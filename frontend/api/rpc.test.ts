import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from './rpc'

const response = () => {
  const res: any = {}
  res.setHeader = vi.fn().mockReturnValue(res)
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

afterEach(() => vi.unstubAllGlobals())

describe('Studionet RPC proxy', () => {
  it('retries a transient fetch failure and returns the RPC response', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{"jsonrpc":"2.0","id":1,"result":"0x1"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)
    const res = response()

    await handler({ method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'gen_call', params: [] } }, res)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('{"jsonrpc":"2.0","id":1,"result":"0x1"}')
  })

  it('rejects non-POST requests without contacting Studionet', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const res = response()

    await handler({ method: 'GET' }, res)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
