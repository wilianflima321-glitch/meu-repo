'use client';

/**
 * @deprecated Product-facing preview should flow through
 * `@/components/preview/CanonicalPreviewSurface`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Codicon from './Codicon'
import { analytics } from '../../web/lib/analytics'
import { Monitor, Smartphone, Tablet, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useInlinePreviewInspector } from './PreviewPanel.inspect'
import {
  MAX_INLINE_PREVIEW_CHARS,
  PREVIEW_NOTICE_CLASS,
  PREVIEW_STATE_COPY_CLASS,
  PREVIEW_STATE_SHELL_CLASS,
  PREVIEW_STATE_TITLE_CLASS,
  buildInspectableRuntimeDoc,
  buildCssPreview,
  buildJavaScriptPreview,
  buildJsonPreview,
  buildTypeScriptPreview,
  getExtension,
  markdownToHtml,
  resolvePreviewMode,
  type PreviewPanelProps,
} from './PreviewPanel.parts'

export default function PreviewPanel({
  title = 'Preview',
  filePath,
  content,
  html,
  projectId,
  runtimeUrl,
  forceInlineFallback = false,
  runtimeUnavailableReason,
  isStale = false,
  inspectArmed = false,
  onRefresh,
  onInlineElementInspect,
}: PreviewPanelProps) {
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null)
  const [runtimeReloadTick, setRuntimeReloadTick] = useState(0)
  const runtimeTelemetryRef = useRef<string>('')
  const inlineFrameRef = useRef<HTMLIFrameElement | null>(null)
  const ext = getExtension(filePath)
  const mode = useMemo(() => resolvePreviewMode(filePath), [filePath])
  const textContent = typeof content === 'string' ? content : typeof html === 'string' ? html : ''
  const hasText = textContent.length > 0
  const isLargeTextPreview = hasText && textContent.length > MAX_INLINE_PREVIEW_CHARS

  const runtimeDoc = useMemo(() => {
    if (!hasText) return ''
    if (mode === 'html') return textContent
    if (mode === 'markdown') return markdownToHtml(textContent)
    if (mode === 'css') return buildCssPreview(textContent)
    if (mode === 'javascript') return buildJavaScriptPreview(textContent)
    if (mode === 'typescript') return buildTypeScriptPreview(textContent, ext)
    return ''
  }, [mode, hasText, textContent, ext])

  const inspectableRuntimeDoc = useMemo(
    () => (runtimeDoc ? buildInspectableRuntimeDoc(runtimeDoc) : ''),
    [runtimeDoc],
  )

  const rawAssetUrl = useMemo(() => {
    if (!filePath || (mode !== 'image' && mode !== 'audio' && mode !== 'video')) return ''
    const params = new URLSearchParams()
    params.set('path', filePath)
    params.set('intent', 'preview')
    if (projectId) params.set('projectId', projectId)
    return `/api/files/raw?${params.toString()}`
  }, [filePath, mode, projectId])

  const showIframeRuntime =
    !isLargeTextPreview &&
    (mode === 'html' || mode === 'markdown' || mode === 'css' || mode === 'javascript' || mode === 'typescript')
  const canUseDevRuntime =
    !!runtimeUrl &&
    !forceInlineFallback &&
    !isLargeTextPreview &&
    (mode === 'html' || mode === 'css' || mode === 'javascript' || mode === 'typescript')
  const runtimeSrc = useMemo(() => {
    if (!runtimeUrl) return ''
    const separator = runtimeUrl.includes('?') ? '&' : '?'
    return `${runtimeUrl}${separator}aethel_preview_tick=${runtimeReloadTick}`
  }, [runtimeReloadTick, runtimeUrl])
  const showText = !isLargeTextPreview && (mode === 'json' || mode === 'text')
  const showMedia = mode === 'image' || mode === 'audio' || mode === 'video'
  const previewStatusLabel = canUseDevRuntime
    ? 'Live'
    : forceInlineFallback && runtimeUrl
      ? 'Unavailable'
      : showIframeRuntime
        ? 'Inline'
        : showMedia
          ? 'Asset'
          : 'Static'
  const previewStatusTitle = [
    `Mode: ${mode}`,
    projectId ? `Project: ${projectId}` : null,
    canUseDevRuntime
      ? 'Runtime: development server'
      : showIframeRuntime
        ? 'Runtime: local preview'
        : forceInlineFallback && runtimeUrl
          ? `Runtime unavailable${runtimeUnavailableReason ? `: ${runtimeUnavailableReason}` : ''}`
          : null,
  ]
    .filter(Boolean)
    .join(' · ')

  useEffect(() => {
    setMediaLoadError(null)
  }, [rawAssetUrl, mode, filePath])

  useEffect(() => {
    const runtimeMode =
      canUseDevRuntime
        ? 'dev-server'
        : showIframeRuntime
          ? 'inline-fallback'
          : 'not-applicable'
    const key = `${filePath || 'none'}:${mode}:${runtimeMode}`
    if (runtimeTelemetryRef.current === key) return
    runtimeTelemetryRef.current = key

    analytics?.track?.('engine', 'render_time', {
      metadata: {
        surface: 'preview-panel',
        filePath: filePath || null,
        mode,
        runtimeMode,
      },
    })
  }, [canUseDevRuntime, filePath, mode, showIframeRuntime])

  useInlinePreviewInspector({
    frameRef: inlineFrameRef,
    inspectArmed,
    canUseDevRuntime,
    showIframeRuntime,
    onInlineElementInspect,
  })

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      <div className="density-header flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2 text-[10px] uppercase tracking-wide text-[var(--aethel-text-tertiary)]">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {filePath && (
            <span className="max-w-[220px] truncate text-[10px] normal-case text-[var(--aethel-text-quaternary)]" title={filePath}>
              {filePath}
            </span>
          )}
          <span
            className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-1.5 py-0.5 text-[10px] normal-case text-[var(--aethel-text-secondary)]"
            title={previewStatusTitle}
          >
            Preview · {previewStatusLabel}
          </span>
          {isStale && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)] text-[10px] normal-case">
              Preview out of sync
            </span>
          )}
        </div>
        <button type="button" aria-label={canUseDevRuntime ? 'Refresh development runtime preview' : 'Refresh preview'}
          onClick={() => {
            if (canUseDevRuntime) setRuntimeReloadTick((prev) => prev + 1)
            onRefresh?.()
          }}
          disabled={!onRefresh && !canUseDevRuntime}
          className="flex items-center gap-1 rounded px-2 py-1 text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
          title="Refresh preview"
        >
          <Codicon name="refresh" />
          Reload
        </button>
      </div>

      <div className="flex-1 bg-[var(--aethel-surface-secondary)]">
        {forceInlineFallback && runtimeUrl && (
          <div className={PREVIEW_NOTICE_CLASS} role="status" aria-live="polite">
            Live runtime unavailable. Local preview is active.
            {runtimeUnavailableReason ? ` Reason: ${runtimeUnavailableReason}.` : ''}
          </div>
        )}
        {canUseDevRuntime && (
          <iframe
            title="Aethel Preview Runtime Server"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="h-full w-full bg-[var(--aethel-surface-primary)]"
            src={runtimeSrc}
          />
        )}

        {!canUseDevRuntime && showIframeRuntime && hasText && (
          <iframe
            ref={inlineFrameRef}
            title="Aethel Preview Runtime"
            sandbox="allow-scripts"
            className="h-full w-full bg-[var(--aethel-surface-primary)]"
            srcDoc={inspectableRuntimeDoc}
            onLoad={() => {
              inlineFrameRef.current?.contentWindow?.postMessage(
                { type: 'aethel.preview.inspect.set', armed: inspectArmed },
                '*',
              )
            }}
          />
        )}

        {inspectArmed && showIframeRuntime && hasText && <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-secondary)] shadow-[0_18px_50px_rgba(2,6,23,0.32)]">Select an element</div>}

        {showText && hasText && (
          <pre className="m-0 h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {mode === 'json' ? buildJsonPreview(textContent) : textContent}
          </pre>
        )}

        {showMedia && !!rawAssetUrl && !mediaLoadError && (
          <div className="w-full h-full flex items-center justify-center p-4">
            {mode === 'image' && (
              <div className="relative w-full h-full min-h-[220px]">
                <Image
                  src={rawAssetUrl}
                  alt={filePath || 'preview'}
                  fill
                  unoptimized
                  className="object-contain"
                  onError={() => setMediaLoadError('Could not render the image from the runtime file endpoint.')}
                />
              </div>
            )}
            {mode === 'audio' && (
              <audio
                controls
                src={rawAssetUrl}
                className="w-full max-w-xl"
                onError={() => setMediaLoadError('Audio preview failed: unsupported codec or missing runtime origin.')}
              />
            )}
            {mode === 'video' && (
              <video
                controls
                src={rawAssetUrl}
                className="max-w-full max-h-full bg-[var(--aethel-surface-primary)]"
                onError={() => setMediaLoadError('Video preview failed: unsupported codec or missing runtime origin.')}
              />
            )}
          </div>
        )}

        {showMedia && mediaLoadError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={PREVIEW_STATE_SHELL_CLASS}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Media preview unavailable</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>{mediaLoadError}</div>
              <div className={`${PREVIEW_STATE_COPY_CLASS} mt-2`}>
                Capability is partially available. Validate codecs and runtime support in the final environment.
              </div>
            </div>
          </div>
        )}

        {mode === 'unsupported' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview is not supported for this file type yet</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                The &quot;{ext || 'unknown'}&quot; extension is outside the validated preview scope.
              </div>
            </div>
          </div>
        )}

        {isLargeTextPreview && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={PREVIEW_STATE_SHELL_CLASS}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview blocked for a large payload</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                This file exceeds the validated inline preview limit ({MAX_INLINE_PREVIEW_CHARS.toLocaleString()} chars).
              </div>
              <div className={`${PREVIEW_STATE_COPY_CLASS} mt-2`}>
                Capability is partially available. Use runtime execution or open a smaller, more focused file.
              </div>
            </div>
          </div>
        )}

        {!hasText && !showMedia && mode !== 'unsupported' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview is not available yet</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                Open a file in Explorer to render the preview.
              </div>
            </div>
          </div>
        )}

        {showMedia && !rawAssetUrl && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Media preview unavailable</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>The media path is missing for this preview context.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
