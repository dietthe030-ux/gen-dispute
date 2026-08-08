import React, { useState } from 'react'

interface DisputeFormProps {
  onSubmit: (reason: string) => void
  isLoading: boolean
  attempts: number
  hasEvidenceReceipt?: boolean
}

export const DisputeForm: React.FC<DisputeFormProps> = ({ onSubmit, isLoading, attempts, hasEvidenceReceipt = true }) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const isRetry = attempts > 0

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.')
      return
    }
    onSubmit(reason)
  }

  return (
    <section className="card border-warning" aria-labelledby="dispute-form-title">
      <h2 id="dispute-form-title" className="card-title text-warning">
        {isRetry ? 'Retry dispute' : 'Open dispute'}
      </h2>
      <p className="card-lede">
        {isRetry
          ? 'One final evaluation after the evidence issuer registers a new receipt.'
          : !hasEvidenceReceipt
            ? 'No issuer receipt is registered. The contract will fail closed as UNDETERMINED and keep escrow locked.'
          : 'The contract evaluates the issuer-registered receipt for this order.'}
      </p>
      {isRetry && (
        <div className="alert alert-warning" role="status" style={{ marginBottom: 16 }}>
          Retry {attempts}/2. Escrow stays locked until a valid verdict.
        </div>
      )}
      <form onSubmit={submit} className="form-group" noValidate>
        <div className="input-group">
          <label htmlFor="dispute-reason">Reason</label>
          <textarea
            id="dispute-reason"
            name="reason"
            placeholder="What does not match the listing…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={3}
            maxLength={500}
            required
          />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" disabled={isLoading} className="btn btn-warning btn-block">
          {isLoading ? 'Submitting dispute…' : isRetry ? 'Submit retry' : 'Submit dispute'}
        </button>
      </form>
    </section>
  )
}
