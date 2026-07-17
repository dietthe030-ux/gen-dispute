import { useState, useEffect, useCallback } from 'react'
import { parseEther, type Address } from 'viem'
import { client, CONTRACT_ADDRESS } from '../config/genlayer'
import type { UIState, OrderState } from '../types'
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types'

const RECEIPT_POLL_INTERVAL_MS = 3000
const ACCEPTED_POLL_RETRIES = 20
const FINALIZED_POLL_RETRIES = 60

export const FINALIZATION_PENDING_MESSAGE =
  'Transaction accepted on Studionet. Finalization is still pending; contract state will continue to refresh.'

const STATUS_NAMES: Record<string, string> = {
  '5': TransactionStatus.ACCEPTED,
  '6': TransactionStatus.UNDETERMINED,
  '7': TransactionStatus.FINALIZED,
  '8': TransactionStatus.CANCELED,
  '12': TransactionStatus.VALIDATORS_TIMEOUT,
  '13': TransactionStatus.LEADER_TIMEOUT,
}

const getReceiptStatusName = (receipt: any): string =>
  String(
    receipt?.statusName ??
      receipt?.status_name ??
      STATUS_NAMES[String(receipt?.status)] ??
      ''
  )

const getReceiptResultName = (receipt: any): string =>
  String(receipt?.resultName ?? receipt?.result_name ?? '')

const assertSuccessfulReceipt = (receipt: any) => {
  const statusName = getReceiptStatusName(receipt)
  if (
    statusName &&
    statusName !== TransactionStatus.ACCEPTED &&
    statusName !== TransactionStatus.FINALIZED
  ) {
    throw new Error(`Transaction ended with status: ${statusName}`)
  }

  const resultName = getReceiptResultName(receipt)
  if (resultName && resultName !== 'AGREE' && resultName !== 'MAJORITY_AGREE') {
    throw new Error(`Transaction consensus failed: ${resultName}`)
  }

  // Older SDK/RPC responses expose this camelCase execution result.
  const legacyExecutionResult =
    receipt?.txExecutionResultName ?? receipt?.tx_execution_result_name
  if (
    legacyExecutionResult &&
    legacyExecutionResult !== ExecutionResult.FINISHED_WITH_RETURN
  ) {
    throw new Error(`Transaction execution failed: ${legacyExecutionResult}`)
  }

  // genlayer-js 1.1.8 Studionet receipts expose execution results inside
  // consensus_data instead of txExecutionResultName.
  const consensusData = receipt?.consensus_data ?? receipt?.consensusData
  const leaderReceipts = Array.isArray(consensusData?.leader_receipt)
    ? consensusData.leader_receipt
    : consensusData?.leader_receipt
      ? [consensusData.leader_receipt]
      : []
  const validators = Array.isArray(consensusData?.validators)
    ? consensusData.validators
    : []
  const executionEntries = [...leaderReceipts, ...validators]
  const executionResults = executionEntries
    .map((entry) => entry?.execution_result ?? entry?.executionResult)
    .filter(Boolean)

  const executionError = executionEntries.find((entry) => {
    const genVmResult = entry?.genvm_result ?? entry?.genvmResult
    return (
      genVmResult?.error_code ||
      genVmResult?.errorCode ||
      genVmResult?.error_description ||
      genVmResult?.errorDescription ||
      genVmResult?.raw_error ||
      genVmResult?.rawError
    )
  })

  if (executionError) {
    const genVmResult = executionError.genvm_result ?? executionError.genvmResult
    const detail =
      genVmResult?.error_description ??
      genVmResult?.errorDescription ??
      genVmResult?.raw_error ??
      genVmResult?.rawError ??
      genVmResult?.error_code ??
      genVmResult?.errorCode
    throw new Error(`Transaction execution failed: ${detail}`)
  }

  const failedExecution = executionResults.find((result) => result !== 'SUCCESS')
  if (failedExecution) {
    throw new Error(`Transaction execution failed: ${failedExecution}`)
  }

  if (!legacyExecutionResult && executionResults.length === 0) {
    throw new Error('Transaction execution failed: missing execution result')
  }
}

const waitForAcceptedAndFinalized = async (
  hash: Awaited<ReturnType<typeof client.writeContract>>,
  onAccepted: () => Promise<void>
): Promise<boolean> => {
  const acceptedReceipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: RECEIPT_POLL_INTERVAL_MS,
    retries: ACCEPTED_POLL_RETRIES,
  })

  assertSuccessfulReceipt(acceptedReceipt)
  await onAccepted()

  try {
    const finalizedReceipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: RECEIPT_POLL_INTERVAL_MS,
      retries: FINALIZED_POLL_RETRIES,
    })
    assertSuccessfulReceipt(finalizedReceipt)
    return true
  } catch (error: any) {
    if (String(error?.message).includes('Timed out waiting for transaction')) {
      return false
    }
    throw error
  }
}

export const FIXTURE_REGISTRY: Record<string, string> = {
  'https://listing.url': 'Vintage Rolex Submariner watch in excellent condition',
  'https://listing.url/rolex_v1': 'Version A: Rolex watch including original box and papers',
  'https://listing.url/rolex_v2': 'Version B: Cheap Casio watch instead of Rolex',
  'https://listing.url/vintage_watch': 'Vintage Rolex Submariner watch in excellent condition',
}

export const parseGenAmount = (amountStr: string): bigint => {
  const trimmed = amountStr.trim()
  // Reject negative, zero, malformed, non-finite inputs
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Invalid numeric format (must be a positive number)')
  }
  
  const dotIndex = trimmed.indexOf('.')
  if (dotIndex !== -1 && (trimmed.length - dotIndex - 1) > 18) {
    throw new Error('Excessive decimal precision (maximum of 18 decimal places)')
  }
  
  const val = parseEther(trimmed)
  if (val <= 0n) {
    throw new Error('Amount must be positive and greater than zero')
  }
  
  return val
}

export const useGenDispute = () => {
  const [account, setAccount] = useState<{ address: Address } | null>(null)
  const [uiState, setUiState] = useState<UIState>('DISCONNECTED')
  const [txHash, setTxHash] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [orderState, setOrderState] = useState<OrderState | null>(null)
  const [isRetrying, setIsRetrying] = useState<boolean>(false)

  // Request network switch/add flow
  const checkAndSwitchNetwork = async () => {
    const provider = (window as any).ethereum
    if (!provider) throw new Error('No browser wallet detected')

    const chainIdHex = await provider.request({ method: 'eth_chainId' })
    const expectedChainIdHex = '0xf22f' // 61999 in hex

    if (chainIdHex !== expectedChainIdHex) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainIdHex }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: expectedChainIdHex,
                chainName: 'GenLayer Studionet',
                rpcUrls: ['https://studio.genlayer.com/api'],
                nativeCurrency: {
                  name: 'GEN',
                  symbol: 'GEN',
                  decimals: 18,
                },
              },
            ],
          })
        } else {
          throw switchError
        }
      }
    }
  }

  const connectWallet = useCallback(async () => {
    setUiState('WALLET_CONNECTING')
    setErrorMessage('')
    try {
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No browser wallet detected. Please install MetaMask or another GenLayer compatible wallet.')
      }

      // Check and switch network first
      await checkAndSwitchNetwork()

      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet.')
      }

      setAccount({ address: accounts[0] as Address })
      setUiState('RETRY_AVAILABLE')
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Failed to connect wallet')
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setOrderState(null)
    setUiState('DISCONNECTED')
  }, [])

  // Listen for account/chain changes
  useEffect(() => {
    const provider = (window as any).ethereum
    if (provider) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount({ address: accounts[0] as Address })
        } else {
          setAccount(null)
          setUiState('DISCONNECTED')
        }
      }

      const handleChain = () => {
        window.location.reload()
      }

      provider.on('accountsChanged', handleAccounts)
      provider.on('chainChanged', handleChain)

      return () => {
        if (provider.removeListener) {
          provider.removeListener('accountsChanged', handleAccounts)
          provider.removeListener('chainChanged', handleChain)
        }
      }
    }
  }, [])

  const refreshOrder = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return
    try {
      const order = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_order',
        args: [],
      }) as any

      if (order && order.status !== 'NONE') {
        setOrderState({
          seller: order.seller,
          buyer: order.buyer,
          escrowAmount: BigInt(order.escrow_amount),
          listingUrl: order.listing_url,
          itemDescription: order.item_description,
          status: order.status,
          disputeAttempts: Number(order.dispute_attempts),
          disputeReason: order.dispute_reason,
          evidenceUrls: order.evidence_urls || [],
          refundTier: order.refund_tier !== null ? Number(order.refund_tier) : null,
          buyerPayout: order.buyer_payout !== null ? BigInt(order.buyer_payout) : null,
          sellerPayout: order.seller_payout !== null ? BigInt(order.seller_payout) : null,
          outcome: order.outcome,
          lastError: order.last_error,
        })
      } else {
        setOrderState(null)
      }
    } catch (e: any) {
      console.error('Failed to read contract state:', e)
    }
  }, [])

  // Poll order state when connected
  useEffect(() => {
    if (account && CONTRACT_ADDRESS) {
      refreshOrder()
      const interval = setInterval(refreshOrder, 5000)
      return () => clearInterval(interval)
    }
  }, [account, refreshOrder])

  const createOrder = useCallback(async (
    buyerAddress: string,
    listingUrl: string,
    listingSnapshot: string,
    description: string,
    amountGen: string
  ) => {
    if (!account) {
      setUiState('ERROR')
      setErrorMessage('Wallet not connected')
      return
    }
    if (!CONTRACT_ADDRESS) {
      setUiState('ERROR')
      setErrorMessage('Contract address not configured')
      return
    }

    setUiState('SUBMITTING')
    setErrorMessage('')
    try {
      // 1. Verify listing snapshot against deterministic fixture registry
      if (!FIXTURE_REGISTRY[listingUrl]) {
        throw new Error('Listing URL is not registered in the fixture database')
      }
      if (listingSnapshot !== FIXTURE_REGISTRY[listingUrl]) {
        throw new Error('Listing snapshot does not match the registered content for this URL')
      }

      // 2. Verify network/chain ID before write
      await checkAndSwitchNetwork()

      // 3. Parse GEN amount accurately
      const amountWei = parseGenAmount(amountGen)

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_order',
        args: [buyerAddress, listingUrl, listingSnapshot, description],
        value: amountWei,
        account: { address: account.address, type: 'json-rpc' },
      })

      setTxHash(hash)
      setUiState('WAITING_FOR_CONSENSUS')

      const finalized = await waitForAcceptedAndFinalized(hash, async () => {
        setUiState('ACCEPTED')
        await refreshOrder()
      })

      if (finalized) {
        setErrorMessage('')
        setUiState('FINALIZED')
      } else {
        setErrorMessage(FINALIZATION_PENDING_MESSAGE)
        setUiState('ACCEPTED')
      }
      await refreshOrder()
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Transaction failed')
    }
  }, [account, refreshOrder])

  const openDispute = useCallback(async (reason: string, evidenceUrl1: string, evidenceUrl2: string = '') => {
    if (!account) {
      setUiState('ERROR')
      setErrorMessage('Wallet not connected')
      return
    }
    if (!CONTRACT_ADDRESS) {
      setUiState('ERROR')
      setErrorMessage('Contract address not configured')
      return
    }

    setUiState('SUBMITTING')
    setErrorMessage('')
    try {
      // 1. Verify network/chain ID before write
      await checkAndSwitchNetwork()

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'open_dispute',
        args: [reason, evidenceUrl1, evidenceUrl2],
        account: { address: account.address, type: 'json-rpc' },
        value: 0n,
      })

      setTxHash(hash)
      setUiState('WAITING_FOR_CONSENSUS')

      const finalized = await waitForAcceptedAndFinalized(hash, async () => {
        setUiState('ACCEPTED')
        await refreshOrder()
      })

      if (finalized) {
        setErrorMessage('')
      } else {
        setErrorMessage(FINALIZATION_PENDING_MESSAGE)
      }

      await refreshOrder()

      // Fetch the updated contract status to determine UI state
      const order = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_order',
        args: [],
      }) as any

      if (order.status === 'PAID_OUT' || order.status === 'RESOLVED') {
        setErrorMessage('')
        setUiState('PAID_OUT')
      } else if (order.status === 'UNDETERMINED') {
        setUiState('UNDETERMINED')
      } else if (!finalized || order.status === 'DISPUTE_PENDING') {
        setErrorMessage(FINALIZATION_PENDING_MESSAGE)
        setUiState('ACCEPTED')
      } else {
        setUiState('ERROR')
        setErrorMessage(order.last_error || 'Dispute resolution failed')
      }
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Transaction failed')
    }
  }, [account, refreshOrder])

  return {
    account,
    uiState,
    txHash,
    errorMessage,
    orderState,
    connectWallet,
    disconnectWallet,
    createOrder,
    openDispute,
    refreshOrder,
    setUiState,
    isRetrying,
    setIsRetrying,
  }
}
