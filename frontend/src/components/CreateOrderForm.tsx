import React, { useState } from 'react'
import { FIXTURE_REGISTRY } from '../hooks/useGenDispute'

interface CreateOrderFormProps {
  onSubmit: (
    buyer: string,
    listingUrl: string,
    listingSnapshot: string,
    description: string,
    amount: string,
    timeoutSeconds: number
  ) => void
  isLoading: boolean
}

export const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ onSubmit, isLoading }) => {
  const [buyer, setBuyer] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [description, setDescription] = useState('')
  const [listingSnapshot, setListingSnapshot] = useState('')
  const [amount, setAmount] = useState('1.5')
  const [timeoutSeconds, setTimeoutSeconds] = useState('604800')
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  const handleUrlChange = (url: string, presetKey = '') => {
    setListingUrl(url)
    setSelectedPreset(presetKey || url)
    if (FIXTURE_REGISTRY[url]) {
      setListingSnapshot(FIXTURE_REGISTRY[url])
      if (url.includes('rolex_v1')) {
        setDescription('Vintage Rolex watch including original box and papers')
      } else if (url.includes('rolex_v2')) {
        setDescription('Black Casio digital wristwatch')
      } else {
        setDescription('Vintage Rolex Submariner watch in excellent condition')
      }
    } else {
      setListingSnapshot('')
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!buyer.startsWith('0x') || buyer.length !== 42) {
      setError('Buyer address must be 0x plus 40 hex characters.')
      return
    }
    if (!listingUrl.startsWith('http://') && !listingUrl.startsWith('https://')) {
      setError('Listing URL must start with http:// or https://')
      return
    }
    if (!FIXTURE_REGISTRY[listingUrl]) {
      setError('Listing URL must be a registered test fixture.')
      return
    }
    if (description.trim().length < 5) {
      setError('Description must be at least 5 characters.')
      return
    }
    if (listingSnapshot !== FIXTURE_REGISTRY[listingUrl]) {
      setError('Listing snapshot no longer matches the registry.')
      return
    }
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setError('Escrow amount must be a positive number.')
      return
    }
    const timeout = Number(timeoutSeconds)
    if (!Number.isInteger(timeout) || timeout < 60 || timeout > 2592000) {
      setError('Settlement timeout must be between 60 and 2,592,000 seconds.')
      return
    }

    onSubmit(buyer, listingUrl, listingSnapshot, description, amount, timeout)
  }

  return (
    <section className="card" aria-labelledby="create-order-title">
      <div className="card-header-flex">
        <div>
          <h2 id="create-order-title" className="card-title">
            Create escrow order
          </h2>
          <p className="card-lede">
            Deposit GEN and lock buyer, listing, and item details on-chain.
          </p>
        </div>
      </div>

      <div className="preset-container">
        <span className="preset-label" id="listing-preset-label">
          Test listing
        </span>
        <div
          className="preset-buttons"
          role="group"
          aria-labelledby="listing-preset-label"
        >
          <button
            type="button"
            onClick={() => handleUrlChange('https://listing.url/rolex_v1', 'v1')}
            className={`btn btn-sm btn-outline-info${selectedPreset === 'v1' || listingUrl.includes('rolex_v1') ? ' is-selected' : ''}`}
            disabled={isLoading}
          >
            Rolex A (box & papers)
          </button>
          <button
            type="button"
            onClick={() => handleUrlChange('https://listing.url/rolex_v2', 'v2')}
            className={`btn btn-sm btn-outline-warning${selectedPreset === 'v2' || listingUrl.includes('rolex_v2') ? ' is-selected' : ''}`}
            disabled={isLoading}
          >
            Casio listing (Version B)
          </button>
          <button
            type="button"
            onClick={() => handleUrlChange('https://listing.url', 'std')}
            className={`btn btn-sm btn-outline-success${selectedPreset === 'std' || listingUrl === 'https://listing.url' ? ' is-selected' : ''}`}
            disabled={isLoading}
          >
            Standard listing
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="form-group" noValidate>
        <div className="input-group">
          <label htmlFor="buyer-addr">Buyer address</label>
          <input
            id="buyer-addr"
            name="buyer"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="0x…"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value.trim())}
            disabled={isLoading}
            required
            aria-describedby="buyer-help"
          />
          <div id="buyer-help" className="input-help">
            42-character Studionet address that can open a dispute.
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="listing-url">Listing URL</label>
          <input
            id="listing-url"
            name="listingUrl"
            type="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://listing.url/…"
            value={listingUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={isLoading}
            required
            aria-describedby="listing-help"
          />
          <div id="listing-help" className="input-help">
            Must match a fixture registered in the contract.
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="item-desc">Item description</label>
          <textarea
            id="item-desc"
            name="description"
            placeholder="Short summary of the item as sold…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            rows={2}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="listing-snapshot">Listing snapshot</label>
          <textarea
            id="listing-snapshot"
            name="listingSnapshot"
            placeholder="Loads from the fixture registry when the URL is valid…"
            value={listingSnapshot}
            readOnly
            disabled={isLoading}
            rows={3}
            required
            aria-describedby="snapshot-help"
          />
          <div id="snapshot-help" className="input-help">
            Stored permanently for dispute evaluation. Not editable.
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="escrow-amount">Escrow amount (GEN)</label>
          <input
            id="escrow-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            required
            aria-describedby="amount-help"
          />
          <div id="amount-help" className="input-help">
            Positive GEN amount deposited with create_order.
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="settlement-timeout">Settlement timeout (seconds)</label>
          <input
            id="settlement-timeout"
            name="timeoutSeconds"
            type="number"
            min="60"
            max="2592000"
            step="1"
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(e.target.value)}
            disabled={isLoading}
            required
            aria-describedby="timeout-help"
          />
          <div id="timeout-help" className="input-help">
            Defaults to 7 days. After expiry, either party can release locked funds back to the seller.
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
          {isLoading ? (
            <span className="spinner-container">
              <span className="spinner" aria-hidden="true" />
              Creating escrow…
            </span>
          ) : (
            'Deposit GEN and create order'
          )}
        </button>
      </form>
    </section>
  )
}
