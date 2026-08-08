import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { useGenDispute } from './hooks/useGenDispute'

// Mock the useGenDispute hook
vi.mock('./hooks/useGenDispute', () => ({
  useGenDispute: vi.fn(),
}))

const orderControls = (selectedOrderId: number | null = null) => ({
  selectedOrderId,
  orderCount: selectedOrderId === null ? 0 : 1,
  isOrderLoading: false,
  loadOrder: vi.fn(),
  clearSelectedOrder: vi.fn(),
  refreshOrderCount: vi.fn(),
})

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero card and connect button when disconnected', () => {
    ;(useGenDispute as any).mockReturnValue({
      account: null,
      uiState: 'DISCONNECTED',
      txHash: '',
      errorMessage: '',
      orderState: null,
      ...orderControls(),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Hold payment until the item checks out')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeInTheDocument()
  })

  it('lets the user choose an injected wallet before connecting', () => {
    const connectWallet = vi.fn()
    ;(useGenDispute as any).mockReturnValue({
      account: null,
      walletOptions: [
        { id: 'metamask', name: 'MetaMask' },
        { id: 'rabby', name: 'Rabby Wallet' },
      ],
      uiState: 'DISCONNECTED',
      txHash: '',
      errorMessage: '',
      orderState: null,
      ...orderControls(),
      connectWallet,
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Connect account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rabby Wallet' }))

    expect(connectWallet).toHaveBeenCalledWith('rabby')
  })

  it('renders order creation form when connected but no order exists', () => {
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x1234567890123456789012345678901234567890' },
      uiState: 'RETRY_AVAILABLE',
      txHash: '',
      errorMessage: '',
      orderState: null,
      ...orderControls(),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Create escrow order')).toBeInTheDocument()
    expect(screen.getByLabelText('Buyer address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deposit GEN and create order' })).toBeInTheDocument()
  })

  it('renders order details and dispute form when connected as BUYER', () => {
    const confirmDelivery = vi.fn()
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'RETRY_AVAILABLE',
      txHash: '',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: BigInt(1.5 * 1e18),
        createdAt: 1786147200,
        expiresAt: 1786752000,
        listingUrl: 'https://listing.url',
        itemDescription: 'Vintage Watch description',
        itemId: 'WATCH_ROLEX_SUBMARINER',
        evidencePolicyHash: 'a'.repeat(64),
        evidenceReceiptUrl: 'https://gen-dispute.vercel.app/fixtures/order-0.html',
        evidenceObservedAt: [],
        status: 'OPEN',
        disputeAttempts: 0,
        disputeReason: '',
        evidenceUrls: [],
        evidenceHashes: [],
        evidenceCommitments: [],
        refundTier: null,
        buyerPayout: null,
        sellerPayout: null,
        outcome: 'NONE',
        lastError: '',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      confirmDelivery,
      recoverExpiredOrder: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Order #0')).toBeInTheDocument()
    expect(screen.getByText('Buyer')).toBeInTheDocument()
    expect(screen.getByText('Open dispute')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delivery and pay seller' }))
    expect(confirmDelivery).toHaveBeenCalledOnce()
  })

  it('does not advertise buyer actions after the order is settled', () => {
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'PAID_OUT',
      txHash: '0xtxhash',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: 100000000000000000n,
        createdAt: 1786147200,
        expiresAt: 1786752000,
        listingUrl: 'https://listing.url/rolex_v2',
        itemDescription: 'Black Casio digital wristwatch',
        itemId: 'WATCH_CASIO_DIGITAL',
        evidencePolicyHash: 'a'.repeat(64),
        evidenceReceiptUrl: 'https://gen-dispute.vercel.app/fixtures/order-0.html',
        evidenceReceiptSha256: 'b'.repeat(64),
        evidenceObservedAt: [1786177748],
        status: 'PAID_OUT',
        disputeAttempts: 0,
        disputeReason: 'Material mismatch',
        evidenceUrls: ['https://gen-dispute.vercel.app/fixtures/order-0.html'],
        evidenceHashes: ['b'.repeat(64)],
        evidenceCommitments: ['c'.repeat(64)],
        refundTier: 100,
        buyerPayout: 100000000000000000n,
        sellerPayout: 0n,
        outcome: 'MATERIAL_MISMATCH',
        lastError: '',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      confirmDelivery: vi.fn(),
      recoverExpiredOrder: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('This order is settled. No further party action is available.')).toBeInTheDocument()
    expect(screen.queryByText('You can confirm delivery or open a dispute while the order is open.')).not.toBeInTheDocument()
  })

  it('renders order details and seller message when connected as SELLER', () => {
    const recoverExpiredOrder = vi.fn()
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x1234567890123456789012345678901234567890' },
      uiState: 'RETRY_AVAILABLE',
      txHash: '',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: BigInt(1.5 * 1e18),
        createdAt: 1,
        expiresAt: 2,
        listingUrl: 'https://listing.url',
        itemDescription: 'Vintage Watch description',
        itemId: 'WATCH_ROLEX_SUBMARINER',
        evidencePolicyHash: 'a'.repeat(64),
        evidenceObservedAt: [],
        status: 'OPEN',
        disputeAttempts: 0,
        disputeReason: '',
        evidenceUrls: [],
        evidenceHashes: [],
        evidenceCommitments: [],
        refundTier: null,
        buyerPayout: null,
        sellerPayout: null,
        outcome: 'NONE',
        lastError: '',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      confirmDelivery: vi.fn(),
      recoverExpiredOrder,
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Order #0')).toBeInTheDocument()
    expect(screen.getByText('Seller')).toBeInTheDocument()
    expect(screen.getByText('Waiting on buyer')).toBeInTheDocument()
    expect(screen.queryByText('Open dispute')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Recover expired escrow' }))
    expect(recoverExpiredOrder).toHaveBeenCalledOnce()
  })

  it('handles retry dispute flow for UNDETERMINED orders', async () => {
    const mockOpenDispute = vi.fn()
    const mockSetIsRetrying = vi.fn()

    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'UNDETERMINED',
      txHash: '0xtxhash',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: BigInt(1.5 * 1e18),
        listingUrl: 'https://listing.url',
        itemDescription: 'Vintage Watch description',
        status: 'UNDETERMINED',
        disputeAttempts: 1,
        disputeReason: 'broken dial',
        evidenceUrls: ['https://evidence.url'],
        evidenceReceiptUrl: 'https://gen-dispute.vercel.app/fixtures/order-0-v1.html',
        refundTier: null,
        buyerPayout: null,
        sellerPayout: null,
        outcome: 'UNDETERMINED',
        lastError: 'Consensus output validation failed',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: mockOpenDispute,
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: mockSetIsRetrying,
    })

    const { rerender } = render(<App />)

    // 1. Initially, result panel is displayed with retry button
    expect(screen.getByText('Undetermined')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: 'Prepare retry' })
    expect(retryBtn).toBeInTheDocument()

    // 2. Click "Prepare retry" to trigger retry state
    fireEvent.click(retryBtn)
    expect(mockSetIsRetrying).toHaveBeenCalledWith(true)

    // 3. Rerender with isRetrying = true
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'RETRY_AVAILABLE',
      txHash: '',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: BigInt(1.5 * 1e18),
        listingUrl: 'https://listing.url',
        itemDescription: 'Vintage Watch description',
        status: 'UNDETERMINED',
        disputeAttempts: 1,
        disputeReason: 'broken dial',
        evidenceUrls: ['https://evidence.url'],
        evidenceReceiptUrl: 'https://gen-dispute.vercel.app/fixtures/order-0-v2.html',
        refundTier: null,
        buyerPayout: null,
        sellerPayout: null,
        outcome: 'UNDETERMINED',
        lastError: 'Consensus output validation failed',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: mockOpenDispute,
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: true,
      setIsRetrying: mockSetIsRetrying,
    })

    rerender(<App />)

    // 4. Verifies the retry dispute form now appears
    expect(screen.getByText('Retry dispute')).toBeInTheDocument()
    expect(screen.queryByText('Undetermined')).not.toBeInTheDocument()

    // 5. Fill out and submit the updated reason. Evidence is issuer-controlled.
    const reasonInput = screen.getByLabelText('Reason')

    fireEvent.change(reasonInput, { target: { value: 'New discrepancy description' } })

    const submitBtn = screen.getByRole('button', { name: 'Submit retry' })
    fireEvent.click(submitBtn)

    // 6. Verifies mockSetIsRetrying(false) and openDispute gets called with updated values
    expect(mockSetIsRetrying).toHaveBeenCalledWith(false)
    expect(mockOpenDispute).toHaveBeenCalledWith('New discrepancy description')
  })

  it('prevents retrying when disputeAttempts >= 2', () => {
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'UNDETERMINED',
      txHash: '0xtxhash',
      errorMessage: '',
      orderState: {
        orderId: 0,
        seller: '0x1234567890123456789012345678901234567890',
        buyer: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4',
        escrowAmount: BigInt(1.5 * 1e18),
        listingUrl: 'https://listing.url',
        itemDescription: 'Vintage Watch description',
        status: 'UNDETERMINED',
        disputeAttempts: 2, // Maximum retry cap reached
        disputeReason: 'broken dial',
        evidenceUrls: ['https://evidence.url'],
        refundTier: null,
        buyerPayout: null,
        sellerPayout: null,
        outcome: 'UNDETERMINED',
        lastError: 'Consensus output validation failed',
      },
      ...orderControls(0),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Undetermined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prepare retry' })).not.toBeInTheDocument()
    expect(screen.getByText('No retries left. Deadline recovery remains available.')).toBeInTheDocument()
  })

  it('shows an accepted transaction awaiting finalization as information, not an error', () => {
    const pendingMessage =
      'Transaction accepted on Studionet. Finalization is still pending; contract state will continue to refresh.'

    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'ACCEPTED',
      txHash: '0xacceptedhash',
      errorMessage: pendingMessage,
      orderState: null,
      ...orderControls(),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    const notice = screen.getByText(pendingMessage)
    expect(notice).toHaveClass('alert-info')
    expect(notice).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('displays transaction execution errors', () => {
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x81b637d8fcd2c6dac59ee6963113a1170de795e4' },
      uiState: 'ERROR',
      txHash: '0xfailedhash',
      errorMessage: 'Transaction execution reverted on-chain.',
      orderState: null,
      ...orderControls(),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Transaction execution reverted on-chain.')).toBeInTheDocument()
  })

  it('does not select an existing order for a newly connected wallet', () => {
    const loadOrder = vi.fn()
    ;(useGenDispute as any).mockReturnValue({
      account: { address: '0x9999999999999999999999999999999999999999' },
      uiState: 'RETRY_AVAILABLE',
      txHash: '',
      errorMessage: '',
      orderState: null,
      ...orderControls(),
      loadOrder,
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      createOrder: vi.fn(),
      openDispute: vi.fn(),
      refreshOrder: vi.fn(),
      setUiState: vi.fn(),
      isRetrying: false,
      setIsRetrying: vi.fn(),
    })

    render(<App />)

    expect(screen.queryByText(/Order #/)).not.toBeInTheDocument()
    expect(screen.getByText('Create escrow order')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Order ID'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load order' }))
    expect(loadOrder).toHaveBeenCalledWith(7)
  })
})
