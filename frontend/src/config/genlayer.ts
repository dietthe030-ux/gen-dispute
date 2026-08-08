import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

// Note: VITE_CONTRACT_ADDRESS must be populated in .env by Codex/user.
// DO NOT commit any placeholder address.
const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}`

// Keep contract reads and consensus polling on a same-origin endpoint. Wallet
// providers are used only for signing methods by genlayer-js; routing the
// remaining RPC calls through Vercel avoids extension/CORS fetch failures.
const appChain = {
  ...studionet,
  rpcUrls: {
    ...studionet.rpcUrls,
    default: {
      ...studionet.rpcUrls.default,
      http: ['/api/rpc'] as const,
    },
  },
}

export let client = createClient({ chain: appChain })

export const setWalletProvider = (provider: any) => {
  client = createClient({ chain: appChain, provider })
}

export { CONTRACT_ADDRESS }
