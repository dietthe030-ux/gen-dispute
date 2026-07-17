# GenDispute

GenDispute is a GenLayer Studionet escrow prototype for item-not-as-described disputes. A seller creates an independent order, deposits native GEN, and names a buyer. If the buyer disputes the delivery, GenLayer validators evaluate public evidence and the Intelligent Contract applies a deterministic 0%, 50%, or 100% buyer refund.

## Current release status

The repository contains a multi-order contract and frontend release candidate:

- Every order receives a numeric `order_id`.
- `DynArray[Order]` keeps escrow, participants, evidence, attempts, and settlement state isolated per order.
- The frontend never selects order `0` merely because a wallet connected or changed.
- A user must enter an order ID to inspect an existing order, or create a new order.
- `open_dispute` always targets an explicit order ID.

The public Vercel app and Studionet address may still be running the earlier single-order release until the multi-order contract is deployed as a new instance and its real address is configured. Do not upgrade the legacy contract: it contains an open escrow and its storage layout is incompatible with this release.

## Contract flow

1. `create_order(buyer, listing_url, listing_snapshot, item_description) -> order_id`
   - Requires a positive native GEN value.
   - Validates the buyer, URL scheme, and fixture-backed listing snapshot.
   - Appends a new isolated order in `OPEN` state.
2. `get_order_count()`
   - Returns the number of orders in the contract.
3. `get_order(order_id)`
   - Returns public state for exactly one order.
4. `open_dispute(order_id, reason, evidence_url_1, evidence_url_2)`
   - May be called only by that order's buyer.
   - Fetches public evidence through nondeterministic execution.
   - Validates the proposed verdict and pays 0%, 50%, or 100% of escrow to the buyer; the seller receives the remainder.
   - An undetermined result keeps that order's escrow locked and permits at most one retry.

## Frontend routes

- `/` — wallet connection, order lookup, escrow creation, participant-specific actions, consensus progress, and settlement.
- `/docs` — project purpose, architecture, security model, payout tiers, and contract method reference.

The frontend uses an injected EIP-1193 wallet and requests GenLayer Studionet:

- Chain ID: `61999` (`0xf22f`)
- RPC: `https://studio.genlayer.com/api`

The real contract address belongs only in the gitignored `frontend/.env`. The committed `frontend/.env.example` remains address-free.

## Project structure

```text
gen-dispute/
├── contracts/gen_dispute.py
├── fixtures/
├── frontend/
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/types/
│   └── vercel.json
├── tests/test_gen_dispute.py
├── SPEC.md
└── ROADMAP.md
```

## Verification

Contract tests:

```bash
gltest tests/test_gen_dispute.py
```

Verified result for this release candidate: `22 passed`.

Frontend checks:

```bash
cd frontend
npm test -- --run
npm run lint
npm run build
```

Verified results for this release candidate:

- `27 passed` frontend tests.
- Lint completed with zero errors.
- TypeScript compilation and the Vite production build completed successfully.
- Vite reports a non-blocking warning for a JavaScript chunk larger than 500 kB.

## Deployment safety

The legacy Studionet contract is `0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8`. It contains an open escrow and must remain untouched.

To release the multi-order version:

1. Deploy `contracts/gen_dispute.py` as a new Studionet contract instance.
2. Verify the new address and methods in GenLayer Studio or Explorer.
3. Configure the exact new address in local and Vercel environment variables.
4. Run a two-wallet smoke test for order creation, explicit ID lookup, observer access, and buyer-only dispute authorization.
5. Only then merge and deploy the multi-order frontend.

No guessed or placeholder address may be used.
