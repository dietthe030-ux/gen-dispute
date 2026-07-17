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
      </div>
    </section>
  )
}
