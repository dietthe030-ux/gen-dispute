# Verification

## Release candidate

| Field | Value |
| --- | --- |
| Project | GenDispute |
| Submission category | Project |
| Prior anonymous-reviewed commit | `f3e81b81221b7ae7b04bb5bbcbbb4c9bd3d86c58` (`CHANGES REQUIRED`) |
| Prior reviewed contract SHA-256 | `78d7d013ddc747a9776468ee01194744d2d86363e0c18f8dd4a58c2ae8604515` |
| Approved PRE_DEPLOY commit | `a350de3db6fea88918cb55110225e9cb9f90b6d1` (`APPROVED`) |
| Exact reviewed revision | Supplied by `git rev-parse HEAD` in each checkpoint package; it is not self-embedded because editing this file changes the commit hash. |
| Current candidate source SHA-256 | `22d16b89b97f9570107adc76fe7d9f212641a7b04b0611d1b872bf47911cb6ed` |
| Current candidate deployment status | Not deployed; fresh deployment or authorized upgrade required |
| Prior deployed source SHA-256 | `9b1cece7f2feb3af52817bce8e0be62d02f5e493da1671557fa6269faca35a23` |
| Network | GenLayer Studionet, chain ID `61999` |
| Deployment classification | Upgradable through GenLayer Root Slot |
| Selected deployer/upgrader | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Replacement contract | `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d` |
| Deployment transaction | `0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e` |
| Local gate audit | `PASS` |

The recorded Studionet deployment is `FINALIZED`, has successful GenVM execution and majority agreement, and matches the prior deployed source hash above. It does not contain the current validator-compatibility fix. The current candidate must receive a new address or authorized upgrade, source-parity verification, and fresh live consensus evidence before release.

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
- Frontend: `46 passed` across 5 test files.
- Oxlint: zero errors.
- TypeScript and Vite production build: passed.
- Repository gate audit: `PASS`.
- Whitespace error check: passed.
- Known non-blocking output: Vite reports a production chunk above 500 kB.

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

## Frontend safety coverage

- EIP-6963/EIP-1193 injected-wallet discovery, explicit provider selection, Studionet switching, mandatory per-connect wallet signatures, signature rejection, reconnect-after-disconnect, and network-switch failures;
- explicit order lookup and account-change selection clearing;
- exact `create_order` return decoding under a simulated concurrent count race;
- accepted, finalized, majority-disagree, undetermined, execution-error, finalization-timeout, same-origin RPC retry behavior without 429 amplification, order-scoped transaction attribution, post-submission RPC recovery through terminal state readback, and post-quorum idle-validator handling, including the live RPC `leader_receipt` shape;
- normal buyer release and expired recovery writes;
- buyer reason-only dispute UI with no outcome/evidence selectors, issuer receipt registration, and reviewer-facing `/docs` content.

## Deployment and recovery gate

The prior source completed its recorded deployment checks. The current candidate source hash has changed to fix a live validator-compatibility defect and therefore requires a fresh exact-revision review and deployment gate before it can replace the live baseline.

### Current candidate draft deployment manifest

| Field | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Source revision | Supplied by `git rev-parse HEAD` in the review package |
| Source SHA-256 | `22d16b89b97f9570107adc76fe7d9f212641a7b04b0611d1b872bf47911cb6ed` |
| Constructor arguments | None (`__init__(self)`) |
| Deployment classification | `UPGRADABLE` |
| Selected deployer/upgrader/evidence issuer | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Linked contracts | None |
| Contract address |  |
| Deployment transaction |  |
| Frontend update | Only after `FINALIZED`, execution `SUCCESS`, source parity, and role readbacks are verified |

The recovery runbooks below apply to this candidate after its address and deployment transaction are recorded. Until then, the prior live contract remains isolated from the candidate release.

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
| Production frontend | `https://gen-dispute.vercel.app` targets this prior live contract |

The exact candidate revision is supplied by `git rev-parse HEAD` in each review package rather than embedded in this file. The manifest above remains evidence for the prior deployed source only.

### Recovery runbooks

**Studio/local UI reset while Studionet state remains:** reconnect the selected upgrader wallet, import the contract by its recorded address, load the exact source identified by the recorded commit and SHA-256, call `get_upgrader()`, and compare the returned address with the manifest before any upgrade or write.

**Studionet/network-state reset:** treat the prior address and state as unrecoverable. Redeploy the exact recorded source with no constructor arguments from the selected wallet, verify `FINALIZED`, execution `SUCCESS`, deployed-source parity, and `get_upgrader()` readback, rerun the full live proof matrix, then update the frontend address and all deployment documentation. Do not present the previous address as current evidence.

Completed `POST_DEPLOY_TEST` requirements:

1. ~~deploy the exact contract source above on Studionet~~ — completed at `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d`;
2. ~~verify deployment `FINALIZED`, execution `SUCCESS`, Explorer source parity, upgrader readback, and evidence-issuer readback~~ — completed;
3. ~~rehearse authorized upgrade and unauthorized rejection on a separate test deployment~~ — completed by `test_root_slot_upgrade_is_restricted_to_deployer`, using the GenLayer Testing Suite lifecycle recommended by the official upgradability documentation;
4. ~~verify exact-ID creation, evidence-bound dispute settlement, buyer confirmation, and expiry recovery~~ — completed with Explorer transaction evidence and live frontend state readback;
5. ~~update the frontend environment to the verified replacement address and verify the live application~~ — completed;
6. ~~update this file with the replacement contract, deployment transaction, proof matrix, and exact-release revision procedure~~ — completed.

### Replacement live evidence collected

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
