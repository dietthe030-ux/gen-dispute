import React, { useEffect, useState } from 'react'

interface OrderLookupProps {
  selectedOrderId: number | null
  orderCount: number | null
  isLoading: boolean
  onLoad: (orderId: number) => Promise<void>
  onCreateNew: () => void
}

export const OrderLookup: React.FC<OrderLookupProps> = ({
  selectedOrderId,
  orderCount,
  isLoading,
  onLoad,
  onCreateNew,
}) => {
  const [value, setValue] = useState(
    selectedOrderId === null ? '' : String(selectedOrderId)
  )

  useEffect(() => {
    setValue(selectedOrderId === null ? '' : String(selectedOrderId))
  }, [selectedOrderId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d+$/.test(value)) return
    await onLoad(Number(value))
  }

  return (
    <section className="card order-lookup" aria-labelledby="order-lookup-title">
      <div className="order-lookup-copy">
        <h2 id="order-lookup-title" className="card-title">
          Find an order
        </h2>
        <p className="card-lede">
          Enter an order ID to inspect its escrow. Orders are not selected from your wallet
          automatically.
        </p>
        {orderCount !== null && (
          <span className="order-count">
            {orderCount === 0 ? 'No orders yet' : `${orderCount} order${orderCount === 1 ? '' : 's'} on this contract`}
          </span>
        )}
      </div>

      <form className="order-lookup-form" onSubmit={submit}>
        <label htmlFor="order-id">Order ID</label>
        <div className="order-lookup-actions">
          <input
            id="order-id"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !/^\d+$/.test(value)}
          >
            {isLoading ? 'Loading…' : 'Load order'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCreateNew}
            disabled={isLoading}
          >
            Create new
          </button>
        </div>
      </form>
    </section>
  )
}
