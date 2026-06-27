import { describe, expect, it } from 'vitest'
import { evaluatePromptSafety, evaluateAssetSafety } from '@/lib/moderation/content-moderator'

describe('content safety and moderation checks', () => {
  it('approves a safe, well-formed creative prompt', () => {
    const evaluation = evaluatePromptSafety('a high-fidelity model of a futuristic hovercar, sci-fi, detailed metal plates')
    expect(evaluation.status).toBe('approved')
    expect(evaluation.score).toBe(1.0)
    expect(evaluation.flaggedCategories).toEqual([])
    expect(evaluation.reason).toBeUndefined()
  })

  it('rejects prompts containing prohibited adult terms', () => {
    const evaluation = evaluatePromptSafety('naked cyberpunk character with neon highlights, nsfw bypass')
    expect(evaluation.status).toBe('rejected')
    expect(evaluation.score).toBeLessThanOrEqual(0.1)
    expect(evaluation.flaggedCategories).toContain('adult-content')
    expect(evaluation.reason).toContain('adult-content')
  })

  it('rejects prompts containing violent terms', () => {
    const evaluation = evaluatePromptSafety('extreme violence and gore, splattered blood on the floor')
    expect(evaluation.status).toBe('rejected')
    expect(evaluation.score).toBeLessThanOrEqual(0.1)
    expect(evaluation.flaggedCategories).toContain('violence-hate')
  })

  it('flags prompts containing suspicious bypass keywords', () => {
    const evaluation = evaluatePromptSafety('3D model designed to exploit the character physics system')
    expect(evaluation.status).toBe('flagged')
    expect(evaluation.score).toBe(0.4)
    expect(evaluation.flaggedCategories).toContain('suspicious-terms')
  })

  it('evaluates complete asset safety, flagging low-quality scores', () => {
    const evaluation = evaluateAssetSafety('futuristic airlock shell', 0.3)
    expect(evaluation.status).toBe('flagged')
    expect(evaluation.flaggedCategories).toContain('low-quality-held')
    expect(evaluation.reason).toContain(' validation threshold')
  })

  it('approves assets when both prompt and quality score are safe', () => {
    const evaluation = evaluateAssetSafety('clean glass table with metallic legs', 0.9)
    expect(evaluation.status).toBe('approved')
    expect(evaluation.flaggedCategories).toEqual([])
  })
})
