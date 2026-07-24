# GenDispute

> **Decentralized e-commerce dispute resolution and escrow refund settlement on GenLayer.**

GenDispute provides trustless consumer protection for peer-to-peer digital item sales and freelance service delivery. A seller locks native GEN token escrow into an isolated order state and specifies the buyer. If the buyer receives an item that is damaged, counterfeit, or not as described, GenLayer's multi-validator AI consensus evaluates external listing snapshots and buyer evidence directly on-chain, applying an automated 0%, 50%, or 100% refund settlement.

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────────────┐
│         Seller          │     │          Buyer          │     │      GenLayer Consensus     │     │    On-Chain Payout    │
│                         │     │                         │     │                             │     │                         │
│  1. Create Order        │────>│  2. Inspect Delivery    │────>│  4. Fetch Evidence (Web)   │────>│  5. 0% Refund (Seller)  │
│  2. Lock Native GEN     │     │  3. Open Dispute        │     │  5. LLM Evidence Evaluation │     │     50% Partial Split   │
│  3. Specify Buyer       │     │     + Evidence URLs     │     │  6. Validate Tier Scoring   │     │     100% Full Buyer     │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────────┘     └─────────────────────────┘
```

---

## 1. The Problem

Peer-to-peer e-commerce, digital asset trades, and freelance service commissions suffer from severe escrow dispute risks:

- **Centralized Platform Exploitation:** Legacy online marketplaces (eBay, OpenSea, Fiverr, PayPal) charge high platform fees (10-15%) and handle disputes through centralized, black-box support desks that rely on manual human review. Disputes take 7-30 days to resolve, and decisions are frequently arbitrary or biased toward high-volume sellers.
- **Inability of Traditional Blockchains to Evaluate Evidence:** Legacy smart contracts (Solidity/Vyper) on Ethereum or Solana can lock funds in simple multi-sig escrows, but cannot parse web evidence, inspect screenshots of damaged items, verify receipt contents, or evaluate whether a delivered digital asset matches a seller's listing description.
- **Binary All-or-Nothing Escrow:** Traditional automated escrow scripts enforce strict binary payouts (0% or 100%). They cannot assess partial damage or issue proportional partial refunds (e.g. 50% refund for missing secondary components).

---

## 2. How It Works

GenDispute replaces centralized corporate dispute desks with GenLayer's multi-validator AI consensus:

1. **Create Order & Lock Escrow:** A Seller calls `create_order`, specifying the Buyer address, listing URL, item description snapshot, and item details, while depositing native GEN tokens into contract escrow. Each order receives an isolated `order_id`.
2. **Delivery & Inspection:** The Buyer receives the item or service. If satisfied, no action is required and funds remain stored safely per contract rules.
3. **Open Dispute:** If the item is defective, missing components, or counterfeit, the Buyer calls `open_dispute(order_id, reason, evidence_url_1, evidence_url_2)`.
4. **Consensus Evidence Fetch:** The GenLayer leader node fetches the public listing URL, item snapshot fixture, and buyer evidence URLs directly on-chain using `gl.nondet.web.render`.
5. **Nondeterministic Evidence Evaluation:** GenLayer passes the seller's original description and buyer's dispute evidence to the AI evaluation prompt (`gl.nondet.exec_prompt`).
6. **Tiered Refund Settlement:** GenLayer validator nodes independently verify the reasoning and confirm tier consistency through `validator_fn`:
   - **Tier 0 (0% Buyer Refund / 100% Seller):** Evidence proves item was delivered correctly as described.
   - **Tier 50 (50% Partial Buyer Refund / 50% Seller):** Evidence shows minor damage, missing secondary accessories, or minor misrepresentation.
   - **Tier 100 (100% Full Buyer Refund / 0% Seller):** Evidence proves item was counterfeit, severely broken, or not delivered.
   - **UNDETERMINED:** Inconclusive evidence allows for one retry attempt while keeping escrow locked.

---

## 3. Why GenLayer Is Essential

GenDispute cannot run on legacy smart contract platforms because it relies on native web fetching and semantic reasoning inside the state machine:

| Capability | EVM / Solidity | Centralized Oracles | GenLayer |
|---|---|---|---|
| Fetch live external web evidence | ❌ Impossible | ⚠️ Centralized / Trusted | ✅ Native `gl.nondet.web.render()` |
| Semantic evidence vs description reasoning | ❌ Impossible | ⚠️ Off-chain server bot | ✅ Native `gl.nondet.exec_prompt()` |
| Multi-validator AI consensus | ❌ Impossible | ❌ None | ✅ Built-in `run_nondet_unsafe` |
| Tiered partial refund calculation | ❌ Hardcoded rules | ❌ Manual support desk | ✅ Dynamic AI scoring & `validator_fn` |
| Isolated multi-order state safety | ⚠️ Complex arrays | ❌ Database lockup | ✅ Native `DynArray[Order]` state |

---

## 4. Live Deployment & Evidence

| Component | Network | Explorer / Address | Details |
|---|---|---|---|
| `gen_dispute.py` | GenLayer Studionet (`61999`) | [`0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7`](https://explorer-studio.genlayer.com/address/0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7) | Multi-Order Intelligent Contract |
| Legacy Contract | GenLayer Studionet | [`0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8`](https://explorer-studio.genlayer.com/address/0xA10b4CCe4721ba86Ce902080a044BA5d465cEaB8) | Single-Order Escrow Archive |
| Web Application | Vercel Production | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) | Next.js App Router dApp |
| Gltest Test Suite | Simulator | 22 Unit Tests Passing | Gltest contract verification suite |
| Frontend Vitest | Vitest / React | 27 Unit Tests Passing | EIP-1193 listeners, order lookup, UI components |

---

## 5. Intelligent Contract Architecture

### Order Data Structure (`contracts/gen_dispute.py`)
```python
@allow_storage
@dataclass
class Order:
    order_id: u256                # Monotonic unique order identifier
    seller: Address               # Order seller (creator) address
    buyer: Address                # Order buyer address
    escrow_amount: u256           # Deposited native GEN escrow
    listing_url: str              # Public item listing URL
    listing_snapshot: str         # Item description snapshot
    item_description: str         # Original item description
    status: str                   # State: OPEN | DISPUTED | SETTLED | UNDETERMINED
    dispute_attempts: u256        # Dispute retry counter (max 2)
    dispute_reason: str           # Buyer's claim reason
    evidence_url_1: str           # Primary evidence URL
    evidence_url_2: str           # Secondary evidence URL
    refund_tier: u256             # Settled refund tier: 0, 50, or 100
    buyer_payout: u256            # Native GEN payout to buyer
    seller_payout: u256           # Native GEN payout to seller
    outcome: str                  # Final outcome summary
    last_error: str               # Last error message if undetermined
```

### API Reference

#### Write Methods
- **`create_order(buyer: Address, listing_url: str, listing_snapshot: str, item_description: str) -> u256`** `@gl.public.write.payable`
  - Validates positive native GEN deposit, URL scheme, and fixture registry snapshot match.
  - Appends a new isolated `Order` in `OPEN` status to `self.orders`.

- **`open_dispute(order_id: u256, reason: str, evidence_url_1: str, evidence_url_2: str = "")`** `@gl.public.write`
  - Callable only by the order's designated `buyer`.
  - Triggers nondeterministic evidence fetching and LLM evaluation via `gl.vm.run_nondet_unsafe`.
  - Executes tiered 0%, 50%, or 100% GEN refund settlement upon validator consensus verification.

#### View Methods
- **`get_order(order_id: u256) -> str`** `@gl.public.view`: Returns full JSON representation of a single order.
- **`get_order_count() -> u256`** `@gl.public.view`: Returns total count of orders created in the contract.

---

## 6. Frontend Architecture & EIP-1193 Integration

The frontend is a modern Next.js dApp using `genlayer-js` and browser-injected wallets:

- **Explicit Order Navigation:** `/` path supports explicit order ID lookup (`/order/[id]`) and creation form without guessing default orders.
- **Documentation Route:** `/docs` provides complete project architecture, payout tier reference, and contract method documentation.
- **Network Listener:** Dynamically requests network switch to GenLayer Studionet (`chainId: 61999` / `RPC: https://studio.genlayer.com/api`).

---

## 7. Development & Verification Guide

### Contract Simulator Testing
```bash
# Run contract unit tests (22 test cases)
gltest tests/test_gen_dispute.py
```

### Frontend Testing & Build
```bash
cd frontend

# Install node dependencies
npm install

# Run frontend Vitest unit tests (27 test cases)
npm test -- --run

# Run ESLint check
npm run lint

# Run Next.js production build
npm run build
```
