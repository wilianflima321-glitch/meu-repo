import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Best-In-Market Benchmark V14', () => {
  const benchmark = read('docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md')

  it('reconciles the stale V13 baseline with current repo quality metrics', () => {
    expect(benchmark).toContain('external V13 audit is treated as historical input')
    expect(benchmark).toContain('`console.log/info/debug`: 0')
    expect(benchmark).toContain('hardcoded hex in component TSX: 0')
    expect(benchmark).toContain('explicit `: any` in app code: 0')
    expect(benchmark).toContain('component files over 1000 lines: 0')
    expect(benchmark).toContain('unit/spec tests: 87')
    expect(benchmark).toContain('Repository Cartography: present')
    expect(benchmark).not.toContain('876')
    expect(benchmark).not.toContain('899')
  })

  it('covers the required competitor set and category matrix', () => {
    for (const competitor of [
      'Cursor 3',
      'Replit Agent 4',
      'Figma MCP',
      'Manus',
      'Genspark',
      'Unreal UE5',
      'Adobe Firefly/Premiere',
      'Linear',
    ]) {
      expect(benchmark).toContain(competitor)
    }

    for (const category of [
      'Game creation',
      'Film, animation, storytelling',
      'Apps and tools',
      'Music and audio',
      'Research agentic + web navigation',
      'Super personal agent',
      'End-to-end experience',
      'Collaboration and versioning',
      'Billing, transparency, enterprise',
      'Performance, monorepo, scale',
    ]) {
      expect(benchmark).toContain(category)
    }
  })

  it('keeps the Linear backlog and no-overclaim red lines executable', () => {
    expect(benchmark).toContain('Aethel Best-In-Market 2026-2027')
    expect(benchmark).toContain('Agent Fleet + Repository Cartography')
    expect(benchmark).toContain('Browser Operator Manus-Style Approvals')
    expect(benchmark).toContain('Do not claim Nanite, Lumen, Unreal parity')
    expect(benchmark).toContain('Do not make chat the product protagonist')
  })
})
