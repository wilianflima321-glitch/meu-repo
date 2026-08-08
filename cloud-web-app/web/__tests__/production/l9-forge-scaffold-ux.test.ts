/**
 * L.9 — Interactive FullStackScaffold UX client (fail-closed).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runInteractiveForgeScaffold } from '@/lib/production/forge-scaffold-client'
import {
  isSupportedDevContainerTemplate,
  listDevContainerTemplateCatalog,
} from '@/lib/production/devcontainer-template-catalog'

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('L.9 Forge scaffold UX client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes L.2 template catalog aligned to SupportedDevContainerTemplate', () => {
    const catalog = listDevContainerTemplateCatalog()
    expect(catalog.length).toBe(5)
    for (const entry of catalog) {
      expect(isSupportedDevContainerTemplate(entry.id)).toBe(true)
    }
  })

  it('rejects unsupported templates without calling APIs', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await runInteractiveForgeScaffold({
      name: 'demo',
      templateId: 'nextjs-saas',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_TEMPLATE')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fail-closed when project create fails — never claims scaffold success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: 'CLOUD_PROJECT_LIMIT_REACHED', message: 'limit' }),
      }),
    )

    const result = await runInteractiveForgeScaffold({
      name: 'demo',
      templateId: 'nextjs-14',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('PROJECT_CREATE_FAILED')
      expect(result.error).toMatch(/limit/i)
    }
  })

  it('fail-closed when scaffold API returns gate blocked evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: '11111111-1111-4111-8111-111111111111', name: 'demo' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({
            ok: false,
            error: 'L8_PREVIEW: Preview URL started but never became reachable',
            commitGate: {
              ok: false,
              verdict: 'FAIL',
              blockedReasons: ['L8_PREVIEW: Preview URL started but never became reachable'],
              checks: [
                { id: 'L8_PREVIEW', status: 'fail', message: 'Preview URL started but never became reachable' },
              ],
              marketingAllowed: false,
            },
            blockedReasons: ['L8_PREVIEW: Preview URL started but never became reachable'],
            devContainerPersist: { ok: true },
          }),
        }),
    )

    const result = await runInteractiveForgeScaffold({
      name: 'demo',
      templateId: 'vite-react',
      preferredStrategy: 'local-dev-server',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('GATE_BLOCKED')
      expect(result.orphanProjectCreated).toBe(true)
      expect(result.projectId).toBe('11111111-1111-4111-8111-111111111111')
      expect(result.blockedReasons?.[0]).toMatch(/L8_PREVIEW/)
      expect(result.commitGate?.ok).toBe(false)
    }
  })

  it('requires L.2 persist evidence even when API ok:true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          preview: { ok: true, url: 'https://preview.example' },
          commitGate: { ok: true, verdict: 'PASS', checks: [], blockedReasons: [], marketingAllowed: false },
          // missing persist.ok
        }),
      }),
    )

    const result = await runInteractiveForgeScaffold({
      name: 'existing',
      templateId: 'nextjs-14',
      existingProjectId: '22222222-2222-4222-8222-222222222222',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('EVIDENCE_MISSING')
    }
  })

  it('returns openUrl + preview on full evidence success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: '33333333-3333-4333-8333-333333333333' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            preview: { ok: true, url: 'https://3000-session.e2b.dev' },
            commitGate: {
              ok: true,
              verdict: 'PASS',
              checks: [{ id: 'L2_DEVCONTAINER', status: 'pass', message: 'ok' }],
              blockedReasons: [],
              marketingAllowed: false,
            },
            devContainerPersist: {
              ok: true,
              relativePath: '.aethel/devcontainer.json',
            },
          }),
        }),
    )

    const result = await runInteractiveForgeScaffold({
      name: 'ship-it',
      templateId: 'nextjs-14',
      preferredStrategy: 'e2b',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.projectId).toBe('33333333-3333-4333-8333-333333333333')
      expect(result.previewUrl).toBe('https://3000-session.e2b.dev')
      expect(result.devContainerPersistOk).toBe(true)
      expect(result.marketingAllowed).toBe(false)
      expect(result.openUrl).toContain('projectId=33333333-3333-4333-8333-333333333333')
      expect(result.openUrl).toContain('previewUrl=')
    }
  })
})
