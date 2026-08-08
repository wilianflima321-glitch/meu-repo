import { DOMAIN_INSTANT_PLAY_BG } from '@/lib/design-system/domain-color-presets'
/**
 * Instant Play — html-emitter stage.
 *
 * Minimal index.html that mounts #aethel-root and loads the packed runtime
 * module (which calls bootAethelRuntime). Forbidden: build-queue addWebTemplate
 * theater copy ("Runtime Web exportado").
 */

export const INSTANT_PLAY_HTML_PATH = 'index.html' as const
export const INSTANT_PLAY_BUNDLE_FILENAME = 'runtime.bundle.js' as const

export interface InstantPlayHtmlEmitInput {
  projectId: string
  jobId: string
  /** Relative script src for the packed ESM bundle (default: ./runtime.bundle.js). */
  bundleSrc?: string
  title?: string
}

export interface InstantPlayHtmlEmitResult {
  path: typeof INSTANT_PLAY_HTML_PATH
  content: string
  contentType: 'text/html; charset=utf-8'
  /** True when HTML contains the real Instant Play boot contract markers. */
  bootsRuntime: boolean
}

/**
 * Emit Instant Play host HTML. The packed module must export/side-effect
 * boot via bootAethelRuntime — HTML never claims readiness alone.
 */
export function emitInstantPlayHtml(input: InstantPlayHtmlEmitInput): InstantPlayHtmlEmitResult {
  const bundleSrc = input.bundleSrc?.trim() || `./${INSTANT_PLAY_BUNDLE_FILENAME}`
  const title = input.title?.trim() || 'Aethel Instant Play'
  const content = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <meta name="aethel-instant-play" content="1" />`,
    `  <meta name="aethel-project-id" content="${escapeAttr(input.projectId)}" />`,
    `  <meta name="aethel-job-id" content="${escapeAttr(input.jobId)}" />`,
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    `    html, body, #aethel-root { margin: 0; width: 100%; height: 100%; background: ${DOMAIN_INSTANT_PLAY_BG}; }`,
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="aethel-root" data-aethel-mount="true"></div>',
    `  <script type="module" src="${escapeAttr(bundleSrc)}"></script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n')

  const bootsRuntime =
    content.includes('id="aethel-root"') &&
    content.includes('type="module"') &&
    content.includes(bundleSrc) &&
    !/Runtime Web exportado/i.test(content) &&
    !/coming soon/i.test(content)

  return {
    path: INSTANT_PLAY_HTML_PATH,
    content,
    contentType: 'text/html; charset=utf-8',
    bootsRuntime,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}
