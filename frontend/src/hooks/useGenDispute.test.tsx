import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  FINALIZATION_PENDING_MESSAGE,
  useGenDispute,
  parseGenAmount,
} from './useGenDispute'
import { client } from '../config/genlayer'
import { TransactionStatus } from 'genlayer-js/types'

vi.mock('../config/genlayer', () => {
  return {
    CONTRACT_ADDRESS: '0xcontractaddress',
    client: {
      writeContract: vi.fn(),
      readContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
      debugTraceTransaction: vi.fn(),
    },
  }
})

const successfulReceipt = (status: 'ACCEPTED' | 'FINALIZED' = 'FINALIZED') => ({
  status: status === 'FINALIZED' ? 7 : 5,
  status_name: status,
  result: 6,
  result_name: 'MAJORITY_AGREE',
  consensus_data: {
    leader_receipt: [
      {
        execution_result: 'SUCCESS',
        genvm_result: {
          error_code: null,
          error_description: null,
        },
      },
    ],
  },
})

const contractOrder = (status: 'OPEN' | 'PAID_OUT' | 'UNDETERMINED' = 'OPEN') => ({
  order_id: 0,
  status,
  seller: '0xseller',
  buyer: '0xbuyer',
  escrow_amount: 1000n,
  created_at: 1786147200,
  expires_at: 1786752000,
  listing_url: 'https://listing.url',
  item_description: 'descr',
  dispute_attempts: status === 'OPEN' ? 0 : 1,
  dispute_reason: status === 'OPEN' ? '' : 'broken',
  evidence_urls: [],
  evidence_hashes: [],
  evidence_commitments: [],
  refund_tier: status === 'PAID_OUT' ? 50 : null,
  buyer_payout: status === 'PAID_OUT' ? 500n : null,
  seller_payout: status === 'PAID_OUT' ? 500n : null,
  outcome:
    status === 'PAID_OUT'
      ? 'PARTIAL_MISMATCH'
      : status === 'UNDETERMINED'
        ? 'UNDETERMINED'
        : 'NONE',
  last_error: status === 'UNDETERMINED' ? 'Consensus failure' : '',
})

describe('useGenDispute Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.debugTraceTransaction).mockResolvedValue({ return_data: '0x01' } as any)
    ;(window as any).ethereum = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (window as any).ethereum
  })

  describe('parseGenAmount utility', () => {
    it('correctly parses valid positive decimal amounts to bigint wei', () => {
      expect(parseGenAmount('1')).toBe(1000000000000000000n)
      expect(parseGenAmount('1.5')).toBe(1500000000000000000n)
      expect(parseGenAmount('0.0001')).toBe(100000000000000n)
    })

    it('rejects zero or negative values', () => {
      expect(() => parseGenAmount('0')).toThrow()
      expect(() => parseGenAmount('-1')).toThrow()
    })

    it('rejects malformed inputs', () => {
      expect(() => parseGenAmount('abc')).toThrow()
      expect(() => parseGenAmount('1.2.3')).toThrow()
      expect(() => parseGenAmount('   ')).toThrow()
    })

    it('rejects excessive decimal precision beyond 18 decimals', () => {
      expect(() => parseGenAmount('0.1234567890123456789')).toThrow() // 19 decimals
    })
  })

  describe('connectWallet handler', () => {
    it('successfully connects wallet when network is correct', async () => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f' // Studionet
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      expect(result.current.account).toEqual({ address: '0x1122334455667788990011223344556677889900' })
      expect(result.current.uiState).toBe('RETRY_AVAILABLE')
      expect(result.current.errorMessage).toBe('')
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [
          'Sign to connect to GenDispute on Studionet. This does not submit a transaction.',
          '0x1122334455667788990011223344556677889900',
        ],
      })
    })

    it('requires a new signature after an explicit disconnect', async () => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        if (method === 'personal_sign') return '0xsigned'
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => result.current.connectWallet())
      act(() => result.current.disconnectWallet())
      await act(async () => result.current.connectWallet())

      expect(mockRequest.mock.calls.filter(([request]: any[]) => request.method === 'personal_sign')).toHaveLength(2)
      expect(result.current.account).toEqual({ address: '0x1122334455667788990011223344556677889900' })
    })

    it('stays disconnected when the signature is rejected', async () => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        if (method === 'personal_sign') throw new Error('User rejected signature')
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => result.current.connectWallet())

      expect(result.current.account).toBeNull()
      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toBe('User rejected signature')
    })

    it('handles missing browser wallet provider', async () => {
      delete (window as any).ethereum

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      expect(result.current.account).toBeNull()
      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toContain('No browser wallet detected')
    })

    it('handles wrong network and network switch rejection', async () => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0x1' // Ethereum Mainnet
        if (method === 'wallet_switchEthereumChain') {
          throw new Error('User rejected chain switch')
        }
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      expect(result.current.account).toBeNull()
      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toBe('User rejected chain switch')
    })

    it('disconnects when the wallet account changes so the new account must sign', async () => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })
      vi.mocked(client.readContract).mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder()
      )

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
        await result.current.loadOrder(0)
      })
      expect(result.current.selectedOrderId).toBe(0)
      expect(result.current.orderState?.orderId).toBe(0)

      const accountChangeHandler = (window as any).ethereum.on.mock.calls.find(
        ([eventName]: [string]) => eventName === 'accountsChanged'
      )?.[1]

      act(() => {
        accountChangeHandler(['0x9999999999999999999999999999999999999999'])
      })

      expect(result.current.selectedOrderId).toBeNull()
      expect(result.current.orderState).toBeNull()
      expect(result.current.account).toBeNull()
      expect(result.current.uiState).toBe('DISCONNECTED')
      expect(result.current.errorMessage).toBe('Account changed. Sign again to reconnect.')
    })
  })

  describe('order lookup', () => {
    it('loads only the explicitly requested order ID', async () => {
      vi.mocked(client.readContract).mockImplementation(async ({ functionName, args }: any) => {
        if (functionName === 'get_order_count') return 8
        return { ...contractOrder(), order_id: args[0] }
      })

      const { result } = renderHook(() => useGenDispute())
      await act(async () => {
        await result.current.loadOrder(7)
      })

      expect(client.readContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName: 'get_order',
        args: [7],
      })
      expect(result.current.selectedOrderId).toBe(7)
      expect(result.current.orderState?.orderId).toBe(7)
    })
  })

  describe('createOrder handler', () => {
    it('successfully creates an order through accepted and finalized statuses', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue(successfulReceipt() as any)

      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.createOrder(
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          '1.5'
        )
      })

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName: 'create_order',
        args: [
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          604800,
        ],
        value: 1500000000000000000n,
        account: { address: '0x1122334455667788990011223344556677889900', type: 'json-rpc' },
      })

      expect(mockWaitForReceipt).toHaveBeenNthCalledWith(1, {
        hash: '0xtxhash',
        status: TransactionStatus.ACCEPTED,
        interval: 3000,
        retries: 60,
      })

      expect(mockWaitForReceipt).toHaveBeenNthCalledWith(2, {
        hash: '0xtxhash',
        status: TransactionStatus.FINALIZED,
        interval: 3000,
        retries: 60,
      })

      expect(result.current.uiState).toBe('FINALIZED')
    })

    it('uses the returned order ID when concurrent creation changes the global count', async () => {
      vi.mocked(client.writeContract).mockResolvedValue('0xconcurrent')
      vi.mocked(client.waitForTransactionReceipt).mockResolvedValue(successfulReceipt() as any)
      vi.mocked(client.debugTraceTransaction).mockResolvedValue({ return_data: '0x39' } as any)
      vi.mocked(client.readContract).mockImplementation(async ({ functionName, args }: any) => {
        if (functionName === 'get_order_count') return 12
        return { ...contractOrder(), order_id: args[0] }
      })
      ;(window as any).ethereum.request.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())
      await act(async () => result.current.connectWallet())
      await act(async () => result.current.createOrder(
        '0xbuyer',
        'https://listing.url',
        'Vintage Rolex Submariner watch in excellent condition',
        'description',
        '1',
      ))

      expect(result.current.orderCount).toBe(12)
      expect(result.current.selectedOrderId).toBe(7)
      expect(result.current.orderState?.orderId).toBe(7)
      expect(client.readContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName: 'get_order',
        args: [7],
      })
    })

    it('treats finalized execution error as a failure', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue({
        status: 7,
        status_name: 'FINALIZED',
        result: 7,
        result_name: 'MAJORITY_DISAGREE',
        consensus_data: {
          leader_receipt: [
            {
              execution_result: 'FAILURE',
              genvm_result: {
                error_code: 'CONTRACT_ERROR',
                error_description: 'Contract execution reverted',
              },
            },
          ],
        },
      } as any)

      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.createOrder(
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          '1.5'
        )
      })

      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toContain('Transaction consensus failed: MAJORITY_DISAGREE')
    })

    it('explains an undetermined consensus without implying escrow loss', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xundetermined')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue({
        status: 6,
        status_name: 'UNDETERMINED',
      } as any)

      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.createOrder(
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          '1.5'
        )
      })

      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toContain('Validators did not reach consensus')
      expect(result.current.errorMessage).toContain('escrow remains locked')
    })

    it('treats a receipt with no execution signal as a failure', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue({
        status: 7,
        status_name: 'FINALIZED',
        result: 6,
        result_name: 'MAJORITY_AGREE',
      } as any)

      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.createOrder(
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          '1.5'
        )
      })

      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toContain('Transaction execution failed: missing execution result')
    })

    it('keeps an accepted order out of the error state when finalization polling times out', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt
        .mockResolvedValueOnce(successfulReceipt('ACCEPTED') as any)
        .mockRejectedValueOnce(
          new Error(
            'Timed out waiting for transaction 0xtxhash to reach status "FINALIZED" (current status: 5).'
          )
        )

      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.createOrder(
          '0xbuyer',
          'https://listing.url/rolex_v1',
          'Version A: Rolex watch including original box and papers',
          'description',
          '1.5'
        )
      })

      expect(result.current.uiState).toBe('ACCEPTED')
      expect(result.current.errorMessage).toBe(FINALIZATION_PENDING_MESSAGE)
    })
  })

  describe('openDispute handler', () => {
    beforeEach(() => {
      const mockRequest = (window as any).ethereum.request
      mockRequest.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })
    })

    it('successfully opens dispute and handles resolved result', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue(successfulReceipt() as any)

      const mockReadContract = vi.mocked(client.readContract)
      mockReadContract.mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder('PAID_OUT')
      )

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.loadOrder(0)
      })

      await act(async () => {
        await result.current.openDispute('reason')
      })

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName: 'open_dispute',
        args: [0, 'reason'],
        value: 0n,
        account: { address: '0x1122334455667788990011223344556677889900', type: 'json-rpc' },
      })

      expect(result.current.uiState).toBe('PAID_OUT')
    })

    it('ignores validators cancelled after an accepted quorum is reached', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const receiptWithIdleValidators = {
        ...successfulReceipt(),
        consensus_data: {
          leader_receipt: [
            {
              mode: 'leader',
              execution_result: 'SUCCESS',
              genvm_result: { error_code: null, raw_error: null },
            },
            {
              mode: 'validator',
              vote: 'agree',
              execution_result: 'SUCCESS',
              genvm_result: { error_code: null, raw_error: null },
            },
            {
              mode: 'validator',
              vote: 'idle',
              execution_result: 'ERROR',
              genvm_result: {
                error_code: 'CONSENSUS_VALIDATOR_QUORUM_REACHED',
                raw_error: {
                  fatal: false,
                  causes: ['VALIDATOR_QUORUM_REACHED'],
                },
              },
            },
          ],
          validators: [],
        },
      }
      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue(receiptWithIdleValidators as any)

      const mockReadContract = vi.mocked(client.readContract)
      mockReadContract.mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder('PAID_OUT')
      )

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.loadOrder(0)
      })

      await act(async () => {
        await result.current.openDispute('reason')
      })

      expect(result.current.uiState).toBe('PAID_OUT')
      expect(result.current.errorMessage).toBe('')
    })

    it('handles UNDETERMINED state outcome', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockResolvedValue('0xtxhash')

      const mockWaitForReceipt = vi.mocked(client.waitForTransactionReceipt)
      mockWaitForReceipt.mockResolvedValue(successfulReceipt() as any)

      const mockReadContract = vi.mocked(client.readContract)
      mockReadContract.mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder('UNDETERMINED')
      )

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.loadOrder(0)
      })

      await act(async () => {
        await result.current.openDispute('reason')
      })

      expect(result.current.uiState).toBe('UNDETERMINED')
    })

    it('handles wallet transaction signing rejection', async () => {
      const mockWriteContract = vi.mocked(client.writeContract)
      mockWriteContract.mockRejectedValue(new Error('User rejected signing'))
      const mockReadContract = vi.mocked(client.readContract)
      mockReadContract.mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder()
      )

      const { result } = renderHook(() => useGenDispute())

      await act(async () => {
        await result.current.connectWallet()
      })

      await act(async () => {
        await result.current.loadOrder(0)
      })

      await act(async () => {
        await result.current.openDispute('reason')
      })

      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toBe('User rejected signing')
    })
  })

  describe('settlement handlers', () => {
    beforeEach(() => {
      ;(window as any).ethereum.request.mockImplementation(async ({ method }: any) => {
        if (method === 'eth_chainId') return '0xf22f'
        if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
        return null
      })
      vi.mocked(client.writeContract).mockResolvedValue('0xsettlement')
      vi.mocked(client.waitForTransactionReceipt).mockResolvedValue(successfulReceipt() as any)
      vi.mocked(client.readContract).mockImplementation(async ({ functionName }: any) =>
        functionName === 'get_order_count' ? 1 : contractOrder('PAID_OUT')
      )
    })

    it.each([
      ['confirm_delivery', 'confirmDelivery'],
      ['recover_expired_order', 'recoverExpiredOrder'],
    ] as const)('submits %s and refreshes the paid-out order', async (functionName, handlerName) => {
      const { result } = renderHook(() => useGenDispute())
      await act(async () => result.current.connectWallet())
      await act(async () => result.current.loadOrder(0))
      await act(async () => result.current[handlerName]())

      expect(client.writeContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName,
        args: [0],
        value: 0n,
        account: {
          address: '0x1122334455667788990011223344556677889900',
          type: 'json-rpc',
        },
      })
      expect(result.current.uiState).toBe('PAID_OUT')
      expect(result.current.orderState?.status).toBe('PAID_OUT')
    })
  })

  it('registers an issuer-signed order receipt with all provenance fields', async () => {
    const receiptHash = 'a'.repeat(64)
    ;(window as any).ethereum.request.mockImplementation(async ({ method }: any) => {
      if (method === 'eth_chainId') return '0xf22f'
      if (method === 'eth_requestAccounts') return ['0x1122334455667788990011223344556677889900']
      return null
    })
    vi.mocked(client.writeContract).mockResolvedValue('0xreceipt')
    vi.mocked(client.waitForTransactionReceipt).mockResolvedValue(successfulReceipt() as any)
    vi.mocked(client.readContract).mockImplementation(async ({ functionName }: any) => {
      if (functionName === 'get_order_count') return 1
      if (functionName === 'get_evidence_issuer') return '0x1122334455667788990011223344556677889900'
      return {
        ...contractOrder(),
        evidence_receipt_url: 'https://gen-dispute.vercel.app/fixtures/order-0.html',
        evidence_receipt_sha256: receiptHash,
        evidence_nonce: 'ORDER_0_V1',
        evidence_receipt_observed_at: 1786147200,
      }
    })

    const { result } = renderHook(() => useGenDispute())
    await act(async () => result.current.connectWallet())
    await act(async () => result.current.loadOrder(0))
    await act(async () => result.current.registerEvidenceReceipt(
      'https://gen-dispute.vercel.app/fixtures/order-0.html',
      receiptHash,
      'ORDER_0_V1',
      1786147200
    ))

    expect(client.writeContract).toHaveBeenCalledWith({
      address: '0xcontractaddress',
      functionName: 'register_evidence_receipt',
      args: [
        0,
        'https://gen-dispute.vercel.app/fixtures/order-0.html',
        receiptHash,
        'ORDER_0_V1',
        1786147200,
      ],
      value: 0n,
      account: {
        address: '0x1122334455667788990011223344556677889900',
        type: 'json-rpc',
      },
    })
  })
})
