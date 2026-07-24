# GenDispute

Decentralized e-commerce dispute resolution and escrow refund settlement on GenLayer.

GenDispute provides trustless consumer protection for peer-to-peer digital item sales. A seller locks native GEN escrow and names a buyer. If the buyer receives an item that is damaged, counterfeit, or not as described, GenLayer's multi-validator AI consensus evaluates public listing snapshots and buyer evidence on-chain, automatically applying a 0%, 50%, or 100% refund.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│  Seller Creates │     │  Buyer Opens         │     │  GenLayer Consensus         │     │  On-Chain Payout│
│  Isolated Order │     │  Dispute + Evidence  │     │                             │     │                 │
│ Lock GEN Escrow │────>│ Submit Evidence URLs │────>│ Fetch Evidence via Web      │────>│ 0% / 50% / 100% │
│ & Name Buyer    │     │ & Listing Snapshot   │     │ & LLM Verdict Evaluation    │     │ Buyer Settlement│
└─────────────────┘     └──────────────────────┘     └─────────────────────────────┘     └─────────────────┘
```

## The Problem

Peer-to-peer e-commerce and digital asset trades face severe dispute risks:
1. **Centralized Platform Bias:** E-commerce platforms (eBay, OpenSea, PayPal) charge heavy fees (10-15%) and handle disputes through slow human support teams that often rule arbitrarily.
2. **No On-Chain Evidence Evaluation:** Traditional Solidity smart contracts cannot inspect digital receipt evidence, compare delivered item screenshots against listing descriptions, or calculate fair partial refunds.
3. **Escrow Lockup Risk:** In conventional escrow scripts, if parties disagree, funds are trapped indefinitely unless a central arbiter intervenes.

## How It Works

1. **Create Order:** A seller calls `create_order` specifying the buyer address, listing URL, item snapshot hash, and item description while depositing native GEN into contract escrow.
2. **Open Dispute:** If the item delivered does not match the agreed description, the buyer calls `open_dispute(order_id, reason, evidence_url_1, evidence_url_2)`.
3. **Consensus Verdict:** GenLayer validators fetch the listing snapshot and buyer evidence URLs directly on-chain via `gl.nondet.web.render`. The AI evaluator compares the evidence against the seller's initial description using `gl.nondet.exec_prompt`.
4. **Deterministic Payout:** GenLayer's `validator_fn` verifies score calculations and enforces payout tiers:
   - **0% Buyer Refund (100% Seller):** Evidence shows item was delivered correctly.
   - **50% Partial Refund:** Minor defect or partial missing component.
   - **100% Full Buyer Refund:** Item counterfeit, severely damaged, or not delivered.

## Why GenLayer

- **On-Chain Evidence Web Scraping:** GenLayer contracts fetch and render external web evidence directly via `gl.nondet.web.render` without central oracles.
- **LLM Evidence Comparison:** Smart contracts reason about subjective evidence, item descriptions, and damage claims natively.
- **Multi-Validator Consensus:** Independent validators achieve consensus on non-deterministic LLM evaluations before committing escrow state.

## Live Deployment

| Component | Network | Address / Location | Description |
|-----------|---------|--------------------|-------------|
| `gen_dispute.py` | GenLayer Studionet | [`0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7`](https://explorer-studio.genlayer.com/address/0xef5663Ae20d8604bc57Bcf87c691ffc64c73CAA7) | Multi-order dispute resolution & escrow contract |
| Frontend | Vercel | [gen-dispute.vercel.app](https://gen-dispute.vercel.app) | Live Next.js dApp for order lookup, dispute filing & settlement |

## Architecture & Contract Methods

### Contract Schema (`contracts/gen_dispute.py`)
- `create_order(buyer: Address, listing_url: str, listing_snapshot: str, item_description: str) -> u256`: Creates an isolated order and locks GEN escrow.
- `get_order_count() -> u256`: Returns total order count.
- `get_order(order_id: u256) -> str`: Returns public metadata and state for a specific order.
- `open_dispute(order_id: u256, reason: str, evidence_url_1: str, evidence_url_2: str)`: Triggers AI consensus evaluation and executes refund settlement.

## Quick Start

### 1. Run Contract Tests
```bash
gltest tests/test_gen_dispute.py
```

### 2. Configure & Run Frontend
```bash
cd frontend
npm install
npm test -- --run
npm run dev
```
