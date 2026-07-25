import React, { useState } from 'react'
import { getEvidencePreset, type EvidencePresetType } from './evidencePresets'

interface DisputeFormProps {
  onSubmit: (reason: string, evidenceUrl1: string, evidenceUrl2: string) => void
  isLoading: boolean
  attempts: number
  listingUrl: string
}

export const DisputeForm: React.FC<DisputeFormProps> = ({
  onSubmit,
  isLoading,
  attempts,
  listingUrl,
}) => {
  const [reason, setReason] = useState('')
  const [evidenceUrl1, setEvidenceUrl1] = useState('')
  const [evidenceUrl2, setEvidenceUrl2] = useState('')
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  const applyPreset = (presetType: EvidencePresetType) => {
    const origin = window.location.origin
    const preset = getEvidencePreset(listingUrl, presetType)
    setSelectedPreset(presetType)
    setReason(preset.reason)
    setEvidenceUrl1(`${origin}/fixtures/${preset.fixture}`)
    setEvidenceUrl2('')
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.')
      return
    }
    if (!evidenceUrl1.startsWith('http://') && !evidenceUrl1.startsWith('https://')) {
      setError('Evidence URL 1 must start with http:// or https://')
      return
    }
    if (evidenceUrl2 && !evidenceUrl2.startsWith('http://') && !evidenceUrl2.startsWith('https://')) {
      setError('Evidence URL 2 must start with http:// or https://')
      return
    }

    onSubmit(reason, evidenceUrl1, evidenceUrl2)
  }

  const isRetry = attempts > 0

  return (
    <section className="card border-warning" aria-labelledby="dispute-form-title">
      <div className="card-header-flex">
        <div>
          <h2 id="dispute-form-title" className="card-title text-warning">
            {isRetry ? 'Retry dispute' : 'Open dispute'}
          </h2>
          <p className="card-lede">
            {isRetry
              ? 'One final evaluation with updated reason and evidence.'
              : 'Claim the item does not match the listing. Evidence must be public URLs.'}
          </p>
        </div>
      </div>

      {isRetry && (
        <div className="alert alert-warning" role="status" style={{ marginBottom: 16 }}>
          Retry {attempts}/2. Escrow stays locked until a valid verdict.
        </div>
      )}

      <div className="preset-container">
        <span className="preset-label" id="evidence-preset-label">
          Test evidence for {listingUrl.includes('rolex_v2') ? 'the Casio listing' : 'the Rolex listing'}
        </span>
        <div
          className="preset-buttons"
          role="group"
          aria-labelledby="evidence-preset-label"
        >
          <button
            type="button"
            onClick={() => applyPreset('match')}
            className={`btn btn-sm btn-outline-success${selectedPreset === 'match' ? ' is-selected' : ''}`}
          >
            Match (0%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('partial')}
            className={`btn btn-sm btn-outline-warning${selectedPreset === 'partial' ? ' is-selected' : ''}`}
          >
            Partial (50%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('mismatch')}
            className={`btn btn-sm btn-outline-danger${selectedPreset === 'mismatch' ? ' is-selected' : ''}`}
          >
            Mismatch (100%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('injection')}
            className={`btn btn-sm btn-outline-secondary${selectedPreset === 'injection' ? ' is-selected' : ''}`}
          >
            Injection
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="form-group" noValidate>
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
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="evidence-1">Evidence URL 1</label>
          <input
            id="evidence-1"
            name="evidence1"
            type="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://…/fixture_evidence_….html"
            value={evidenceUrl1}
            onChange={(e) => setEvidenceUrl1(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="evidence-2">Evidence URL 2 (optional)</label>
          <input
            id="evidence-2"
            name="evidence2"
            type="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://…"
            value={evidenceUrl2}
            onChange={(e) => setEvidenceUrl2(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn btn-warning btn-block">
          {isLoading ? (
            <span className="spinner-container">
              <span className="spinner" aria-hidden="true" />
              Submitting dispute…
            </span>
          ) : isRetry ? (
            'Submit retry'
          ) : (
            'Submit dispute'
          )}
        </button>
      </form>
    </section>
  )
}
