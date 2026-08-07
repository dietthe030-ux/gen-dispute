import React from 'react'
import type { OrderState } from '../types'

interface OrderStatusProps {
  order: OrderState
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ order }) => {
  const formatGen = (wei: bigint) => {
    return `${(Number(wei) / 1e18).toFixed(4)} GEN`
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'badge badge-success'
      case 'DISPUTE_PENDING':
        return 'badge badge-warning'
      case 'RESOLVED':
        return 'badge badge-info'
      case 'PAID_OUT':
        return 'badge badge-primary'
      case 'UNDETERMINED':
        return 'badge badge-danger'
      default:
        return 'badge badge-secondary'
    }
  }

  const statusHint = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Escrow locked. Buyer may open a dispute.'
      case 'DISPUTE_PENDING':
        return 'Dispute submitted. Waiting for consensus.'
      case 'RESOLVED':
        return 'Verdict recorded. Payout may follow.'
      case 'PAID_OUT':
        return 'Escrow distributed to buyer and seller.'
      case 'UNDETERMINED':
        return 'No payout. Buyer may retry once if attempts remain.'
      default:
        return ''
    }
  }

  return (
    <section className="card" aria-labelledby="order-status-title">
      <div className="card-header-flex">
        <div>
          <h2 id="order-status-title" className="card-title">
            Order #{order.orderId}
          </h2>
          {statusHint(order.status) && (
            <p className="card-lede">{statusHint(order.status)}</p>
          )}
        </div>
        <span className={getStatusClass(order.status)}>{order.status}</span>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <div className="status-label">Escrow</div>
          <div className="status-value highlight">{formatGen(order.escrowAmount)}</div>
        </div>

        <div className="status-item">
          <div className="status-label">Settlement deadline</div>
          <div className="status-value">{new Date(order.expiresAt * 1000).toLocaleString()}</div>
        </div>

        <div className="status-item">
          <div className="status-label">Dispute attempts</div>
          <div className="status-value">{order.disputeAttempts} / 2</div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Seller address</div>
          <div className="status-value code-font" title={order.seller}>
            {order.seller}
          </div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Buyer address</div>
          <div className="status-value code-font" title={order.buyer}>
            {order.buyer}
          </div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Listing</div>
          <div className="status-value">
            <a
              href={order.listingUrl}
              target="_blank"
              rel="noreferrer"
              className="external-link"
            >
              {order.listingUrl}
            </a>
          </div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Item description</div>
          <div className="status-value desc-text">{order.itemDescription}</div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Canonical item ID</div>
          <div className="status-value code-font">{order.itemId}</div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Frozen evidence policy SHA-256</div>
          <div className="status-value code-font" title={order.evidencePolicyHash}>
            {order.evidencePolicyHash}
          </div>
        </div>

        <div className="status-item full-width">
          <div className="status-label">Issuer-registered receipt</div>
          <div className="status-value code-font">
            {order.evidenceReceiptUrl ? (
              <a href={order.evidenceReceiptUrl} target="_blank" rel="noreferrer" className="external-link">
                {order.evidenceReceiptUrl}
              </a>
            ) : 'Not registered'}
          </div>
        </div>

        {order.evidenceReceiptUrl && (
          <>
            <div className="status-item full-width">
              <div className="status-label">Receipt SHA-256</div>
              <div className="status-value code-font">{order.evidenceReceiptSha256}</div>
            </div>
            <div className="status-item full-width">
              <div className="status-label">One-time evidence nonce</div>
              <div className="status-value code-font">{order.evidenceNonce}</div>
            </div>
            <div className="status-item full-width">
              <div className="status-label">Issuer observation time</div>
              <div className="status-value">
                {order.evidenceReceiptObservedAt
                  ? new Date(order.evidenceReceiptObservedAt * 1000).toISOString()
                  : 'Not recorded'}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
