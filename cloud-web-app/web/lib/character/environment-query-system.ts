/**
 * Letter bu — Environment Query System (EQS) for AI cover / LoS before fire ability.
 */

export const ENVIRONMENT_QUERY_SYSTEM_WIRED = true as const

export type EqsQueryKind = 'cover' | 'los-fire' | 'flee'

export interface EqsWorldPoint {
  id: string
  x: number
  y: number
  z: number
  /** Optional cover score bias 0..1 from authored volumes. */
  coverBias?: number
}

export interface EqsAgent {
  x: number
  y: number
  z: number
  /** Facing yaw radians (XZ). */
  yaw?: number
}

export interface EqsTarget {
  x: number
  y: number
  z: number
}

export interface EqsLosTester {
  /** Return true when open line of sight exists between a and b. */
  (a: EqsWorldPoint | EqsAgent, b: EqsTarget | EqsWorldPoint): boolean
}

export interface EqsQueryInput {
  kind: EqsQueryKind
  agent: EqsAgent
  target?: EqsTarget
  candidates: EqsWorldPoint[]
  hasLineOfSight: EqsLosTester
  maxResults?: number
}

export interface EqsScoredPoint {
  point: EqsWorldPoint
  score: number
  hasLosToTarget: boolean
  distanceToAgent: number
}

export interface EqsQueryResult {
  kind: EqsQueryKind
  items: EqsScoredPoint[]
  /** Best point or null. */
  best: EqsScoredPoint | null
  /** For los-fire: true when agent already has LoS to target. */
  canFireNow: boolean
  wired: true
}

function dist(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  return Math.hypot(ax - bx, ay - by, az - bz)
}

/**
 * Run EQS: cover prefers occluded-from-target near agent; los-fire prefers clear shots.
 */
export function runEnvironmentQuery(input: EqsQueryInput): EqsQueryResult {
  const max = input.maxResults ?? 5
  const target = input.target
  const scored: EqsScoredPoint[] = []

  let canFireNow = false
  if (target && input.kind === 'los-fire') {
    canFireNow = input.hasLineOfSight(input.agent, target)
  }

  for (const c of input.candidates) {
    const distanceToAgent = dist(input.agent.x, input.agent.y, input.agent.z, c.x, c.y, c.z)
    const hasLosToTarget = target ? input.hasLineOfSight(c, target) : false
    let score = 0

    if (input.kind === 'cover') {
      // Prefer points WITHOUT LoS to target (behind cover) but close to agent.
      const cover = (c.coverBias ?? 0.5) + (hasLosToTarget ? 0 : 0.5)
      score = cover * 2 - distanceToAgent * 0.1
    } else if (input.kind === 'los-fire') {
      // Prefer clear LoS from candidate toward target, close enough to engage.
      score = (hasLosToTarget ? 2 : -1) - distanceToAgent * 0.05
      if (target) {
        const dTarget = dist(c.x, c.y, c.z, target.x, target.y, target.z)
        score += dTarget < 40 ? 0.5 : -0.2
      }
    } else {
      // flee — far from target, any cover helps
      const away = target
        ? dist(c.x, c.y, c.z, target.x, target.y, target.z)
        : distanceToAgent
      score = away * 0.05 + (c.coverBias ?? 0) - distanceToAgent * 0.02
    }

    scored.push({ point: c, score, hasLosToTarget, distanceToAgent })
  }

  scored.sort((a, b) => b.score - a.score)
  const items = scored.slice(0, max)
  return {
    kind: input.kind,
    items,
    best: items[0] ?? null,
    canFireNow,
    wired: true,
  }
}

/**
 * Gate GAS fire ability: require LoS or move-to EQS best first.
 */
export function shouldFireAbilityAfterEqs(result: EqsQueryResult): {
  fireNow: boolean
  relocateTo: EqsWorldPoint | null
} {
  if (result.kind !== 'los-fire') {
    return { fireNow: false, relocateTo: result.best?.point ?? null }
  }
  if (result.canFireNow) {
    return { fireNow: true, relocateTo: null }
  }
  const clear = result.items.find((i) => i.hasLosToTarget)
  return {
    fireNow: false,
    relocateTo: clear?.point ?? result.best?.point ?? null,
  }
}
