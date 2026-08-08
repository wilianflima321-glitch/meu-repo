import { describe, expect, it, vi } from 'vitest'
import {
  buildPreviewHmrPathCandidates,
  detectViteHmrClient,
  resolveClientHmrConnected,
} from '@/lib/preview/vite-hmr-detect'

describe('L.8 Vite HMR detection', () => {
  it('buildPreviewHmrPathCandidates prefers Vite protocol when client present', () => {
    const withVite = buildPreviewHmrPathCandidates({ viteClientPresent: true, wsToken: 'tok_abc' })
    expect(withVite[0]?.engine).toBe('vite')
    expect(withVite[0]?.protocols).toEqual(['vite-hmr'])
    expect(withVite[0]?.path).toContain('token=tok_abc')
    expect(withVite.some((c) => c.path === '/_next/webpack-hmr')).toBe(true)

    const unknown = buildPreviewHmrPathCandidates({ viteClientPresent: false })
    expect(unknown[0]?.path).toBe('/_next/webpack-hmr')
    expect(unknown.some((c) => c.engine === 'vite')).toBe(true)
  })

  it('detectViteHmrClient claims vite only for real /@vite/client bodies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/javascript' },
      text: async () =>
        `export const createHotContext = () => ({});\nconst __HMR_TOKEN__ = "secret99";\nimport.meta.hot`,
    })

    const detected = await detectViteHmrClient('http://localhost:5173/app', { fetchImpl: fetchImpl as typeof fetch })
    expect(detected.viteClientPresent).toBe(true)
    expect(detected.engine).toBe('vite')
    expect(detected.wsToken).toBe('secret99')
    expect(detected.pathCandidates[0]?.protocols).toEqual(['vite-hmr'])
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:5173/@vite/client',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('detectViteHmrClient fails closed on 404 / non-vite body', async () => {
    const missing = await detectViteHmrClient('http://localhost:3000', {
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: async () => '',
      }) as typeof fetch,
    })
    expect(missing.viteClientPresent).toBe(false)
    expect(missing.engine).toBe('unknown')

    const html = await detectViteHmrClient('http://localhost:3000', {
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => '<html><body>not vite</body></html>',
      }) as typeof fetch,
    })
    expect(html.viteClientPresent).toBe(false)
  })

  it('resolveClientHmrConnected is true for Vite client OR WS', () => {
    expect(resolveClientHmrConnected({ viteClientPresent: true, wsConnected: false })).toBe(true)
    expect(resolveClientHmrConnected({ viteClientPresent: false, wsConnected: true })).toBe(true)
    expect(resolveClientHmrConnected({ viteClientPresent: false, wsConnected: false })).toBe(false)
  })
})
