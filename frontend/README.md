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
4. Only the evidence issuer can register a receipt. Only the selected order's buyer receives the reason-only dispute action after a receipt exists.
5. Account changes clear the selected order. The app never assumes that a new wallet owns or should view order `0`.

## Evidence behavior

The remediation contract separates evidence authority from both trading parties. The deployment wallet is the evidence issuer and signs `register_evidence_receipt`, binding a trusted-origin URL, exact SHA-256, one-time nonce, and observation time to one order. The receipt attestation must contain that exact order ID, canonical item ID, publisher ID, and nonce. The buyer UI has no evidence URL fields or payout presets; it can only submit a reason after registration. The interface displays receipt provenance and the per-attempt commitments.

The bundled receipt pages are demonstration artifacts for order `0`. For any other order, the issuer must first publish a new receipt at the trusted origin with that exact order ID and a new nonce; changing only a URL query is invalid.

## Transaction lifecycle

The connect action shows the injected wallets detected in the browser instead of defaulting to `window.ethereum`. Every explicit wallet connection requires `personal_sign`; disconnecting or changing accounts clears the local session, so reconnecting cannot silently reuse wallet authorization. For every write, the app switches the selected provider to Studionet, submits `client.writeContract`, and shows the transaction hash while consensus is pending. It waits for `ACCEPTED`, checks consensus and decisive GenVM execution results, then waits for `FINALIZED` and checks execution again. For `create_order`, it decodes the returned `u256` from the GenVM trace and loads that exact ID; the global count is never used to infer ownership. Validators reported as idle because quorum was already reached are not treated as failures, even when the RPC includes them in `leader_receipt`. A finalization timeout remains visible as accepted/pending. Wallet rejection, RPC, validation, consensus, execution, and wallet-selection errors are shown in the transaction panel.

## Contract configuration

The local and public integration target is the verified replacement contract `0xd5DBaE8c1A1B2A8F34dba3e4AdC62f9263EaB53d`. Set that exact address through the gitignored `.env` locally and through Vercel environment configuration. Never commit `.env` or use a placeholder address.

## Commands

```bash
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
```

Current local verification:

- 40 frontend tests passed.
- Oxlint completed with zero errors.
- TypeScript compilation and the Vite production build succeeded.
- The production build reports a non-blocking large-chunk warning.

Frontend tests mock the wallet and SDK. The separately linked Explorer transactions prove the supervised live Studionet flow.
