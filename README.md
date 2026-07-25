# GenDispute

GenDispute is an evidence-aware GEN escrow prototype for item-not-as-described disputes on GenLayer Studionet. A seller creates an order and locks GEN for a named buyer. If the buyer disputes the delivery, the Intelligent Contract evaluates public evidence and settles a fixed 0%, 50%, or 100% buyer refund.

## Trust problem

An escrow contract can hold funds and enforce access control, but a conventional deterministic contract cannot decide whether public evidence shows that an item matches its listing. Sending that decision to one marketplace administrator or one hosted LLM API creates a new trusted party that can change its model, prompt, or result without validator agreement.

GenDispute keeps custody and payout arithmetic in the contract while GenLayer validators independently perform the evidence evaluation. The current prototype is deliberately bounded: listing snapshots come from a small deterministic fixture registry, evidence must be available at public HTTP(S) URLs, and the only payout tiers are 0%, 50%, and 100%.

## How it works

1. The seller calls `create_order`, names the buyer, supplies a registered listing URL and matching snapshot, and deposits native GEN.
2. The frontend reads the returned order through an explicit order ID. It never chooses order `0` automatically after a wallet change.
3. The named buyer may call `open_dispute` with a reason and one or two public evidence URLs.
4. Inside `run_nondet_unsafe`, the leader fetches each evidence URL with `gl.nondet.web.get` and asks `gl.nondet.exec_prompt` for structured discrepancy fields.
5. Each validator fetches and evaluates the same evidence independently. It first rejects malformed or internally contradictory output, then compares the stable decision fields `reason_code`, `refund_tier`, and `evidence_sufficient`. Free-form summaries are not compared byte-for-byte.
6. Consensus can produce a 0%, 50%, or 100% buyer refund. The contract calculates complementary buyer and seller shares and emits native GEN transfers. Insufficient or failed evaluation moves the order to `UNDETERMINED` and preserves the escrow for at most one retry.

Deterministic authorization, order state, retry-cap, deposit, duplicate-action, and URL checks run before nondeterministic evaluation.

## Why GenLayer is required

The core decision combines live public web content with semantic comparison against the stored listing snapshot. Solidity-style deterministic execution cannot fetch and interpret that evidence by itself. A centralized LLM endpoint could perform the comparison, but its operator would remain the sole authority over the prompt and verdict.

GenLayer lets the decision execute within an Intelligent Contract and be checked by validators that independently repeat the source-grounded task. Schema validation remains a safety guard; it is not treated as consensus. After consensus, payout rules are deterministic and on-chain.

## Live deployment

| Component | Current public endpoint | Verified status on July 26, 2026 |
| --- | --- | --- |
| Web application | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) | React + Vite application with `/` and `/docs` routes |
| Production contract | [`0xD37A4f08C46397da6Efa87a0009F4516B925A5f5`](https://explorer-studio.genlayer.com/address/0xD37A4f08C46397da6Efa87a0009F4516B925A5f5) | Current source verified in Explorer; [deployment transaction](https://explorer-studio.genlayer.com/tx/0xb6ac673c903453abb5a522063ac9cf7b139d5c8568bb40c30c8478806671bcb5) is `FINALIZED`, `SUCCESS`, and accepted |
| Network | GenLayer Studionet, chain ID `61999` | RPC: `https://studio.genlayer.com/api` |

An independent `get_order_count()` read returned `0` after deployment. No legacy contract is used by the submitted frontend or listed as the implementation target.

## Intelligent Contract API

The signatures below are taken directly from `contracts/gen_dispute.py`.

| Method | Kind | Return | Behavior |
| --- | --- | --- | --- |
| `create_order(buyer: Address, listing_url: str, listing_snapshot: str, item_description: str)` | Payable write | `u256` | Creates an isolated order and returns its ID |
| `open_dispute(order_id: u256, reason: str, evidence_url_1: str, evidence_url_2: str = "")` | Write | `None` | Evaluates buyer evidence and attempts settlement |
| `get_order_count()` | View | `int` | Returns the number of stored orders |
| `get_order(order_id: u256)` | View | `dict` | Returns the selected order's public state |

Order states are `OPEN`, `DISPUTE_PENDING`, `UNDETERMINED`, transient `RESOLVED`, and final `PAID_OUT`.

## Frontend and transaction lifecycle

The frontend is React 19 + TypeScript + Vite with `genlayer-js` and an injected EIP-1193 wallet.

For each write, the application:

1. requests or switches the wallet to Studionet;
2. asks the wallet to sign and submits `client.writeContract`;
3. displays submission and consensus-pending states;
4. waits for an `ACCEPTED` receipt and checks consensus plus GenVM execution results;
5. refreshes the affected contract state;
6. waits for `FINALIZED`, checks execution results again, and refreshes state;
7. keeps an accepted transaction visible as finalization-pending on timeout instead of reporting a false failure; and
8. shows wallet, RPC, consensus, execution, validation, and timeout errors in the transaction panel.

Routes:

- `/` - wallet connection, explicit order lookup, order creation, dispute, and result UI.
- `/docs` - reviewer-facing product, architecture, and contract reference.

## Repository layout

```text
contracts/gen_dispute.py       Intelligent Contract
tests/test_gen_dispute.py      GenVM contract tests
fixtures/                      Local HTML evidence fixtures
frontend/src/                 React application and tests
frontend/README.md            Frontend setup and lifecycle details
docs/gen-dispute-live.png     Screenshot captured from the live app
ROADMAP.md                    Delivered scope, limits, and future stages
```

## Local setup and verification

Contract:

```bash
gltest tests/test_gen_dispute.py
genvm-lint check contracts/gen_dispute.py
```

Frontend:

```bash
cd frontend
npm install
npm test -- --run
npm run lint
npm run build
```

Current local results:

- 24 contract tests passed.
- 27 frontend tests passed.
- GenVM lint, frontend lint, TypeScript compilation, and the Vite production build passed.

Local tests mock web, model, wallet, and SDK behavior; they are regression evidence, not proof of a live dispute settlement.

## Configuration and deployment

`frontend/.env.example` intentionally contains no contract address. Local and Vercel environments must set `VITE_CONTRACT_ADDRESS` to the verified production address shown above. Keep local `.env` files untracked and confirm that the address rendered by `/` and `/docs` matches Explorer after every deployment.

## Known limitations

- Order creation accepts only the contract's hardcoded fixture listing registry; the listing URL itself is not fetched.
- Evidence URLs are buyer-supplied public pages, not guaranteed authoritative sources. They can change or disappear and are not content-addressed.
- No buyer-confirmation, cancellation, deadline, timeout settlement, or emergency recovery flow exists.
- Two undetermined attempts can leave escrow locked.
- The current production contract has a verified deployment and read, but no order, dispute, verdict, or payout transaction.
- The production bundle currently emits a non-blocking large-chunk warning.
- Studionet is a test environment and the contract has not received a production security audit.

See [ROADMAP.md](ROADMAP.md) for proposed lifecycle recovery, immutable evidence, observability, and pilot work.
