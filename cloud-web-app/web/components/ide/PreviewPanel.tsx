'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Codicon from './Codicon'

interface PreviewPanelProps {
  title?: string
  filePath?: string
  content?: string
  html?: string
  projectId?: string
  isStale?: boolean
  onRefresh?: () => void
}

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
    body { margin: 0; padding: 16px; font-family: Inter, Segoe UI, sans-serif; background: #0b0d12; color: #e2e8f0; line-height: 1.45; }
    a { color: #93c5fd; }
    pre { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; overflow: auto; }
    code { color: #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    h1,h2,h3,h4,h5,h6 { margin: 14px 0 8px; color: #f8fafc; }
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
    html, body { margin: 0; padding: 0; font-family: Inter, Segoe UI, sans-serif; background: #0f172a; color: #e2e8f0; }
    .app { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: min(520px, 95vw); border: 1px solid #334155; border-radius: 12px; background: #111827; padding: 20px; }
    .btn { border: 1px solid #334155; border-radius: 8px; background: #1e293b; color: #f8fafc; padding: 8px 12px; }
    ${css}
  </style>
</head>
<body>
  <div class="app">
    <div class="card">
      <h2>Aethel CSS Preview</h2>
      <p>Arquivo CSS aplicado em um template de teste.</p>
      <button class="btn">Test Button</button>
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
    html, body { margin: 0; padding: 0; background: #0b0d12; color: #e2e8f0; font-family: Inter, Segoe UI, sans-serif; }
    #app { padding: 16px; min-height: 140px; border-bottom: 1px solid #1e293b; }
    #log { margin: 0; padding: 12px 16px; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; color: #94a3b8; }
    .error { color: #fda4af; }
  </style>
</head>
<body>
  <div id="app">JS runtime initialized.</div>
  <pre id="log">Runtime log:</pre>
  <script>
    const logNode = document.getElementById('log');
    const originalLog = console.log;
    console.log = (...args) => {
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
      console.log('Runtime exception:', error?.message || error);
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
    html, body { margin: 0; padding: 0; background: #0b0d12; color: #e2e8f0; font-family: Inter, Segoe UI, sans-serif; }
    #app { padding: 16px; min-height: 140px; border-bottom: 1px solid #1e293b; }
    #log { margin: 0; padding: 12px 16px; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; color: #94a3b8; }
    .error { color: #fda4af; }
  </style>
</head>
<body>
  <div id="app">TypeScript runtime initialized.</div>
  <pre id="log">Runtime log:</pre>
  <script>
    const logNode = document.getElementById('log');
    const originalLog = console.log;
    console.log = (...args) => {
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
      console.log('TS transpile/runtime exception:', error?.message || error);
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
  title = 'Preview',
  filePath,
  content,
  html,
  projectId,
  isStale = false,
  onRefresh,
}: PreviewPanelProps) {
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null)
  const ext = getExtension(filePath)
  const mode = useMemo(() => {
    if (!filePath) {
      if (typeof html === 'string' && html.trim()) return 'html'
      if (typeof content === 'string' && content.trim()) return 'text'
      return 'text'
    }
    return resolvePreviewMode(filePath)
  }, [filePath, html, content])
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
    if (projectId) params.set('projectId', projectId)
    return `/api/files/raw?${params.toString()}`
  }, [filePath, mode, projectId])

  const showIframeRuntime =
    !isLargeTextPreview &&
    (mode === 'html' || mode === 'markdown' || mode === 'css' || mode === 'javascript' || mode === 'typescript')
  const showText = !isLargeTextPreview && (mode === 'json' || mode === 'text')
  const showMedia = mode === 'image' || mode === 'audio' || mode === 'video'

  useEffect(() => {
    setMediaLoadError(null)
  }, [rawAssetUrl, mode, filePath])

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="density-header flex items-center justify-between px-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wide">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {filePath && (
            <span className="text-[10px] text-slate-500 normal-case truncate max-w-[220px]" title={filePath}>
              {filePath}
            </span>
          )}
          {projectId && (
            <span className="text-[10px] text-cyan-300 normal-case px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
              project:{projectId}
            </span>
          )}
          <span className="text-[10px] text-slate-500 normal-case">
            mode:{mode}
          </span>
          {isStale && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] normal-case">
              Preview out of date
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={!onRefresh}
          aria-label="Refresh preview panel"
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          title="Refresh preview"
        >
          <Codicon name="refresh" />
          Refresh
        </button>
      </div>

      <div className="flex-1 bg-slate-900">
        {showIframeRuntime && hasText && (
          <iframe
            title="Aethel Preview Runtime"
            sandbox="allow-scripts"
            className="w-full h-full bg-white"
            srcDoc={runtimeDoc}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}

        {showText && hasText && (
          <pre className="h-full m-0 p-4 overflow-auto text-xs leading-5 text-slate-200 font-mono whitespace-pre-wrap">
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
                  onError={() => setMediaLoadError('Unable to render image preview from file runtime endpoint.')}
                />
              </div>
            )}
            {mode === 'audio' && (
              <audio
                controls
                src={rawAssetUrl}
                className="w-full max-w-xl"
                onError={() => setMediaLoadError('Audio preview failed (unsupported codec or missing runtime source).')}
              />
            )}
            {mode === 'video' && (
              <video
                controls
                src={rawAssetUrl}
                className="max-w-full max-h-full bg-black"
                onError={() => setMediaLoadError('Video preview failed (unsupported codec or missing runtime source).')}
              />
            )}
          </div>
        )}

        {showMedia && mediaLoadError && (
          <div className="h-full flex items-center justify-center text-center px-6 text-slate-400 text-sm">
            <div className="max-w-lg rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="mb-2 font-medium text-amber-200">Media preview unavailable</div>
              <div className="text-slate-300 text-xs">{mediaLoadError}</div>
              <div className="mt-2 text-slate-500 text-xs">
                Capability status: PARTIAL. Validate media codec/runtime support in final target environment.
              </div>
            </div>
          </div>
        )}

        {mode === 'unsupported' && (
          <div className="h-full flex items-center justify-center text-center px-6 text-slate-400 text-sm">
            <div className="max-w-md rounded border border-slate-700 bg-slate-950/40 px-4 py-3">
              <div className="mb-2 font-medium text-slate-300">Preview unsupported for this file type</div>
              <div className="text-slate-500 text-xs">
                Extension &quot;{ext || 'unknown'}&quot; is outside the validated runtime preview scope.
              </div>
            </div>
          </div>
        )}

        {isLargeTextPreview && (
          <div className="h-full flex items-center justify-center text-center px-6 text-slate-400 text-sm">
            <div className="max-w-lg rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="mb-2 font-medium text-amber-200">Preview gated for large payload</div>
              <div className="text-slate-300 text-xs">
                This file exceeds the validated inline preview limit ({MAX_INLINE_PREVIEW_CHARS.toLocaleString()} chars).
              </div>
              <div className="mt-2 text-slate-500 text-xs">
                Capability status: PARTIAL. Use runtime execution or open a smaller scoped file.
              </div>
            </div>
          </div>
        )}

        {!hasText && !showMedia && mode !== 'unsupported' && (
          <div className="h-full flex items-center justify-center text-center px-6 text-slate-400 text-sm">
            <div>
              <div className="mb-2 font-medium text-slate-300">Preview not available</div>
              <div className="text-slate-500">
                Open a file in Explorer to render preview.
              </div>
            </div>
          </div>
        )}

        {showMedia && !rawAssetUrl && (
          <div className="h-full flex items-center justify-center text-center px-6 text-slate-400 text-sm">
            <div>
              <div className="mb-2 font-medium text-slate-300">Media preview unavailable</div>
              <div className="text-slate-500">Missing media source path for this preview context.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
