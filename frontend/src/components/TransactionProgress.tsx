import React from 'react'
import type { UIState } from '../types'

interface TransactionProgressProps {
  state: UIState
  errorMessage?: string
}

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  state,
  errorMessage,
}) => {
  const getStepStatus = (stepState: UIState) => {
    if (state === 'ERROR' && stepState === 'ERROR') return 'step-error'
    if (state === 'UNDETERMINED' && stepState === 'UNDETERMINED') return 'step-warning'

    const statesOrder: UIState[] = [
      'DISCONNECTED',
      'WALLET_CONNECTING',
      'RETRY_AVAILABLE',
      'SUBMITTING',
      'WAITING_FOR_CONSENSUS',
      'ACCEPTED',
      'FINALIZED',
      'PAID_OUT',
    ]

    const currentIndex = statesOrder.indexOf(state)
    const stepIndex = statesOrder.indexOf(stepState)

    if (state === 'ERROR' || state === 'UNDETERMINED') {
      if (stepState === 'SUBMITTING' || stepState === 'WAITING_FOR_CONSENSUS') {
        return 'step-completed'
      }
    }

    if (stepIndex < 0) return 'step-inactive'
    if (stepIndex < currentIndex) return 'step-completed'
    if (stepIndex === currentIndex) return 'step-active'
    return 'step-inactive'
  }

  return (
    <section className="progress-card" aria-label="Transaction progress" aria-live="polite">
      <div className="progress-header">
        <h3>Transaction</h3>
        <span className="progress-badge" title={state}>
          {state}
        </span>
      </div>

      <div className="steps-container">
        <div className={`step-item ${getStepStatus('WALLET_CONNECTING')}`}>
          <div className="step-number" aria-hidden="true">
            1
          </div>
          <div className="step-text">Connect wallet</div>
        </div>

        <div className={`step-item ${getStepStatus('SUBMITTING')}`}>
          <div className="step-number" aria-hidden="true">
            2
          </div>
          <div className="step-text">Submit transaction</div>
        </div>

        <div className={`step-item ${getStepStatus('WAITING_FOR_CONSENSUS')}`}>
          <div className="step-number" aria-hidden="true">
            3
          </div>
          <div className="step-text">Await consensus</div>
        </div>

        <div className={`step-item ${getStepStatus('ACCEPTED')}`}>
          <div className="step-number" aria-hidden="true">
            4
          </div>
          <div className="step-text">Accepted</div>
        </div>

        <div className={`step-item ${getStepStatus('FINALIZED')}`}>
          <div className="step-number" aria-hidden="true">
            5
          </div>
          <div className="step-text">Finalized</div>
        </div>
      </div>

      {state === 'ERROR' && errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginTop: 16 }}>
          {errorMessage}
        </div>
      )}

      {state === 'ACCEPTED' && errorMessage && (
        <div className="alert alert-info" role="status" style={{ marginTop: 16 }}>
          {errorMessage}
        </div>
      )}
    </section>
  )
}
