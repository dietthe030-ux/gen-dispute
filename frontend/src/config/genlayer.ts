import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

// Note: VITE_CONTRACT_ADDRESS must be populated in .env by Codex/user.
// DO NOT commit any placeholder address.
const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}`

export let client = createClient({ chain: studionet })

export const setWalletProvider = (provider: any) => {
  client = createClient({ chain: studionet, provider })
}

export { CONTRACT_ADDRESS }
