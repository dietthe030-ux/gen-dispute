import React from 'react'
import { CONTRACT_ADDRESS } from '../config/genlayer'

interface SiteHeaderProps {
  activePage: 'app' | 'docs'
}

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`

export const SiteHeader: React.FC<SiteHeaderProps> = ({ activePage }) => {
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="GenDispute home">
        <span className="brand-mark" aria-hidden="true">
          GD
        </span>
        <span className="brand-copy">
          <span className="brand-name">GenDispute</span>
          <span className="brand-sub">Evidence-led escrow on GenLayer</span>
        </span>
      </a>

      <nav className="site-nav" aria-label="Primary navigation">
        <a
          className={`site-nav-link${activePage === 'app' ? ' is-active' : ''}`}
          href="/"
          aria-current={activePage === 'app' ? 'page' : undefined}
        >
          App
        </a>
        <a
          className={`site-nav-link${activePage === 'docs' ? ' is-active' : ''}`}
          href="/docs"
          aria-current={activePage === 'docs' ? 'page' : undefined}
        >
          Docs
        </a>
      </nav>

      <div className="header-meta">
        <span className="network-chip" title="Chain ID 61999">
          Studionet
        </span>
        {CONTRACT_ADDRESS ? (
          <span className="contract-addr" title={CONTRACT_ADDRESS}>
            {shortAddress(CONTRACT_ADDRESS)}
          </span>
        ) : (
          <span className="contract-addr danger" title="Set VITE_CONTRACT_ADDRESS in .env">
            Contract not configured
          </span>
        )}
      </div>
    </header>
  )
}
