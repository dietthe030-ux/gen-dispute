import React from 'react'

interface WalletConnectProps {
  address: string | null
  uiState: string
  onConnect: () => void
  onDisconnect: () => void
}

const formatAddress = (address: string) =>
  `${address.slice(0, 8)}…${address.slice(-6)}`

export const WalletConnect: React.FC<WalletConnectProps> = ({
  address,
  uiState,
  onConnect,
  onDisconnect,
}) => {
  const isConnecting = uiState === 'WALLET_CONNECTING'
  const isConnected = !!address

  return (
    <section className="wallet-card" aria-label="Wallet">
      <div className="wallet-header">
        <div className="wallet-title">Wallet</div>
        <div
          className={`wallet-status ${isConnected ? 'connected' : ''}`}
          aria-live="polite"
        >
          {isConnecting ? 'Connecting…' : isConnected ? 'Connected' : 'Not connected'}
        </div>
      </div>

      {isConnected ? (
        <div className="wallet-details">
          <div className="wallet-row">
            <div className="address-label">Account</div>
            <div className="address-value" title={address}>
              {formatAddress(address)}
            </div>
          </div>
          <div className="wallet-row">
            <div className="meta-label">Network</div>
            <div className="meta-value">Studionet · 61999</div>
          </div>
          <div className="wallet-actions">
            <button type="button" onClick={onDisconnect} className="btn btn-secondary btn-block">
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-details">
          <p className="wallet-prompt">
            Connect a wallet on GenLayer Studionet to create escrow or manage a dispute.
          </p>
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="btn btn-primary btn-block"
          >
            {isConnecting ? (
              <span className="spinner-container">
                <span className="spinner" aria-hidden="true" />
                Connecting…
              </span>
            ) : (
              'Connect account'
            )}
          </button>
        </div>
      )}
    </section>
  )
}
