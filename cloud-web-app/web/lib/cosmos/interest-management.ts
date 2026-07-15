/**
 * Letter cn — Network Interest Management — spatial relevance culling for net.
 * 5k ships must not flood clients. Agones fleet still HELD — fail-closed without live fleet.
 */

export const COSMOS_INTEREST_MANAGEMENT_WIRED = true as const

export interface InterestActor {
  id: string
  x: number
  y: number
  z: number
  /** Priority boost (owner, combat, etc.). */
  priority: number
}

export interface InterestQuery {
  observerX: number
  observerY: number
  observerZ: number
  radiusM: number
  maxActors: number
}

export interface InterestSet {
  actorIds: string[]
  culled: number
  total: number
  /** Always false until Agones/dedicated fleet proven. */
  liveFleetReady: false
}

/**
 * Build interest set: distance cull + priority sort + budget cap.
 * Fail-closed: never claims live fleet replication.
 */
export function buildInterestSet(
  actors: InterestActor[],
  query: InterestQuery,
): InterestSet {
  const r2 = query.radiusM * query.radiusM
  const scored: Array<{ id: string; score: number }> = []
  for (const a of actors) {
    const dx = a.x - query.observerX
    const dy = a.y - query.observerY
    const dz = a.z - query.observerZ
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 > r2) continue
    const dist = Math.sqrt(d2)
    // Closer + higher priority → higher score.
    const score = a.priority * 1000 - dist
    scored.push({ id: a.id, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const max = Math.max(0, query.maxActors)
  const actorIds = scored.slice(0, max).map((s) => s.id)
  return {
    actorIds,
    culled: actors.length - actorIds.length,
    total: actors.length,
    liveFleetReady: false,
  }
}

/**
 * Gate: spatial interest API may run locally; dedicated fleet replication HELD.
 */
export function evaluateInterestFleetGate(input: {
  agonesFleetLive?: boolean
}): {
  interestCullingReady: true
  dedicatedFleetReplicationAllowed: false
  notes: string[]
} {
  void input.agonesFleetLive
  return {
    interestCullingReady: true,
    dedicatedFleetReplicationAllowed: false,
    notes: [
      'Interest management types CLOSED — spatial cull fail-closed',
      'Agones fleet / 5k-ship live replication HELD',
    ],
  }
}

export function proveInterestManagement(): {
  passed: boolean
  cullsDistant: boolean
  respectsBudget: boolean
  fleetHeld: boolean
  notes: string[]
} {
  const actors: InterestActor[] = []
  for (let i = 0; i < 5000; i++) {
    actors.push({
      id: `ship-${i}`,
      x: (i % 100) * 500,
      y: 0,
      z: Math.floor(i / 100) * 500,
      priority: 1,
    })
  }
  // Priority VIP inside radius (x=0) must survive budget cull.
  actors[0]!.priority = 10
  const set = buildInterestSet(actors, {
    observerX: 0,
    observerY: 0,
    observerZ: 0,
    radiusM: 2000,
    maxActors: 64,
  })
  const gate = evaluateInterestFleetGate({})
  const cullsDistant = set.culled > 4000
  const respectsBudget = set.actorIds.length <= 64
  const fleetHeld = set.liveFleetReady === false && !gate.dedicatedFleetReplicationAllowed
  return {
    passed: cullsDistant && respectsBudget && fleetHeld && set.actorIds.includes('ship-0'),
    cullsDistant,
    respectsBudget,
    fleetHeld,
    notes: [
      ...gate.notes,
      `interest set ${set.actorIds.length}/${set.total} (culled ${set.culled})`,
    ],
  }
}
