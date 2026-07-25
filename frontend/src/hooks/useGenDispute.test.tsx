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
  listing_url: 'https://listing.url',
  item_description: 'descr',
  dispute_attempts: status === 'OPEN' ? 0 : 1,
  dispute_reason: status === 'OPEN' ? '' : 'broken',
  evidence_urls: [],
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

    it('clears the selected order when the wallet account changes', async () => {
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
        await result.current.openDispute('reason', 'https://evidence')
      })

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xcontractaddress',
        functionName: 'open_dispute',
        args: [0, 'reason', 'https://evidence', ''],
        value: 0n,
        account: { address: '0x1122334455667788990011223344556677889900', type: 'json-rpc' },
      })

      expect(result.current.uiState).toBe('PAID_OUT')
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
        await result.current.openDispute('reason', 'https://evidence')
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
        await result.current.openDispute('reason', 'https://evidence')
      })

      expect(result.current.uiState).toBe('ERROR')
      expect(result.current.errorMessage).toBe('User rejected signing')
    })
  })
})
