# GenDispute Frontend

The frontend is a React 19, TypeScript, and Vite interface for the GenDispute multi-order Intelligent Contract.

## User flow

1. Connect an injected browser wallet.
2. Approve or add GenLayer Studionet.
3. Enter a known order ID to inspect it, or create a new escrow order.
4. The selected order determines whether the wallet is the Buyer, Seller, or Observer.
5. Only the selected order's buyer sees the dispute action.
6. Transaction progress continues through accepted consensus and finalization.

Changing accounts clears the selected order. The interface never assumes that a connected wallet owns or should view order `0`.

## Routes

- `/` — wallet, order lookup, escrow creation, dispute, and settlement interface.
- `/docs` — product, architecture, security, and multi-order contract documentation.

`vercel.json` rewrites direct route requests to the Vite entry point.

## Configuration

Create a local `.env` only after a real multi-order contract has been deployed and verified:

```text
VITE_CONTRACT_ADDRESS=<verified new Studionet contract address>
```

Do not configure the legacy single-order address for this frontend release. Do not commit `.env`; `.env.example` intentionally contains no address.

## Commands

```bash
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
```

Current verified results:

- 27 frontend tests passed.
- Lint completed with zero errors.
- TypeScript compilation and Vite production build succeeded.

The production build currently reports a non-blocking large-chunk warning.
