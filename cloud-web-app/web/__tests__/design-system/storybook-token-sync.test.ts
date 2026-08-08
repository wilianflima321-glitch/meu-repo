import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanHardcodedHexColors } from '../../lib/design-system/DesignTokenSync'
import {
  CW5_FIGMA_HELD_REASON,
  CW5_FIGMA_TOKEN_GOVERNMENT_READY,
  CW5_STORYBOOK_TOKEN_SYNC_READY,
} from '../../lib/design-system/cw5-figma-honesty'

const WEB_ROOT = path.resolve(__dirname, '../..')
const STORY_ROOTS = [
  path.join(WEB_ROOT, 'components'),
  path.resolve(WEB_ROOT, '../packages/ide-ui'),
]

const TAILWIND_PALETTE_RE =
  /(?:^|[\s"'`:])((?:dark:)?(?:bg|text|border|ring|outline|from|to|via|divide|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:\d{2,3}|black|white)(?:\/[\d.]+)?|(?:dark:)?(?:bg|text|border)-(?:white|black)(?:\/[\d.]+)?)\b/g

function walkStories(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkStories(full, results)
    else if (/\.stories\.(?:ts|tsx|mdx)$/.test(entry.name)) results.push(full)
  }
  return results
}

function scanTailwindPalette(code: string): string[] {
  const hits: string[] = []
  TAILWIND_PALETTE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TAILWIND_PALETTE_RE.exec(code)) !== null) {
    hits.push(match[1])
  }
  return hits
}

describe('CW5 Storybook token sync', () => {
  const stories = STORY_ROOTS.flatMap((root) => walkStories(root))

  it('discovers web + ide-ui stories', () => {
    expect(stories.length).toBeGreaterThanOrEqual(40)
    expect(stories.some((p) => p.replace(/\\/g, '/').includes('/packages/ide-ui/'))).toBe(true)
  })

  it('fail-closes hex theater in every story file', () => {
    const dirty: string[] = []
    for (const file of stories) {
      const code = fs.readFileSync(file, 'utf8')
      const hex = scanHardcodedHexColors(code)
      if (hex.length > 0) {
        dirty.push(`${path.relative(WEB_ROOT, file)}: ${hex.slice(0, 4).join(', ')}`)
      }
    }
    expect(dirty).toEqual([])
  })

  it('fail-closes Tailwind palette theater in every story file', () => {
    const dirty: string[] = []
    for (const file of stories) {
      const code = fs.readFileSync(file, 'utf8')
      // Skip pure comment lines for false positives; scanHardcoded already style-scoped.
      const withoutBlockComments = code.replace(/\/\*[\s\S]*?\*\//g, '')
      const lines = withoutBlockComments
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n')
      const palette = scanTailwindPalette(lines)
      if (palette.length > 0) {
        dirty.push(`${path.relative(WEB_ROOT, file)}: ${palette.slice(0, 4).join(', ')}`)
      }
    }
    expect(dirty).toEqual([])
  })

  it('keeps Figma token government HELD (no empire claim without live Figma)', () => {
    expect(CW5_STORYBOOK_TOKEN_SYNC_READY).toBe(true)
    expect(CW5_FIGMA_TOKEN_GOVERNMENT_READY).toBe(false)
    expect(CW5_FIGMA_HELD_REASON).toMatch(/no live Figma/i)
  })
})
