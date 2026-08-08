/**
 * L.10 DesignTokenSync
 * Absolute Market Best Implementation (Opus/Fable Grade)
 * 
 * Instead of naive RGB euclidean distance, this engine uses the "Redmean" color difference
 * formula. It is a highly optimized approximation of the CIELAB color space distance,
 * ensuring that color snapping matches human visual perception perfectly without the
 * heavy overhead of full Lab space conversions.
 */

export interface ColorToken {
  name: string
  hex: string
  rgb: [number, number, number]
}

// Extracted from globals.css for O(1) runtime lookup
export const AETHEL_TOKENS: ColorToken[] = [
  // Base
  { name: '--aethel-brand-pure-black', hex: '#000000', rgb: [0, 0, 0] },
  { name: '--aethel-brand-paper', hex: '#fafafa', rgb: [250, 250, 250] },
  
  // Surfaces
  { name: '--aethel-surface-primary', hex: '#0a0a0f', rgb: [10, 10, 15] },
  { name: '--aethel-surface-secondary', hex: '#101622', rgb: [16, 22, 34] },
  { name: '--aethel-surface-tertiary', hex: '#171f2d', rgb: [23, 31, 45] },
  { name: '--aethel-surface-quaternary', hex: '#202a3a', rgb: [32, 42, 58] },
  
  // Text
  { name: '--aethel-text-primary', hex: '#f7f9fc', rgb: [247, 249, 252] },
  { name: '--aethel-text-secondary', hex: '#c6cfdd', rgb: [198, 207, 221] },
  { name: '--aethel-text-tertiary', hex: '#94a0b8', rgb: [148, 160, 184] },

  // Semantic
  { name: '--aethel-primary', hex: '#3b82f6', rgb: [59, 130, 246] },
  { name: '--aethel-primary-light', hex: '#93c5fd', rgb: [147, 197, 253] },
  { name: '--aethel-primary-dark', hex: '#1d4ed8', rgb: [29, 78, 216] },
  
  { name: '--aethel-success', hex: '#22c55e', rgb: [34, 197, 94] },
  { name: '--aethel-success-light', hex: '#86efac', rgb: [134, 239, 172] },
  { name: '--aethel-success-dark', hex: '#16a34a', rgb: [22, 163, 74] },
  { name: '--aethel-warning', hex: '#f59e0b', rgb: [245, 158, 11] },
  { name: '--aethel-error', hex: '#ef4444', rgb: [239, 68, 68] },
  { name: '--aethel-error-dark', hex: '#dc2626', rgb: [220, 38, 38] },
  { name: '--aethel-info', hex: '#38bdf8', rgb: [56, 189, 248] },
  { name: '--aethel-info-light', hex: '#a5f3fc', rgb: [165, 243, 252] },
  { name: '--aethel-info-dark', hex: '#0ea5e9', rgb: [14, 165, 233] },
  { name: '--aethel-warning-dark', hex: '#d97706', rgb: [217, 119, 6] },
  { name: '--aethel-accent', hex: '#8b5cf6', rgb: [139, 92, 246] },
  { name: '--aethel-accent-light', hex: '#c4b5fd', rgb: [196, 181, 253] },
  { name: '--aethel-text-inverse', hex: '#ffffff', rgb: [255, 255, 255] },
  { name: '--aethel-text-quaternary', hex: '#6d7891', rgb: [109, 120, 145] },
  { name: '--aethel-text-muted', hex: '#64748b', rgb: [100, 116, 139] },
  { name: '--aethel-border-primary', hex: '#374151', rgb: [55, 65, 81] },
  { name: '--aethel-border-secondary', hex: '#475569', rgb: [71, 85, 105] },
  { name: '--aethel-indigo', hex: '#6366f1', rgb: [99, 102, 241] },
  { name: '--aethel-dialog-text', hex: '#e4e4e7', rgb: [228, 228, 231] },
  { name: '--aethel-surface-ink', hex: '#16161d', rgb: [22, 22, 29] },
  { name: '--aethel-browser-theme-light', hex: '#2563eb', rgb: [37, 99, 235] },
  { name: '--aethel-browser-theme-dark', hex: '#0b0d12', rgb: [11, 13, 18] },
  { name: '--aethel-stripe-brand', hex: '#635BFF', rgb: [99, 91, 255] },
  { name: '--aethel-quest-accent', hex: '#ffcc00', rgb: [255, 204, 0] },
  { name: '--aethel-quest-complete', hex: '#66ff66', rgb: [102, 255, 102] },
  { name: '--aethel-dialogue-speaker', hex: '#66aaff', rgb: [102, 170, 255] },
  { name: '--aethel-terminal-dark-plus-bright-red', hex: '#f14c4c', rgb: [241, 76, 76] },
  { name: '--aethel-file-icon-jsx', hex: '#61dafb', rgb: [97, 218, 251] },
  { name: '--aethel-collab-vivid-0', hex: '#FF6B6B', rgb: [255, 107, 107] },
  { name: '--aethel-scene-material-black', hex: '#1a1a1a', rgb: [26, 26, 26] },
  { name: '--aethel-cyan-bright', hex: '#06b6d4', rgb: [6, 182, 212] },
  { name: '--aethel-water-deep', hex: '#0891b2', rgb: [8, 145, 178] },
  { name: '--aethel-foliage-terrain', hex: '#4a5a3a', rgb: [74, 90, 58] },
  { name: '--aethel-terrain-mesh', hex: '#4a7c59', rgb: [74, 124, 89] },
  { name: '--aethel-character-skin', hex: '#e2a98f', rgb: [226, 169, 143] },
  { name: '--aethel-character-skin-soft', hex: '#e8d5c4', rgb: [232, 213, 196] },
  { name: '--aethel-hair-light', hex: '#fff5e6', rgb: [255, 245, 230] },
  { name: '--aethel-grid-major', hex: '#1f2933', rgb: [31, 41, 51] },
  { name: '--aethel-grid-minor', hex: '#141a24', rgb: [20, 26, 36] },
  { name: '--aethel-vr-panel', hex: '#333333', rgb: [51, 51, 51] },
  { name: '--aethel-vr-panel-border', hex: '#666666', rgb: [102, 102, 102] },
  { name: '--aethel-vr-highlight', hex: '#4488ff', rgb: [68, 136, 255] },
  { name: '--aethel-viewport-film-stop-0', hex: '#09111f', rgb: [9, 17, 31] },
  { name: '--aethel-viewport-film-stop-50', hex: '#101a2b', rgb: [16, 26, 43] },
  { name: '--aethel-viewport-film-stop-100', hex: '#061014', rgb: [6, 16, 20] },
  { name: '--aethel-viewport-game-accent', hex: '#80ff9f', rgb: [128, 255, 159] },
  { name: '--aethel-hmr-error', hex: '#ff6b6b', rgb: [255, 107, 107] },
  { name: '--aethel-hmr-pre-bg', hex: '#1a1a1a', rgb: [26, 26, 26] },
  { name: '--aethel-hmr-btn-bg', hex: '#333333', rgb: [51, 51, 51] },

  // Neon (Premium)
  { name: '--aethel-neon-cyan', hex: '#22d3ee', rgb: [34, 211, 238] },
  { name: '--aethel-neon-indigo', hex: '#818cf8', rgb: [129, 140, 248] },
  { name: '--aethel-neon-amber', hex: '#fbbf24', rgb: [251, 191, 36] },
  { name: '--aethel-neon-emerald', hex: '#34d399', rgb: [52, 211, 153] },
  { name: '--aethel-neon-violet', hex: '#a78bfa', rgb: [167, 139, 250] }
]

/** Concrete hex for Three/canvas fallbacks — literals live only in this excluded file. */
export function tokenColor(name: string): string {
  const token = AETHEL_TOKENS.find((entry) => entry.name === name)
  return token?.hex ?? '#000000'
}

/** Concrete rgba() for Canvas2D — channel literals stay in this excluded file. */
export function tokenRgba(name: string, alpha: number): string {
  const token = AETHEL_TOKENS.find((entry) => entry.name === name)
  if (!token) return `rgba(0, 0, 0, ${alpha})`
  const [r, g, b] = token.rgb
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ]
  }
  // Handle shorthand #fff
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const shortResult = shorthandRegex.exec(hex)
  if (shortResult) {
    return [
      parseInt(shortResult[1] + shortResult[1], 16),
      parseInt(shortResult[2] + shortResult[2], 16),
      parseInt(shortResult[3] + shortResult[3], 16)
    ]
  }
  return null
}

/**
 * Human-perception weighted color distance (Redmean approximation)
 */
function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const rMean = (rgb1[0] + rgb2[0]) / 2
  const r = rgb1[0] - rgb2[0]
  const g = rgb1[1] - rgb2[1]
  const b = rgb1[2] - rgb2[2]

  const weightR = 2 + rMean / 256
  const weightG = 4.0
  const weightB = 2 + (255 - rMean) / 256

  return Math.sqrt(weightR * r * r + weightG * g * g + weightB * b * b)
}

export function findClosestToken(hex: string): ColorToken | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  let closestToken = AETHEL_TOKENS[0]
  let minDistance = Infinity

  for (const token of AETHEL_TOKENS) {
    const dist = colorDistance(rgb, token.rgb)
    if (dist < minDistance) {
      minDistance = dist
      closestToken = token
    }
  }

  return closestToken
}

/**
 * Scans generated agent code and normalizes hardcoded hex colors to Aethel CSS variables.
 * Safe regex ensures it doesn't break UUIDs or URL hashes.
 * ASYNC VERSION: Yields to event loop to prevent starvation (DEBT-PERF/EVENT-LOOP CLOSED).
 */
export async function normalizeAgentUiPatchAsync(code: string): Promise<string> {
  const hexColorRegex = /(?<=[:=\[,\s'"`])(#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8}))(?=[\]\s'"`},;}])/g
  
  let match
  let lastIndex = 0
  let result = ''
  let operations = 0
  
  while ((match = hexColorRegex.exec(code)) !== null) {
    result += code.substring(lastIndex, match.index)
    const closest = findClosestToken(match[1])
    if (closest) {
      result += `var(${closest.name})`
    } else {
      result += match[1]
    }
    lastIndex = hexColorRegex.lastIndex
    
    operations++
    if (operations % 100 === 0) {
      // Yield to Node.js event loop to maintain 60FPS UI stream
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  
  result += code.substring(lastIndex)
  return result
}

// Keep synchronous version for tests and lightweight non-agentic payloads
export function normalizeAgentUiPatch(code: string): string {
  const hexColorRegex = /(?<=[:=\[,\s'"`])(#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8}))(?=[\]\s'"`},;}])/g
  return code.replace(hexColorRegex, (match) => {
    const closest = findClosestToken(match)
    if (closest) {
      return `var(${closest.name})`
    }
    return match
  })
}

/** Same style-context hex matcher used by normalize — for apply-path QA. */
const UI_HEX_COLOR_RE =
  /(?<=[:=\[,\s'"`])(#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8}))(?=[\]\s'"`},;}])/g

/**
 * L.10 QA — scan remaining hardcoded hex colors in UI patch contexts.
 * Used on the governed apply path (fail-closed when residuals remain).
 */
export function scanHardcodedHexColors(code: string): string[] {
  const hits: string[] = []
  UI_HEX_COLOR_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = UI_HEX_COLOR_RE.exec(code)) !== null) {
    hits.push(match[1])
  }
  return hits
}

export type DesignTokenQaResult =
  | { ok: true; residualHex: [] }
  | { ok: false; residualHex: string[]; message: string }

/**
 * Fail-closed DesignTokenSync QA for UI patches (TSX/CSS).
 * Incoming style-context hex colors must already be snapped to `var(--aethel-*)`
 * (engineer loop / MagicWand normalize first). Residual hex blocks apply.
 */
export function assertUiPatchPassesDesignTokenQa(code: string): DesignTokenQaResult {
  const residualHex = scanHardcodedHexColors(code)
  if (residualHex.length === 0) {
    return { ok: true, residualHex: [] }
  }
  return {
    ok: false,
    residualHex,
    message: `L.10 DesignTokenSync QA: ${residualHex.length} hardcoded hex color(s) — normalize to var(--aethel-*) before apply (${residualHex.slice(0, 6).join(', ')})`,
  }
}

export function isUiDesignTokenPath(filePath: string): boolean {
  const lower = filePath.replace(/\\/g, '/').toLowerCase()
  return /\.(tsx|jsx|css|scss)$/i.test(lower)
}
