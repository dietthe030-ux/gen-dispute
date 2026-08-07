import React, { useState } from 'react'

interface EvidenceReceiptFormProps {
  onSubmit: (url: string, sha256: string, nonce: string, observedAt: number) => void
  isLoading: boolean
  isRetry: boolean
}

export const EvidenceReceiptForm: React.FC<EvidenceReceiptFormProps> = ({ onSubmit, isLoading, isRetry }) => {
  const [url, setUrl] = useState('')
  const [sha256, setSha256] = useState('')
  const [nonce, setNonce] = useState('')
  const [observedAt, setObservedAt] = useState(() => Math.floor(Date.now() / 1000).toString())
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!url.startsWith('https://gen-dispute.vercel.app/fixtures/')) {
      setError('Receipt URL must use the trusted GenDispute fixture origin.')
      return
    }
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      setError('Enter the lowercase 64-character SHA-256 of the receipt bytes.')
      return
    }
    if (!nonce.trim()) {
      setError('Evidence nonce is required.')
      return
    }
    const observedAtValue = Number(observedAt)
    if (!Number.isSafeInteger(observedAtValue) || observedAtValue <= 0) {
      setError('Observation time must be a Unix timestamp in seconds.')
      return
    }
    onSubmit(url, sha256, nonce.trim(), observedAtValue)
  }

  return (
    <section className="card border-warning" aria-labelledby="receipt-form-title">
      <h2 id="receipt-form-title" className="card-title text-warning">
        {isRetry ? 'Register replacement receipt' : 'Register evidence receipt'}
      </h2>
      <p className="card-lede">
        Evidence issuer only. The receipt body must contain this order ID, canonical item ID,
        and the same one-time nonce.
      </p>
      <form onSubmit={submit} className="form-group" noValidate>
        <div className="input-group">
          <label htmlFor="receipt-url">Receipt URL</label>
          <input id="receipt-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={isLoading} required />
        </div>
        <div className="input-group">
          <label htmlFor="receipt-sha256">Receipt SHA-256</label>
          <input id="receipt-sha256" className="code-font" value={sha256} onChange={(e) => setSha256(e.target.value)} disabled={isLoading} maxLength={64} required />
        </div>
        <div className="input-group">
          <label htmlFor="receipt-nonce">One-time evidence nonce</label>
          <input id="receipt-nonce" className="code-font" value={nonce} onChange={(e) => setNonce(e.target.value)} disabled={isLoading} maxLength={96} required />
        </div>
        <div className="input-group">
          <label htmlFor="receipt-observed-at">Observed at (Unix seconds)</label>
          <input id="receipt-observed-at" type="number" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} disabled={isLoading} required />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" disabled={isLoading} className="btn btn-warning btn-block">
          {isLoading ? 'Registering receipt…' : 'Register receipt'}
        </button>
      </form>
    </section>
  )
}
