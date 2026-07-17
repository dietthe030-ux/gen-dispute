# GenDispute React Frontend

The GenDispute frontend is built with React 19, TypeScript, and Vite. Its dark editorial interface keeps wallet state, escrow actions, consensus progress, and settlement outcomes visually distinct without decorative UI noise.

> [!WARNING]
> **Configuration Blocker:**
> The verified Studionet contract address is configured locally in the gitignored `.env`. Keep `.env.example` address-free and never commit guessed or placeholder addresses.

---

## Routes

- `/` - wallet connection, escrow creation, order state, dispute submission, consensus progress, and settlement.
- `/docs` - project overview, workflow, technology, payout tiers, security model, and contract method reference.

`vercel.json` rewrites direct requests to `index.html`, so opening or refreshing `/docs` works after deployment.

---

## Technical Specifications and Features

- **Direct Wallet Provider Integration**: Removes insecure private key persistence. Interacts directly with browser wallets (`window.ethereum`) via the EIP-1193 interface.
- **Studionet Chain Auto-Switching**: Automatically prompts the user to switch to or add the GenLayer Studionet network (`chainId: 61999` or `0xf22f` in hex, RPC: `https://studio.genlayer.com/api`).
- **Dynamic Role Checks**: Dynamically parses the connected address to assign Buyer, Seller, or Observer views.
- **Strict Input Validation**: Rejects malformed amounts, zero/negative inputs, or decimal strings exceeding 18 decimals before submitting transactions.
- **SDK Type Safety**: Uses the receipt fields and status enums exposed by the installed `genlayer-js` version. Transactions wait for accepted consensus and finalization before the UI reports completion.
- **Trustworthy Listing Snapshots**: Integrates a `FIXTURE_REGISTRY` to prevent arbitrary text input in listing snapshots, autofilling matching metadata presets for the user.
- **Responsive Product Documentation**: Shares the application header and design tokens while giving `/docs` its own long-form layout and semantic section structure.

---

## Available Commands

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Development Server
Run the local Vite development server:
```bash
npm run dev
```

### 3. Run Unit Tests (Vitest)
Run the 24 unit tests covering the app, documentation page, and `useGenDispute` transaction handlers:
```bash
npx vitest run
```

### 4. Code Quality & Lint
Run linter check (oxlint):
```bash
npm run lint
```

### 5. TypeScript Compilation & Build
Verify type compilation and bundle for production:
```bash
npx tsc -b
npm run build
```
