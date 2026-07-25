# GenDispute Frontend

This directory contains the React 19, TypeScript, and Vite interface for the GenDispute multi-order Intelligent Contract. It uses `genlayer-js` with an injected EIP-1193 wallet.

## Routes

- `/` - connect a wallet, create an escrow, load an explicit order ID, select evidence presets matched to that order's listing, open an eligible dispute, and inspect settlement state.
- `/docs` - project, trust model, consensus, payout tiers, and contract reference.

`vercel.json` rewrites direct route requests to the Vite entry point.

## Wallet and order behavior

1. The app requests or adds GenLayer Studionet (`61999`).
2. A connected wallet can create an order or load a known order ID.
3. The selected order determines whether the wallet is the buyer, seller, or an observer.
4. Only the selected order's buyer receives the dispute action.
5. Account changes clear the selected order. The app never assumes that a new wallet owns or should view order `0`.

## Transaction lifecycle

For `create_order` and `open_dispute`, the app switches to Studionet, submits `client.writeContract`, and shows the transaction hash while consensus is pending. It waits for `ACCEPTED`, checks consensus and the decisive GenVM execution results, refreshes contract state, then waits for `FINALIZED` and checks execution again. Validators reported as idle because quorum was already reached are not treated as failed transactions. A finalization timeout remains visible as accepted/pending rather than being reported as a failed write. Wallet rejection, RPC, validation, consensus, and execution errors are shown in the transaction panel.

## Contract configuration

The production frontend is configured for:

```text
0x1E877E7B333D5371a75d2EF995763bcdabaeB9cE
```

Explorer shows that the address above contains the reviewed contract source, including the decisive identity-mismatch validation rule. Its deployment, 0.1 GEN order creation, and 100% material-mismatch dispute transactions are finalized, successful, and accepted. The payout transfer to the buyer is finalized, and a direct state read returns order `0` as `PAID_OUT` with refund tier `100` and a zero contract balance. See the root README for the transaction links.

Copy `.env.example` to the gitignored `.env`, then set `VITE_CONTRACT_ADDRESS` to the exact verified address above. Use the same value in the linked Vercel project. Never commit `.env` or use a placeholder address.

## Commands

```bash
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
```

Current local verification:

- 32 frontend tests passed.
- Oxlint completed with zero errors.
- TypeScript compilation and the Vite production build succeeded.
- The production build reports a non-blocking large-chunk warning.

Frontend tests mock the wallet and SDK. The separately linked Explorer transactions prove the supervised live Studionet flow.
