# Verification

## Release candidate

| Field | Value |
| --- | --- |
| Project | GenDispute |
| Submission category | Project |
| Prior anonymous-reviewed commit | `d30ea42c01b922889642da93fa209ff887ee5161` (`CHANGES REQUIRED`) |
| Prior reviewed contract SHA-256 | `d240e8da50f1e8f1d1660deb8881ff585211ec22ed214909cdca0dcfbceadb0c` |
| Exact reviewed revision | Supplied by `git rev-parse HEAD` in each checkpoint package; it is not self-embedded because editing this file changes the commit hash. |
| Contract source SHA-256 | `78d7d013ddc747a9776468ee01194744d2d86363e0c18f8dd4a58c2ae8604515` |
| Network | GenLayer Studionet, chain ID `61999` |
| Deployment classification | Upgradable through GenLayer Root Slot |
| Selected deployer/upgrader | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Local gate audit | `PASS` |

The release candidate is locally verified but not yet deployed. The submitted V1 contract at `0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE` is frozen and does not contain this remediation source. It remains historical evidence only.

## Reviewer-requested remediation

| Request | Implemented evidence |
| --- | --- |
| Consume the ID returned by `create_order` | `useGenDispute.ts` reads `debugTraceTransaction({ round: 0 })`, decodes `return_data` through `abi.calldata.decode`, and loads that exact order. |
| Cover concurrent order creation | The frontend regression sets the global count to `12` while `create_order` returns ID `7`, then proves the UI loads order `7`. The count is display-only. |
| Bind immutable evidence to each order | `create_order` freezes an exact policy containing `order_id`-specific HTTPS URLs, canonical item ID, source validity windows, publisher ID, and expected body SHA-256 values. Leader and validators independently enforce that policy, and each attempt stores observation time, exact byte and attestation hashes, plus a canonical submission commitment. |
| Add normal release | The named buyer can call `confirm_delivery`; the contract records `BUYER_CONFIRMED` and releases the full escrow to the seller. |
| Add locked-fund recovery | Every order has a bounded deadline. After expiry, the buyer or seller can call `recover_expired_order` for `OPEN` or `UNDETERMINED` state; the seller-funded escrow returns to the seller. |

## Anonymous PRE_DEPLOY blocker closure

| Prior blocker | Corrected design | Regression evidence |
| --- | --- | --- |
| Evidence was not authenticated or order-specific | Arbitrary and wrong-order URLs are rejected. Every order freezes an order-ID-bound source policy before a dispute. Attestations must match the registered publisher, canonical item, evidence set, and validity window; unknown publisher, wrong item, stale, duplicate, and conflicting sources fail closed as `UNDETERMINED` with zero payout. The demo publisher is policy-registered and byte-hash-pinned, but not represented as an externally certified real-world identity. | Contract tests cover wrong order, unknown source/publisher, wrong item, stale source, conflicting source sets, mutated bytes, valid immutable evidence, and all three payout tiers. |
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
- GenVM: lint passed, validation passed, 8 public methods detected.
- Frontend: `36 passed` across 4 test files.
- Oxlint: zero errors.
- TypeScript and Vite production build: passed.
- Repository gate audit: `PASS`.
- Whitespace error check: passed.
- Known non-blocking output: Vite reports a production chunk above 500 kB.

Contract tests use an isolated WSL environment with `genlayer-test==0.29.2`. Web, LLM, wallet, and SDK behavior is mocked locally; these results do not substitute for Studionet transactions.

## Contract safety coverage

- positive escrow, buyer/seller separation, registered listing, and snapshot validation;
- independent leader and validator evidence retrieval and semantic evaluation;
- frozen order/item/source/time/body-hash policy plus exact evidence-byte and attestation-hash agreement;
- wrong-order, unknown-publisher, wrong-item, stale, conflicting, malformed, changed, and injection-style evidence paths;
- HTTP error, unsupported content type, oversized body, invalid UTF-8, missing attestation, and hostile reason paths;
- 0%, 50%, and 100% conservation and transfer targets;
- buyer-only dispute and confirmation authorization;
- deadline bounds, no early recovery, named-party recovery, and no duplicate terminal action;
- two-attempt commitment preservation and expired `UNDETERMINED` recovery;
- Root Slot upgrader readback, unauthorized rejection, empty-code rejection, and authorized replacement.

## Frontend safety coverage

- Studionet connection and network-switch failures;
- explicit order lookup and account-change selection clearing;
- exact `create_order` return decoding under a simulated concurrent count race;
- accepted, finalized, majority-disagree, undetermined, execution-error, and finalization-timeout handling;
- normal buyer release and expired recovery writes;
- listing- and order-aware immutable evidence presets, arbitrary-source rejection, and reviewer-facing `/docs` content.

## Deployment and recovery gate

The user selected and confirmed the external deployment wallet `0xbf90af1bc61314775d57b641b89c1f702a93b40d`. The replacement deployment remains blocked until the anonymous co-review AI returns `APPROVED` for the exact `PRE_DEPLOY` revision and evidence package. At deployment, the selected wallet must send the deployment transaction, be registered by the constructor, and be independently read back through `get_upgrader()`.

### Draft deployment manifest

| Field | Intended value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Exact source revision | Supplied by `git rev-parse HEAD` in the approved deployment package |
| Source SHA-256 | `78d7d013ddc747a9776468ee01194744d2d86363e0c18f8dd4a58c2ae8604515` |
| Constructor arguments | None (`__init__(self)`) |
| Deployment classification | `UPGRADABLE` |
| Deployer/upgrader | `0xbf90af1bc61314775d57b641b89c1f702a93b40d` |
| Linked contracts | None |
| Frontend address update | Blocked until post-deployment acceptance and live smoke verification |

The final manifest must add the actual deployment address, Explorer link, deployment transaction, deployed-source readback, final exact revision, and any post-deployment verification transactions.

### Recovery runbooks

**Studio/local UI reset while Studionet state remains:** reconnect the selected upgrader wallet, import the contract by its recorded address, load the exact source identified by the recorded commit and SHA-256, call `get_upgrader()`, and compare the returned address with the manifest before any upgrade or write.

**Studionet/network-state reset:** treat the prior address and state as unrecoverable. Redeploy the exact recorded source with no constructor arguments from the selected wallet, verify `FINALIZED`, execution `SUCCESS`, deployed-source parity, and `get_upgrader()` readback, rerun the full live proof matrix, then update the frontend address and all deployment documentation. Do not present the previous address as current evidence.

Before the replacement can be accepted:

1. deploy the exact contract source above on Studionet;
2. verify deployment `FINALIZED`, execution `SUCCESS`, Explorer source parity, and upgrader readback;
3. rehearse authorized upgrade and unauthorized rejection on a separate throwaway deployment;
4. prove exact-ID order creation, buyer confirmation, evidence-bound dispute settlement, and expiry recovery with transaction receipts and state readback;
5. update the frontend environment to the verified replacement address and verify the live application;
6. update this file with the replacement contract, deployment transaction, proof matrix, and final exact release commit.

## Historical V1 evidence

- Contract: [0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE](https://explorer-studio.genlayer.com/address/0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE)
- Deployment: [0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8](https://explorer-studio.genlayer.com/tx/0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8)
- Order creation: [0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f](https://explorer-studio.genlayer.com/tx/0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f)
- Material-mismatch dispute: [0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d](https://explorer-studio.genlayer.com/tx/0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d)
- Buyer transfer: [0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a](https://explorer-studio.genlayer.com/tx/0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a)

These links prove only the older V1 flow and are not counted as remediation deployment evidence.
