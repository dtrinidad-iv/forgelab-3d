import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadModel, ModelNotFoundError } from '~/utils/three/loadModel'

const respond = (status: number, type: string, body = '') => vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } }))

describe('loadModel error classification', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('treats a 404 as a missing model', async () => {
    vi.stubGlobal('fetch', respond(404, 'application/json'))
    await expect(loadModel('/models/x.glb')).rejects.toBeInstanceOf(ModelNotFoundError)
  })

  it('treats an HTML page served with 200 (SPA fallback) as a missing model', async () => {
    vi.stubGlobal('fetch', respond(200, 'text/html', '<!doctype html>'))
    await expect(loadModel('/models/x.glb')).rejects.toBeInstanceOf(ModelNotFoundError)
  })

  it('reports a login wall (401/403 HTML) as access denied, not as missing', async () => {
    for (const status of [401, 403]) {
      vi.stubGlobal('fetch', respond(status, 'text/html; charset=utf-8', '<title>Login Redirect</title>'))
      const err = await loadModel('/models/x.glb').catch((e) => e)
      expect(err).not.toBeInstanceOf(ModelNotFoundError)
      expect(err.message).toMatch(new RegExp(`denied \\(${status}\\).*requires a login`))
    }
  })

  it('reports other HTTP failures with the status', async () => {
    vi.stubGlobal('fetch', respond(500, 'text/plain'))
    await expect(loadModel('/models/x.glb')).rejects.toThrow(/Failed to fetch \/models\/x.glb \(500/)
  })
})
