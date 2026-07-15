/**
 * Letter cv — CapScore-budgeted Rapier hero fragments only.
 * Debris/dust never enter Rapier when GPU path is intended (chaos-killer posture).
 */

export const HERO_RAPIER_BUDGET_LETTER = 'cv' as const

export interface HeroRapierBudget {
  capabilityScore: number
  maxHeroFragments: number
  /** GT730 / low CapScore: zero heroes — fail-closed Zero-UI (no Rapier spam). */
  rapierHeroesAllowed: boolean
  notes: string[]
}

/**
 * Law XV CapScore → hero Rapier budget.
 * score < 20 (GT730): 0 heroes (degrade / fail-closed)
 * 20–39: 2 heroes
 * 40–59: 4
 * 60–74: 8
 * 75+: 16
 */
export function resolveHeroRapierBudget(capabilityScore: number): HeroRapierBudget {
  const score = Math.max(0, Math.min(100, Math.round(capabilityScore)))
  const notes: string[] = ['Hero fragment Rapier budget (letter cv) — debris stays GPU SoA']

  if (score < 20) {
    notes.push(`Law XV GT730-aware: score=${score} — hero Rapier budget=0 (Zero-UI)`)
    return {
      capabilityScore: score,
      maxHeroFragments: 0,
      rapierHeroesAllowed: false,
      notes,
    }
  }

  let maxHeroFragments = 2
  if (score >= 75) maxHeroFragments = 16
  else if (score >= 60) maxHeroFragments = 8
  else if (score >= 40) maxHeroFragments = 4

  notes.push(`CapScore=${score} → maxHeroFragments=${maxHeroFragments}`)
  return {
    capabilityScore: score,
    maxHeroFragments,
    rapierHeroesAllowed: true,
    notes,
  }
}

/** Filter plan entries eligible for DEST-001 Rapier session. */
export function selectHeroFragmentsForRapier<T extends { tier: string }>(
  entries: T[],
  budget: HeroRapierBudget,
): T[] {
  if (!budget.rapierHeroesAllowed || budget.maxHeroFragments <= 0) return []
  return entries.filter((e) => e.tier === 'hero').slice(0, budget.maxHeroFragments)
}
