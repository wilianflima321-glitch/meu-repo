/**
 * Letter cn — Cosmos Law XV CapScore budgets (GT730 degrade).
 */

import type { CosmosCapabilityBudget } from '@/lib/cosmos/types'

export const COSMOS_CAPABILITY_BUDGET_WIRED = true as const

export function resolveCosmosCapabilityBudget(
  capabilityScore: number,
): CosmosCapabilityBudget {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0
  const tier: CosmosCapabilityBudget['tier'] =
    score < 20
      ? 'gt730'
      : score < 45
        ? 'integrated'
        : score < 75
          ? 'discrete'
          : 'enthusiast'

  if (tier === 'gt730') {
    return {
      capabilityScore: score,
      tier,
      maxNestedGrids: 1,
      fineBvhRadiusM: 250,
      coarseBvhLeafAu: 2,
      interestRadiusM: 800,
      maxInterestActors: 24,
      reversedZAllowed: true, // safety vs Z-fight still on
      floatingOriginAllowed: true,
      ccdBodiesMax: 4,
      acousticRaySteps: 4,
      skyAtmosphereSamples: 4,
      volumetricCellSizeM: 32,
      notes: ['GT730: tight nested/interest/CCD; reverse-Z + floating origin still on'],
    }
  }
  if (tier === 'integrated') {
    return {
      capabilityScore: score,
      tier,
      maxNestedGrids: 2,
      fineBvhRadiusM: 500,
      coarseBvhLeafAu: 1.5,
      interestRadiusM: 1500,
      maxInterestActors: 48,
      reversedZAllowed: true,
      floatingOriginAllowed: true,
      ccdBodiesMax: 12,
      acousticRaySteps: 6,
      skyAtmosphereSamples: 6,
      volumetricCellSizeM: 48,
      notes: ['integrated cosmos budgets'],
    }
  }
  if (tier === 'discrete') {
    return {
      capabilityScore: score,
      tier,
      maxNestedGrids: 4,
      fineBvhRadiusM: 1000,
      coarseBvhLeafAu: 1,
      interestRadiusM: 3000,
      maxInterestActors: 96,
      reversedZAllowed: true,
      floatingOriginAllowed: true,
      ccdBodiesMax: 32,
      acousticRaySteps: 10,
      skyAtmosphereSamples: 10,
      volumetricCellSizeM: 64,
      notes: ['discrete cosmos budgets'],
    }
  }
  return {
    capabilityScore: score,
    tier,
    maxNestedGrids: 8,
    fineBvhRadiusM: 1000,
    coarseBvhLeafAu: 0.5,
    interestRadiusM: 5000,
    maxInterestActors: 128,
    reversedZAllowed: true,
    floatingOriginAllowed: true,
    ccdBodiesMax: 64,
    acousticRaySteps: 16,
    skyAtmosphereSamples: 16,
    volumetricCellSizeM: 96,
    notes: ['enthusiast budgets; Star Citizen / UE planetary parity still HELD'],
  }
}
