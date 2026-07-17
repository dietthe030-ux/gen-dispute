# Project Roadmap

This roadmap reflects the state of GenDispute verified on July 17, 2026. It separates delivered evidence from future targets. It does not claim production adoption, a public frontend deployment, or live dispute settlement that has not been demonstrated.

## V1 Delivered

GenDispute is a GenLayer Studionet escrow prototype for item-not-as-described disputes. A seller locks native GEN for a named buyer and records a listing URL, an approved listing snapshot, and an item description. If the buyer disputes the delivery, the Intelligent Contract evaluates public evidence through GenLayer's nondeterministic execution and validator consensus, then applies one of three deterministic settlement tiers:

- 0% buyer refund when the delivered item matches the description.
- 50% buyer refund for a partial mismatch.
- 100% buyer refund for an identity or material mismatch.

### Delivered user flow

1. A user connects an EIP-1193 browser wallet.
2. The frontend checks or requests GenLayer Studionet, chain ID `61999` (`0xf22f`).
3. The seller enters the buyer address, a positive GEN amount, a registered listing URL, its matching snapshot, and an item description.
4. The frontend calls `create_order`; the contract locks the transferred GEN and exposes the resulting order through `get_order`.
5. The designated buyer can submit a reason and one or two public evidence URLs through `open_dispute`.
6. A leader execution fetches the evidence pages and proposes a structured verdict. Validators reject malformed, insufficient, unsupported, or internally contradictory results.
7. A valid consensus result assigns a 0%, 50%, or 100% buyer refund and transfers the complementary share to the seller.
8. An undetermined result leaves funds locked and permits one additional dispute attempt. The contract rejects a third attempt.

### Intelligent Contract role

The Python Intelligent Contract is the escrow holder, access-control boundary, order state machine, evidence evaluation coordinator, verdict validator, payout calculator, and transfer initiator. The listing snapshot is stored at order creation and is not re-fetched during dispute evaluation. Evidence page content is treated as untrusted data in the evaluation prompt, while the validator independently derives the permitted payout tier from the structured discrepancy fields.

### Frontend and contract integration

The React frontend uses `genlayer-js` on Studionet to:

- Read `get_order`.
- Submit payable `create_order` transactions.
- Submit `open_dispute` transactions.
- Prompt the wallet to switch or add Studionet.
- Track accepted consensus and continue polling for finalization.
- Render buyer, seller, and observer states from the connected address.
- Expose `/docs` for the project overview, architecture, technology, security model, payout tiers, and contract method reference.

The contract address is configured locally through the gitignored frontend environment file. The public example environment file remains address-free.

### Verified delivery evidence

| Area | Verified evidence |
| --- | --- |
| Contract source | `contracts/gen_dispute.py`; SHA-256 `1D635416D7507BBA2736C3CB7864B9733B5E5C6BFA66871F0818C8F1F5239C2C` for the reviewed local source. |
| Studionet contract | `0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8`, visible on the [GenLayer Studio Explorer](https://explorer-studio.genlayer.com/address/0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8). The Explorer reported the contract as finalized and showed two transactions at verification time. |
| Live Studionet transaction | [`create_order` transaction](https://explorer-studio.genlayer.com/tx/0x6d2ddeeaefb0ac249a9471d1b2d03f2df7e53a4f1c833678fbc6d9c49fa2d2ab): `FINALIZED`, consensus `Accepted`, execution `SUCCESS`, value `1.50 GEN`. |
| Current live contract state | A direct `get_order()` read returned `OPEN`, escrow amount `1.5 GEN`, seller `0x277bf20771129ae224042d23b0311c1ac5a9ac1b`, buyer `0x896ef52d620ea3ccda34b4e72a8e197974e4e39e`, zero dispute attempts, and no payout. |
| Contract tests | `gltest tests/test_gen_dispute.py`: 19 of 19 tests passed in the local GenVM test environment. The suite covers access control, listing validation, all payout tiers, payout recipients, retry behavior, malformed and contradictory verdicts, insufficient evidence, snapshot immutability, and fixture consistency. |
| Frontend tests | `npm test -- --run`: 24 of 24 tests passed across the application, documentation page, and transaction hook. |
| Frontend quality | `npm run lint` completed with no errors. `npm run build` completed successfully with TypeScript compilation and a Vite production bundle. |
| Routes | `/` and `/docs` returned HTTP 200 in local verification. Responsive checks covered 390 px, 768 px, and 1440 px widths without horizontal overflow. |

### Boundaries of the delivered version

- The verified Studionet evidence proves contract deployment and one successful live `create_order`. It does not prove that a live `open_dispute`, consensus verdict, or payout has completed on Studionet.
- The current contract instance holds one order. After `create_order`, a second order cannot be created on the same instance.
- Listing acceptance depends on a small hardcoded fixture registry. This is suitable for a controlled demonstration, not an open marketplace.
- There is no normal buyer-confirmation, seller-cancellation, timeout, emergency recovery, or administrative rescue path. Settlement currently requires a dispute, and two undetermined attempts can leave the escrow permanently locked.
- Evidence is accepted by URL. The current version does not provide content-addressed evidence, media authenticity checks, availability guarantees, privacy controls, or source reputation scoring.
- Contract tests use mocked web and LLM responses. Frontend tests mock the wallet and GenLayer client. These tests validate logic but are not a substitute for a multi-wallet Studionet end-to-end test.
- The reviewed local source hash is recorded above, but source-to-deployed-bytecode equivalence was not independently established from Explorer data.
- No public GenDispute GitHub repository was present under `dietthe030-ux` during verification.
- No GenDispute Vercel project or public production web URL was found. The frontend is build-ready but is not claimed as publicly deployed.
- The production build reports a non-blocking warning for a JavaScript chunk of approximately 608 kB before gzip.
- No real users, recurring usage, testimonials, partnerships, marketplace integrations, or production analytics have been verified.

## Target Users

### Primary users

- Buyers and sellers in small peer-to-peer transactions where payment should remain locked until an item-not-as-described risk is resolved.
- Collectible and specialty-item communities where listing details such as identity, condition, accessories, and provenance materially affect value.
- Marketplace builders exploring AI-assisted escrow without assigning the final outcome to a single centralized support agent.
- GenLayer developers who need a concrete reference for combining web evidence, nondeterministic execution, deterministic validation, and native asset settlement.

### User need and use context

These users need a settlement process that can reason about evidence that ordinary deterministic contracts cannot interpret. GenDispute is most valuable when the transaction terms can be captured before payment, the buyer can provide publicly accessible evidence, and both parties accept a predefined settlement policy.

The current version is appropriate for controlled demonstrations and technical pilots. It is not yet appropriate for high-value commerce because its single-order lifecycle, fixture registry, recovery limitations, and unverified production operations create material risk.

## Adoption Approach

No current user base or community adoption is claimed. The following is a proposed path to initial usage.

### Initial communities and channels

- GenLayer developer channels, hackathons, workshops, and demo sessions.
- Web3 marketplace builders evaluating Intelligent Contracts.
- Small collector communities willing to run low-value, supervised test transactions.
- Technical content showing how evidence validation changes the escrow design compared with a deterministic smart contract.

### Demo and onboarding

1. Present the `/docs` page before wallet connection so users understand roles, evidence requirements, payout tiers, and current limitations.
2. Run a guided two-wallet demonstration with separate seller and buyer accounts on Studionet.
3. Begin with fixture-backed examples for match, partial mismatch, full mismatch, and prompt-injection evidence.
4. Link each submitted transaction to Explorer and explain accepted consensus, finalization, and contract state.
5. Collect structured feedback after each step: wallet setup, order creation, evidence preparation, consensus wait, and outcome comprehension.

### Converting trials into continued use

- Publish a reproducible pilot guide with exact supported transaction types and risk disclosures.
- Provide transaction history, status notifications, and a clear recovery policy before asking users to return.
- Prioritize marketplace connectors only after a community demonstrates repeated use of the same listing and evidence workflow.
- Use pilot completion and failure data to decide whether to broaden supported item categories or settlement policies.

## Planned Integrations

All integrations in this section are proposals, not delivered capabilities.

| Integration | Why it is needed | Product and architecture impact | Conditions for implementation |
| --- | --- | --- | --- |
| Content-addressed listing storage such as IPFS or Arweave | The hardcoded fixture registry does not scale and does not independently preserve arbitrary marketplace terms. | Store a content hash or immutable URI at order creation; update the validator to compare evidence against the preserved listing artifact rather than a local registry entry. | Define a canonical snapshot schema, gateway fallback policy, maximum document size, and content availability tests. |
| Marketplace listing APIs or signed seller feeds | Manual fixture selection cannot support real inventory or establish listing provenance. | Add an adapter layer that normalizes marketplace fields and records a signed or hashed snapshot before escrow funding. | Obtain API permission, document rate limits and terms, map supported fields, and define behavior when a listing changes or disappears. |
| Evidence storage and attestation services | Public URLs can change, expire, or expose sensitive information. | Add immutable evidence references, upload metadata, timestamping, and optional third-party attestations while keeping raw content out of contract storage where appropriate. | Complete privacy and retention design, choose supported media types, set size limits, and validate that GenLayer validators can access the evidence reliably. |
| WalletConnect-compatible multi-wallet support | The frontend currently depends on `window.ethereum`, which narrows wallet and mobile coverage. | Introduce a wallet adapter layer while preserving the existing `genlayer-js` account and Studionet transaction flow. | Confirm wallet support for chain ID 61999, test add/switch-network behavior, and pass multi-browser and mobile signing tests. |
| Explorer and transaction observability | Users need independent evidence for transaction state and actionable diagnostics when consensus or finalization is delayed. | Add direct Explorer links, structured receipt logging, error categorization, and privacy-preserving operational telemetry. | Define the stable Explorer URL scheme, telemetry consent policy, event schema, and retention controls. |
| Notification provider | Consensus and finalization can outlast a browser session. | Add opt-in email, push, or messaging notifications driven by indexed contract state rather than browser-only polling. | Establish a reliable indexer, verify event delivery, protect contact data, and define retry and opt-out behavior. |
| Pilot marketplace or collector community | A bounded real workflow is necessary to validate whether the dispute policy matches user expectations. | Add category-specific listing fields, evidence guidance, and possibly a configurable policy module without weakening deterministic payout validation. | Secure an explicit pilot agreement, complete safety review, cap transaction value, publish support and recovery procedures, and obtain informed participant consent. |

## Success Metrics

The current evidence column contains only verified observations. Targets are proposed pilot exit criteria and are not current results.

| Metric | Current evidence | Future target | Measurement method |
| --- | --- | --- | --- |
| Contract test reliability | 19 of 19 local contract tests passed. | 100% pass rate for all invariant and regression tests on every release candidate. | CI logs using the pinned GenLayer test environment. |
| Frontend quality | 24 of 24 tests passed; lint and production build succeeded. | 100% required checks passing on every main-branch change. | CI status for tests, lint, typecheck, and build. |
| Live transaction evidence | One verified `create_order` finalized successfully on Studionet. This is not a statistically meaningful success rate. | At least 20 finalized pilot order creations and 10 finalized disputes, including at least two examples of each payout tier after lifecycle hardening. | Explorer-indexed transactions matched to anonymized pilot session IDs. |
| Transaction finalization rate | No complete attempt denominator is available. | At least 95% of wallet-approved submissions reach successful finalization; user-rejected wallet prompts are reported separately. | Frontend telemetry reconciled with Explorer receipts. |
| End-to-end completion | No production analytics and no verified live dispute completion. | At least 70% of guided pilot participants who connect a wallet complete their intended supported flow. | Consent-based funnel events from wallet connection through finalized outcome. |
| Consensus reliability | Local tests cover valid and invalid verdicts; no live dispute sample exists. | At least 90% of valid pilot disputes resolve on the first attempt, with no unsupported payout tier accepted. | Contract state and transaction review by dispute attempt and validator outcome. |
| Fund safety | No live payout has been verified; one 1.5 GEN escrow remains open. | Zero unrecoverable fund-loss incidents in the pilot and a documented recovery path for every non-terminal state. | State-machine monitoring, incident register, and balance reconciliation. |
| Initial reach | No verified users or community adoption. | 25 distinct qualified pilot wallets and at least 10 participants completing a second supported transaction within 30 days. | Unique wallet counts and cohort analysis, excluding test automation and team wallets. |
| Integration progress | Studionet, an EIP-1193 wallet, and `genlayer-js` are integrated; no marketplace or evidence-storage integration is live. | Two additional integrations operating in the pilot with automated health checks. | Integration-specific test suites, uptime checks, and successful production calls. |
| Frontend performance | Production build succeeds, but the main JavaScript chunk is approximately 608 kB before gzip and no field performance baseline exists. | Remove the build-size warning and achieve a p75 Largest Contentful Paint below 2.5 seconds on the agreed mobile test profile. | Bundle analysis, Lighthouse CI, and consent-based web-vitals reporting after deployment. |

## Future Updates

### Phase 1: Escrow Lifecycle and Safety Hardening

- **Problem:** The contract supports one order per deployment, requires a dispute to release funds, and can leave funds locked after repeated undetermined results.
- **User value:** Parties gain a complete, understandable escrow lifecycle and a defined recovery path before using meaningful value.
- **Planned changes:** Introduce order identifiers and multi-order storage; add buyer confirmation, pre-acceptance cancellation rules, deadlines, timeout settlement, and a narrowly specified recovery mechanism; formalize every terminal and non-terminal state; expand property and integration tests.
- **Related integrations:** Explorer observability and an event indexer.
- **Conditions:** Approve a revised state-machine specification, define authority and timeout policy, complete adversarial review, deploy a new contract instance, and migrate the frontend only after test and source verification.
- **Success indicators:** Full state-transition test coverage, zero unreachable states in model tests, successful supervised timeout and recovery scenarios, and no unreconciled balances.

### Phase 2: Evidence Integrity and Listing Interoperability

- **Problem:** The fixture registry and mutable public URLs limit real-world applicability and evidence reliability.
- **User value:** Users can preserve authentic marketplace terms and submit durable evidence without relying on demonstration-only URLs.
- **Planned changes:** Define a versioned listing schema; store content hashes or immutable URIs; add marketplace adapters; support evidence metadata, timestamps, content-addressed media, and source-availability checks; strengthen prompt-injection and malformed-content tests.
- **Related integrations:** IPFS or Arweave, marketplace APIs, and optional evidence attestation providers.
- **Conditions:** Select storage and gateway providers, complete privacy review, obtain API access, define file and category limits, and demonstrate reliable validator retrieval.
- **Success indicators:** Snapshot verification succeeds for at least 99% of valid pilot listings, no accepted verdict references mutated evidence, and adapter contract tests pass against recorded provider fixtures.

### Phase 3: Production Frontend and Operations

- **Problem:** The frontend is not publicly deployed, has no production telemetry or notifications, supports only injected EIP-1193 wallets, and ships a large primary JavaScript chunk.
- **User value:** Users receive a reliable public interface, broader wallet access, better transaction visibility, and recoverable sessions.
- **Planned changes:** Create the dedicated GitHub repository, establish CI, deploy through the verified Vercel account linked to `dietthe030-ux`, add Explorer links, introduce WalletConnect-compatible adapters, add opt-in notifications and privacy-preserving analytics, persist non-sensitive transaction context, and split large bundles.
- **Related integrations:** GitHub Actions, Vercel, WalletConnect-compatible wallets, Explorer, telemetry, and notification services.
- **Conditions:** Verify repository ownership, Git author, active GitHub account, linked Vercel user/team, environment variables, privacy policy, and the intended contract address before production deployment.
- **Success indicators:** All deployment checks pass, `/` and `/docs` work on direct navigation, at least 95% successful wallet-approved transaction finalization, no exposed secrets, and the agreed performance target is met.

### Phase 4: Controlled Marketplace Pilot

- **Problem:** Technical correctness alone does not establish that the dispute categories, evidence burden, and payout policy match real user expectations.
- **User value:** A bounded pilot validates the process with real workflows while limiting financial and operational risk.
- **Planned changes:** Select one item category, publish evidence standards and transaction caps, train pilot users, add category-specific guidance, review every dispute outcome, and iterate only through versioned policy changes.
- **Related integrations:** One approved marketplace or collector community, support tooling, and operational reporting.
- **Conditions:** Complete Phases 1 through 3, conduct security review, define participant support and incident response, obtain community agreement, and fund operational monitoring.
- **Success indicators:** Meet the pilot targets in the Success Metrics section, record zero unrecoverable fund-loss incidents, document outcome agreement and disagreement rates, and make an evidence-based decision on expansion.

### Phase 5: Protocol Readiness

- **Problem:** Scaling beyond a controlled pilot requires independent security assurance, stable governance, and configurable policies without weakening deterministic settlement guarantees.
- **User value:** Marketplaces can evaluate GenDispute as infrastructure rather than a single demonstration contract.
- **Planned changes:** Commission an independent contract and frontend security review; version settlement policies; define upgrade and migration rules; add rate and abuse controls; publish an integration SDK and operational runbook; evaluate whether fees, bonds, or appeals are justified by pilot evidence.
- **Related integrations:** Security auditors, developer tooling, indexers, and approved ecosystem partners.
- **Conditions:** Demonstrated pilot demand, stable lifecycle and evidence schemas, budget for audit and operations, and explicit governance ownership.
- **Success indicators:** No unresolved critical audit findings, at least two independently operated integrations, documented upgrade compatibility, and reliability metrics sustained over an agreed evaluation period.
