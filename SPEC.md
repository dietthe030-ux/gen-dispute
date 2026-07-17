# GenDispute Multi-Order Specification

## 1. Objective

GenDispute demonstrates evidence-aware escrow on GenLayer Studionet. One contract instance can hold multiple independent item-sale orders. Each order binds a seller, buyer, listing snapshot, GEN escrow balance, dispute evidence, and settlement state to a numeric `order_id`.

The Intelligent Contract interprets public evidence through GenLayer consensus while keeping authorization, state transitions, allowed refund tiers, and payout arithmetic deterministic.

## 2. Contract scope

1. A seller creates an order by depositing a positive native GEN amount.
2. The contract appends the order and returns its zero-based `order_id`.
3. Any caller may read the number of orders or inspect a known order ID.
4. Only the buyer assigned to an order may dispute that order.
5. A dispute includes a reason and one or two public evidence URLs.
6. A valid consensus result pays the buyer 0%, 50%, or 100% of that order's escrow and pays the seller the remainder.
7. An undetermined result moves only the targeted order to `UNDETERMINED`, moves no funds, and permits one retry.

## 3. Frontend scope

- Connect an injected EIP-1193 wallet on Studionet.
- Do not auto-select any order when a wallet connects or changes.
- Show an explicit order ID lookup.
- Allow a connected user to create another order even when orders already exist.
- Display the selected order's ID, participants, escrow, listing, status, and dispute attempts.
- Derive Buyer, Seller, or Observer from the selected order and connected address.
- Include `order_id` in every dispute write and state refresh.
- Track transaction acceptance, finalization, execution errors, undetermined results, and payouts.
- Provide `/docs` with the current multi-order method reference.

## 4. Storage and state model

The contract stores `orders: DynArray[Order]`. Each `Order` contains:

- `order_id`
- `seller`, `buyer`, `escrow_amount`
- `listing_url`, `listing_snapshot`, `item_description`
- `status`, `dispute_attempts`, `dispute_reason`
- two evidence URL fields
- `refund_tier`, `buyer_payout`, `seller_payout`
- `outcome`, `last_error`

Supported states are `OPEN`, `DISPUTE_PENDING`, `RESOLVED`, `UNDETERMINED`, and `PAID_OUT`.

## 5. Invariants

- An order ID is the index assigned when the order is appended.
- A missing order ID is rejected.
- One order's creation, dispute, retry, verdict, or payout cannot modify another order.
- Escrow must be positive.
- Seller and buyer must differ.
- Only an order's buyer can open its dispute.
- Only `OPEN` or eligible `UNDETERMINED` orders can be disputed.
- No order permits more than two dispute attempts.
- A resolved or paid order cannot be disputed again.
- Refund tier is exactly `0`, `50`, or `100`.
- Buyer and seller payouts sum exactly to the targeted order's escrow.
- No payout occurs for `DISPUTE_PENDING` or `UNDETERMINED`.

## 6. Evidence and consensus

The controlled demo accepts only listing URLs and snapshots in `FIXTURE_REGISTRY`. Evidence URLs must use HTTP or HTTPS and at least one is required.

The leader reads evidence pages as untrusted data and proposes structured JSON. The validator checks required fields, types, allowed categorical values, evidence sufficiency, deterministic tier derivation, and reason-code consistency. Prompt-like instructions inside evidence pages must not control the evaluator.

## 7. Network and configuration

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Frontend SDK: the installed `genlayer-js` package

A real deployment address is configured through a gitignored environment file. The repository must not contain a guessed address or a wallet credential.

## 8. Acceptance criteria

1. Two or more orders can be created in one contract instance.
2. Created orders receive sequential IDs and keep isolated state.
3. Unknown IDs are rejected for reads and writes.
4. A newly connected or changed wallet has no selected order.
5. A user can load a known order by ID.
6. An observer can inspect but cannot act on that order.
7. Disputes target the selected ID and enforce that order's buyer authorization.
8. Match, partial mismatch, and material mismatch fixtures produce the bounded payout tiers.
9. Invalid or insufficient verdicts produce no payout.
10. Contract tests, frontend tests, lint, TypeScript compilation, and production build pass.
11. The legacy single-order contract is not upgraded; the multi-order storage layout is deployed as a new instance.

## 9. Out of scope

- Buyer delivery confirmation, seller cancellation, deadlines, timeout settlement, and emergency recovery.
- Open marketplace listings beyond the controlled fixture registry.
- Human appeal, reputation, identity verification, private evidence, or media authenticity.
- Mainnet operation, high-value commerce, production SLAs, or adoption claims.
