/**
 * Apex specialist registry — Decision #55–#57
 * Domain elite only. Nano / dumb fallback banned.
 */

export type ApexQualityTier = 'apex' | 'premium' | 'fast' | 'hero'
/** nano is typed only so CI can reject selection — never register nano candidates */
export type ForbiddenQualityTier = 'nano' | 'dumb'

export type ApexTaskDomain =
  | 'code'
  | 'planning'
  | 'critic'
  | 'ui'
  | 'lighting'
  | 'assets'
  | 'tests'
  | 'creative-writing'
  | 'mesh'
  | 'audio'
  | 'world'
  | 'docs'

export interface ApexModelCandidate {
  modelId: string
  displayName: string
  openWeights: boolean
  qualityTier: ApexQualityTier
  apexRank: number
  domains: ApexTaskDomain[]
  arenaCategory?: string
  supportsTools?: boolean
  supportsJson?: boolean
}

const APEX_REGISTRY: ApexModelCandidate[] = [
  {
    modelId: 'anthropic/claude-sonnet-4',
    displayName: 'Claude Sonnet',
    openWeights: false,
    qualityTier: 'premium',
    apexRank: 98,
    domains: ['code', 'planning', 'critic', 'ui'],
    supportsTools: true,
    supportsJson: true,
  },
  {
    modelId: 'anthropic/claude-opus-4',
    displayName: 'Claude Opus',
    openWeights: false,
    qualityTier: 'hero',
    apexRank: 99,
    domains: ['code', 'planning', 'critic'],
    supportsTools: true,
    supportsJson: true,
  },
  {
    modelId: 'deepseek/deepseek-chat-v3',
    displayName: 'DeepSeek V3',
    openWeights: true,
    qualityTier: 'apex',
    apexRank: 92,
    domains: ['code', 'tests', 'ui'],
    supportsTools: true,
    supportsJson: true,
  },
  {
    modelId: 'x-ai/grok-3',
    displayName: 'Grok',
    openWeights: true,
    qualityTier: 'apex',
    apexRank: 90,
    domains: ['code', 'planning', 'creative-writing'],
    supportsTools: true,
  },
  {
    modelId: 'qwen/qwen-2.5-72b-instruct',
    displayName: 'Qwen 72B',
    openWeights: true,
    qualityTier: 'apex',
    apexRank: 88,
    domains: ['code', 'tests', 'assets'],
    supportsTools: true,
    supportsJson: true,
  },
  {
    modelId: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    openWeights: false,
    qualityTier: 'premium',
    apexRank: 95,
    domains: ['code', 'ui', 'planning', 'critic'],
    supportsTools: true,
    supportsJson: true,
  },
]

export function listApexCandidates(): readonly ApexModelCandidate[] {
  return APEX_REGISTRY
}

export function assertNoNanoInRegistry(candidates: readonly ApexModelCandidate[] = APEX_REGISTRY): void {
  for (const c of candidates) {
    const tier = c.qualityTier as string
    if (tier === 'nano' || tier === 'dumb') {
      throw new Error(`Decision #55 violation: nano/dumb candidate registered: ${c.modelId}`)
    }
  }
}

export function selectApexForDomain(input: {
  domain: ApexTaskDomain
  preferOpenWeights?: boolean
  premiumAvailable?: boolean
  minRank?: number
}): ApexModelCandidate | null {
  assertNoNanoInRegistry()
  const minRank = input.minRank ?? 80
  let pool = APEX_REGISTRY.filter((c) => c.domains.includes(input.domain) && c.apexRank >= minRank)

  if (input.preferOpenWeights || input.premiumAvailable === false) {
    const ow = pool.filter((c) => c.openWeights)
    if (ow.length > 0) pool = ow
  } else if (input.premiumAvailable) {
    const closed = pool.filter((c) => !c.openWeights && (c.qualityTier === 'premium' || c.qualityTier === 'hero'))
    if (closed.length > 0) pool = closed
  }

  pool = [...pool].sort((a, b) => b.apexRank - a.apexRank)
  return pool[0] ?? null
}

/** Adaptive MoA width #62 */
export function adaptiveMoAWidth(riskScore: number, planId?: string): 1 | 2 | 3 {
  const plan = (planId || '').toLowerCase()
  if (plan === 'free') return 1
  if (riskScore < 40) return 1
  if (plan === 'starter') return riskScore >= 40 ? 2 : 1
  if (riskScore < 70) return 2
  return 3
}

export function selectMoAGenerators(input: {
  domain: ApexTaskDomain
  width: 1 | 2 | 3
}): ApexModelCandidate[] {
  assertNoNanoInRegistry()
  const ranked = APEX_REGISTRY.filter((c) => c.domains.includes(input.domain) && c.openWeights)
    .sort((a, b) => b.apexRank - a.apexRank)
  const picks: ApexModelCandidate[] = []
  for (const c of ranked) {
    if (picks.length >= input.width) break
    picks.push(c)
  }
  // If not enough OW, fill with closed apex (still never nano)
  if (picks.length < input.width) {
    for (const c of APEX_REGISTRY.filter((x) => x.domains.includes(input.domain)).sort(
      (a, b) => b.apexRank - a.apexRank,
    )) {
      if (picks.length >= input.width) break
      if (!picks.find((p) => p.modelId === c.modelId)) picks.push(c)
    }
  }
  return picks
}
