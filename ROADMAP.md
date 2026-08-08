# Project Roadmap

This roadmap reflects source, local verification, and the replacement Studionet deployment reviewed on August 8, 2026. It claims no users, traction, or partnerships. Full replacement workflow verification and the matching public frontend release remain in progress.

## V1 Delivered

GenDispute is a GenLayer Studionet escrow prototype for item-not-as-described disputes. A seller creates an isolated order, names the buyer, records a fixture-backed listing snapshot, and deposits native GEN. A separate on-chain evidence issuer registers one hash-pinned receipt for the exact order; the buyer submits only a reason. The Intelligent Contract restricts the decision to a 0%, 50%, or 100% buyer refund, calculates complementary payouts, and emits native GEN transfers after consensus.

The remediation build includes:

- deterministic deposit, participant, state, retry, duplicate-action, and URL guards;
- explicit multi-order storage and order-ID reads;
- exact frontend decoding of the ID returned by `create_order`, independent of the global order count;
- issuer-only receipt registration that binds the exact order, canonical item policy, SHA-256, observation time, and globally unique nonce through a signed transaction;
- exact HTTPS evidence retrieval with `gl.nondet.web.get`, followed by order ID, item ID, publisher ID, nonce, observation-window, and byte-hash validation;
- structured semantic evaluation with `gl.nondet.exec_prompt`;
- independent validator retrieval and reevaluation of the same evidence;
- consensus comparison over `reason_code`, `refund_tier`, `evidence_sufficient`, and exact SHA-256 evidence-byte hashes, with schema and internal-consistency checks as supplemental guards;
- canonical on-chain policy and submission commitments retained separately for both allowed dispute attempts;
- bounded attestation extraction that excludes raw HTML and buyer-authored reasons from the LLM prompt;
- buyer-confirmed normal release, explicit order deadlines, and participant-triggered expired-order recovery;
- a Root Slot upgrader registered at deployment, with authorization and non-empty-code guards;
- React 19, TypeScript, Vite, `genlayer-js`, EIP-6963 injected-wallet discovery, and an EIP-1193 fallback;
- a reason-only buyer dispute form with no payout or evidence selection, plus a separate evidence-issuer registration form;
- explicit wallet selection, explicit order lookup, buyer/seller/evidence-issuer/observer roles, mandatory per-connect wallet signatures, account-change disconnection, transaction progress, receipt execution checks, and error states; and
- `/docs`, root and frontend setup documentation, contract tests, and frontend tests.

### Verified evidence

| Area | Evidence |
| --- | --- |
| Public source | [dietthe030-ux/gen-dispute](https://github.com/dietthe030-ux/gen-dispute) contains the reviewed contract, frontend, tests, and documentation. |
| Local contract verification | 47/47 tests pass, covering issuer authorization, cross-order replay rejection, buyer outcome-selection rejection, order/item/time/nonce/hash binding, hostile inputs, independent verdict checks, commitments, deadlines, release, recovery, and Root Slot authorization. |
| Local frontend verification | 42/42 tests pass, including explicit provider selection, terminal-state reconciliation after transient RPC polling failure, settled-order action messaging, concurrent returned-order decoding, mandatory reconnect signatures, live-shaped post-quorum receipt handling, issuer-registration calldata, and proof that the buyer UI exposes neither outcome presets nor evidence URL inputs; Oxlint, TypeScript compilation, and the Vite production build pass. |
| Current public release | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) targets the replacement contract and exposes the remediation frontend. The older [`0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE`](https://explorer-studio.genlayer.com/address/0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE) deployment remains historical V1 evidence only. |
| Replacement deployment | [`0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d`](https://explorer-studio.genlayer.com/address/0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d) is deployed from the approved source; full live workflow verification is in progress. |

### Current limitations

Other current limitations are:

- Listing creation is limited to a small hardcoded fixture registry; the listing URL itself is not fetched.
- Evidence is limited to project-hosted, byte-hash-pinned demo attestations. The deployment wallet authenticates registrations and is contractually distinct from the parties, but it is not an external logistics or marketplace provider. Exact bytes are not stored permanently.
- Packaged demonstration receipts are bound to order `0`; every later order requires a newly published issuer receipt with its own order ID and nonce.
- The production evidence covers one supervised 100% material-mismatch refund; the 0% and 50% tiers have not been exercised live.
- A separate previous test instance contains two funded orders and three undetermined attempts; that state does not migrate to production.
- There is no mutual cancellation path. Expired recovery returns the seller-funded escrow to the seller.
- Local contract tests mock web and model results; frontend tests mock the wallet and SDK.
- The Vite production build reports a non-blocking large-chunk warning.
- The prototype has not received a production security audit and is not presented as ready for high-value commerce.

## Target Users

The initial target users are buyers and sellers performing supervised, low-value peer-to-peer transactions where item identity, condition, or included accessories matter. A second target group is marketplace and GenLayer developers evaluating how evidence-aware consensus can be combined with on-chain custody and bounded settlement.

Their need is not merely fund storage. They need a decision process that can inspect public evidence without granting one marketplace administrator or one hosted LLM API sole authority over the verdict. GenDispute is currently suitable for demonstrations and controlled pilots, not unsupervised production commerce.

## Adoption Approach

No existing user base or partner community is claimed. The proposed first-user approach is:

1. Run supervised demonstrations in GenLayer developer communities, hackathons, and marketplace-builder sessions.
2. Use separate seller, buyer, evidence-issuer, and observer wallets to demonstrate explicit order lookup, signed per-order receipt registration, replay rejection, consensus progress, and each bounded payout tier.
3. Show the `/docs` route before signing so participants understand evidence hashing, payout bounds, normal release, and deadline recovery.
4. Link every demonstration write to Explorer and distinguish wallet approval, `ACCEPTED`, `FINALIZED`, and successful GenVM execution.
5. Collect structured feedback on wallet setup, evidence preparation, wait time, verdict clarity, and locked-fund recovery expectations.

Trial users should be invited back only after they can complete the flow without operator correction and the contract has a documented completion and recovery policy.

## Planned Integrations

All integrations below are proposals, not delivered features.

| Integration | Why and user value | Architecture impact | Conditions |
| --- | --- | --- | --- |
| IPFS, Arweave, or another content-addressed store | Preserves listing terms and evidence used in a verdict. | Store canonical hashes or immutable URIs; add retrieval, size, and fallback policies. | Provider selection, privacy review, validator retrieval tests, and a versioned content schema. |
| Signed marketplace listing feeds | Reduces manual entry and gives the snapshot verifiable provenance. | Add adapters that normalize and bind signed listing fields to an order. | API permission, signature policy, rate-limit handling, and update/deletion rules. |
| External signed evidence providers | Replaces the deployment-wallet demo issuer with a logistics, inspection, or marketplace authority without accepting buyer-controlled pages. | Configure or upgrade the issuer key and retain the current order, time, nonce, and hash binding. | Provider selection, key rotation, schema versioning, privacy review, and validator availability. |
| WalletConnect-compatible wallet layer | Expands supported desktop and mobile wallets. | Replace direct injected-provider assumptions with a tested wallet abstraction. | Confirm Studionet support and pass connect, switch, rejection, and account-change tests. |
| Explorer/indexer and notifications | Lets users leave the page while consensus continues and later recover transaction context. | Index order state, receipt status, and opt-in notifications without making the indexer authoritative. | Stable APIs, privacy-preserving event schema, monitoring, and delivery retry policy. |
| Bounded marketplace or collector pilot | Tests whether evidence requirements and payout tiers match a real category. | Add category-specific listing fields, caps, evidence guidance, and support procedures. | Explicit partner agreement, risk limits, incident ownership, and prior lifecycle hardening. |

## Success Metrics

Current evidence is separated from future targets.

| Metric | Current evidence | Future target | Measurement |
| --- | --- | --- | --- |
| Contract regression reliability | 47/47 local tests pass. | All required checks pass for every release candidate. | Pinned CI logs and reviewed GenVM test output. |
| Frontend regression reliability | 42/42 tests, lint, and build pass. | All required checks pass on every main-branch change. | CI test, lint, typecheck, and build results. |
| Source-to-deployment integrity | Replacement deployed source SHA-256 exactly matches the approved local contract source; upgrader and evidence-issuer readbacks match the selected wallet. | Preserve source/address alignment for every release. | Commit hash, deployment transaction, Explorer source, and production environment review. |
| Transaction success | The replacement deployment, first `create_order`, receipt registration, and 100% material-mismatch dispute finalized with successful decisive executions and majority agreement; this sample is too small for a reliability rate. | At least 95% of wallet-approved supervised writes finalize with accepted consensus, excluding user rejection. | Reconcile frontend submissions with Explorer receipts and execution results. |
| End-to-end dispute completion | Replacement order `0` is `PAID_OUT` with a verified 100% buyer refund after issuer-bound evidence evaluation. Historical V1 contains a separate 100% refund example. | At least 10 supervised finalized disputes after lifecycle hardening, including evidence for every supported tier. | Explorer transactions and post-transaction contract-state reconciliation. |
| Order selection correctness | A concurrent-creation regression proves that the app uses the returned ID even when the global count advances to 12. | Zero incorrect post-create selections during the pilot. | Return-trace decoding tests and consent-based pilot issue logs. |
| Fund safety | Replacement order `0` records buyer payout `0.1 GEN`, seller payout `0`, and terminal `PAID_OUT` state. Historical V1 has a zero contract balance; a separate test instance still holds `0.20 GEN` across two open orders. | Zero unreconciled production balances and a documented result for every terminal and recovery state. | Contract balance reconciliation, state monitoring, and incident records. |
| Initial reach | No verified users or community count. | 25 qualified pilot wallets and 10 participants completing a second supported flow within 30 days. | Deduplicated opt-in pilot cohorts excluding team and automated wallets. |
| Frontend performance | Build passes with a large-chunk warning; no field baseline exists. | Remove the warning and meet p75 LCP below 2.5 seconds on an agreed mobile profile. | Bundle analysis, Lighthouse CI, and consent-based web vitals. |

## Future Updates

### Phase 1: Broaden funded end-to-end coverage

- **Problem:** One 100% refund is verified, but the 0% and 50% paths and repeated-flow reliability are not yet demonstrated live.
- **User value:** Reviewers and users can verify all bounded settlement outcomes instead of one path.
- **Changes:** Run supervised low-value smoke tests for the remaining fixture-backed payout tiers and preserve Explorer evidence.
- **Integrations:** GenLayer Studio, Studionet Explorer, GitHub, and Vercel.
- **Conditions:** Passing checks, funded Studionet test wallets, and agreed evidence fixtures.
- **Success:** All three payout tiers have matching source, live address, Explorer transactions, and resulting order state.

### Phase 2: Extend escrow lifecycle policy

- **Problem:** Normal buyer confirmation and expiry recovery now exist, but mutual cancellation and category-specific timeout policy do not.
- **User value:** Both parties receive more flexible settlement rules for orders that should end before delivery or dispute.
- **Changes:** Specify mutual cancellation, optional pre-shipment cancellation windows, and category-specific deadline policies without weakening current recovery invariants.
- **Integrations:** Explorer indexer and operational monitoring.
- **Conditions:** Reviewed state-machine specification, threat model, migration plan, and balance-invariant tests.
- **Success:** No unreachable state, full balance reconciliation, and successful supervised confirmation, timeout, recovery, and cancellation scenarios.

### Phase 3: Extend durable evidence beyond the demo issuer

- **Problem:** Hash-pinned project fixtures and a deployment-wallet issuer demonstrate provenance but cannot establish independent real-world delivery facts at marketplace scale.
- **User value:** Parties can prove exactly which listing terms and evidence were evaluated.
- **Changes:** Keep the delivered order-specific receipt and submission commitments, add durable content-addressed storage, external provider keys, and key-rotation rules.
- **Integrations:** Content-addressed storage, signed marketplace feeds, and evidence attestation.
- **Conditions:** Provider selection, privacy and retention policy, content limits, and reliable validator retrieval.
- **Success:** No verdict references mutated evidence and all supported provider-adapter tests pass.

### Phase 4: Improve access and transaction observability

- **Problem:** Browser-only polling, injected-wallet dependence, and limited diagnostics make long consensus flows harder to resume.
- **User value:** Users can return to a transaction, use more wallets, and understand failures.
- **Changes:** Add indexed order history, Explorer links, wallet adapters, opt-in notifications, structured diagnostics, and route-level code splitting.
- **Integrations:** WalletConnect-compatible wallets, Explorer/indexer APIs, and a notification provider.
- **Conditions:** Stable APIs, privacy policy, event schema, mobile tests, and performance budgets.
- **Success:** Pilot finalization and selection-integrity targets are met and the bundle warning is removed.

### Phase 5: Run a controlled category pilot

- **Problem:** Local correctness does not prove that evidence burdens and payout tiers match real user expectations.
- **User value:** A bounded pilot tests the workflow while limiting financial and operational risk.
- **Changes:** Select one item category, cap value, publish evidence standards, review outcomes, commission an independent security assessment, and version settlement policy.
- **Integrations:** One approved marketplace or collector community, security reviewers, and support tooling.
- **Conditions:** Completion of prior phases, explicit pilot agreement, incident response, audit budget, and governance ownership.
- **Success:** Pilot targets are met, no unrecoverable fund-loss incident occurs, and no critical audit finding remains unresolved.
