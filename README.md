# GenDispute

GenDispute is a seller-funded GEN escrow prototype for item-not-as-described trades on GenLayer Studionet. It combines public evidence, validator consensus, and deterministic 0%, 50%, or 100% buyer refunds.

![GenDispute application](docs/gen-dispute-live.png)

## Verified links

| Item | Link | Current status |
| --- | --- | --- |
| Web application | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) | Public V1 at `/` with reviewer documentation at `/docs` |
| Submitted V1 contract | [`0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE`](https://explorer-studio.genlayer.com/address/0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE) | Historical deployment and settlement evidence for the submitted V1 |
| Source repository | [dietthe030-ux/gen-dispute](https://github.com/dietthe030-ux/gen-dispute) | Public repository before the remediation release |
| Verification record | [docs/VERIFICATION.md](docs/VERIFICATION.md) | Local remediation evidence and deployment gate status |
| Network | GenLayer Studionet, chain ID `61999` | RPC `https://studio.genlayer.com/api` |

The remediation source in this worktree is newer than the public V1 links above. V1 was frozen, so a replacement Studionet deployment and matching Vercel configuration are required before resubmission. No replacement address is claimed before that evidence exists.

## Trust problem

A deterministic escrow can hold funds and enforce access control, but it cannot decide whether public evidence shows that a delivered item matches its listing. Giving that decision to one marketplace administrator or hosted LLM API creates a new trusted party that can change the prompt, model, evidence, or verdict without validator agreement.

GenDispute keeps custody, state transitions, evidence commitments, and payout arithmetic in the Intelligent Contract. The seller controls the listing terms and deadline; the buyer controls the dispute claim and evidence URLs; neither party can supply the verdict or refund tier.

## Why GenLayer is essential

The core decision combines live public web content with semantic comparison against the stored listing snapshot. The contract leader fetches evidence through `gl.nondet.web.get` and evaluates it through `gl.nondet.exec_prompt`. Validators independently repeat both operations.

A verdict is accepted only when schema and internal-consistency guards pass and validators agree on the stable consequential fields: `reason_code`, `refund_tier`, `evidence_sufficient`, and the SHA-256 hashes of the exact fetched bytes. Free-form summaries are not compared byte-for-byte. This source-grounded consensus and its direct on-chain payout cannot be replaced by traditional Solidity or one centralized AI response without reintroducing a trusted operator.

## How it works

### Seller

1. Connect a wallet on Studionet.
2. Name the buyer, select a registered fixture listing, choose a timeout, and deposit native GEN through `create_order`.
3. The frontend decodes the exact returned order ID from the GenVM trace. The global count is display-only and is never used to infer the created order.
4. Wait for buyer confirmation, a dispute verdict, or deadline recovery.

### Buyer

1. Load the known order ID and inspect its seller, listing snapshot, escrow, and deadline.
2. Confirm a correct delivery to release the full escrow to the seller, or submit a reason and one or two public evidence URLs through `open_dispute`.
3. If evaluation is undetermined, retry once with new evidence.

### Either named party

After the deadline, the buyer or seller can call `recover_expired_order` for an `OPEN` or `UNDETERMINED` order. Because the seller funded this prototype escrow, expiry releases the full amount back to the seller.

## Architecture

| Layer | Responsibility |
| --- | --- |
| Intelligent Contract | Authoritative orders, participants, deadlines, evidence commitments, verdicts, payouts, terminal states, and Root Slot upgrade authorization |
| GenLayer consensus | Independent web retrieval and semantic reevaluation before consequential verdict fields are accepted |
| React + Vite frontend | Wallet connection, Studionet switching, write submission, returned-ID decoding, receipt verification, explicit state readback, and user-facing recovery errors |
| Public fixture pages | Bounded demo listings and evidence; never authoritative application state |

There is no backend database or off-chain verdict service. Contract reads are the application source of truth.

## Intelligent Contract

Order states are `OPEN`, `DISPUTE_PENDING`, `UNDETERMINED`, transient `RESOLVED`, and terminal `PAID_OUT`. Deterministic participant, amount, listing, deadline, retry, duplicate-action, and URL checks run before nondeterministic evaluation.

Each dispute submission stores a canonical SHA-256 commitment over its order ID, submission number, reason, URLs, and fetched content hashes. Both allowed submission commitments are retained. A later URL change therefore cannot rewrite the bytes that were bound to the on-chain decision, although the contract does not preserve the source page itself.

| Method | Kind | Return | Behavior |
| --- | --- | --- | --- |
| `create_order(buyer, listing_url, listing_snapshot, item_description, timeout_seconds = 604800)` | Payable write | `u256` | Creates an isolated timed order and returns its ID |
| `open_dispute(order_id, reason, evidence_url_1, evidence_url_2 = "")` | Write | `None` | Fetches, hashes, evaluates, and attempts to settle buyer evidence |
| `confirm_delivery(order_id)` | Write | `None` | Buyer releases the full escrow to the seller |
| `recover_expired_order(order_id)` | Write | `None` | Either named party releases an expired open or undetermined escrow to the seller |
| `upgrade(new_code)` | Write | `None` | Registered Root Slot upgrader replaces code; empty or unauthorized calls fail |
| `get_upgrader()` | View | `bytes` | Returns the deployment upgrader |
| `get_order_count()` | View | `int` | Returns the number of stored orders |
| `get_order(order_id)` | View | `dict` | Returns public state for one explicit order |

Escrow conservation is deterministic: buyer share is `escrow * tier // 100`, seller share is the remainder, and the two stored payouts always sum to the deposited amount. State becomes terminal before external transfer messages are emitted.

## Transaction lifecycle

For every write, the frontend:

1. requests or switches the wallet to Studionet;
2. asks the wallet to sign and submits `client.writeContract`;
3. displays submission and consensus-pending states;
4. waits for `ACCEPTED` and checks consensus plus the leader and agreeing validators' GenVM execution results;
5. decodes `create_order` return data through `debugTraceTransaction` and `abi.calldata.decode`, when applicable;
6. reads the affected order directly from the contract;
7. waits for `FINALIZED`, checks execution `SUCCESS` again, and reconciles state; and
8. keeps a timed-out finalization visible as accepted/pending rather than reporting false success.

Validators cancelled after quorum are not treated as failed transactions. Wallet rejection, RPC, validation, consensus, execution, readback, and timeout errors remain visible in the transaction panel. Account changes clear the selected order.

## Run locally

Prerequisites: Node.js, npm, Python, `genlayer-test==0.29.2`, and `genvm-lint`.

```bash
git clone https://github.com/dietthe030-ux/gen-dispute.git
cd gen-dispute/frontend
npm install
cp .env.example .env
# Set VITE_CONTRACT_ADDRESS only to a verified Studionet deployment.
npm run dev
```

Routes:

- `/` — wallet, explicit order lookup, create, confirm, dispute, recovery, and settlement state.
- `/docs` — reviewer-facing product, architecture, trust boundary, and method reference.

## Tests and verification

Contract:

```bash
gltest tests/test_gen_dispute.py
genvm-lint check contracts/gen_dispute.py
```

Frontend:

```bash
cd frontend
npm test -- --run
npm run lint
npm run build
```

Current local results:

- 33 contract tests passed.
- 35 frontend tests passed, including a concurrent-creation regression where the returned ID differs from `count - 1`.
- GenVM lint and validation passed.
- Oxlint, TypeScript compilation, and the Vite production build passed.
- The production build reports a non-blocking large-chunk warning.

Local tests mock web, model, wallet, and SDK behavior. They are regression evidence, not live-chain proof.

## Deployment and recovery

`frontend/.env.example` contains no address. The replacement contract must be deployed on Studionet by a verified external user-controlled wallet, and that same wallet must be read back through `get_upgrader`. The deployment transaction must be `FINALIZED`, execution `SUCCESS`, and the Explorer source must match `contracts/gen_dispute.py` before the frontend environment changes.

The submitted V1 [deployment](https://explorer-studio.genlayer.com/tx/0x7ebe17a1815e77ffcd2e6f3587693dfd3a44e7ff475f9a05ebb90fe5e19ceab8), [order creation](https://explorer-studio.genlayer.com/tx/0x6e066962310c5736670c6a20170cc61b8b81b3065e859ef78356114c33056e7f), [material-mismatch dispute](https://explorer-studio.genlayer.com/tx/0x43f8916eace1c93da67ac8fe4173e85ab55e945feafd0bde094a73fcb8695e9d), and [buyer transfer](https://explorer-studio.genlayer.com/tx/0x312f9bba5a7a0663a75da2fc46a1f41924b9416fc855c164b939d6c4e200d69a) remain historical evidence only. The replacement release requires new proof for returned-ID creation, normal release, dispute evidence binding, and expiry recovery.

The contract is classified as upgradable through GenLayer Root Slot. Any upgrade requires the registered external wallet, a non-empty source payload, local regression verification, an isolated rehearsal deployment, deployed-source parity checks, and fresh exact-revision review.

## Security and trust boundaries

- Listing creation is limited to a deterministic fixture registry; the listing URL itself is not fetched.
- Evidence HTML is untrusted data. The prompt instructs evaluators to ignore embedded commands, and injection fixtures exercise that boundary.
- Exact evidence-byte hashes are consensus-bound, but public URL ownership, publisher identity, long-term availability, and real-world custody are not authenticated.
- Only the buyer may dispute or confirm; only the buyer or seller may trigger expired recovery; only the registered upgrader may replace code.
- Studionet GEN is simulated test-network value. This prototype has not received a production security audit.

## Known limitations

- The fixture registry and three payout tiers are intentionally narrow and do not support arbitrary marketplace listings.
- There is no mutual cancellation path.
- Evidence bytes are committed but not stored in content-addressed storage and may later disappear from their original URLs.
- Live remediation evidence and a replacement contract address do not exist until the gated redeployment is completed.
- Only the older V1 has a supervised live 100% material-mismatch settlement; 0% and 50% remain local-test-only paths.
- The frontend currently depends on an injected EIP-1193 wallet and browser polling.

See [ROADMAP.md](ROADMAP.md) for deployment verification, durable evidence storage, observability, cancellation policy, and controlled pilot plans.
