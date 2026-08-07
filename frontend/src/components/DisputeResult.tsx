import React from 'react'
import type { OrderState } from '../types'

interface DisputeResultProps {
  order: OrderState
  txHash: string
  onRetry: () => void
  canRetry: boolean
}

export const DisputeResult: React.FC<DisputeResultProps> = ({
  order,
  txHash,
  onRetry,
  canRetry,
}) => {
  const formatGen = (wei: bigint | null) => {
    if (wei === null) return '0.0000 GEN'
    return `${(Number(wei) / 1e18).toFixed(4)} GEN`
  }

  const isResolved = order.status === 'RESOLVED' || order.status === 'PAID_OUT'
  const isUndetermined = order.status === 'UNDETERMINED'

  if (!isResolved && !isUndetermined) return null

  const tierLabel =
    order.refundTier === 0
      ? '0% refund'
      : order.refundTier === 50
        ? '50% refund'
        : order.refundTier === 100
          ? '100% refund'
          : `${order.refundTier}% refund`

  const settlementLabel =
    order.outcome === 'BUYER_CONFIRMED'
      ? 'Delivery confirmed'
      : order.outcome === 'EXPIRED_RECOVERY'
        ? 'Expired escrow released'
        : tierLabel

  return (
    <section className="card" aria-labelledby="verdict-title">
      <h2 id="verdict-title" className="card-title">
        Verdict
      </h2>

      {isResolved ? (
        <div className="verdict-container">
          <div className="verdict-banner success" role="status">
            <div className="verdict-tier">{settlementLabel}</div>
            <div className="verdict-code">{order.outcome}</div>
          </div>

          <div className="payout-split">
            <h3>Payout split</h3>
            <div className="payout-row">
              <span>Buyer receives</span>
              <span className="payout-amount highlight">{formatGen(order.buyerPayout)}</span>
            </div>
            <div className="payout-row">
              <span>Seller receives</span>
              <span className="payout-amount highlight">{formatGen(order.sellerPayout)}</span>
            </div>
          </div>

          <div className="verdict-details">
            {order.disputeReason && (
              <div className="detail-item">
                <span className="detail-label">Dispute reason</span>
                <span className="detail-val">{order.disputeReason}</span>
              </div>
            )}
            {order.evidenceUrls.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Evidence</span>
                <span className="detail-val">
                  {order.evidenceUrls.map((url, idx) => (
                    <div key={idx}>
                      <a href={url} target="_blank" rel="noreferrer" className="external-link">
                        {url}
                      </a>
                    </div>
                  ))}
                </span>
              </div>
            )}
            {order.evidenceHashes.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Evidence SHA-256</span>
                <span className="detail-val code-font">{order.evidenceHashes.join('\n')}</span>
              </div>
            )}
            {order.evidenceCommitments.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Submission commitments</span>
                <span className="detail-val code-font">{order.evidenceCommitments.join('\n')}</span>
              </div>
            )}
            {order.evidenceObservedAt.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Observed at (UTC)</span>
                <span className="detail-val">
                  {order.evidenceObservedAt
                    .map((timestamp) => new Date(timestamp * 1000).toISOString())
                    .join('\n')}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="verdict-container">
          <div className="verdict-banner danger" role="status">
            <div className="verdict-tier">Undetermined</div>
            <div className="verdict-code">Escrow locked</div>
          </div>

          <div className="alert alert-danger" style={{ marginTop: 12 }}>
            No consensus or the result could not be validated. Funds were not moved.
          </div>

          {order.lastError && (
            <div className="error-box">
              <strong>Detail:</strong> {order.lastError}
            </div>
          )}

          {canRetry ? (
            <div className="retry-action">
              <p>One retry remains. Wait for the issuer to register a new receipt, then submit again.</p>
              <button type="button" onClick={onRetry} className="btn btn-warning btn-block">
                Prepare retry
              </button>
            </div>
          ) : (
            <div className="retry-action">
              <p className="text-muted">No retries left. Deadline recovery remains available.</p>
            </div>
          )}
        </div>
      )}

      {txHash && (
        <div className="tx-hash-container">
          <span className="tx-label">Transaction</span>
          <span className="tx-value code-font" title={txHash}>
            {txHash}
          </span>
        </div>
      )}
    </section>
  )
}
