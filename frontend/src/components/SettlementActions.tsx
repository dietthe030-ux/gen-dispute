import React from 'react'
import type { OrderState } from '../types'

interface SettlementActionsProps {
  order: OrderState
  isBuyer: boolean
  isSeller: boolean
  isLoading: boolean
  onConfirmDelivery: () => void
  onRecoverExpired: () => void
}

export const SettlementActions: React.FC<SettlementActionsProps> = ({
  order,
  isBuyer,
  isSeller,
  isLoading,
  onConfirmDelivery,
  onRecoverExpired,
}) => {
  if (!isBuyer && !isSeller) return null
  if (order.status !== 'OPEN' && order.status !== 'UNDETERMINED') return null

  const expired = Math.floor(Date.now() / 1000) >= order.expiresAt

  return (
    <section className="card settlement-card" aria-labelledby="settlement-title">
      <h2 id="settlement-title" className="card-title">Settle escrow</h2>
      <p className="card-lede">
        Use the normal release after delivery, or recover an unresolved escrow after its deadline.
      </p>
      <div className="settlement-actions">
        {isBuyer && order.status === 'OPEN' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirmDelivery}
            disabled={isLoading}
          >
            Confirm delivery and pay seller
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline-warning"
          onClick={onRecoverExpired}
          disabled={isLoading || !expired}
        >
          Recover expired escrow
        </button>
      </div>
      {!expired && (
        <div className="input-help">
          Recovery unlocks at {new Date(order.expiresAt * 1000).toLocaleString()}.
        </div>
      )}
    </section>
  )
}
