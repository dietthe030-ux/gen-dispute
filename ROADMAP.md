# Project Roadmap

This roadmap reflects source, test, live application, and Studionet Explorer evidence reviewed on July 26, 2026. It does not claim users, traction, partnerships, or a successful live dispute settlement.

## V1 Delivered

GenDispute is a GenLayer Studionet escrow prototype for item-not-as-described disputes. A seller creates an isolated order, names the buyer, records a fixture-backed listing snapshot, and deposits native GEN. The named buyer can submit one or two public evidence URLs. The Intelligent Contract restricts the decision to a 0%, 50%, or 100% buyer refund, calculates complementary payouts, and emits native GEN transfers after consensus.

The current source candidate includes:

- deterministic deposit, participant, state, retry, duplicate-action, and URL guards;
- explicit multi-order storage and order-ID reads;
- public evidence retrieval with `gl.nondet.web.get`;
- structured semantic evaluation with `gl.nondet.exec_prompt`;
- independent validator retrieval and reevaluation of the same evidence;
- consensus comparison over `reason_code`, `refund_tier`, and `evidence_sufficient`, with schema and internal-consistency checks as supplemental guards;
- React 19, TypeScript, Vite, `genlayer-js`, and injected EIP-1193 wallet integration;
- listing-aware demo evidence presets that keep Rolex and Casio delivery facts aligned with the selected order;
- explicit order lookup, buyer/seller/observer roles, account-change selection clearing, transaction progress, receipt execution checks, and error states; and
- `/docs`, root and frontend setup documentation, contract tests, and frontend tests.

### Verified evidence

| Area | Evidence |
| --- | --- |
| Public source | [dietthe030-ux/gen-dispute](https://github.com/dietthe030-ux/gen-dispute) contains the reviewed contract, frontend, tests, and documentation. |
| Local contract verification | 24/24 tests pass, including rejection of a schema-valid leader verdict that disagrees with an independent validator evaluation. |
| Local frontend verification | 31/31 tests pass; Oxlint, TypeScript compilation, and the Vite production build pass. |
| Live web | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) and `/docs` load and use the production Studionet contract. |
| Studionet deployment | Explorer shows that [`0xD37A4f08C46397da6Efa87a0009F4516B925A5f5`](https://explorer-studio.genlayer.com/address/0xD37A4f08C46397da6Efa87a0009F4516B925A5f5) contains the reviewed source, two accepted `create_order` writes, and 0.20 GEN. The first [`open_dispute` attempt](https://explorer-studio.genlayer.com/tx/0x640a84828b3baea2444cc4b2849787b8ed426e2ad5d1441ca263c02488035109) finalized with successful GenVM execution but undetermined consensus; its state transition was rolled back. |

### Current limitations

Other current limitations are:

- Listing creation is limited to a small hardcoded fixture registry; the listing URL itself is not fetched.
- Buyer-supplied evidence URLs are public web inputs, not guaranteed authoritative or immutable sources.
- Two funded live orders and one undetermined dispute attempt are visible; no accepted live verdict or payout is verified.
- No buyer-confirmation, cancellation, deadline, timeout settlement, or emergency recovery path exists.
- Two undetermined attempts can leave escrow locked.
- Local contract tests mock web and model results; frontend tests mock the wallet and SDK.
- The Vite production build reports a non-blocking large-chunk warning.
- The prototype has not received a production security audit and is not presented as ready for high-value commerce.

## Target Users

The initial target users are buyers and sellers performing supervised, low-value peer-to-peer transactions where item identity, condition, or included accessories matter. A second target group is marketplace and GenLayer developers evaluating how evidence-aware consensus can be combined with on-chain custody and bounded settlement.

Their need is not merely fund storage. They need a decision process that can inspect public evidence without granting one marketplace administrator or one hosted LLM API sole authority over the verdict. GenDispute is currently suitable for demonstrations and controlled pilots, not unsupervised production commerce.

## Adoption Approach

No existing user base or partner community is claimed. The proposed first-user approach is:

1. Run supervised demonstrations in GenLayer developer communities, hackathons, and marketplace-builder sessions.
2. Use two funded Studionet wallets plus an observer wallet to demonstrate explicit order lookup, participant authorization, consensus progress, and each fixture-backed payout tier.
3. Show the `/docs` route before signing so participants understand the evidence model, payout bounds, and current recovery limitations.
4. Link every demonstration write to Explorer and distinguish wallet approval, `ACCEPTED`, `FINALIZED`, and successful GenVM execution.
5. Collect structured feedback on wallet setup, evidence preparation, wait time, verdict clarity, and locked-fund recovery expectations.

Trial users should be invited back only after they can complete the flow without operator correction and the contract has a documented completion and recovery policy.

## Planned Integrations

All integrations below are proposals, not delivered features.

| Integration | Why and user value | Architecture impact | Conditions |
| --- | --- | --- | --- |
| IPFS, Arweave, or another content-addressed store | Preserves listing terms and evidence used in a verdict. | Store canonical hashes or immutable URIs; add retrieval, size, and fallback policies. | Provider selection, privacy review, validator retrieval tests, and a versioned content schema. |
| Signed marketplace listing feeds | Reduces manual entry and gives the snapshot verifiable provenance. | Add adapters that normalize and bind signed listing fields to an order. | API permission, signature policy, rate-limit handling, and update/deletion rules. |
| Evidence timestamping or attestation | Helps detect mutated, expired, or misattributed evidence. | Record hashes, timestamps, media metadata, and optional attestations. | Supported-media policy, retention policy, privacy review, and validator availability. |
| WalletConnect-compatible wallet layer | Expands supported desktop and mobile wallets. | Replace direct injected-provider assumptions with a tested wallet abstraction. | Confirm Studionet support and pass connect, switch, rejection, and account-change tests. |
| Explorer/indexer and notifications | Lets users leave the page while consensus continues and later recover transaction context. | Index order state, receipt status, and opt-in notifications without making the indexer authoritative. | Stable APIs, privacy-preserving event schema, monitoring, and delivery retry policy. |
| Bounded marketplace or collector pilot | Tests whether evidence requirements and payout tiers match a real category. | Add category-specific listing fields, caps, evidence guidance, and support procedures. | Explicit partner agreement, risk limits, incident ownership, and prior lifecycle hardening. |

## Success Metrics

Current evidence is separated from future targets.

| Metric | Current evidence | Future target | Measurement |
| --- | --- | --- | --- |
| Contract regression reliability | 24/24 local tests pass. | All required checks pass for every release candidate. | Pinned CI logs and reviewed GenVM test output. |
| Frontend regression reliability | 31/31 tests, lint, and build pass. | All required checks pass on every main-branch change. | CI test, lint, typecheck, and build results. |
| Source-to-deployment integrity | Explorer source and the reviewed contract match; production uses the verified address. | Preserve this alignment for every release. | Commit hash, deployment transaction, Explorer source, and production environment review. |
| Transaction success | Two `create_order` writes finalized successfully; one `open_dispute` write finalized with undetermined consensus. | At least 95% of wallet-approved supervised writes finalize with accepted consensus, excluding user rejection. | Reconcile frontend submissions with Explorer receipts and execution results. |
| End-to-end dispute completion | One live dispute attempt is verified as undetermined; no live payout is verified. | At least 10 supervised finalized disputes after lifecycle hardening, including evidence for every supported tier. | Explorer transactions and post-transaction contract-state reconciliation. |
| Order selection correctness | Automated tests cover explicit lookup and wallet-change clearing. | Zero unintended retained selections during the pilot. | Account-change tests and consent-based pilot issue logs. |
| Fund safety | Explorer shows 0.20 GEN held across two open orders after the undetermined dispute was rolled back; no payout has occurred. | Zero unreconciled balances and a documented result for every terminal and recovery state. | Contract balance reconciliation, state monitoring, and incident records. |
| Initial reach | No verified users or community count. | 25 qualified pilot wallets and 10 participants completing a second supported flow within 30 days. | Deduplicated opt-in pilot cohorts excluding team and automated wallets. |
| Frontend performance | Build passes with a large-chunk warning; no field baseline exists. | Remove the warning and meet p75 LCP below 2.5 seconds on an agreed mobile profile. | Bundle analysis, Lighthouse CI, and consent-based web vitals. |

## Future Updates

### Phase 1: Verify funded end-to-end transactions

- **Problem:** Funded orders and an undetermined dispute are recorded, but no accepted verdict or payout has completed on the new instance.
- **User value:** Reviewers and users can verify the complete workflow rather than deployment alone.
- **Changes:** Use listing-aware, fact-only evidence fixtures for low-value dispute/payout smoke tests and preserve Explorer evidence.
- **Integrations:** GenLayer Studio, Studionet Explorer, GitHub, and Vercel.
- **Conditions:** Passing checks, funded Studionet test wallets, and agreed evidence fixtures.
- **Success:** Source, live address, Explorer transactions, and resulting order state all match.

### Phase 2: Complete escrow lifecycle and recovery

- **Problem:** Orders require a dispute to release funds and repeated undetermined outcomes can lock escrow.
- **User value:** Both parties receive predictable confirmation, cancellation, timeout, and recovery rules.
- **Changes:** Specify and implement buyer confirmation, cancellation windows, deadlines, timeout settlement, and narrowly constrained recovery.
- **Integrations:** Explorer indexer and operational monitoring.
- **Conditions:** Reviewed state-machine specification, threat model, migration plan, and balance-invariant tests.
- **Success:** No unreachable state, full balance reconciliation, and successful supervised timeout and recovery scenarios.

### Phase 3: Make listing and evidence inputs durable

- **Problem:** Fixture listings and mutable public evidence URLs cannot support open marketplace use.
- **User value:** Parties can prove exactly which listing terms and evidence were evaluated.
- **Changes:** Version a listing schema, bind content hashes or immutable URIs, add evidence metadata, and strengthen availability and injection tests.
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
