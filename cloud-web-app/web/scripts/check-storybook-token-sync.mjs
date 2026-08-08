#!/usr/bin/env node
/**
 * CW5 / R12 — Storybook token sync gate (fail-closed).
 *
 * Scans colocated `*.stories.(ts|tsx|mdx)` under web/components and packages/ide-ui.
 * Rejects hex/rgb theater and Tailwind default-palette classes so stories stay on
 * `var(--aethel-*)` / DesignTokenSync government.
 *
 * Figma: intentionally NOT claimed here — see `lib/design-system/cw5-figma-honesty.ts`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(__dirname, '..')
const IDE_UI_ROOT = path.resolve(WEB_ROOT, '../packages/ide-ui')

const STORY_ROOTS = [
  path.join(WEB_ROOT, 'components'),
  IDE_UI_ROOT,
]

const COLOR_HEX_RGB_RE =
  /(?<=[:=\[,\s'"`])(#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})\b|rgba?\([\d\s,.]+\))/g

/** Tailwind default palette / bare white-black used as chrome theater in stories. */
const TAILWIND_PALETTE_RE =
  /(?:^|[\s"'`:])((?:dark:)?(?:bg|text|border|ring|outline|from|to|via|divide|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:\d{2,3}|black|white)(?:\/[\d.]+)?|(?:dark:)?(?:bg|text|border)-(?:white|black)(?:\/[\d.]+)?)\b/g

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walkStories(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkStories(full, results)
    } else if (/\.stories\.(?:ts|tsx|mdx)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

function isCommentOrSvgPaint(line) {
  const trimmed = line.trim()
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    line.includes('fill=') ||
    line.includes('stroke=')
  )
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const findings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isCommentOrSvgPaint(line)) continue

    COLOR_HEX_RGB_RE.lastIndex = 0
    const hexMatches = line.match(COLOR_HEX_RGB_RE) || []
    const validHex = hexMatches.filter((m) => {
      if (m.startsWith('#') && m.length > 7 && !/^#[0-9a-fA-F]{8}$/.test(m)) return false
      if (line.includes(`href="${m}"`)) return false
      return true
    })
    for (const match of validHex) {
      findings.push({ line: i + 1, kind: 'hex/rgb', match, text: line.trim() })
    }

    TAILWIND_PALETTE_RE.lastIndex = 0
    let tw
    while ((tw = TAILWIND_PALETTE_RE.exec(line)) !== null) {
      findings.push({ line: i + 1, kind: 'tailwind-palette', match: tw[1], text: line.trim() })
    }
  }

  return findings
}

const stories = STORY_ROOTS.flatMap((root) => walkStories(root))
let hasErrors = false
let findingCount = 0

console.log('Running CW5 QA Gate: check-storybook-token-sync...')
console.log(`  Stories scanned: ${stories.length}`)
console.log('  Figma token government: HELD (code-side tokens only — see cw5-figma-honesty.ts)')

if (stories.length === 0) {
  console.error('\x1b[31mQA FAILED:\x1b[0m No Storybook stories found under components/ or packages/ide-ui.')
  process.exit(1)
}

for (const filePath of stories) {
  const relative = toPosix(path.relative(WEB_ROOT, filePath))
  const findings = scanFile(filePath)
  if (findings.length === 0) continue
  hasErrors = true
  findingCount += findings.length
  for (const finding of findings) {
    console.error(
      `\x1b[31m[CW5 Storybook Token Sync]\x1b[0m ${relative}:${finding.line} (${finding.kind}) → ${finding.match}`,
    )
    console.error(`  Line: ${finding.text}`)
    console.error('  Fix: use var(--aethel-*) / DesignTokenSync — no hex or Tailwind palette theater.\n')
  }
}

const reportDir = path.join(WEB_ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'CW5_STORYBOOK_TOKEN_SYNC.md'),
  [
    '# CW5 Storybook Token Sync',
    '',
    `Stories scanned: ${stories.length}`,
    `Findings: ${findingCount}`,
    'Figma token government: HELD',
    `Status: ${hasErrors ? 'FAIL' : 'PASS'}`,
    '',
  ].join('\n'),
)

if (hasErrors) {
  console.error(
    `\x1b[31mQA FAILED:\x1b[0m ${findingCount} Storybook color theater finding(s). Normalize to var(--aethel-*).`,
  )
  process.exit(1)
}

console.log(
  `\x1b[32mQA PASSED:\x1b[0m Storybook stories use design tokens (no hex/Tailwind palette theater). Figma remains HELD.`,
)
process.exit(0)
