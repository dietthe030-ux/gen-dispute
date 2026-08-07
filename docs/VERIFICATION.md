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
| Contract source SHA-256 | `9b1cece7f2feb3af52817bce8e0be62d02f5e493da1671557fa6269faca35a23` |
| Network | GenLayer Studionet, chain ID `61999` |
| Deployment classification | Upgradable through GenLayer Root Slot |
| Selected deployer/upgrader | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Replacement contract | `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d` |
| Deployment transaction | `0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e` |
| Local gate audit | `PASS` |

The release candidate is deployed on Studionet. The deployment is `FINALIZED`, has successful GenVM execution and majority agreement, and its deployed source SHA-256 exactly matches the approved contract source. Independent readback returns `0xbf90af1bc61314775d57b641b89c1f702a93b40d` from both `get_upgrader()` and `get_evidence_issuer()`. Full live workflow verification remains in progress.

## Reviewer-requested remediation

| Request | Implemented evidence |
| --- | --- |
| Consume the ID returned by `create_order` | `useGenDispute.ts` reads `debugTraceTransaction({ round: 0 })`, decodes `return_data` through `abi.calldata.decode`, and loads that exact order. |
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

- Contract: `47 passed`.
- GenVM: lint passed, validation passed, 10 public methods detected.
- Frontend: `38 passed` across 4 test files.
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

- Studionet connection, mandatory per-connect wallet signatures, signature rejection, reconnect-after-disconnect, and network-switch failures;
- explicit order lookup and account-change selection clearing;
- exact `create_order` return decoding under a simulated concurrent count race;
- accepted, finalized, majority-disagree, undetermined, execution-error, finalization-timeout, and post-quorum idle-validator handling, including the live RPC `leader_receipt` shape;
- normal buyer release and expired recovery writes;
- buyer reason-only dispute UI with no outcome/evidence selectors, issuer receipt registration, and reviewer-facing `/docs` content.

## Deployment and recovery gate

The anonymous co-review AI approved the exact `PRE_DEPLOY` revision and source hash. The selected wallet `0xbf90af1bc61314775d57b641b89c1f702a93b40d` deployed the replacement contract and was independently read back as both Root Slot upgrader and evidence issuer. Progression is now gated by the `POST_DEPLOY_TEST` live proof matrix.

### Draft deployment manifest

| Field | Intended value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Exact source revision | Supplied by `git rev-parse HEAD` in the approved deployment package |
| Source SHA-256 | `9b1cece7f2feb3af52817bce8e0be62d02f5e493da1671557fa6269faca35a23` |
| Constructor arguments | None (`__init__(self)`) |
| Deployment classification | `UPGRADABLE` |
| Deployer/upgrader/evidence issuer | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Linked contracts | None |
| Frontend address update | Blocked until post-deployment acceptance and live smoke verification |

The final manifest must add the actual deployment address, Explorer link, deployment transaction, deployed-source readback, final exact revision, and any post-deployment verification transactions.

### Recovery runbooks

**Studio/local UI reset while Studionet state remains:** reconnect the selected upgrader wallet, import the contract by its recorded address, load the exact source identified by the recorded commit and SHA-256, call `get_upgrader()`, and compare the returned address with the manifest before any upgrade or write.

**Studionet/network-state reset:** treat the prior address and state as unrecoverable. Redeploy the exact recorded source with no constructor arguments from the selected wallet, verify `FINALIZED`, execution `SUCCESS`, deployed-source parity, and `get_upgrader()` readback, rerun the full live proof matrix, then update the frontend address and all deployment documentation. Do not present the previous address as current evidence.

Before the replacement can pass `POST_DEPLOY_TEST`:

1. ~~deploy the exact contract source above on Studionet~~ — completed at `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d`;
2. ~~verify deployment `FINALIZED`, execution `SUCCESS`, Explorer source parity, upgrader readback, and evidence-issuer readback~~ — completed;
3. rehearse authorized upgrade and unauthorized rejection on a separate throwaway deployment;
4. prove exact-ID order creation, buyer confirmation, evidence-bound dispute settlement, and expiry recovery with transaction receipts and state readback;
5. update the frontend environment to the verified replacement address and verify the live application;
6. update this file with the replacement contract, deployment transaction, proof matrix, and final exact release commit.

### Replacement live evidence collected

- Deployment: [`0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e`](https://explorer-studio.genlayer.com/tx/0x13c21f3c5d5aea282fda77c0c8d503cee8c1aff2093e6ca0b5efc11224e4a73e) — `FINALIZED`, `MAJORITY_AGREE`, decisive executions `SUCCESS`.
- Order `0` creation: [`0x47820c92ffe2cd7bd5820faca69cf98ad019b5727eb6c2b2f461b847100747f1`](https://explorer-studio.genlayer.com/tx/0x47820c92ffe2cd7bd5820faca69cf98ad019b5727eb6c2b2f461b847100747f1) — seller `0x0d4b...d563`, buyer `0x7885...2339`, `0.1 GEN`, `FINALIZED`, `MAJORITY_AGREE`, leader and three agreeing validators `SUCCESS`.
- Order `0` readback: `OPEN`, `0.1 GEN` escrow, Casio Version B listing, zero dispute attempts, no receipt yet.
- The RPC returned two post-quorum validators as `idle` with `CONSENSUS_VALIDATOR_QUORUM_REACHED`; they did not contribute to the accepted result. The frontend now ignores those non-decisive entries and has a regression matching this live receipt shape.

## Historical V1 evidence

- Contract: [0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE](https://explorer-studio.genlayer.com/address/0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE)
- Deployment: [0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8](https://explorer-studio.genlayer.com/tx/0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8)
- Order creation: [0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f](https://explorer-studio.genlayer.com/tx/0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f)
- Material-mismatch dispute: [0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d](https://explorer-studio.genlayer.com/tx/0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d)
- Buyer transfer: [0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a](https://explorer-studio.genlayer.com/tx/0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a)

These links prove only the older V1 flow and are not counted as remediation deployment evidence.
