/**
 * @deprecated Product-facing preview should flow through
 * `@/components/preview/CanonicalPreviewSurface`.
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Codicon from './Codicon'
import { analytics } from '@/lib/analytics'
import { Monitor, Smartphone, Tablet, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface PreviewPanelProps {
  title?: string
  filePath?: string
  content?: string
  html?: string
  projectId?: string
  runtimeUrl?: string
  forceInlineFallback?: boolean
  runtimeUnavailableReason?: string
  isStale?: boolean
  onRefresh?: () => void
}

// Canonical runtime/html preview primitive.
// Product-level routing should flow through `components/preview/CanonicalPreviewSurface.tsx`
// to avoid fragmenting preview semantics across dashboard surfaces.

type PreviewMode =
  | 'html'
  | 'markdown'
  | 'json'
  | 'text'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'image'
  | 'audio'
  | 'video'
  | 'unsupported'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm'])
const TEXT_EXTENSIONS = new Set(['txt', 'log', 'ini', 'env', 'toml', 'yaml', 'yml'])
const MAX_INLINE_PREVIEW_CHARS = 350_000
const PREVIEW_NOTICE_CLASS =
  'mx-4 mt-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_24%,var(--aethel-border-primary))] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,var(--aethel-surface-secondary))] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]'
const PREVIEW_STATE_SHELL_CLASS =
  'max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]'
const PREVIEW_STATE_TITLE_CLASS = 'mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]'
const PREVIEW_STATE_COPY_CLASS = 'text-xs leading-5 text-[var(--aethel-text-tertiary)]'

function getExtension(filePath?: string): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const name = normalized.split('/').pop() || normalized
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function markdownToHtml(markdown: string): string {
  const escaped = escapeHtml(markdown)
  const withBlocks = escaped
    .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^\-\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^(?!<h\d|<pre|<li|<\/li|<blockquote|<code|<\/pre)(.+)$/gm, '<p>$1</p>')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; padding: 16px; font-family: Inter, Segoe UI, sans-serif; background: var(--aethel-surface-primary); color: var(--aethel-text-secondary); line-height: 1.45; }
    a { color: var(--aethel-primary-light); }
    pre { background: var(--aethel-surface-secondary); border: 1px solid var(--aethel-border-primary); border-radius: 8px; padding: 12px; overflow: auto; }
    code { color: var(--aethel-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    h1,h2,h3,h4,h5,h6 { margin: 14px 0 8px; color: var(--aethel-text-primary); }
    p { margin: 8px 0; }
    li { margin-left: 18px; }
  </style>
</head>
<body>${withBlocks}</body>
</html>`
}

function buildCssPreview(css: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; font-family: Inter, Segoe UI, sans-serif; background: var(--aethel-surface-primary); color: var(--aethel-text-secondary); }
    .app { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: min(520px, 95vw); border: 1px solid var(--aethel-border-primary); border-radius: 12px; background: var(--aethel-surface-secondary); padding: 20px; }
    .btn { border: 1px solid var(--aethel-border-primary); border-radius: 8px; background: var(--aethel-surface-tertiary); color: var(--aethel-text-primary); padding: 8px 12px; }
    ${css}
  </style>
</head>
<body>
  <div class="app">
    <div class="card">
      <h2>Previa CSS do Aethel</h2>
      <p>Arquivo CSS aplicado a um template de teste.</p>
      <button type="button" class="btn">Botao de teste</button>
    </div>
  </div>
</body>
</html>`
}

function buildJavaScriptPreview(source: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: var(--aethel-surface-primary); color: var(--aethel-text-secondary); font-family: Inter, Segoe UI, sans-serif; }
    #app { padding: 16px; min-height: 140px; border-bottom: 1px solid var(--aethel-border-primary); }
    #log { margin: 0; padding: 12px 16px; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; color: var(--aethel-text-tertiary); }
    .error { color: var(--aethel-error-light); }
  </style>
</head>
<body>
  <div id="app">Runtime JS inicializado.</div>
  <pre id="log">Log do runtime:</pre>
  <script>
    const logNode = document.getElementById('log');
    const runtimeConsole = globalThis['console'];
    const originalLog = runtimeConsole['log'].bind(runtimeConsole);
    runtimeConsole['log'] = (...args) => {
      logNode.textContent += "\\n" + args.map(String).join(" ");
      originalLog(...args);
    };
    window.addEventListener('error', (event) => {
      logNode.innerHTML += '\\n<span class="error">ERROR: ' + event.message + '</span>';
    });
  </script>
  <script type="module">
    try {
      const rawSource = ${JSON.stringify(source)};
      const runtimeModule = new Function(rawSource);
      runtimeModule();
    } catch (error) {
      runtimeConsole['log']('Runtime exception:', error?.message || error);
      throw error;
    }
  </script>
</body>
</html>`
}

function buildTypeScriptPreview(source: string, extension: string): string {
  const presetList = extension === 'tsx' || extension === 'jsx' ? "['typescript','react']" : "['typescript']"
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: var(--aethel-surface-primary); color: var(--aethel-text-secondary); font-family: Inter, Segoe UI, sans-serif; }
    #app { padding: 16px; min-height: 140px; border-bottom: 1px solid var(--aethel-border-primary); }
    #log { margin: 0; padding: 12px 16px; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; color: var(--aethel-text-tertiary); }
    .error { color: var(--aethel-error-light); }
  </style>
</head>
<body>
  <div id="app">Runtime TypeScript inicializado.</div>
  <pre id="log">Log do runtime:</pre>
  <script>
    const logNode = document.getElementById('log');
    const runtimeConsole = globalThis['console'];
    const originalLog = runtimeConsole['log'].bind(runtimeConsole);
    runtimeConsole['log'] = (...args) => {
      logNode.textContent += "\\n" + args.map(String).join(" ");
      originalLog(...args);
    };
    window.addEventListener('error', (event) => {
      logNode.innerHTML += '\\n<span class="error">ERROR: ' + event.message + '</span>';
    });
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="module">
    try {
      const raw = ${JSON.stringify(source)};
      if (!window.Babel || typeof Babel.transform !== 'function') {
        throw new Error('TS_TRANSPILER_UNAVAILABLE: @babel/standalone failed to load in preview runtime.');
      }
      const transformed = Babel.transform(raw, { presets: ${presetList} }).code;
      const runtimeModule = new Function(transformed || '');
      runtimeModule();
    } catch (error) {
      runtimeConsole['log']('TS transpile/runtime exception:', error?.message || error);
      throw error;
    }
  </script>
</body>
</html>`
}

function buildJsonPreview(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

function resolvePreviewMode(filePath?: string): PreviewMode {
  const ext = getExtension(filePath)
  if (!ext) return 'text'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'json') return 'json'
  if (ext === 'css') return 'css'
  if (ext === 'js') return 'javascript'
  if (ext === 'ts' || ext === 'tsx' || ext === 'jsx') return 'typescript'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  return 'unsupported'
}

export default function PreviewPanel({
  title = 'Previa',
  filePath,
  content,
  html,
  projectId,
  runtimeUrl,
  forceInlineFallback = false,
  runtimeUnavailableReason,
  isStale = false,
  onRefresh,
}: PreviewPanelProps) {
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null)
  const [runtimeReloadTick, setRuntimeReloadTick] = useState(0)
  const runtimeTelemetryRef = useRef<string>('')
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
          {projectId && (
            <span className="rounded px-1.5 py-0.5 text-[10px] normal-case text-[var(--aethel-info-light)] border border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
              project:{projectId}
            </span>
          )}
          <span className="text-[10px] normal-case text-[var(--aethel-text-quaternary)]">
            mode:{mode}
          </span>
          {canUseDevRuntime && (
            <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-1.5 py-0.5 text-[10px] normal-case text-[var(--aethel-success-light)]">
              runtime:dev-server
            </span>
          )}
          {!canUseDevRuntime && showIframeRuntime && (
            <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-1.5 py-0.5 text-[10px] normal-case text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]">
              runtime:inline-fallback
            </span>
          )}
          {forceInlineFallback && runtimeUrl && (
            <span
              className="rounded border border-[color-mix(in_srgb,var(--aethel-error)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-1.5 py-0.5 text-[10px] normal-case text-[var(--aethel-error-light)]"
              title={runtimeUnavailableReason || 'Runtime indisponivel'}
            >
              runtime:indisponivel
            </span>
          )}
          {isStale && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)] text-[10px] normal-case">
              Preview desatualizado
            </span>
          )}
        </div>
        <button type="button" aria-label={canUseDevRuntime ? 'Atualizar preview em runtime de desenvolvimento' : 'Atualizar preview'}
          onClick={() => {
            if (canUseDevRuntime) setRuntimeReloadTick((prev) => prev + 1)
            onRefresh?.()
          }}
          disabled={!onRefresh && !canUseDevRuntime}
          className="flex items-center gap-1 rounded px-2 py-1 text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
          title="Atualizar preview"
        >
          <Codicon name="refresh" />
          Atualizar
        </button>
      </div>

      <div className="flex-1 bg-[var(--aethel-surface-secondary)]">
        {forceInlineFallback && runtimeUrl && (
          <div className={PREVIEW_NOTICE_CLASS} role="status" aria-live="polite">
            Runtime externo indisponivel. Fallback inline ativo (recursos de runtime desabilitados).
            {runtimeUnavailableReason ? ` Motivo: ${runtimeUnavailableReason}.` : ''}
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
            title="Aethel Preview Runtime"
            sandbox="allow-scripts"
            className="h-full w-full bg-[var(--aethel-surface-primary)]"
            srcDoc={runtimeDoc}
          />
        )}

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
                  onError={() => setMediaLoadError('Nao foi possivel renderizar a imagem a partir do endpoint de arquivos do runtime.')}
                />
              </div>
            )}
            {mode === 'audio' && (
              <audio
                controls
                src={rawAssetUrl}
                className="w-full max-w-xl"
                onError={() => setMediaLoadError('Falha no preview de audio: codec nao suportado ou origem do runtime ausente.')}
              />
            )}
            {mode === 'video' && (
              <video
                controls
                src={rawAssetUrl}
                className="max-w-full max-h-full bg-[var(--aethel-surface-primary)]"
                onError={() => setMediaLoadError('Falha no preview de video: codec nao suportado ou origem do runtime ausente.')}
              />
            )}
          </div>
        )}

        {showMedia && mediaLoadError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={PREVIEW_STATE_SHELL_CLASS}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview de midia indisponivel</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>{mediaLoadError}</div>
              <div className={`${PREVIEW_STATE_COPY_CLASS} mt-2`}>
                Capacidade em estado parcial. Valide codecs e suporte do runtime no ambiente final.
              </div>
            </div>
          </div>
        )}

        {mode === 'unsupported' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview ainda nao suportado para este tipo de arquivo</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                A extensao &quot;{ext || 'desconhecida'}&quot; ainda esta fora do escopo validado de preview.
              </div>
            </div>
          </div>
        )}

        {isLargeTextPreview && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={PREVIEW_STATE_SHELL_CLASS}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview bloqueado para payload grande</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                Este arquivo excede o limite validado de preview inline ({MAX_INLINE_PREVIEW_CHARS.toLocaleString()} chars).
              </div>
              <div className={`${PREVIEW_STATE_COPY_CLASS} mt-2`}>
                Capacidade em estado parcial. Use execucao em runtime ou abra um arquivo menor e mais focado.
              </div>
            </div>
          </div>
        )}

        {!hasText && !showMedia && mode !== 'unsupported' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview ainda nao disponivel</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>
                Abra um arquivo no Explorer para renderizar o preview.
              </div>
            </div>
          </div>
        )}

        {showMedia && !rawAssetUrl && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
            <div className={`${PREVIEW_STATE_SHELL_CLASS} max-w-md`}>
              <div className={PREVIEW_STATE_TITLE_CLASS}>Preview de midia indisponivel</div>
              <div className={PREVIEW_STATE_COPY_CLASS}>Faltou o caminho da midia para este contexto de preview.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
