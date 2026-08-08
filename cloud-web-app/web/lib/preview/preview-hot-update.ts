/**
 * L.8 — client helpers for multi-file preview hot-update after governed apply.
 * Honesty: never claim HMR unless the server returned hmr:true.
 */

export const PREVIEW_APPLY_SUCCESS_EVENT = 'aethel.preview.apply-success'
export const PREVIEW_FORCE_RELOAD_EVENT = 'aethel.preview.force-reload'
export const PREVIEW_HOT_UPDATE_RESULT_EVENT = 'aethel.preview.hot-update-result'

export type PreviewApplySuccessDetail = {
  paths: string[]
  projectId?: string | null
  /** Prefer HMR when the preview bridge is connected; default forces reload. */
  preferHmr?: boolean
}

export type PreviewHotUpdateClientResult = {
  ok: boolean
  filesSynced: number
  hmr: boolean
  reload: boolean
  reusedSession: boolean
  mode: 'hmr' | 'reload' | 'denied'
  message?: string
  sandboxSessionId?: string
  strategy?: string
}

/** Fire after a successful governed apply batch so the live preview session can sync+refresh. */
export function notifyPreviewApplySuccess(detail: PreviewApplySuccessDetail): void {
  if (typeof window === 'undefined') return
  const paths = (detail.paths ?? []).map((p) => p.trim()).filter(Boolean)
  if (paths.length === 0) return
  window.dispatchEvent(
    new CustomEvent(PREVIEW_APPLY_SUCCESS_EVENT, {
      detail: {
        paths,
        projectId: detail.projectId ?? null,
        preferHmr: Boolean(detail.preferHmr),
      } satisfies PreviewApplySuccessDetail,
    }),
  )
}

/** Force iframe reload without reprovisioning (honesty: full reload, not HMR). */
export function forcePreviewIframeReload(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PREVIEW_FORCE_RELOAD_EVENT))
}

export function publishPreviewHotUpdateResult(result: PreviewHotUpdateClientResult): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PREVIEW_HOT_UPDATE_RESULT_EVENT, {
      detail: result,
    }),
  )
}
