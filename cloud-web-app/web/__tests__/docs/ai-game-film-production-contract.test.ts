import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('AI game/film production contract', () => {
  const contract = read('docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md')
  const gapMap = read('docs/master/93_UNREAL_AGENTIC_PRODUCT_GAP_MAP_2026-05-01.md')
  const uxGap = read('cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md')

  it('defines the graph-based spine agents need beyond chat context', () => {
    expect(contract).toContain('AI Game/Film Production Contract')
    expect(contract).toContain('Project Brain')
    expect(contract).toContain('Mission Ledger')
    expect(contract).toContain('Asset Graph')
    expect(contract).toContain('Scene Graph')
    expect(contract).toContain('Gameplay Graph')
    expect(contract).toContain('Shot Graph')
    expect(contract).toContain('Validation Graph')
    expect(contract).toContain('Evidence Graph')
  })

  it('keeps game and film depth mode-specific instead of adding top-level clutter', () => {
    expect(contract).toContain('No new top-level interface')
    expect(contract).toContain('Web Light')
    expect(contract).toContain('Studio Home')
    expect(contract).toContain('Studio Cloud')
    expect(contract).toContain('Studio Local')
    expect(contract).toContain('Domain Room by mode')
  })

  it('does not claim Unreal or autonomous AAA parity without validation evidence', () => {
    expect(contract).toContain('Unreal parity')
    expect(contract).toContain('autonomous AAA')
    expect(contract).toContain('license/provenance')
    expect(contract).toContain('human approval')
    expect(contract).toContain('playtest')
    expect(contract).toContain('render queue')
    expect(contract).not.toMatch(/full Unreal parity/i)
    expect(contract).not.toMatch(/fully automatic AAA game generation/i)
  })

  it('stays aligned with the existing Unreal and UX gap docs', () => {
    expect(gapMap).toContain('AI production operating system')
    expect(gapMap).toContain('Mission Ledger')
    expect(uxGap).toContain('Unreal/Game/Film Gap Triage')
    expect(uxGap).toContain('mode-specific')
  })
})
