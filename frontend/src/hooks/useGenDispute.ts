import { useState, useEffect, useCallback } from 'react'
import { hexToBytes, parseEther, type Address, type Hex } from 'viem'
import { abi } from 'genlayer-js'
import { client, CONTRACT_ADDRESS } from '../config/genlayer'
import type { UIState, OrderState } from '../types'
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types'

const RECEIPT_POLL_INTERVAL_MS = 3000
const ACCEPTED_POLL_RETRIES = 60
const FINALIZED_POLL_RETRIES = 60
export const DEFAULT_TIMEOUT_SECONDS = 7 * 24 * 60 * 60

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

const formatExecutionError = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const assertSuccessfulReceipt = (receipt: any) => {
  const statusName = getReceiptStatusName(receipt)
  if (
    statusName &&
    statusName !== TransactionStatus.ACCEPTED &&
    statusName !== TransactionStatus.FINALIZED
  ) {
    if (statusName === TransactionStatus.UNDETERMINED) {
      throw new Error(
        'Validators did not reach consensus. Contract state was not changed and escrow remains locked. Review the evidence for contradictions before retrying.'
      )
    }
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
  // Once quorum is reached, Studionet may cancel validators that are no longer
  // needed. Those entries are reported as idle/ERROR with
  // CONSENSUS_VALIDATOR_QUORUM_REACHED even though the accepted transaction
  // and its leader/agreeing validators executed successfully. Only entries
  // that contributed to the accepted result should determine UI success.
  const decisiveExecutionEntries = [
    ...leaderReceipts,
    ...validators.filter(
      (entry: any) => String(entry?.vote ?? '').toLowerCase() === 'agree'
    ),
  ]
  const executionResults = decisiveExecutionEntries
    .map((entry) => entry?.execution_result ?? entry?.executionResult)
    .filter(Boolean)

  const executionError = decisiveExecutionEntries.find((entry) => {
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
    throw new Error(`Transaction execution failed: ${formatExecutionError(detail)}`)
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

export const decodeCreatedOrderId = async (
  hash: Awaited<ReturnType<typeof client.writeContract>>
): Promise<number> => {
  const trace = await client.debugTraceTransaction({ hash, round: 0 })
  if (!trace?.return_data || !String(trace.return_data).startsWith('0x')) {
    throw new Error('create_order did not return a decodable order ID')
  }

  const decoded = abi.calldata.decode(hexToBytes(trace.return_data as Hex))
  const orderId = typeof decoded === 'bigint' ? Number(decoded) : Number(decoded)
  if (!Number.isSafeInteger(orderId) || orderId < 0) {
    throw new Error('create_order returned an invalid order ID')
  }
  return orderId
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

const toOrderState = (order: any): OrderState => ({
  orderId: Number(order.order_id),
  seller: order.seller,
  buyer: order.buyer,
  escrowAmount: BigInt(order.escrow_amount),
  createdAt: Number(order.created_at),
  expiresAt: Number(order.expires_at),
  listingUrl: order.listing_url,
  itemDescription: order.item_description,
  status: order.status,
  disputeAttempts: Number(order.dispute_attempts),
  disputeReason: order.dispute_reason,
  evidenceUrls: order.evidence_urls || [],
  evidenceHashes: order.evidence_hashes || [],
  evidenceCommitments: order.evidence_commitments || [],
  refundTier: order.refund_tier !== null ? Number(order.refund_tier) : null,
  buyerPayout: order.buyer_payout !== null ? BigInt(order.buyer_payout) : null,
  sellerPayout: order.seller_payout !== null ? BigInt(order.seller_payout) : null,
  outcome: order.outcome,
  lastError: order.last_error,
})

export const useGenDispute = () => {
  const [account, setAccount] = useState<{ address: Address } | null>(null)
  const [uiState, setUiState] = useState<UIState>('DISCONNECTED')
  const [txHash, setTxHash] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [orderState, setOrderState] = useState<OrderState | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [isOrderLoading, setIsOrderLoading] = useState<boolean>(false)
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
      setSelectedOrderId(null)
      setOrderState(null)
      setUiState('RETRY_AVAILABLE')
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Failed to connect wallet')
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setOrderState(null)
    setSelectedOrderId(null)
    setOrderCount(null)
    setUiState('DISCONNECTED')
  }, [])

  // Listen for account/chain changes
  useEffect(() => {
    const provider = (window as any).ethereum
    if (provider) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount({ address: accounts[0] as Address })
          setSelectedOrderId(null)
          setOrderState(null)
          setIsRetrying(false)
          setErrorMessage('')
          setUiState('RETRY_AVAILABLE')
        } else {
          setAccount(null)
          setSelectedOrderId(null)
          setOrderState(null)
          setOrderCount(null)
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

  const refreshOrderCount = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setOrderCount(null)
      return null
    }

    try {
      const count = Number(await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_order_count',
        args: [],
      }))
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error('Contract returned an invalid order count')
      }
      setOrderCount(count)
      return count
    } catch (error) {
      console.error('Failed to read order count:', error)
      setOrderCount(null)
      return null
    }
  }, [])

  const readOrder = useCallback(async (orderId: number) => {
    const order = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_order',
      args: [orderId],
    }) as any
    return toOrderState(order)
  }, [])

  const refreshOrder = useCallback(async (orderIdOverride?: number) => {
    const orderId = orderIdOverride ?? selectedOrderId
    if (!CONTRACT_ADDRESS || orderId === null) return
    try {
      setOrderState(await readOrder(orderId))
    } catch (e: any) {
      console.error('Failed to read contract state:', e)
      if (orderIdOverride !== undefined) throw e
    }
  }, [readOrder, selectedOrderId])

  const loadOrder = useCallback(async (orderId: number) => {
    if (!Number.isSafeInteger(orderId) || orderId < 0) {
      setUiState('ERROR')
      setErrorMessage('Order ID must be a non-negative whole number')
      return
    }
    if (!CONTRACT_ADDRESS) {
      setUiState('ERROR')
      setErrorMessage('Contract address not configured')
      return
    }

    setIsOrderLoading(true)
    setErrorMessage('')
    try {
      const order = await readOrder(orderId)
      setSelectedOrderId(orderId)
      setOrderState(order)
      setIsRetrying(false)
      setUiState('RETRY_AVAILABLE')
    } catch (error: any) {
      setSelectedOrderId(null)
      setOrderState(null)
      setUiState('ERROR')
      setErrorMessage(
        String(error?.message || '').includes('Order does not exist')
          ? `Order #${orderId} does not exist on this contract`
          : error?.message || `Unable to load order #${orderId}`
      )
    } finally {
      setIsOrderLoading(false)
    }
  }, [readOrder])

  const clearSelectedOrder = useCallback(() => {
    setSelectedOrderId(null)
    setOrderState(null)
    setIsRetrying(false)
    setErrorMessage('')
    setUiState(account ? 'RETRY_AVAILABLE' : 'DISCONNECTED')
  }, [account])

  // Read only the explicitly selected order. A wallet switch never inherits
  // another wallet's last-viewed order.
  useEffect(() => {
    if (account && CONTRACT_ADDRESS && selectedOrderId !== null) {
      refreshOrder()
      const interval = setInterval(refreshOrder, 5000)
      return () => clearInterval(interval)
    }
  }, [account, selectedOrderId, refreshOrder])

  useEffect(() => {
    if (account && CONTRACT_ADDRESS) {
      refreshOrderCount()
    }
  }, [account, refreshOrderCount])

  const createOrder = useCallback(async (
    buyerAddress: string,
    listingUrl: string,
    listingSnapshot: string,
    description: string,
    amountGen: string,
    timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS
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
        args: [buyerAddress, listingUrl, listingSnapshot, description, timeoutSeconds],
        value: amountWei,
        account: { address: account.address, type: 'json-rpc' },
      })

      setTxHash(hash)
      setUiState('WAITING_FOR_CONSENSUS')

      const finalized = await waitForAcceptedAndFinalized(hash, async () => {
        setUiState('ACCEPTED')
        const createdOrderId = await decodeCreatedOrderId(hash)
        setSelectedOrderId(createdOrderId)
        await refreshOrder(createdOrderId)
        await refreshOrderCount()
      })

      if (finalized) {
        setErrorMessage('')
        setUiState('FINALIZED')
      } else {
        setErrorMessage(FINALIZATION_PENDING_MESSAGE)
        setUiState('ACCEPTED')
      }
      await refreshOrderCount()
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Transaction failed')
    }
  }, [account, refreshOrder, refreshOrderCount])

  const settleOrder = useCallback(async (
    functionName: 'confirm_delivery' | 'recover_expired_order'
  ) => {
    if (!account || selectedOrderId === null || !CONTRACT_ADDRESS) {
      setUiState('ERROR')
      setErrorMessage('Connect a wallet and select an order first')
      return
    }

    setUiState('SUBMITTING')
    setErrorMessage('')
    try {
      await checkAndSwitchNetwork()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args: [selectedOrderId],
        account: { address: account.address, type: 'json-rpc' },
        value: 0n,
      })
      setTxHash(hash)
      setUiState('WAITING_FOR_CONSENSUS')

      const finalized = await waitForAcceptedAndFinalized(hash, async () => {
        setUiState('ACCEPTED')
        await refreshOrder()
      })
      const settledOrder = await readOrder(selectedOrderId)
      setOrderState(settledOrder)
      if (finalized) {
        if (settledOrder.status !== 'PAID_OUT') {
          throw new Error('Settlement finalized but the order is not paid out')
        }
        setUiState('PAID_OUT')
      } else {
        setUiState('ACCEPTED')
        setErrorMessage(FINALIZATION_PENDING_MESSAGE)
      }
    } catch (e: any) {
      setUiState('ERROR')
      setErrorMessage(e.message || 'Transaction failed')
    }
  }, [account, readOrder, refreshOrder, selectedOrderId])

  const confirmDelivery = useCallback(
    () => settleOrder('confirm_delivery'),
    [settleOrder]
  )

  const recoverExpiredOrder = useCallback(
    () => settleOrder('recover_expired_order'),
    [settleOrder]
  )

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
    if (selectedOrderId === null) {
      setUiState('ERROR')
      setErrorMessage('Select an order before opening a dispute')
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
        args: [selectedOrderId, reason, evidenceUrl1, evidenceUrl2],
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
        args: [selectedOrderId],
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
  }, [account, refreshOrder, selectedOrderId])

  return {
    account,
    uiState,
    txHash,
    errorMessage,
    orderState,
    selectedOrderId,
    orderCount,
    isOrderLoading,
    connectWallet,
    disconnectWallet,
    createOrder,
    openDispute,
    confirmDelivery,
    recoverExpiredOrder,
    loadOrder,
    clearSelectedOrder,
    refreshOrder,
    refreshOrderCount,
    setUiState,
    isRetrying,
    setIsRetrying,
  }
}
