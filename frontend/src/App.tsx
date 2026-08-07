import React from 'react'
import { useGenDispute } from './hooks/useGenDispute'
import { WalletConnect } from './components/WalletConnect'
import { CreateOrderForm } from './components/CreateOrderForm'
import { OrderStatus } from './components/OrderStatus'
import { DisputeForm } from './components/DisputeForm'
import { DisputeResult } from './components/DisputeResult'
import { TransactionProgress } from './components/TransactionProgress'
import { SiteHeader } from './components/SiteHeader'
import { OrderLookup } from './components/OrderLookup'
import { SettlementActions } from './components/SettlementActions'
import { EvidenceReceiptForm } from './components/EvidenceReceiptForm'

const App: React.FC = () => {
  const {
    account,
    uiState,
    txHash,
    errorMessage,
    orderState,
    selectedOrderId,
    orderCount,
    evidenceIssuer,
    isOrderLoading,
    connectWallet,
    disconnectWallet,
    createOrder,
    openDispute,
    registerEvidenceReceipt,
    confirmDelivery,
    recoverExpiredOrder,
    loadOrder,
    clearSelectedOrder,
    isRetrying,
    setIsRetrying,
  } = useGenDispute()

  const handleOrderCreate = async (
    buyer: string,
    listingUrl: string,
    listingSnapshot: string,
    description: string,
    amount: string,
    timeoutSeconds: number
  ) => {
    await createOrder(buyer, listingUrl, listingSnapshot, description, amount, timeoutSeconds)
  }

  const handleDisputeSubmit = async (reason: string) => {
    await openDispute(reason)
  }

  const isConnected = !!account
  const isSubmitting = uiState === 'SUBMITTING' || uiState === 'WAITING_FOR_CONSENSUS'
  const hasOrder = !!orderState

  const connectedAddress = account?.address
  const buyerAddress = orderState?.buyer
  const sellerAddress = orderState?.seller

  const isBuyer = !!(connectedAddress && buyerAddress && connectedAddress.toLowerCase() === buyerAddress.toLowerCase())
  const isSeller = !!(connectedAddress && sellerAddress && connectedAddress.toLowerCase() === sellerAddress.toLowerCase())
  const isEvidenceIssuer = !!(
    connectedAddress && evidenceIssuer && connectedAddress.toLowerCase() === evidenceIssuer.toLowerCase()
  )
  const hasFreshEvidenceReceipt = !!orderState?.evidenceReceiptUrl && (
    orderState.disputeAttempts === 0 ||
    orderState.evidenceReceiptUrl !== orderState.evidenceUrls.at(-1) ||
    orderState.evidenceReceiptSha256 !== orderState.evidenceHashes.at(-1)
  )

  const showProgress =
    isConnected &&
    (uiState === 'SUBMITTING' ||
      uiState === 'WAITING_FOR_CONSENSUS' ||
      uiState === 'ACCEPTED' ||
      uiState === 'FINALIZED' ||
      uiState === 'PAID_OUT' ||
      uiState === 'ERROR' ||
      uiState === 'UNDETERMINED' ||
      (uiState === 'RETRY_AVAILABLE' && !!txHash))

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <SiteHeader activePage="app" />

      <main id="main-content" className="grid-main">
        <h1 className="sr-only">GenDispute escrow application</h1>
        <aside className="col-sidebar" aria-label="Wallet and transaction status">
          <WalletConnect
            address={connectedAddress || null}
            uiState={uiState}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />

          {isConnected && orderState && (
            <div className="card role-info-card">
              <h2 className="card-title">Your role</h2>
              {isEvidenceIssuer ? (
                <div className="role-badge role-observer">Evidence issuer</div>
              ) : isBuyer ? (
                <div className="role-badge role-buyer">Buyer</div>
              ) : isSeller ? (
                <div className="role-badge role-seller">Seller</div>
              ) : (
                <div className="role-badge role-observer">Observer</div>
              )}
              <p className="role-desc">
                {isEvidenceIssuer
                  ? 'You can register a content-addressed receipt for this order.'
                  : isBuyer
                  ? 'You can confirm delivery or open a dispute while the order is open.'
                  : isSeller
                    ? 'You created this order. After the deadline, you can recover unresolved escrow.'
                    : 'This wallet is not a party to this order.'}
              </p>
            </div>
          )}

          {showProgress && (
            <TransactionProgress state={uiState} errorMessage={errorMessage} />
          )}

          {uiState === 'ERROR' && errorMessage && !showProgress && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}
        </aside>

        <div className="col-content">
          {!isConnected ? (
            <section className="card hero-card" aria-labelledby="welcome-heading">
              <h2 id="welcome-heading">Hold payment until the item checks out</h2>
              <p>
                Seller deposits GEN into escrow. An independent issuer binds evidence to one order.
                Validators settle a 0%, 50%, or 100% refund.
              </p>
              <ol className="hero-steps">
                <li>
                  <span>1</span>
                  Connect wallet on Studionet
                </li>
                <li>
                  <span>2</span>
                  Create escrow or open a dispute
                </li>
                <li>
                  <span>3</span>
                  Wait for consensus and payout
                </li>
              </ol>
              <button type="button" onClick={connectWallet} className="btn btn-primary btn-lg">
                Connect wallet
              </button>
            </section>
          ) : (
            <div className="order-workspace">
              <OrderLookup
                selectedOrderId={selectedOrderId}
                orderCount={orderCount}
                isLoading={isOrderLoading}
                onLoad={loadOrder}
                onCreateNew={clearSelectedOrder}
              />

              {!hasOrder ? (
                <CreateOrderForm onSubmit={handleOrderCreate} isLoading={isSubmitting} />
              ) : (
                <>
                  <OrderStatus order={orderState} />

                  <SettlementActions
                    order={orderState}
                    isBuyer={isBuyer}
                    isSeller={isSeller}
                    isLoading={isSubmitting}
                    onConfirmDelivery={confirmDelivery}
                    onRecoverExpired={recoverExpiredOrder}
                  />

                  {isEvidenceIssuer &&
                    ((orderState.status === 'OPEN' && !orderState.evidenceReceiptUrl) ||
                      (orderState.status === 'UNDETERMINED' && orderState.disputeAttempts < 2)) && (
                      <EvidenceReceiptForm
                        onSubmit={registerEvidenceReceipt}
                        isLoading={isSubmitting}
                        isRetry={orderState.status === 'UNDETERMINED'}
                      />
                    )}

                  {isBuyer &&
                    (orderState.status === 'OPEN' ||
                      (orderState.status === 'UNDETERMINED' && isRetrying)) &&
                    hasFreshEvidenceReceipt && (
                      <DisputeForm
                        onSubmit={async (reason) => {
                          setIsRetrying(false)
                          await handleDisputeSubmit(reason)
                        }}
                        isLoading={isSubmitting}
                        attempts={orderState.disputeAttempts}
                      />
                    )}

                  {isBuyer && orderState.status === 'OPEN' && !orderState.evidenceReceiptUrl && (
                    <div className="card alert-card info">
                      <h3>Waiting for evidence receipt</h3>
                      <p>The independent evidence issuer must register an order-bound receipt before a dispute can be evaluated.</p>
                    </div>
                  )}

                  {isBuyer && orderState.status === 'UNDETERMINED' && isRetrying && !hasFreshEvidenceReceipt && (
                    <div className="card alert-card info">
                      <h3>Waiting for replacement receipt</h3>
                      <p>The evidence issuer must register a new URL, hash, and nonce before the retry can be submitted.</p>
                    </div>
                  )}

                  {(orderState.status === 'RESOLVED' ||
                    orderState.status === 'PAID_OUT' ||
                    (orderState.status === 'UNDETERMINED' && !isRetrying)) && (
                    <DisputeResult
                      order={orderState}
                      txHash={txHash}
                      onRetry={() => {
                        setIsRetrying(true)
                      }}
                      canRetry={isBuyer && orderState.disputeAttempts < 2}
                    />
                  )}

                  {isSeller && orderState.status === 'OPEN' && (
                    <div className="card alert-card info">
                      <h3>Waiting on buyer</h3>
                      <p>
                        Escrow is locked in the contract. The buyer may open a dispute if the
                        item does not match the listing.
                      </p>
                    </div>
                  )}

                  {!isBuyer && !isSeller && !isEvidenceIssuer && (
                    <div className="card alert-card warning">
                      <h3>View only</h3>
                      <p>
                        Your address is not the buyer or seller on this order. You can inspect
                        state but cannot submit actions.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
