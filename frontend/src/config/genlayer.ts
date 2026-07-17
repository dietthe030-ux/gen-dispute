import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

// Note: VITE_CONTRACT_ADDRESS must be populated in .env by Codex/user.
// DO NOT commit any placeholder address.
const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}`

// We create client configured for Studionet with explicit browser provider
export const client = createClient({
  chain: studionet,
  provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined
})

export { CONTRACT_ADDRESS }
