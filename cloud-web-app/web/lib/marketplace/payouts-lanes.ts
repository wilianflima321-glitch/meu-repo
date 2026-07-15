/**
 * Law XII / Block 6G.3 — Revenue lanes (H.0).
 * UNIVERSAL_STORE = 30/70 · IN_GAME_IAP = 12% server-offset · LEGACY_FLAT_12 = grandfather only.
 */

export enum RevenueLane {
  /** Hub / Universal Store marketplace listings — Law XII 30% platform / 70% creator */
  UNIVERSAL_STORE = 'UNIVERSAL_STORE',
  /** In-game IAP dedicated-server offset — 12% platform */
  IN_GAME_IAP = 'IN_GAME_IAP',
  /** Grandfather only — never use for new Universal Store paths */
  LEGACY_FLAT_12 = 'LEGACY_FLAT_12',
}

export const REVENUE_LANE_PLATFORM_TAKE: Record<RevenueLane, number> = {
  [RevenueLane.UNIVERSAL_STORE]: 0.3,
  [RevenueLane.IN_GAME_IAP]: 0.12,
  [RevenueLane.LEGACY_FLAT_12]: 0.12,
}

export interface CreatorRevenueSplit {
  creatorCents: number
  platformCents: number
  creatorShare: number
  platformShare: number
  lane: RevenueLane
}

/**
 * @deprecated Prefer `REVENUE_LANE_PLATFORM_TAKE[IN_GAME_IAP]` — kept for redis-cost-guard IAP offset.
 */
export const PLATFORM_TAKE_RATE = REVENUE_LANE_PLATFORM_TAKE[RevenueLane.IN_GAME_IAP]

export function calculateRevenueSplit(
  totalPriceCents: number,
  lane: RevenueLane = RevenueLane.IN_GAME_IAP,
): CreatorRevenueSplit {
  const platformShare = REVENUE_LANE_PLATFORM_TAKE[lane]
  const platformCents = Math.round(totalPriceCents * platformShare)
  const creatorCents = totalPriceCents - platformCents
  return {
    creatorCents,
    platformCents,
    creatorShare: 1 - platformShare,
    platformShare,
    lane,
  }
}

export function isUniversalStoreLane(lane: RevenueLane): boolean {
  return lane === RevenueLane.UNIVERSAL_STORE
}
