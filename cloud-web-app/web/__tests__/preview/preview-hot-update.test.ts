import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  forcePreviewIframeReload,
  notifyPreviewApplySuccess,
  PREVIEW_APPLY_SUCCESS_EVENT,
  PREVIEW_FORCE_RELOAD_EVENT,
} from '@/lib/preview/preview-hot-update'
import { requestPreviewHotUpdate } from '@/lib/preview/runtime-manager'

describe('L.8 preview hot-update client helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('notifyPreviewApplySuccess dispatches paths and skips empty', () => {
    const spy = vi.fn()
    window.addEventListener(PREVIEW_APPLY_SUCCESS_EVENT, spy as EventListener)
    notifyPreviewApplySuccess({ paths: [] })
    expect(spy).not.toHaveBeenCalled()
    notifyPreviewApplySuccess({ paths: [' src/App.tsx ', ''] })
    expect(spy).toHaveBeenCalledTimes(1)
    const detail = (spy.mock.calls[0]![0] as CustomEvent).detail
    expect(detail.paths).toEqual(['src/App.tsx'])
    window.removeEventListener(PREVIEW_APPLY_SUCCESS_EVENT, spy as EventListener)
  })

  it('forcePreviewIframeReload dispatches force-reload event', () => {
    const spy = vi.fn()
    window.addEventListener(PREVIEW_FORCE_RELOAD_EVENT, spy as EventListener)
    forcePreviewIframeReload()
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener(PREVIEW_FORCE_RELOAD_EVENT, spy as EventListener)
  })

  it('requestPreviewHotUpdate fails closed without sandboxId (hmr:false)', async () => {
    const result = await requestPreviewHotUpdate({
      sandboxId: null,
      paths: ['src/App.tsx'],
    })
    expect(result.ok).toBe(false)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(false)
    expect(result.mode).toBe('denied')
    expect(result.error).toBe('RUNTIME_HOT_UPDATE_MISSING_SESSION')
  })

  it('requestPreviewHotUpdate maps server honesty flags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          success: true,
          hmr: false,
          reload: true,
          mode: 'reload',
          reusedSession: true,
          filesSynced: 3,
          message: 'Synced 3 file(s); full preview reload required (HMR not confirmed).',
          sandboxSessionId: 'sess-1',
        }),
      }),
    )

    const result = await requestPreviewHotUpdate({
      sandboxId: 'sess-1',
      paths: ['a.tsx', 'b.tsx', 'c.tsx'],
    })

    expect(result.ok).toBe(true)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(true)
    expect(result.mode).toBe('reload')
    expect(result.filesSynced).toBe(3)
    expect(result.reusedSession).toBe(true)
  })
})
