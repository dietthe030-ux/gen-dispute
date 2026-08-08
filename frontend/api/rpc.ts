const STUDIONET_RPC = 'https://studio.genlayer.com/api'
const MAX_ATTEMPTS = 3
const MAX_BODY_BYTES = 128 * 1024

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  if (!body || Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Invalid RPC request body' })
  }

  let lastResponse: Response | undefined
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const upstream = await fetch(STUDIONET_RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20_000),
      })
      lastResponse = upstream
      if (upstream.ok || (upstream.status < 500 && upstream.status !== 429)) {
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
        return res.status(upstream.status).send(await upstream.text())
      }
    } catch {
      // Retry transient transport failures; the response below remains honest
      // if all attempts fail.
    }
  }

  if (lastResponse) {
    return res.status(lastResponse.status).send(await lastResponse.text())
  }
  return res.status(502).json({
    jsonrpc: '2.0',
    id: req.body?.id ?? null,
    error: { code: -32098, message: 'Studionet RPC temporarily unavailable' },
  })
}
