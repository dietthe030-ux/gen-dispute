# Verification

## Release candidate

| Field | Value |
| --- | --- |
| Project | GenDispute |
| Submission category | Project |
| Prior anonymous-reviewed commit | `d1cf6a41f956ee7566d8a7dcb353a8b62e1b6b72` (`APPROVED`, superseded by LF-only source normalization) |
| Prior reviewed contract SHA-256 | `22d16b89b97f9570107adc76fe7d9f212641a7b04b0611d1b872bf47911cb6ed` |
| Contract PRE_DEPLOY status | `APPROVED` for commit `0d13b529e07e82a3679f593364881c9232789b5f` and normalized contract SHA-256 `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d` |
| Prior final-review result | Commit `b51817eb573e850d9e674075ced1587ffe230ff9`: `CHANGES REQUIRED`; superseded after completing the current-deployment proof matrix, correcting attribution, and adding the repository license. |
| Exact release revision | The public annotated tag and GitHub Release [`gendispute-v1-final`](https://github.com/dietthe030-ux/gen-dispute/releases/tag/gendispute-v1-final) bind the final commit after this self-referential document is committed. The release notes state the literal SHA and Vercel deployment provenance. |
| Current candidate source SHA-256 | `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d` |
| Current candidate deployment status | Deployed, source-parity verified, and exercised through every advertised write path and critical terminal/retry branch |
| Public `main` revision | Must equal the commit targeted by `gendispute-v1-final`; verify with GitHub and `git rev-parse gendispute-v1-final^{commit}` |
| Prior deployed source SHA-256 | `9b1cece7f2feb3af52817bce8e0be62d02f5e493da1671557fa6269faca35a23` |
| Network | GenLayer Studionet, chain ID `61999` |
| Deployment classification | Upgradable through GenLayer Root Slot |
| Selected deployer/upgrader | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Current contract | `0x7cFC1C241B7bb6Cf636551053dcA403B6ceD48E7` |
| Deployment transaction | `0x93d77018ef4e1bd384eeaee738a96ea7564317a610ca371d3dfcfa12b1a893a9` |
| Local gate audit | `PASS` |

The current Studionet deployment is `FINALIZED`, has successful GenVM execution and majority agreement, and decodes to 38,207 LF-only source bytes with SHA-256 `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d`. RPC readbacks return the selected wallet for both `get_upgrader()` and `get_evidence_issuer()`. The release delta does not change those contract bytes.

## Reviewer-requested remediation

| Request | Implemented evidence |
| --- | --- |
| Consume the ID returned by `create_order` | `useGenDispute.ts` reads the accepted transaction through `getTransaction`, decodes `consensus_data.leader_receipt[0].result.payload.raw` through `abi.calldata.decode`, and loads that exact order without relying on a debug RPC. Reads and consensus polling use the same-origin `/api/rpc` function, which retries transient transport failures and forwards to the official Studionet endpoint. |
| Cover concurrent order creation | The frontend regression sets the global count to `12` while `create_order` returns ID `7`, then proves the UI loads order `7`. The count is display-only. |
| Bind authenticated evidence to each order | The deployment wallet is the evidence issuer and signs `register_evidence_receipt`, binding one trusted-origin URL, SHA-256, observation time, and globally unique nonce to one order. The contract forbids the issuer from being buyer or seller. Receipt attestations must match the exact order ID, canonical item ID, publisher ID, and nonce. Each attempt retains its own URL, byte hash, observation time, attestation hash, and canonical commitment. |
| Add normal release | The named buyer can call `confirm_delivery`; the contract records `BUYER_CONFIRMED` and releases the full escrow to the seller. |
| Add locked-fund recovery | Every order has a bounded deadline. After expiry, the buyer or seller can call `recover_expired_order` for `OPEN` or `UNDETERMINED` state; the seller-funded escrow returns to the seller. |

## Anonymous PRE_DEPLOY blocker closure

| Prior blocker | Corrected design | Regression evidence |
| --- | --- | --- |
| Buyer could select a reusable payout fixture | The buyer no longer supplies evidence URLs and the frontend contains no Match/Partial/Mismatch controls. Only the issuer address can register a receipt. Its signed transaction binds order ID, item policy, observation time, nonce, URL, and SHA-256. Nonces are globally single-use; a URL query does not alter the body subject; retries require a newly registered receipt. Missing or wrongly bound evidence remains `UNDETERMINED` with zero payout. | Tests create two same-item orders and prove order-0 evidence cannot settle order 1, query suffixes add no provenance, buyers cannot register mismatch evidence or choose a tier, nonces cannot replay, invalid observation times fail, and only issuer-registered order-specific evidence settles. |
| Publisher authentication was missing | The contract authenticates the publisher through the GenLayer transaction signer returned by `get_evidence_issuer`. The constructor registers the deployment wallet as issuer and Root Slot upgrader, while order creation rejects that address as either trading party. The bounded receipt also carries the matching publisher ID. | Tests cover issuer-only registration, issuer/party separation, publisher-ID mismatch, SHA-256 mismatch, and authorized issuer readback. |
| Untrusted web and prompt inputs lacked deterministic safeguards | Reason and URL lengths are bounded. HTTP status, content type, body size, UTF-8, attestation shape, facts, and exact body hash are checked before evaluation. Raw HTML, seller description, and buyer reason are excluded from the LLM prompt; only canonical JSON containing the frozen listing and validated attestation facts enters `exec_prompt`. | Contract tests cover 4xx/5xx, unsupported content, oversized bodies, invalid UTF-8, missing attestation, hostile instruction pages, hostile buyer reason, and validators agreeing with an injected unsupported verdict. All fail closed without transfer. |

## Local verification

Commands executed against the release-candidate worktree:

```text
gltest tests/test_gen_dispute.py -q
genvm-lint check contracts/gen_dispute.py
cd frontend
npm test -- --run
npm run lint
npm run build
powershell -ExecutionPolicy Bypass -File E:\Genlayer\scripts\audit-genlayer-project-gates.ps1 -ProjectName gen-dispute
git diff --check
```

Results:

- Contract: `48 passed`.
- GenVM: lint passed, validation passed, 10 public methods detected.
- Frontend: `47 passed` across 5 test files.
- Oxlint: zero errors.
- TypeScript and Vite production build: passed.
- Repository gate audit: `PASS`.
- Whitespace error check: passed.
- Known non-blocking output: Vite reports a production chunk above 500 kB.

Dependency triage on the release tree reports five transitive advisories and no direct vulnerable package. `nanoid`, `postcss`, and `undici` are dev-only Vite/Vitest/jsdom paths. `brace-expansion` and `js-yaml` appear under the production install only because `genlayer-js@1.1.8` brings ESLint/import-plugin peer tooling; the application does not import those packages, and their package identifiers are absent from the built production assets. No forced override or audit fix is applied because runtime reachability was not demonstrated and changing SDK peer dependencies without compatibility evidence would add release risk. This remains a disclosed dependency-maintenance item.

Contract tests use an isolated WSL environment with `genlayer-test==0.29.2`. Web, LLM, wallet, and SDK behavior is mocked locally; these results do not substitute for Studionet transactions.

## Contract safety coverage

- positive escrow, buyer/seller separation, registered listing, and snapshot validation;
- independent leader and validator evidence retrieval and semantic evaluation;
- issuer-signed order/item/time/nonce/body-hash binding plus exact evidence-byte and attestation-hash agreement;
- cross-order replay, query-suffix replay, unauthorized issuer, issuer-as-party, unknown-publisher, wrong-item, stale, malformed, changed, and injection-style evidence paths;
- HTTP error, unsupported content type, oversized body, invalid UTF-8, missing attestation, and hostile reason paths;
- 0%, 50%, and 100% conservation and transfer targets;
- buyer-only dispute and confirmation authorization;
- deadline bounds, no early recovery, named-party recovery, and no duplicate terminal action;
- two-attempt commitment preservation and expired `UNDETERMINED` recovery;
- Root Slot upgrader readback, unauthorized rejection, empty-code rejection, and authorized replacement.

The fixture-mirroring regression enumerates both fixture directories, compares every mirrored page byte-for-byte, parses every embedded attestation except the listing-only page, and validates publisher ID, item ID, numeric order ID, and non-empty nonce. Candidate receipts cover order `0` plus exact orders `1`, `3`, `4`, `5`, and `6`; repository presence is not treated as registration or live-settlement evidence.

## Frontend safety coverage

- EIP-6963/EIP-1193 injected-wallet discovery, explicit provider selection, Studionet switching, mandatory per-connect wallet signatures, signature rejection, reconnect-after-disconnect, and network-switch failures;
- explicit order lookup and account-change selection clearing;
- exact `create_order` return decoding under a simulated concurrent count race;
- accepted, finalized, majority-disagree, undetermined, execution-error, finalization-timeout, same-origin RPC retry behavior without 429 amplification, order-scoped transaction attribution, post-submission RPC recovery through terminal state readback, and post-quorum idle-validator handling, including the live RPC `leader_receipt` shape;
- normal buyer release and expired recovery writes;
- buyer reason-only dispute UI with no outcome/evidence selectors, issuer receipt registration, and reviewer-facing `/docs` content.

The initial `OPEN` buyer flow exposes only the reason field even when no receipt is registered. Missing evidence fails closed as `UNDETERMINED` with zero payout. The retry flow remains blocked until the issuer registers a fresh URL, hash, and nonce.

## Deployment and recovery gate

The current LF-normalized contract received exact-hash `PRE_DEPLOY` approval, was deployed to a new Studionet instance, and passed source-parity and role readbacks. The release delta after deployment changes frontend provider discovery, tests, fixtures, and documentation only; it does not change the deployed contract bytes.

The diagnostic deployment at `0x6A480D0350ACc67C3667F54933839Ddb6d0D4d51` (`0x82a702dccaf573da9b8b3ba14b929c5d6ea95dbead570c39acc0c8b98c39b6be`) exposed Studio's LF normalization of the earlier mixed-line-ending source. The repository then enforced LF, fresh review approved SHA-256 `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d`, and the accepted candidate was deployed only after that approval. The diagnostic instance is retained solely for the isolated upgrade rehearsal.

### Current candidate deployment manifest

| Field | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Approved contract revision | `0d13b529e07e82a3679f593364881c9232789b5f` |
| Final repository revision | Public tag and release `gendispute-v1-final` resolve to the exact final commit without changing its tree |
| Source SHA-256 | `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d` |
| Constructor arguments | None (`__init__(self)`) |
| Deployment classification | `UPGRADABLE` |
| Selected deployer/upgrader/evidence issuer | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Linked contracts | None |
| Contract address | `0x7cFC1C241B7bb6Cf636551053dcA403B6ceD48E7` |
| Deployment transaction | `0x93d77018ef4e1bd384eeaee738a96ea7564317a610ca371d3dfcfa12b1a893a9` |
| Frontend update | Release frontend configured for this verified address through Vercel production environment |
| Public frontend provenance | Stable production at [gen-dispute.vercel.app](https://gen-dispute.vercel.app); the public GitHub Release records the exact commit, Vercel deployment ID, production alias, and commit-bound public alias after final publication |

The candidate deployment, source parity, and role readbacks are verified. The prior live contract remains isolated as historical evidence.

### Prior live deployment manifest

| Field | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Approved source revision | `a350de3db6fea88918cb55110225e9cb9f90b6d1` |
| Source SHA-256 | `9b1cece7f2feb3af52817bce8e0be62d02f5e493da1671557fa6269faca35a23` |
| Constructor arguments | None (`__init__(self)`) |
| Deployment classification | `UPGRADABLE` |
| Deployer/upgrader/evidence issuer | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Linked contracts | None |
| Contract address | `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d` |
| Deployment transaction | `0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e` |
| Production frontend | Historical target before the current candidate release |

The prior manifest remains historical evidence only. The current release revision is resolved through the public `gendispute-v1-final` tag and GitHub Release described at the top of this document.

### Recovery runbooks

**Studio/local UI reset while Studionet state remains:** reconnect the selected upgrader wallet, import the contract by its recorded address, load the exact source identified by the recorded commit and SHA-256, call `get_upgrader()`, and compare the returned address with the manifest before any upgrade or write.

**Studionet/network-state reset:** treat the prior address and state as unrecoverable. Redeploy the exact recorded source with no constructor arguments from the selected wallet, verify `FINALIZED`, execution `SUCCESS`, deployed-source parity, and `get_upgrader()` readback, rerun the full live proof matrix, then update the frontend address and all deployment documentation. Do not present the previous address as current evidence.

Candidate deployment, source parity, role readbacks, exact-ID order creation, issuer registration, matching production frontend publication, all three payout tiers, fail-closed retry, buyer confirmation, and expired recovery are verified below. The release was published before this documentation correction: public `main`, the `gendispute-v1-final` tag and GitHub Release, the production deployment record, stable site, and commit-bound alias are recorded at the top. Anonymous checkpoint reports are retained outside the public repository and are not represented as repository-controlled release state.

Local coverage proves that `upgrade(new_code)` rejects a non-upgrader and empty code and accepts a non-empty payload from the recorded upgrader. The exact candidate source was also rehearsed on isolated contract [`0x6A480D0350ACc67C3667F54933839Ddb6d0D4d51`](https://explorer-studio.genlayer.com/address/0x6A480D0350ACc67C3667F54933839Ddb6d0D4d51): authorized transaction [`0x60303e3389e6c95ca899b2aa26cfdc630a36890f4cb64d9e03847609e3cabfc8`](https://explorer-studio.genlayer.com/tx/0x60303e3389e6c95ca899b2aa26cfdc630a36890f4cb64d9e03847609e3cabfc8) is `FINALIZED`, `MAJORITY_AGREE`, and execution `SUCCESS`; unauthorized seller transaction [`0x3f7f75c78e54b9af8096328241fac9c72ecbd35dce6bb45a7b4083cbe098a883`](https://explorer-studio.genlayer.com/tx/0x3f7f75c78e54b9af8096328241fac9c72ecbd35dce6bb45a7b4083cbe098a883) finalized with an `Unauthorized address` rollback. Source hash and role readbacks remained unchanged.

### Current candidate live evidence

- Deployment: [`0x93d77018ef4e1bd384eeaee738a96ea7564317a610ca371d3dfcfa12b1a893a9`](https://explorer-studio.genlayer.com/tx/0x93d77018ef4e1bd384eeaee738a96ea7564317a610ca371d3dfcfa12b1a893a9) — `FINALIZED`, `MAJORITY_AGREE`, decisive execution `SUCCESS`; contract `0x7cFC1C241B7bb6Cf636551053dcA403B6ceD48E7`.
- Deployed-source parity: 38,207 LF-only bytes, SHA-256 `21830bd59bf6df93d9314bed3ff27925afdc44dbd7f8509ff72b5d565d412c4d`; upgrader and evidence issuer both read back as `0xbf90af1bc61314775d57b641b89c1f702a93b40d`.
- Order `0` creation: [`0xf490087d737879ea0845da5b2f4c8f2bd2126a372428c60b1fdbe70d76b84b35`](https://explorer-studio.genlayer.com/tx/0xf490087d737879ea0845da5b2f4c8f2bd2126a372428c60b1fdbe70d76b84b35) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`; exact returned order ID `0`, seller `0x0d4b...d563`, buyer `0x7885...2339`, escrow `0.1 GEN`.
- Issuer receipt registration: [`0x779d661cec3552080370f68c57222e32baa55034c3bd0b310e4c2e4b147e4873`](https://explorer-studio.genlayer.com/tx/0x779d661cec3552080370f68c57222e32baa55034c3bd0b310e4c2e4b147e4873) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`; URL, lowercase SHA-256, nonce, and observation time match order readback.
- Material-mismatch dispute: [`0xec8d9abce9a3d72a7556d5f3e9769f875874942b53ba8faae9b4010af8b362a1`](https://explorer-studio.genlayer.com/tx/0xec8d9abce9a3d72a7556d5f3e9769f875874942b53ba8faae9b4010af8b362a1) — buyer sender, `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`; readback `PAID_OUT`, `MATERIAL_MISMATCH`, 100% buyer refund, buyer payout `0.1 GEN`, seller payout `0`.
- The 100% outcome is consistent with an original collectible box being absent. That used receipt remains immutable.
- Order `1` creation: [`0x24ae5f2466cbd6aea0e02c1f314f90c8fd084a71bfe072461f81d1529ab72956`](https://explorer-studio.genlayer.com/tx/0x24ae5f2466cbd6aea0e02c1f314f90c8fd084a71bfe072461f81d1529ab72956) — seller sender, `0.1 GEN`, `FINALIZED`, `MAJORITY_AGREE`, decisive execution `SUCCESS`; returned order ID `1`.
- Order `1` issuer receipt registration: [`0x7128b0dcd19da2f33b6e683db25d785d87e56d5d5d69c38b5f1470658f2c0a20`](https://explorer-studio.genlayer.com/tx/0x7128b0dcd19da2f33b6e683db25d785d87e56d5d5d69c38b5f1470658f2c0a20) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`; readback binds order `1` to receipt SHA-256 `9df592f5661674af9aec9fad18cb8f23ff905168e27138d255986cde33946f4d` and nonce `ORDER_1_ROLEX_MINOR_CONDITION_V1`.
- Partial-mismatch dispute: [`0x8a30903d094b1855ec6730cae7b2c38ed392863289961f97f7b29910a8a0a94f`](https://explorer-studio.genlayer.com/tx/0x8a30903d094b1855ec6730cae7b2c38ed392863289961f97f7b29910a8a0a94f) — buyer sender, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback `PAID_OUT`, `PARTIAL_MISMATCH`, refund tier `50`, escrow `0.1 GEN`, buyer payout `0.05 GEN`, seller payout `0.05 GEN`, and no recorded error.
- Order `2` creation: [`0x4373f666a4a70c6a4f05d832164fa423c9a6dc367f72a58c380713574aadc107`](https://explorer-studio.genlayer.com/tx/0x4373f666a4a70c6a4f05d832164fa423c9a6dc367f72a58c380713574aadc107) — seller sender, `0.1 GEN`, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; returned order ID `2` and `OPEN` readback.
- Order `2` buyer confirmation: [`0x11d5c4c9a7238061c79c9561093d7412d978117c8aa337683e3e9c830caf1a65`](https://explorer-studio.genlayer.com/tx/0x11d5c4c9a7238061c79c9561093d7412d978117c8aa337683e3e9c830caf1a65) — buyer sender, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback `PAID_OUT`, `BUYER_CONFIRMED`, buyer payout `0`, seller payout `0.1 GEN`.
- Order `3` creation: [`0x07f3f100c5f20a836fe3109f5650f12c6ff09bcbf50c6d41967964b7b4868ba7`](https://explorer-studio.genlayer.com/tx/0x07f3f100c5f20a836fe3109f5650f12c6ff09bcbf50c6d41967964b7b4868ba7) — seller sender, `0.1 GEN`, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; returned order ID `3`, no registered receipt, and `OPEN` readback.
- Order `3` first dispute: [`0xa93191c6d0576ff0751dcab40989d2de15624f5f25976046806180ced87b258a`](https://explorer-studio.genlayer.com/tx/0xa93191c6d0576ff0751dcab40989d2de15624f5f25976046806180ced87b258a) — buyer sender, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback `UNDETERMINED`, one attempt used, `0.1 GEN` still locked, both payouts zero, and `No issuer-authenticated evidence receipt is registered`.
- Order `3` fresh receipt registration: [`0xdc35b021964b0b363426be6388c839eb6e2826c881a0fa220fbe3963efb54bfd`](https://explorer-studio.genlayer.com/tx/0xdc35b021964b0b363426be6388c839eb6e2826c881a0fa220fbe3963efb54bfd) — issuer sender, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback URL, SHA-256 `a8427dd8374a4768a491d4324f72a84b836cf216c88ce83a576eda87db42a3a0`, and nonce `ORDER_3_ROLEX_MATCH_V1` match the immutable receipt.
- Order `3` retry and 0% settlement: [`0x5ccab3dba913447431953217f325070763c3f6f6693f48f3ef70aec32526e89d`](https://explorer-studio.genlayer.com/tx/0x5ccab3dba913447431953217f325070763c3f6f6693f48f3ef70aec32526e89d) — buyer sender, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback `PAID_OUT`, `MATCHES_DESCRIPTION`, refund tier `0`, buyer payout `0`, seller payout `0.1 GEN`. The retained `last_error` is the recorded diagnostic from the first failed-closed attempt, not the terminal outcome.
- Order `4` creation: [`0x476e6d6d98fb973981ace0b0bbba47b22c4f60258a3b1bbb90d124c230e426f9`](https://explorer-studio.genlayer.com/tx/0x476e6d6d98fb973981ace0b0bbba47b22c4f60258a3b1bbb90d124c230e426f9) — seller sender, `0.1 GEN`, 60-second timeout, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; returned order ID `4` and `OPEN` readback.
- Order `4` expired recovery: [`0xe1c958d8e04b8107c66b5df5332f23a5371634c664cdfa9275b0b68b48b8ead4`](https://explorer-studio.genlayer.com/tx/0xe1c958d8e04b8107c66b5df5332f23a5371634c664cdfa9275b0b68b48b8ead4) — seller sender after deadline, `FINALIZED`, `MAJORITY_AGREE`, all four decisive executions `SUCCESS`; readback `PAID_OUT`, `EXPIRED_RECOVERY`, buyer payout `0`, seller payout `0.1 GEN`.

### Consolidated current-deployment proof matrix

| Actor | UI or operational action | Contract method | Live transaction | Final result and readback | Source and regression reference |
| --- | --- | --- | --- | --- | --- |
| Seller | Deposit `0.1 GEN` and create an isolated order | `create_order` | [`0x4373…c107`](https://explorer-studio.genlayer.com/tx/0x4373f666a4a70c6a4f05d832164fa423c9a6dc367f72a58c380713574aadc107) | `FINALIZED`, agreement, four successful decisive executions; exact returned ID `2`, `OPEN`, `0.1 GEN` escrow | `GenDispute.create_order`; `test_create_order_positive_escrow`; frontend returned-ID concurrency regression |
| Evidence issuer | Bind an immutable receipt to one order | `register_evidence_receipt` | [`0xdc35…4bfd`](https://explorer-studio.genlayer.com/tx/0xdc35b021964b0b363426be6388c839eb6e2826c881a0fa220fbe3963efb54bfd) | `FINALIZED`, agreement, four successful decisive executions; order `3` URL/hash/nonce readback matched | `GenDispute.register_evidence_receipt`; `test_only_issuer_can_register_receipts_and_nonce_cannot_replay` |
| Buyer | Submit without a receipt | `open_dispute` | [`0xa931…258a`](https://explorer-studio.genlayer.com/tx/0xa93191c6d0576ff0751dcab40989d2de15624f5f25976046806180ced87b258a) | `FINALIZED`, agreement, four successful decisive executions; `UNDETERMINED`, zero payout, escrow locked, one retry remains | `GenDispute.open_dispute`; `test_missing_issuer_receipt_is_undetermined_without_payout` |
| Buyer | Retry after fresh issuer receipt; matching item | `open_dispute` | [`0x5cca…e89d`](https://explorer-studio.genlayer.com/tx/0x5ccab3dba913447431953217f325070763c3f6f6693f48f3ef70aec32526e89d) | `FINALIZED`, agreement, four successful decisive executions; tier 0, seller `0.1 GEN`, `PAID_OUT` | `test_dispute_resolved_tier_0`; `test_retry_preserves_each_evidence_commitment` |
| Buyer | Dispute a partial mismatch | `open_dispute` | [`0x8a30…a94f`](https://explorer-studio.genlayer.com/tx/0x8a30903d094b1855ec6730cae7b2c38ed392863289961f97f7b29910a8a0a94f) | `FINALIZED`, agreement, four successful decisive executions; tier 50, `0.05/0.05 GEN`, `PAID_OUT` | `test_dispute_resolved_tier_50`; validator partial-mismatch regressions |
| Buyer | Dispute a material mismatch | `open_dispute` | [`0xec8d…62a1`](https://explorer-studio.genlayer.com/tx/0xec8d9abce9a3d72a7556d5f3e9769f875874942b53ba8faae9b4010af8b362a1) | `FINALIZED`, agreement, successful decisive executions; tier 100, buyer `0.1 GEN`, `PAID_OUT` | `test_dispute_resolved_tier_100`; evidence-binding regressions |
| Buyer | Confirm correct delivery | `confirm_delivery` | [`0x11d5…1a65`](https://explorer-studio.genlayer.com/tx/0x11d5c4c9a7238061c79c9561093d7412d978117c8aa337683e3e9c830caf1a65) | `FINALIZED`, agreement, four successful decisive executions; `BUYER_CONFIRMED`, seller `0.1 GEN`, `PAID_OUT` | `GenDispute.confirm_delivery`; `test_buyer_can_confirm_delivery_and_release_full_escrow` |
| Seller | Recover after the recorded deadline | `recover_expired_order` | [`0xe1c9…ead4`](https://explorer-studio.genlayer.com/tx/0xe1c958d8e04b8107c66b5df5332f23a5371634c664cdfa9275b0b68b48b8ead4) | `FINALIZED`, agreement, four successful decisive executions; `EXPIRED_RECOVERY`, seller `0.1 GEN`, `PAID_OUT` | `GenDispute.recover_expired_order`; recovery permission/early-call regressions |
| Upgrader and unauthorized seller | Rehearse exact-source replacement and authorization rejection on isolated instance | `upgrade` | [Authorized](https://explorer-studio.genlayer.com/tx/0x60303e3389e6c95ca899b2aa26cfdc630a36890f4cb64d9e03847609e3cabfc8) / [rejected](https://explorer-studio.genlayer.com/tx/0x3f7f75c78e54b9af8096328241fac9c72ecbd35dce6bb45a7b4083cbe098a883) | Exact candidate bytes succeeded for the recorded upgrader; unauthorized sender rolled back; source hash/readbacks unchanged | `GenDispute.upgrade`; `test_root_slot_upgrade_is_restricted_to_deployer` |

The first eight rows target the submitted contract `0x7cFC1C241B7bb6Cf636551053dcA403B6ceD48E7`. Upgrade rehearsal intentionally uses isolated instance `0x6A480D0350ACc67C3667F54933839Ddb6d0D4d51` so the submitted escrow state and Root Slot are not mutated during release verification.

### Final-review blocker closure matrix

| Reviewer blocker | Prior failure/root cause | Correction and current contract evidence | Publication/re-test gate |
| --- | --- | --- | --- |
| Missing exact-deployment proof matrix | Current address had only 50% and 100% settlement evidence; normal release, recovery, 0%, and retry were historical or absent. | Orders `2`–`4` now prove buyer confirmation, missing-receipt `UNDETERMINED`, issuer registration, successful 0% retry, and expired recovery on `0x7cFC…48E7`; the consolidated matrix links every write and regression. | Re-query each transaction and order readback; verify escrow conservation and recipients. |
| False current-deployment attribution | README grouped prior-contract confirmation and recovery links under the current deployment. | README now links current-contract transactions `0x11d5…1a65` and `0xe1c9…ead4`; prior-address evidence stays explicitly historical. | Inspect every README link recipient after publication. |
| Incomplete final manifest | Static wording omitted a public exact-revision binding and order-1 creation. | Public annotated tag/GitHub Release bind the final commit without a self-hash cycle; order-1 creation `0x24ae…2956` and the complete current proof matrix are recorded. | Confirm tag target, release notes, GitHub `main`, and all transaction recipients. |
| Missing public license | No root license existed. | Root [`LICENSE`](../LICENSE) contains the user-approved MIT License for `dietthe030-ux`. | Confirm GitHub license detection after push. |
| Protected Vercel deployment URL | The raw Vercel deployment hostname required authentication. | The protected hostname is not used as public evidence. Stable production remains public; the final GitHub Release and GitHub deployment record bind exact commit, Vercel deployment ID, production alias, and a commit-bound public alias. | Open the stable and commit-bound aliases without authentication; compare served assets and contract binding. |

### Prior replacement live evidence collected

- Deployment: [`0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e`](https://explorer-studio.genlayer.com/tx/0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`.
- Order `0` creation: [`0x47820c92ffe2cd7bd5820faca69cf98ad019b5727eb6c2b2f461b847100747f1`](https://explorer-studio.genlayer.com/tx/0x47820c92ffe2cd7bd5820faca69cf98ad019b5727eb6c2b2f461b847100747f1) — seller `0x0d4b...d563`, buyer `0x7885...2339`, `0.1 GEN`, `FINALIZED`, `MAJORITY_AGREE`, leader and three agreeing validators `SUCCESS`.
- Evidence receipt registration: [`0xbb5f7256b6f8194474cf3d466d9503d6196dd5b9805d2ddce7fcc296c17f6c26`](https://explorer-studio.genlayer.com/tx/0xbb5f7256b6f8194474cf3d466d9503d6196dd5b9805d2ddce7fcc296c17f6c26) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`.
- Material-mismatch dispute: [`0x689f98cc38614819171d50797a71dd6c9639a6d947fcffeaf1dc204ffd75feac`](https://explorer-studio.genlayer.com/tx/0x689f98cc38614819171d50797a71dd6c9639a6d947fcffeaf1dc204ffd75feac) — `FINALIZED`, `MAJORITY_AGREE`, three agreeing validator executions `SUCCESS`, with a finalized `0.1 GEN` transfer to the buyer.
- Order `0` readback: `PAID_OUT`, `MATERIAL_MISMATCH`, 100% refund, buyer payout `0.1 GEN`, seller payout `0`.
- Order `1` buyer confirmation: [`0x8ed60188d11129026a5e01f53d8a32f044575f81e461f2abaf011f1c7abe08eb`](https://explorer-studio.genlayer.com/tx/0x8ed60188d11129026a5e01f53d8a32f044575f81e461f2abaf011f1c7abe08eb) — Explorer reports `FINALIZED`, method `confirm_delivery`, execution `SUCCESS`, buyer sender `0x7885...2339`, and the replacement contract as recipient. Live frontend readback showed `PAID_OUT`, `BUYER_CONFIRMED`, buyer payout `0`, and seller payout `0.1 GEN`.
- Order `2` expiry recovery: [`0x9f174a5a46d823d043c6db790d108b7f9e014035ba8e74339a7d6af891be903b`](https://explorer-studio.genlayer.com/tx/0x9f174a5a46d823d043c6db790d108b7f9e014035ba8e74339a7d6af891be903b) — Explorer reports `FINALIZED`, method `recover_expired_order`, execution `SUCCESS`, seller sender `0x0d4b...d563`, and the replacement contract as recipient. Live frontend readback showed `PAID_OUT`, `EXPIRED_RECOVERY`, buyer payout `0`, and seller payout `0.1 GEN`.
- The RPC returned two post-quorum validators as `idle` with `CONSENSUS_VALIDATOR_QUORUM_REACHED`; they did not contribute to the accepted result. The frontend now ignores those non-decisive entries and has a regression matching this live receipt shape.

## Historical V1 evidence

- Contract: [0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE](https://explorer-studio.genlayer.com/address/0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE)
- Deployment: [0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8](https://explorer-studio.genlayer.com/tx/0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8)
- Order creation: [0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f](https://explorer-studio.genlayer.com/tx/0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f)
- Material-mismatch dispute: [0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d](https://explorer-studio.genlayer.com/tx/0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d)
- Buyer transfer: [0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a](https://explorer-studio.genlayer.com/tx/0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a)

These links prove only the older V1 flow and are not counted as remediation deployment evidence.
