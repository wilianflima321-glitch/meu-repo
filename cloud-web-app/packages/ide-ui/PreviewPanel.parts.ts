export interface PreviewPanelProps {
  title?: string
  filePath?: string
  content?: string
  html?: string
  projectId?: string
  runtimeUrl?: string
  forceInlineFallback?: boolean
  runtimeUnavailableReason?: string
  isStale?: boolean
  inspectArmed?: boolean
  onRefresh?: () => void
  onInlineElementInspect?: (payload: InlineElementInspectPayload) => void
}

export interface InlineElementInspectPayload {
  position: { x: number; y: number }
  elementInfo: {
    tag: string
    id?: string
    className?: string
    textContent?: string
    attributes?: Record<string, string>
    boxModel?: {
      width: number
      height: number
      margin: string
      padding: string
      border: string
    }
    computedStyles?: Record<string, string>
  }
}

export function buildInspectableRuntimeDoc(source: string): string {
  const bridge = `<script>
(() => {
  const messageType = 'aethel.preview.inspect.element';
  const setType = 'aethel.preview.inspect.set';
  let armed = false;
  let styleNode = null;
  const root = document.documentElement;
  function setArmed(next) {
    armed = Boolean(next);
    root.dataset.aethelInspectArmed = armed ? 'true' : 'false';
    if (armed && !styleNode) {
      styleNode = document.createElement('style');
      styleNode.textContent = 'html[data-aethel-inspect-armed="true"] *{cursor:crosshair!important}html[data-aethel-inspect-armed="true"] *:hover{outline:1px solid var(--aethel-focus)!important;outline-offset:2px!important}';
      document.head.appendChild(styleNode);
    }
    if (!armed && styleNode) {
      styleNode.remove();
      styleNode = null;
    }
  }
  document.addEventListener('click', (event) => {
    if (!armed) return;
    const node = event.target;
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = node.getBoundingClientRect();
    const computed = window.getComputedStyle(node);
    const attrs = {};
    Array.from(node.attributes || []).slice(0, 10).forEach((attr) => { attrs[attr.name] = attr.value; });
    const text = (node.innerText || node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 180);
    window.parent.postMessage({
      type: messageType,
      bounds: { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      elementInfo: {
        tag: node.tagName.toLowerCase(),
        id: node.id || undefined,
        className: typeof node.className === 'string' ? node.className || undefined : undefined,
        textContent: text || undefined,
        attributes: attrs,
        boxModel: { width: Math.round(rect.width), height: Math.round(rect.height), margin: computed.margin, padding: computed.padding, border: computed.border },
        computedStyles: { display: computed.display, position: computed.position, color: computed.color, backgroundColor: computed.backgroundColor, fontSize: computed.fontSize, fontWeight: computed.fontWeight },
      },
    }, '*');
    setArmed(false);
  }, true);
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === setType) setArmed(event.data.armed);
  });
})();
<\/script>`

  return /<\/body>/i.test(source) ? source.replace(/<\/body>/i, `${bridge}</body>`) : `${source}${bridge}`
}

// Canonical runtime/html preview primitive.
// Product-level routing should flow through `components/preview/CanonicalPreviewSurface.tsx`
// to avoid fragmenting preview semantics across dashboard surfaces.

export type PreviewMode =
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

export const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'])
export const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg'])
export const VIDEO_EXTENSIONS = new Set(['mp4', 'webm'])
export const TEXT_EXTENSIONS = new Set(['txt', 'log', 'ini', 'env', 'toml', 'yaml', 'yml'])
export const MAX_INLINE_PREVIEW_CHARS = 350_000
export const PREVIEW_NOTICE_CLASS =
  'mx-4 mt-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_24%,var(--aethel-border-primary))] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,var(--aethel-surface-secondary))] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]'
export const PREVIEW_STATE_SHELL_CLASS =
  'max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-5 py-4 shadow-[0_18px_40px_color-mix(in_srgb,black_22%,transparent)]'
export const PREVIEW_STATE_TITLE_CLASS = 'mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]'
export const PREVIEW_STATE_COPY_CLASS = 'text-xs leading-5 text-[var(--aethel-text-tertiary)]'

export function getExtension(filePath?: string): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const name = normalized.split('/').pop() || normalized
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function markdownToHtml(markdown: string): string {
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

export function buildCssPreview(css: string): string {
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
      <h2>Aethel CSS preview</h2>
      <p>CSS file applied to a test template.</p>
      <button type="button" class="btn">Test button</button>
    </div>
  </div>
</body>
</html>`
}

export function buildJavaScriptPreview(source: string): string {
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
  <div id="app">JavaScript runtime initialized.</div>
  <pre id="log">Runtime log:</pre>
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

export function buildTypeScriptPreview(source: string, extension: string): string {
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
  <div id="app">TypeScript runtime initialized.</div>
  <pre id="log">Runtime log:</pre>
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

export function buildJsonPreview(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

export function resolvePreviewMode(filePath?: string): PreviewMode {
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
