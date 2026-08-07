# GenDispute Frontend

This directory contains the React 19, TypeScript, and Vite interface for the GenDispute multi-order Intelligent Contract. It uses `genlayer-js` with an injected EIP-1193 wallet.

## Routes

- `/` - connect a wallet, create a timed escrow, load an explicit order ID, confirm delivery, recover an expired order, open an eligible dispute, and inspect evidence commitments and settlement state.
- `/docs` - project, trust model, consensus, payout tiers, and contract reference.

`vercel.json` rewrites direct route requests to the Vite entry point.

## Wallet and order behavior

1. The app requests or adds GenLayer Studionet (`61999`).
2. A connected wallet can create an order or load a known order ID.
3. The selected order determines whether the wallet is the buyer, seller, or an observer.
4. Only the selected order's buyer receives the dispute action.
5. Account changes clear the selected order. The app never assumes that a new wallet owns or should view order `0`.

## Transaction lifecycle

For every write, the app switches to Studionet, submits `client.writeContract`, and shows the transaction hash while consensus is pending. It waits for `ACCEPTED`, checks consensus and decisive GenVM execution results, then waits for `FINALIZED` and checks execution again. For `create_order`, it decodes the returned `u256` from the GenVM trace and loads that exact ID; the global count is never used to infer ownership. Validators reported as idle because quorum was already reached are not treated as failures. A finalization timeout remains visible as accepted/pending. Wallet rejection, RPC, validation, consensus, and execution errors are shown in the transaction panel.

## Contract configuration

The submitted V1 frontend still points to `0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE`. That frozen deployment predates the remediation source and must not be presented as its evidence. Copy `.env.example` to the gitignored `.env` only after a replacement deployment is verified, then set the exact same `VITE_CONTRACT_ADDRESS` in Vercel. Never commit `.env` or use a placeholder address.

## Commands

```bash
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
```

Current local verification:

- 35 frontend tests passed.
- Oxlint completed with zero errors.
- TypeScript compilation and the Vite production build succeeded.
- The production build reports a non-blocking large-chunk warning.

Frontend tests mock the wallet and SDK. The separately linked Explorer transactions prove the supervised live Studionet flow.
