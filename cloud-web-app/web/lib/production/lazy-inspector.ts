/**
 * Decision #66 — LazyInspector (ANTI-LAZY-2)
 * Scans proposed patch hunks BEFORE L.5. Never bans bare `...` (TS spread/rest).
 */

export type LazyInspectorVerdict = 'PASS' | 'REJECT'

export interface LazyInspectorResult {
  verdict: LazyInspectorVerdict
  matchedPatterns: string[]
  hunkRefs: string[]
  lazyRejectCount: number
  settleZero: true
}

export interface AntiLazyChunkPolicy {
  maxApplyLocPerTask: 300
  splitStrategy: 'function' | 'file-slice' | 'disjoint-paths'
}

export const DEFAULT_ANTI_LAZY_CHUNK_POLICY: AntiLazyChunkPolicy = {
  maxApplyLocPerTask: 300,
  splitStrategy: 'disjoint-paths',
}

/** Named regex set — only applied to NEW/changed lines */
const LAZY_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'comment-elision-slash', re: /^\s*\/\/\s*\.\.\./ },
  { id: 'comment-elision-rest', re: /^\s*\/\/\s*(rest of|existing code|resto do código)/i },
  { id: 'block-elision', re: /^\s*\/\*\s*\.\.\./ },
  { id: 'todo-marker', re: /\bTODO\b/ },
  { id: 'fixme-marker', re: /\bFIXME\b/ },
  { id: 'hack-marker', re: /\bHACK\b/ },
  { id: 'xxx-marker', re: /\bXXX\b/ },
  { id: 'implement-here', re: /implement here|your code here|resto do código/i },
  { id: 'not-implemented-throw', re: /throw new Error\(\s*['"]not implemented['"]\s*\)/i },
  { id: 'rust-todo', re: /\btodo!\s*\(/ },
  { id: 'rust-unimplemented', re: /\bunimplemented!\s*\(/ },
  { id: 'empty-success', re: /success\s*:\s*true/ },
]

function extractNewLines(patchOrContent: string): Array<{ line: string; ref: string }> {
  const lines = patchOrContent.split(/\r?\n/)
  const isUnifiedDiff = lines.some((l) => l.startsWith('+++') || l.startsWith('@@'))
  const out: Array<{ line: string; ref: string }> = []

  if (isUnifiedDiff) {
    let hunk = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('@@')) {
        hunk += 1
        continue
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        out.push({ line: line.slice(1), ref: `hunk-${hunk}:L${i + 1}` })
      }
    }
    return out
  }

  return lines.map((line, i) => ({ line, ref: `L${i + 1}` }))
}

function lineLooksLikeAllowlistedTodo(line: string): boolean {
  return /@aethel-allow-todo/.test(line)
}

/**
 * Inspect proposed apply content or unified diff.
 * @param lazyRejectCount prior rejects on this leg (max 2 then BLOCK at orchestrator)
 */
export function inspectLazyPatch(
  patchOrContent: string,
  lazyRejectCount = 0,
): LazyInspectorResult {
  const newLines = extractNewLines(patchOrContent)
  const matchedPatterns: string[] = []
  const hunkRefs: string[] = []

  let sawSuccessTrue = false
  let sawArtifactId = false

  for (const { line, ref } of newLines) {
    if (lineLooksLikeAllowlistedTodo(line)) continue

    if (/success\s*:\s*true/.test(line)) sawSuccessTrue = true
    if (/artifactId\s*:\s*['"][^'"]+['"]/.test(line) || /artifactId\s*:\s*[a-zA-Z_]/.test(line)) {
      sawArtifactId = true
    }

    for (const pattern of LAZY_PATTERNS) {
      if (pattern.id === 'empty-success') continue
      if (pattern.re.test(line)) {
        if (!matchedPatterns.includes(pattern.id)) matchedPatterns.push(pattern.id)
        if (!hunkRefs.includes(ref)) hunkRefs.push(ref)
      }
    }
  }

  if (sawSuccessTrue && !sawArtifactId && /artifactId/.test(patchOrContent) === false) {
    // Heuristic: success:true in patch without any artifact id nearby
    const hasNonEmptyArtifact =
      /artifactId\s*:\s*['"][^'"]+['"]/.test(patchOrContent) ||
      /"artifactId"\s*:\s*"[^"]+"/.test(patchOrContent)
    if (!hasNonEmptyArtifact && /success\s*:\s*true/.test(patchOrContent)) {
      matchedPatterns.push('empty-success')
      hunkRefs.push('success-true')
    }
  }

  if (matchedPatterns.length > 0) {
    return {
      verdict: 'REJECT',
      matchedPatterns,
      hunkRefs,
      lazyRejectCount: lazyRejectCount + 1,
      settleZero: true,
    }
  }

  return {
    verdict: 'PASS',
    matchedPatterns: [],
    hunkRefs: [],
    lazyRejectCount,
    settleZero: true,
  }
}

export function countApplyLoc(patchOrContent: string): number {
  return extractNewLines(patchOrContent).length
}

export function exceedsAntiLazyChunk(
  patchOrContent: string,
  policy: AntiLazyChunkPolicy = DEFAULT_ANTI_LAZY_CHUNK_POLICY,
): boolean {
  return countApplyLoc(patchOrContent) > policy.maxApplyLocPerTask
}

export function canRetryLazyReject(lazyRejectCount: number, maxRetries = 2): boolean {
  return lazyRejectCount < maxRetries
}
