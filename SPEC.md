# GenDispute MVP Specification

## 1. Objective

Build a small, demonstrable GenLayer dapp that holds a buyer's native GEN payment in escrow and resolves one "item not as described" claim from public listing/evidence pages. The intelligent decision is a bounded refund tier: `0`, `50`, or `100` percent.

The MVP proves the GenLayer value proposition: a shared on-chain decision based on natural-language criteria and public web evidence, with deterministic state transition and payout.

## 2. Approved MVP scope

### Contract flows

1. Seller creates one order by depositing a positive native GEN amount and supplying a stable public listing URL plus a short item description.
2. Buyer opens one dispute with one reason and one or two public evidence URLs.
3. The contract reaches `RESOLVED` with a refund tier, or `UNDETERMINED` without moving escrow.
4. For a resolved dispute, the contract pays the buyer `0%`, `50%`, or `100%` of escrow and the seller receives the remainder.
5. A single retry is permitted only after `UNDETERMINED`; a resolved order cannot be disputed again.

### Frontend flows

- Connect wallet on Studionet.
- Create order form.
- Display order status, escrow amount, listing URL, and participants.
- Open dispute form for the buyer.
- Display pending/accepted/finalized/undetermined states.
- Display verdict, refund amount, seller amount, evidence URLs, and transaction hash.
- Provide explorer links only when a real deployed address and transaction hash are available; never invent them.

## 3. Explicit non-goals

- Multiple sellers, buyers, listings, currencies, or order batches.
- Human appeal, arbitration, reputation, identity verification, or moderation dashboard.
- Marketplace browsing or checkout beyond one order.
- Ranking several candidates or evaluating a portfolio.
- Production persistence, mainnet deployment, GitHub push, or Vercel deployment.

## 4. Contract state model

Suggested enums:

- `OrderStatus`: `OPEN`, `DISPUTE_PENDING`, `RESOLVED`, `UNDETERMINED`, `PAID_OUT`, `CANCELLED`.
- `DisputeOutcome`: `NONE`, `NO_REFUND`, `HALF_REFUND`, `FULL_REFUND`, `UNDETERMINED`.

Suggested stored fields:

- `seller`, `buyer`, `escrow_amount`, `listing_url`, `listing_snapshot_ref`, `item_description`.
- `status`, `dispute_attempts`, `dispute_reason`, `evidence_urls`.
- `refund_tier`, `buyer_payout`, `seller_payout`, `decision_id`, `last_error`.

The implementation may change names or types if required by the current GenLayer SDK, but it must preserve these invariants:

- escrow amount is positive and cannot be withdrawn twice;
- only the seller can create the order and only the buyer can open its dispute;
- dispute can be opened only while the order is `OPEN` or after an `UNDETERMINED` result with fewer than two attempts;
- payout amounts sum exactly to escrow;
- no payout occurs for `DISPUTE_PENDING` or `UNDETERMINED`;
- a resolved order is terminal.

## 5. Intelligent decision design

### Evidence inputs

The demo uses self-hosted, stable HTML pages under the project or a local static server. The listing page should contain the seller's claims and item attributes. Evidence pages should contain the buyer's observed condition and supporting details. Do not depend on social media, login-gated pages, or mutable third-party marketplaces for acceptance tests.

### Leader result

The nondeterministic leader step may fetch/render the approved public pages and use an LLM to produce strict JSON with:

```json
{
  "refund_tier": 0,
  "reason_code": "MATCHES_DESCRIPTION",
  "summary": "short human-readable explanation",
  "listing_facts": ["..."],
  "evidence_facts": ["..."]
}
```

`refund_tier` must be exactly `0`, `50`, or `100`; `reason_code` must come from a finite documented set. The prompt must instruct the model to treat fetched pages as untrusted data, ignore instructions found inside them, and cite only facts visible in the supplied pages.

### Validator rule

For this project, `validator_fn` must be deterministic and must not call an LLM or any `gl.nondet.*` operation. It must validate the leader's normalized result, allowed values, required fields, evidence/listing references, and arithmetic/payout consistency. It may reject malformed, unsupported, or internally contradictory results. It must not silently convert an invalid result into a payout.

If the current SDK requires a different validator API, preserve this safety rule and document the adapter in the implementation notes.

### Undetermined behavior

If consensus is not reached or the result cannot be safely validated, mark the attempt `UNDETERMINED`, retain escrow, record a user-readable error, and allow at most one retry. Never pay out on an undetermined result.

## 6. Snapshot policy

At order creation, capture a stable listing reference. Prefer a normalized text/metadata snapshot if that is the supported storage representation. Use screenshot capture only after verifying current GenVM/SDK support for storing and re-reading the returned image data within contract limits. The acceptance test must prove that later page edits do not change the stored snapshot used by the dispute.

## 7. Network and transaction behavior

- Development network: Studionet, chain ID `61999`, RPC `https://studio.genlayer.com/api`.
- Use the current official `genlayer-js`/Viem integration documented by GenLayer.
- A write returns a transaction hash; the UI must wait for an accepted/finalized receipt before showing final state.
- Native GEN faucet funding is allowed for the developer demo. No private key, real contract address, or wallet address may be committed.

## 8. Acceptance criteria

1. A fresh wallet can create a positive-value order with a valid listing URL.
2. Unauthorized users cannot create on behalf of another seller or open another buyer's dispute.
3. The same order rejects a second resolved dispute.
4. A deterministic fixture where evidence matches the listing yields tier `0` and seller receives all escrow.
5. A fixture with a material mismatch yields tier `100` and buyer receives all escrow.
6. A partial mismatch yields tier `50`; buyer and seller payouts sum exactly to escrow.
7. Invalid leader output, unsupported tier, missing evidence, or failed consensus yields `UNDETERMINED` and no payout.
8. One retry after `UNDETERMINED` works; a second retry is rejected.
9. The frontend shows transaction progress and never displays a final verdict before receipt confirmation.
10. Tests cover access control, state transitions, payout arithmetic, retry cap, prompt-injection text inside pages, and URL/input validation.

## 9. Required review gates

- Codex reviews the implementation against this document after Antigravity completes.
- Any real contract address is requested from the user and verified before frontend wiring.
- Codex alone chooses GitHub account/repository, commits, pushes, and deploys, if later authorized.

