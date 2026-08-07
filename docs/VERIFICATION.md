# Verification

## Release candidate

| Field | Value |
| --- | --- |
| Project | GenDispute |
| Submission category | Project |
| Contract source-origin commit | `e2147fde7975e37cd8620a6c60f4a60e917e077d` |
| Pre-deploy evidence baseline commit | `6ab106be3d9438f83e48f1cd273ff30c954f62af` |
| Exact reviewed revision | Supplied by `git rev-parse HEAD` in each checkpoint package; it is not self-embedded because editing this file changes the commit hash. |
| Contract source SHA-256 | `d240e8da50f1e8f1d1660deb8881ff585211ec22ed214909cdca0dcfbceadb0c` |
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
| Bind evidence to each order | Leader and validators independently SHA-256 hash fetched evidence bytes. Stable consensus includes those hashes, and the contract stores a canonical commitment for each allowed submission. |
| Add normal release | The named buyer can call `confirm_delivery`; the contract records `BUYER_CONFIRMED` and releases the full escrow to the seller. |
| Add locked-fund recovery | Every order has a bounded deadline. After expiry, the buyer or seller can call `recover_expired_order` for `OPEN` or `UNDETERMINED` state; the seller-funded escrow returns to the seller. |

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

- Contract: `33 passed`.
- GenVM: lint passed, validation passed, 8 public methods detected.
- Frontend: `35 passed` across 4 test files.
- Oxlint: zero errors.
- TypeScript and Vite production build: passed.
- Repository gate audit: `PASS`.
- Whitespace error check: passed.
- Known non-blocking output: Vite reports a production chunk above 500 kB.

Contract tests use an isolated WSL environment with `genlayer-test==0.29.2`. Web, LLM, wallet, and SDK behavior is mocked locally; these results do not substitute for Studionet transactions.

## Contract safety coverage

- positive escrow, buyer/seller separation, registered listing, and snapshot validation;
- independent leader and validator evidence retrieval and semantic evaluation;
- exact evidence-byte hash agreement and canonical submission commitments;
- malformed, contradictory, insufficient, changed, and injection-style evidence paths;
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
- listing-aware evidence presets and reviewer-facing `/docs` content.

## Deployment and recovery gate

The user selected and confirmed the external deployment wallet `0xbf90af1bc61314775d57b641b89c1f702a93b40d`. The replacement deployment remains blocked until the anonymous co-review AI returns `APPROVED` for the exact `PRE_DEPLOY` revision and evidence package. At deployment, the selected wallet must send the deployment transaction, be registered by the constructor, and be independently read back through `get_upgrader()`.

### Draft deployment manifest

| Field | Intended value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Contract source | `contracts/gen_dispute.py` |
| Source-origin commit | `e2147fde7975e37cd8620a6c60f4a60e917e077d` |
| Source SHA-256 | `d240e8da50f1e8f1d1660deb8881ff585211ec22ed214909cdca0dcfbceadb0c` |
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
