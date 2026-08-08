# GenDispute Frontend

This directory contains the React 19, TypeScript, and Vite interface for the GenDispute multi-order Intelligent Contract. It uses `genlayer-js`, discovers injected wallets through EIP-6963 with an EIP-1193 fallback, and connects only the provider selected by the user.

## Routes

- `/` - connect a wallet, create a timed escrow, load an explicit order ID, confirm delivery, recover an expired order, open an eligible dispute, and inspect evidence commitments and settlement state.
- `/docs` - project, trust model, consensus, payout tiers, and contract reference.

`vercel.json` rewrites direct route requests to the Vite entry point.

## Wallet and order behavior

1. The app requests or adds GenLayer Studionet (`61999`).
2. A connected wallet can create an order or load a known order ID.
3. The selected order determines whether the wallet is the buyer, seller, evidence issuer, or an observer.
4. Only the evidence issuer can register a receipt. While an order is `OPEN`, its buyer receives the reason-only dispute action even if no receipt exists; that initial attempt fails closed as `UNDETERMINED` with no payout.
5. Account changes clear the selected order. The app never assumes that a new wallet owns or should view order `0`.

## Evidence behavior

The remediation contract separates evidence authority from both trading parties. The deployment wallet is the evidence issuer and signs `register_evidence_receipt`, binding a trusted-origin URL, exact SHA-256, one-time nonce, and observation time to one order. The receipt attestation must contain that exact order ID, canonical item ID, publisher ID, and nonce. The buyer UI has no evidence URL fields or payout presets. An initial reason-only dispute may be submitted without a receipt and fails closed; after `UNDETERMINED`, the retry remains unavailable until the issuer registers a fresh receipt. The interface displays receipt provenance and the per-attempt commitments.

The candidate bundles order-`0` Rolex/Casio match, partial, mismatch, and injection receipts plus exact receipts for orders `3`, `4`, `5`, and `6`. A bundled or publicly reachable page is not proof of on-chain registration or successful settlement. Each receipt remains valid only for its embedded order ID, item ID, publisher ID, and nonce; changing only a URL query is invalid.

## Transaction lifecycle

The connect action shows the injected wallets detected in the browser instead of defaulting to `window.ethereum`. Every explicit wallet connection requires `personal_sign`; disconnecting or changing accounts clears the local session, so reconnecting cannot silently reuse wallet authorization. For every write, the app switches the selected provider to Studionet, submits `client.writeContract`, and shows the transaction hash while consensus is pending. A hash is cleared when another order is explicitly loaded, so the result card never attributes the previous order's session transaction to the newly loaded order. The wallet provider is used for signing and submission; contract reads and consensus polling go through the same-origin `/api/rpc` function, which retries transient transport failures and forwards only to the official Studionet RPC. HTTP 429 responses are returned without retrying, and selected orders refresh only on explicit loads and transaction lifecycle events, so an idle tab does not exhaust the shared RPC quota. The app waits for `ACCEPTED`, checks consensus and decisive GenVM execution results, then waits for `FINALIZED` and checks execution again. For `create_order`, it decodes the returned `u256` from the accepted transaction's leader result payload and loads that exact ID; the global count is never used to infer ownership. Validators reported as idle because quorum was already reached are not treated as failures, even when the RPC includes them in `leader_receipt`. A finalization timeout remains visible as accepted/pending. If polling still fails after submission, later contract readback reconciles terminal `PAID_OUT` or `UNDETERMINED` state instead of retaining a stale RPC error. Wallet rejection, validation, consensus, execution, and unresolved RPC or wallet-selection errors remain visible in the transaction panel.

## Contract configuration

The production frontend targets verified Studionet contract `0x7cFC1C241B7bb6Cf636551053dcA403B6ceD48E7` through Vercel environment configuration. Keep `.env` gitignored and never commit credentials or placeholder addresses.

## Commands

```bash
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
```

Current local verification:

- 47 frontend tests passed, including duplicate injected-provider suppression.
- Oxlint completed with zero errors.
- TypeScript compilation and the Vite production build succeeded.
- The production build reports a non-blocking large-chunk warning.

Frontend tests mock the wallet and SDK. The separately linked Explorer transactions prove the supervised live Studionet flow.
