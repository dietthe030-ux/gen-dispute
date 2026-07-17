# Project Roadmap

This roadmap reflects evidence reviewed on July 17, 2026. It distinguishes the legacy single-order production release, the deployed multi-order Studionet contract, and the multi-order frontend that is awaiting production environment migration. It does not claim users, traction, partnerships, or live dispute settlement without evidence.

## V1 Delivered

GenDispute V1 is a GenLayer Studionet escrow prototype for item-not-as-described disputes. A seller deposits native GEN for a named buyer and records an approved listing snapshot. The designated buyer can submit public evidence. GenLayer validators evaluate the mismatch and the contract restricts settlement to a 0%, 50%, or 100% buyer refund.

The Intelligent Contract holds escrow, enforces participant access, preserves the listing snapshot, coordinates nondeterministic evidence evaluation, validates the verdict, calculates complementary buyer and seller payouts, and initiates native GEN transfers.

### Delivered and verified user flow

1. Connect an injected EIP-1193 wallet.
2. Request GenLayer Studionet, chain ID `61999`.
3. Create an escrow with a buyer, positive GEN value, registered listing URL, matching snapshot, and item description.
4. Read the deployed order state.
5. If connected as the named buyer, submit one or two public evidence URLs.
6. Track accepted consensus and finalization.
7. Display a bounded settlement result or an undetermined result.

### Deployment evidence

| Area | Current evidence |
| --- | --- |
| Public source | [dietthe030-ux/gen-dispute](https://github.com/dietthe030-ux/gen-dispute) contains the deployed V1 source history. |
| Live web app | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) is the public Vercel application connected to the GitHub repository. |
| Legacy Studionet contract | [`0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8`](https://explorer-studio.genlayer.com/address/0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8) is the verified V1 instance. |
| Multi-order Studionet contract | [`0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7`](https://explorer-studio.genlayer.com/address/0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7) accepted a direct `get_order_count()` read and returned `0` during integration verification. |
| Verified Studionet write | The [`create_order` transaction](https://explorer-studio.genlayer.com/tx/0x6d2ddeeaefb0ac249a9471d1b2d03f2df7e53a4f1c833678fbc6d9c49fa2d2ab) finalized successfully with 1.50 GEN. |
| Live state observed before this redesign | The V1 contract exposed one `OPEN` order with 1.5 GEN, seller `0x277bf20771129ae224042d23b0311c1ac5a9ac1b`, buyer `0x896ef52d620ea3ccda34b4e72a8e197974e4e39e`, and zero dispute attempts. |
| Multi-order contract verification | The release-candidate contract passed 22 of 22 local GenVM tests, including creation isolation, settlement isolation, and unknown-ID rejection. |
| Multi-order frontend verification | The release-candidate frontend passed 27 of 27 tests; lint completed with zero errors; TypeScript and the Vite production build succeeded. |

### Honest boundary between V1 and the release candidate

The new Studionet contract implements the multi-order design using `DynArray[Order]` and explicit `order_id` reads and writes. The corresponding frontend implements manual order lookup and account-change selection clearing. The contract is deployed and readable, but the public Vercel frontend is not yet claimed as migrated to it.

The legacy contract contains an open escrow and was not upgraded. Its incompatible storage layout remains isolated from the new deployment.

Other V1 limitations remain:

- No live dispute, verdict, or payout transaction has been independently verified on Studionet.
- Listing creation is restricted to a small hardcoded fixture registry.
- There is no buyer-confirmation, cancellation, deadline, timeout, or emergency recovery path.
- Two undetermined attempts can leave an order's escrow locked.
- Public evidence URLs may change or disappear and are not content-addressed.
- Local contract tests mock web and model behavior; frontend tests mock the wallet and SDK.
- No production users, recurring activity, testimonials, partnerships, or analytics have been verified.
- The Vite build emits a non-blocking warning for a JavaScript chunk larger than 500 kB.

## Target Users

The initial target users are:

- Buyers and sellers running low-value, supervised peer-to-peer transactions where item identity, condition, accessories, or provenance matter.
- Collectible and specialty-item communities that need an explicit item-not-as-described policy.
- Marketplace developers evaluating evidence-aware escrow without delegating the final decision to one centralized support agent.
- GenLayer developers learning how to combine public web evidence, nondeterministic execution, deterministic verdict validation, and native asset settlement.

These users need payment custody and evidence evaluation in one auditable workflow. The prototype is valuable for controlled demonstrations and pilots. It is not yet suitable for high-value or unsupervised commerce because recovery, evidence integrity, operational monitoring, and live settlement evidence remain incomplete.

## Adoption Approach

No current user base is claimed. The proposed adoption approach is:

1. Demonstrate the flow in GenLayer developer communities, hackathons, workshops, and marketplace-builder sessions.
2. Use two supervised wallets and low-value Studionet funds to show order creation, explicit order-ID lookup, Observer access, buyer authorization, and each fixture-backed verdict.
3. Present `/docs` before wallet signing so participants understand roles, evidence requirements, payout tiers, and limitations.
4. Link each demo transaction to Explorer and explain accepted consensus versus finalization.
5. Collect structured feedback on wallet setup, order discovery, evidence preparation, wait time, outcome clarity, and recovery expectations.
6. Invite repeat use only after lifecycle and recovery controls are implemented and clearly documented.

Early trials should become continued use only if participants can reliably find their orders, understand why a verdict was reached, recover from non-terminal states, and complete a second supervised transaction without operator intervention.

## Planned Integrations

All entries below are future proposals.

| Integration | Why it is needed and user value | Product or architecture impact | Conditions |
| --- | --- | --- | --- |
| Content-addressed listing storage such as IPFS or Arweave | Replaces the demonstration-only fixture registry with durable listing terms. | Store and validate immutable URIs or hashes; add retrieval fallback and size policies. | Select providers, define a canonical snapshot schema, test validator retrieval, and complete privacy review. |
| Marketplace APIs or signed listing feeds | Reduces manual data entry and establishes listing provenance. | Add adapters that normalize listing fields and bind signed or hashed snapshots to an order. | Obtain API permission, document rate limits and terms, and define update/deletion behavior. |
| Evidence storage and attestation | Prevents evidence URLs from silently changing or expiring. | Record content hashes, timestamps, media metadata, and optional attestations. | Define supported media, retention, privacy, availability, and validator-access policies. |
| WalletConnect-compatible adapters | Expands browser and mobile wallet coverage beyond injected providers. | Introduce a wallet abstraction while preserving `genlayer-js` signing and Studionet configuration. | Verify chain support and pass browser, mobile, account-change, and rejection tests. |
| Explorer indexer and observability | Gives users independent transaction status and useful failure diagnostics. | Add order history, Explorer links, indexed state transitions, structured receipt logs, and alerts. | Confirm stable APIs, define privacy-preserving event schemas, and operate health checks. |
| Notification provider | Consensus may outlast a browser session. | Send opt-in updates from indexed contract state instead of browser polling alone. | Establish an indexer, protect contact data, and define delivery retry and opt-out behavior. |
| Pilot collector or marketplace community | Tests whether evidence standards and payout rules match a real bounded workflow. | Add category-specific listing fields, evidence guidance, transaction caps, and support procedures. | Obtain explicit pilot agreement, informed consent, safety review, and incident-response ownership. |

## Success Metrics

Current evidence is separated from future targets.

| Metric | Current evidence | Future target | Measurement |
| --- | --- | --- | --- |
| Contract regression reliability | 22/22 multi-order contract tests passed locally. | 100% of required contract checks pass for every release candidate. | Pinned CI logs and reviewed GenVM test output. |
| Frontend regression reliability | 27/27 tests passed; lint and build succeeded. | 100% of required frontend checks pass on every main-branch change. | CI results for tests, lint, typecheck, and build. |
| Live multi-order deployment | Contract `0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7` is reachable and `get_order_count()` returned `0`; no live order write or dispute exists yet. | Complete supervised order creation, lookup, authorization, dispute, and payout smoke tests. | Studio and Explorer inspection plus recorded smoke-test transactions. |
| Wallet-to-order correctness | Local UI tests confirm no default selection for a newly connected wallet. | Zero cases in pilot testing where an account switch retains an unintended selected order. | Automated account-change tests and consent-based session logs. |
| Transaction finalization | One V1 order creation is verified; no meaningful denominator exists. | At least 95% of wallet-approved pilot writes finalize successfully, excluding user-rejected prompts. | Reconcile frontend submissions with Explorer receipts. |
| End-to-end dispute completion | No live V1 dispute or payout has been verified. | At least 10 supervised finalized disputes, with at least two examples of each payout tier after safety hardening. | Explorer transactions and contract-state reconciliation. |
| Fund safety | One legacy 1.5 GEN escrow remains open; no live payout evidence exists. | Zero unreconciled balances and a documented recovery outcome for every supported non-terminal state. | Balance reconciliation, state monitoring, and incident records. |
| Initial reach | No verified user or community count. | 25 qualified pilot wallets and at least 10 participants completing a second supported transaction within 30 days. | Deduplicated wallet cohorts excluding team and automated test wallets. |
| Integration progress | Studionet, injected wallet access, `genlayer-js`, GitHub, and Vercel are configured. | Two additional planned integrations operating with automated health checks. | Integration test suites and availability monitoring. |
| Frontend performance | Build succeeds with a large-chunk warning; no field baseline exists. | Remove the warning and achieve p75 LCP below 2.5 seconds on the agreed mobile profile. | Bundle analysis, Lighthouse CI, and consent-based web vitals. |

## Future Updates

### Phase 1: Complete and validate the multi-order release

- **Problem:** The multi-order contract is deployed, but the production frontend environment and live transaction flow are not yet migrated and verified.
- **User value:** Users can create multiple isolated escrows and intentionally open a known order by ID.
- **Changes:** Configure the verified address in Vercel; deploy the tested frontend; run two-wallet and observer smoke tests; verify order creation, lookup, authorization, dispute, and settlement evidence.
- **Integrations:** GenLayer Studio, Explorer, GitHub, and Vercel.
- **Conditions:** Correct GitHub/Vercel account verification, production environment migration, passing checks, and continued protection of the legacy escrow.
- **Success:** Multiple live orders retain isolated state; wallet switching clears selection; unauthorized disputes fail; all production routes and checks pass.

### Phase 2: Complete escrow lifecycle and recovery

- **Problem:** Orders require a dispute to release funds and can remain locked after repeated undetermined results.
- **User value:** Buyers and sellers receive predictable completion, cancellation, timeout, and recovery rules.
- **Changes:** Specify buyer confirmation, cancellation windows, deadlines, timeout settlement, and a narrowly constrained recovery mechanism; model every state transition and balance invariant.
- **Integrations:** Explorer indexer and operational monitoring.
- **Conditions:** Approved state-machine specification, threat review, migration strategy, and supervised recovery tests.
- **Success:** No unreachable state in model tests, full balance reconciliation, and successful supervised timeout and recovery scenarios.

### Phase 3: Preserve listing and evidence integrity

- **Problem:** Fixture listings and mutable public evidence URLs do not support open marketplace use.
- **User value:** Parties can prove the terms and evidence used for a decision.
- **Changes:** Version a listing schema; store content hashes or immutable URIs; add marketplace adapters, evidence timestamps, media metadata, availability checks, and stronger injection tests.
- **Integrations:** IPFS or Arweave, marketplace APIs, and evidence attestation providers.
- **Conditions:** Storage provider selection, API access, content limits, privacy review, and reliable validator retrieval.
- **Success:** At least 99% valid pilot snapshot retrieval, zero verdicts referencing mutated evidence, and passing provider-adapter tests.

### Phase 4: Improve operations and user access

- **Problem:** Browser-only polling, injected-wallet dependence, limited diagnostics, and a large bundle reduce reliability and accessibility.
- **User value:** Users can return to transactions, receive updates, use more wallets, and understand failures.
- **Changes:** Add indexed order history, Explorer links, wallet adapters, opt-in notifications, privacy-preserving analytics, structured errors, and route-level code splitting.
- **Integrations:** WalletConnect-compatible wallets, Explorer/indexer APIs, telemetry, and notifications.
- **Conditions:** Privacy policy, event schema, stable provider APIs, multi-device tests, and performance budgets.
- **Success:** At least 95% successful wallet-approved finalization, no lost selected-order context within supported sessions, and p75 LCP below 2.5 seconds.

### Phase 5: Controlled pilot and protocol readiness

- **Problem:** Local correctness does not prove that evidence burdens, verdict categories, and payout policies meet real user expectations.
- **User value:** A bounded pilot validates the workflow while limiting financial and operational risk.
- **Changes:** Select one item category, cap value, publish evidence standards, review outcomes, commission an independent security assessment, version settlement policies, and publish integration guidance.
- **Integrations:** One approved collector or marketplace community, security reviewers, support tools, and developer tooling.
- **Conditions:** Completion of prior phases, explicit pilot agreement, incident response, audit budget, and clear governance ownership.
- **Success:** Pilot targets in Success Metrics are met, zero unrecoverable fund-loss incidents occur, no critical audit finding remains unresolved, and expansion is supported by measured repeat use.
