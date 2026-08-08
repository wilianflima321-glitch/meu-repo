import {
  assertUiPatchPassesDesignTokenQa,
  findClosestToken,
  normalizeAgentUiPatch,
} from '../../lib/design-system/DesignTokenSync'

describe('L.10 DesignTokenSync Engine', () => {
  it('finds exact matches', () => {
    const token = findClosestToken('#0a0a0f')
    expect(token?.name).toBe('--aethel-surface-primary')
  })

  it('snaps close colors accurately using Redmean perceptual distance', () => {
    // Pure red #f00 should snap to --aethel-error (#ef4444)
    const token = findClosestToken('#ff0000')
    expect(token?.name).toBe('--aethel-error')

    // Off-blue #3a81f5 should snap to --aethel-primary (#3b82f6)
    const token2 = findClosestToken('#3a81f5')
    expect(token2?.name).toBe('--aethel-primary')

    // Almost black #050505 should snap to --aethel-surface-primary (#0a0a0f) or pure black
    const token3 = findClosestToken('#010101')
    expect(token3?.name).toBe('--aethel-brand-pure-black')
  })

  it('normalizes agent UI patches containing hex codes', () => {
    const agentCode = `
      export function Card() {
        return (
          <div style={{ backgroundColor: '#0a0a0f', color: '#c6cfdd' }}>
            <span className="text-[#3b82f6]">Hello</span>
          </div>
        )
      }
    `
    const normalized = normalizeAgentUiPatch(agentCode)
    
    // Expect exact matches to be replaced
    expect(normalized).toContain('var(--aethel-surface-primary)')
    expect(normalized).toContain('var(--aethel-text-secondary)')
    expect(normalized).toContain('var(--aethel-primary)')
    
    // Ensure raw hexes are gone
    expect(normalized).not.toContain('#0a0a0f')
    expect(normalized).not.toContain('#c6cfdd')
    expect(normalized).not.toContain('#3b82f6')
  })

  it('normalizes shorthand hex codes', () => {
    const agentCode = `<div color="#f00">Error</div>`
    const normalized = normalizeAgentUiPatch(agentCode)
    expect(normalized).toContain('var(--aethel-error)')
    expect(normalized).not.toContain('#f00')
  })

  it('ignores non-color hashes', () => {
    const agentCode = `<a href="#main-content">Skip to content</a>`
    const normalized = normalizeAgentUiPatch(agentCode)
    expect(normalized).toContain('#main-content')
  })

  it('L.10 apply-path QA fails closed on residual style hex and passes after normalize', () => {
    const dirty = `<div style={{ color: '#ef4444' }} />`
    const dirtyQa = assertUiPatchPassesDesignTokenQa(dirty)
    expect(dirtyQa.ok).toBe(false)

    const clean = normalizeAgentUiPatch(dirty)
    const cleanQa = assertUiPatchPassesDesignTokenQa(clean)
    expect(cleanQa.ok).toBe(true)
    expect(clean).toContain('var(--aethel-error)')
  })
})
