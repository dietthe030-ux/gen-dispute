# GenDispute Escrow & AI-Consensus Dispute Resolution

GenDispute is a decentralized e-commerce escrow and dispute resolution protocol designed for **GenLayer Studionet**. It allows a buyer and seller to establish an escrow agreement for a physical item sale, which can be automatically resolved via consensus-driven AI validators if a dispute arises.

> [!WARNING]
> **Studionet integration is configured locally.** The verified deployed contract address is stored only in the gitignored `frontend/.env`; no placeholder address is committed to source.

---

## Architecture & Workflow

1. **Order Creation (`create_order`)**:
   - The seller deposits native GEN into the intelligent contract.
   - Specifies the buyer's address, listing URL (static description source), verified listing snapshot, and item description.
   - The contract verifies the listing snapshot against the hardcoded `FIXTURE_REGISTRY` database. Only registered/trusted URLs and matching content snapshots are allowed.
   - Escrow remains locked in the contract, transitioning the state to `OPEN`.

2. **Dispute Claims (`open_dispute`)**:
   - The buyer can raise a dispute if the item received does not match the description.
   - Provides a claim reason and up to two evidence page URLs (e.g., photo inspection reports).
   - Escalates the order status to `DISPUTE_PENDING` and triggers a non-deterministic evaluation.

3. **AI-Consensus Resolution (`leader_fn` and `validator_fn`)**:
   - The **Leader** reads the stored listing snapshot and fetches the evidence pages.
   - Determines the appropriate **Refund Tier** (0% for matches, 50% for partial mismatch, 100% for material mismatch).
   - The **Validators** run the same logic deterministically, validating the format, types, and consistency rules of the proposed verdict.
   - If consensus is reached, the escrow is split and distributed accordingly using proxies to perform native transfers to the buyer and seller EOAs (`PAID_OUT`).
   - If consensus fails or a validation error occurs, the order transitions to `UNDETERMINED`. The escrow remains locked, and the buyer is allowed **exactly one retry** with updated evidence. A second failure locks the escrow permanently.

---

## Directory Structure

```text
gen-dispute/
├── contracts/
│   └── gen_dispute.py         # GenLayer Intelligent Contract (Python)
├── fixtures/
│   ├── fixture_listing.html           # Baseline vintage Rolex Submariner description
│   ├── fixture_evidence_match.html    # Matches listing (Tier 0)
│   ├── fixture_evidence_partial.html  # Dial repaint, missing papers (Tier 50)
│   ├── fixture_evidence_full_mismatch.html # casio received (Tier 100)
│   └── fixture_prompt_injection.html  # Adversarial prompt override test
├── frontend/
│   ├── src/
│   │   ├── components/        # Premium UI Components (Wallet, Forms, Results, Progress)
│   │   ├── config/            # GenLayer client config on Studionet
│   │   ├── hooks/             # Custom useGenDispute React hook
│   │   │   ├── useGenDispute.ts
│   │   │   └── useGenDispute.test.tsx # Hook transaction/SDK mocks (13 test cases)
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # App container (Access checks based on MetaMask addresses)
│   │   ├── App.test.tsx       # Frontend App component tests (7 test cases)
│   │   └── index.css          # Sleek glassmorphic dark-mode design system
│   ├── vite.config.ts         # Vitest & React build settings
│   ├── tsconfig.json          # TS config
│   └── .env.example           # Contract address placeholder
├── tests/
│   └── test_gen_dispute.py    # Python contract unit tests (18 test cases)
└── README.md                  # Setup & Integration instructions
```

---

## Technical Specifications

### Intelligent Contract (`contracts/gen_dispute.py`)
- Built using GenVM Python SDK with version dependencies.
- Implements a hardcoded `FIXTURE_REGISTRY` database matching verified listing URLs to their expected page content snapshots, ensuring that snapshots are trustworthy and cannot be arbitrary.
- Emits native GEN payouts to EOAs securely via `@gl.evm.contract_interface` wrapper.

### React Frontend (`frontend/`)
- Powered by `Vite`, `React`, and `TypeScript`.
- Uses real browser wallet integrations (`window.ethereum`) and switches/adds the Studionet network (Chain ID `61999` / `0xf22f`) automatically.
- Participant roles (Buyer, Seller, Observer) are derived automatically from the connected MetaMask address.
- Uses `parseEther` and regex checks for exact amount input validation.
- Treats `ACCEPTED` as a valid consensus milestone, continues polling for `FINALIZED`, and validates the execution data exposed by the current Studionet receipt shape.
- Provides two frontend routes:
  - `/` for wallet connection, escrow creation, order state, and disputes.
  - `/docs` for the project overview, technology, security model, payout tiers, and contract reference.
- Uses `frontend/vercel.json` to keep direct navigation to `/docs` working after a Vercel deployment.

---

## Verification & Testing

### 1. Local / Direct-Mode Tests (Pytest)
These tests execute on the local GenVM test environment, mocking network calls, LLM responses, and transaction execution.
Run command:
```bash
gltest tests/test_gen_dispute.py
```
*Result: 19 passed tests.*

### 2. Frontend Unit Tests (Vitest)
These tests mock the browser wallet provider and the GenLayer client, validating the hook transaction handlers and App UI.
Run command:
```bash
cd frontend
npx vitest run
```
*Result: 24 passed tests across the app, docs page, and transaction hook.*

### 3. Frontend Lint & Typecheck
Verify code quality and type compilation:
```bash
cd frontend
npm run lint
npx tsc -b
```

### 4. Build Check
Build client assets for production:
```bash
cd frontend
npm run build
```

---

## Deployment & Live Verification Notes

> [!IMPORTANT]
> **Local Testing vs. Studionet Network:**
> - Unit testing and frontend test suites run locally and in mocked mode.
> - A live deploy to Studionet requires configured RPC connections and MetaMask credentials. Do not attempt Studionet deployment or configuration until authorized by Codex.
