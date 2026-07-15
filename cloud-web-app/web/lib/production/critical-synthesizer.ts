/**
 * Decision #62 — Critical synthesizer for MoA width ≥ 2.
 * Prefer LazyInspector PASS proposals; else densest complete body.
 * Optional Premium fuse via injectable LLM when caller supplies fuseFn.
 */

import { inspectLazyPatch } from '@/lib/production/lazy-inspector'
import type { MoAGeneratorProposal } from '@/lib/production/apex-moa-orchestrator'

export type CriticalFuseFn = (input: {
  proposals: MoAGeneratorProposal[]
  domainPrompt: string
}) => Promise<{ patchText: string; note: string }>

export function synthesizeCriticalProposals(
  proposals: MoAGeneratorProposal[],
): { patchText: string; note: string } {
  const nonEmpty = proposals.filter((p) => p.patchText.trim().length > 0)
  if (nonEmpty.length === 0) {
    return { patchText: '', note: 'No non-empty generator proposals' }
  }

  for (const p of nonEmpty) {
    if (inspectLazyPatch(p.patchText).verdict === 'PASS') {
      return {
        patchText: p.patchText,
        note: `Selected Lazy PASS proposal from ${p.modelId}`,
      }
    }
  }

  const densest = [...nonEmpty].sort((a, b) => b.patchText.length - a.patchText.length)[0]
  return {
    patchText: densest.patchText,
    note: `Selected densest proposal from ${densest.modelId} (${nonEmpty.length} candidates)`,
  }
}

/**
 * Width ≥ 2 fuse: try Premium fuseFn when provided; always fall back to deterministic synthesize.
 */
export async function fuseCriticalProposals(input: {
  proposals: MoAGeneratorProposal[]
  domainPrompt: string
  fuseFn?: CriticalFuseFn
}): Promise<{ patchText: string; note: string; fusedBy: 'deterministic' | 'llm' }> {
  const deterministic = synthesizeCriticalProposals(input.proposals)
  if (!input.fuseFn || input.proposals.length < 2 || !deterministic.patchText) {
    return { ...deterministic, fusedBy: 'deterministic' }
  }

  try {
    const fused = await input.fuseFn({
      proposals: input.proposals,
      domainPrompt: input.domainPrompt,
    })
    if (fused.patchText.trim().length > 0 && inspectLazyPatch(fused.patchText).verdict === 'PASS') {
      return { patchText: fused.patchText, note: fused.note, fusedBy: 'llm' }
    }
  } catch {
    // fall through — never block mission on fuse LLM failure
  }

  return { ...deterministic, fusedBy: 'deterministic' }
}
