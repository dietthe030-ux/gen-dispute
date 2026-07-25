import { useEffect } from 'react'
import { SiteHeader } from './components/SiteHeader'
import { CONTRACT_ADDRESS } from './config/genlayer'

const payoutTiers = [
  {
    tier: '0%',
    outcome: 'No material mismatch',
    detail: 'The item matches the listing. The seller receives the escrow.',
    className: 'tier-zero',
  },
  {
    tier: '50%',
    outcome: 'Partial mismatch',
    detail: 'The item identity matches, but important listing claims do not.',
    className: 'tier-partial',
  },
  {
    tier: '100%',
    outcome: 'Material mismatch',
    detail: 'The delivered item is fundamentally different. The buyer receives the escrow.',
    className: 'tier-full',
  },
]

export const DocsPage = () => {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = description?.content

    document.title = 'GenDispute Docs - Project and architecture'
    if (description) {
      description.content =
        'Learn how GenDispute uses GenLayer Intelligent Contracts, validator consensus, public evidence, and deterministic payout tiers.'
    }

    return () => {
      document.title = previousTitle
      if (description && previousDescription) {
        description.content = previousDescription
      }
    }
  }, [])

  return (
    <div className="app-container docs-shell">
      <a href="#docs-content" className="skip-link">
        Skip to documentation
      </a>

      <SiteHeader activePage="docs" />

      <main id="docs-content" className="docs-main">
        <section className="docs-hero" aria-labelledby="docs-title">
          <div className="docs-hero-copy">
            <span className="docs-kicker">Product documentation</span>
            <h1 id="docs-title">Escrow that waits for evidence.</h1>
            <p>
              GenDispute holds GEN in independent order escrows and lets validators settle
              item-not-as-described claims from public evidence.
            </p>
            <div className="docs-actions">
              <a className="btn btn-primary btn-lg" href="/">
                Open the app
              </a>
              <a
                className="btn btn-secondary btn-lg"
                href="https://docs.genlayer.com/developers"
                target="_blank"
                rel="noreferrer"
              >
                GenLayer developer docs
              </a>
            </div>
          </div>

          <div
            className="architecture-map"
            role="img"
            aria-label="Seller funds an intelligent contract. Buyer submits evidence. Validators reach consensus and the contract pays both parties."
          >
            <div className="architecture-map-head">
              <span>Settlement flow</span>
              <span className="architecture-network">Studionet 61999</span>
            </div>
            <div className="architecture-lane">
              <div className="architecture-node">
                <span className="architecture-node-code">SELLER</span>
                <strong>Deposit GEN</strong>
              </div>
              <span className="architecture-arrow" aria-hidden="true">
                →
              </span>
              <div className="architecture-node architecture-node-contract">
                <span className="architecture-node-code">CONTRACT</span>
                <strong>Lock escrow</strong>
              </div>
            </div>
            <div className="architecture-lane architecture-lane-reverse">
              <div className="architecture-node">
                <span className="architecture-node-code">BUYER</span>
                <strong>Submit evidence</strong>
              </div>
              <span className="architecture-arrow" aria-hidden="true">
                →
              </span>
              <div className="architecture-node">
                <span className="architecture-node-code">VALIDATORS</span>
                <strong>Reach consensus</strong>
              </div>
            </div>
            <div className="architecture-output">
              <span>Deterministic settlement</span>
              <strong>0% / 50% / 100%</strong>
            </div>
          </div>
        </section>

        <section className="docs-section docs-overview" aria-labelledby="overview-title">
          <div className="docs-section-copy">
            <h2 id="overview-title">Why GenDispute exists</h2>
            <p>
              Marketplace escrow protects payment, but traditional contracts cannot judge
              whether a delivered item matches a listing. GenDispute adds evidence-aware
              consensus while keeping custody and payout rules on-chain.
            </p>
          </div>
          <dl className="facts-strip">
            <div>
              <dt>Network</dt>
              <dd>GenLayer Studionet</dd>
            </div>
            <div>
              <dt>Asset</dt>
              <dd>GEN escrow</dd>
            </div>
            <div>
              <dt>Dispute attempts</dt>
              <dd>Maximum 2</dd>
            </div>
            <div>
              <dt>Decision model</dt>
              <dd>Validator consensus</dd>
            </div>
          </dl>
        </section>

        <section className="docs-section" aria-labelledby="workflow-title">
          <div className="docs-section-copy">
            <h2 id="workflow-title">From listing to settlement</h2>
            <p>Each action has one owner and one verifiable state transition.</p>
          </div>
          <div className="workflow-grid">
            <article>
              <h3>Create escrow</h3>
              <p>
                The seller names the buyer, locks the listing snapshot, deposits GEN, and
                receives an order ID.
              </p>
            </article>
            <article>
              <h3>Open by order ID</h3>
              <p>
                Any wallet may inspect a known order, while only its named participants can act.
              </p>
            </article>
            <article>
              <h3>Submit public evidence</h3>
              <p>The buyer provides a reason and public URLs when the delivered item differs.</p>
            </article>
            <article>
              <h3>Settle the escrow</h3>
              <p>Validators agree on a tier. The contract computes and emits the payout.</p>
            </article>
          </div>
        </section>

        <section className="docs-section technology-section" aria-labelledby="technology-title">
          <div className="technology-lead">
            <h2 id="technology-title">Built for verifiable judgment</h2>
            <p>
              The architecture separates semantic evaluation from deterministic guards,
              independent validator checks, custody, and payout arithmetic.
            </p>
          </div>
          <div className="technology-stack">
            <article>
              <span>Contract layer</span>
              <h3>Python Intelligent Contract</h3>
              <p>
                Stores multiple isolated orders, controls access, validates outcomes, and
                settles GEN.
              </p>
            </article>
            <article>
              <span>Consensus layer</span>
              <h3>GenLayer validators</h3>
              <p>
                Independently fetch the same public evidence, rerun the evaluation, and compare
                stable decision fields with the leader result.
              </p>
            </article>
            <article>
              <span>Application layer</span>
              <h3>React and genlayer-js</h3>
              <p>Connects the wallet, submits writes, tracks consensus, and reads order state.</p>
            </article>
          </div>
        </section>

        <section className="docs-section" aria-labelledby="tiers-title">
          <div className="docs-section-copy">
            <h2 id="tiers-title">Three bounded outcomes</h2>
            <p>
              Validators classify the mismatch. The contract maps that classification to fixed
              payout arithmetic.
            </p>
          </div>
          <div className="payout-matrix">
            {payoutTiers.map((item) => (
              <article key={item.tier} className={item.className}>
                <strong className="payout-tier">{item.tier}</strong>
                <h3>{item.outcome}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="docs-section security-section" aria-labelledby="security-title">
          <div className="security-intro">
            <h2 id="security-title">Designed around hostile evidence</h2>
            <p>Web content is treated as evidence, never as an instruction to the evaluator.</p>
          </div>
          <div className="security-checks">
            <article>
              <h3>Immutable listing context</h3>
              <p>The snapshot is fixed when the seller creates the order.</p>
            </article>
            <article>
              <h3>Buyer-only dispute access</h3>
              <p>Only the order buyer can submit evidence or use the retry.</p>
            </article>
            <article>
              <h3>Injection-aware evaluation</h3>
              <p>Instructions inside evidence pages are treated as untrusted content.</p>
            </article>
            <article>
              <h3>Independent validator check</h3>
              <p>
                Schema checks reject malformed output; validators also repeat the evidence task
                before a verdict can trigger payout.
              </p>
            </article>
          </div>
        </section>

        <section className="docs-section contract-section" aria-labelledby="contract-title">
          <div className="contract-reference">
            <h2 id="contract-title">Contract reference</h2>
            <p>
              The application reads the deployment configured for its current environment.
              Each deployment exposes independent orders numbered from zero. Confirm the shown
              address and its source revision in Explorer before signing.
            </p>
            <code>{CONTRACT_ADDRESS || 'Contract not configured'}</code>
          </div>
          <div className="method-reference" aria-label="Contract methods">
            <div>
              <code>create_order(...) -&gt; u256 order_id</code>
              <span>Payable seller write; appends an isolated order</span>
            </div>
            <div>
              <code>get_order_count() -&gt; int</code>
              <span>Public order count read</span>
            </div>
            <div>
              <code>get_order(order_id) -&gt; dict</code>
              <span>Public state read for one order</span>
            </div>
            <div>
              <code>open_dispute(order_id, ...) -&gt; None</code>
              <span>Buyer evidence write for one order</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="docs-footer">
        <span>GenDispute on GenLayer Studionet</span>
        <div>
          <a href="/">App</a>
          <a href="#docs-content">Back to top</a>
        </div>
      </footer>
    </div>
  )
}
