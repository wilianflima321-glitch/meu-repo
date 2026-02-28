import type { PlanId } from '@/lib/plans'

type EntitlementSource = 'subscription' | 'trial'

export type AssetSourcePolicyInput = {
  planId: PlanId
  entitlementSource: EntitlementSource
  source?: string | null
  license?: string | null
  forCommercialUse?: boolean
}

export type AssetSourcePolicyDecision = {
  allowed: boolean
  reason: string | null
  source: string
  license: string
  sourceTrustScore: number
  licenseRisk: 'low' | 'medium' | 'high'
  metadata: {
    planId: PlanId
    entitlementSource: EntitlementSource
    forCommercialUse: boolean
    policyTier: 'strict' | 'balanced' | 'flexible'
  }
}

const TRUSTED_SOURCES = new Map<string, number>([
  ['user_upload', 100],
  ['internal_marketplace', 95],
  ['polyhaven', 90],
  ['mixamo', 85],
  ['freesound', 78],
  ['sketchfab', 75],
  ['epic_fab', 74],
  ['cgtrader', 70],
  ['kitbash3d', 70],
  ['youtube_audio_library', 68],
  ['custom_url', 45],
  ['unknown', 30],
])

const LICENSE_RISK: Record<string, 'low' | 'medium' | 'high'> = {
  cc0: 'low',
  commercial: 'low',
  proprietary_owned: 'low',
  royalty_free: 'low',
  cc_by: 'medium',
  editorial: 'medium',
  cc_by_sa: 'high',
  cc_by_nc: 'high',
  gpl: 'high',
  unknown: 'high',
}

function normalizeKey(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || fallback
}

function policyTierByPlan(planId: PlanId): 'strict' | 'balanced' | 'flexible' {
  if (planId === 'starter' || planId === 'basic') return 'strict'
  if (planId === 'pro') return 'balanced'
  return 'flexible'
}

function minTrustByPlan(planId: PlanId): number {
  switch (planId) {
    case 'starter':
      return 70
    case 'basic':
      return 60
    case 'pro':
      return 45
    case 'studio':
      return 35
    case 'enterprise':
      return 20
    default:
      return 70
  }
}

export function evaluateAssetSourcePolicy(input: AssetSourcePolicyInput): AssetSourcePolicyDecision {
  const source = normalizeKey(input.source, 'user_upload')
  const license = normalizeKey(input.license, 'unknown')
  const forCommercialUse = input.forCommercialUse !== false
  const sourceTrustScore = TRUSTED_SOURCES.get(source) ?? TRUSTED_SOURCES.get('unknown') ?? 30
  const licenseRisk = LICENSE_RISK[license] || 'high'
  const tier = policyTierByPlan(input.planId)
  const minTrust = minTrustByPlan(input.planId)

  if (sourceTrustScore < minTrust) {
    return {
      allowed: false,
      reason: `Source trust score ${sourceTrustScore} is below ${input.planId} threshold (${minTrust}).`,
      source,
      license,
      sourceTrustScore,
      licenseRisk,
      metadata: {
        planId: input.planId,
        entitlementSource: input.entitlementSource,
        forCommercialUse,
        policyTier: tier,
      },
    }
  }

  if (forCommercialUse && licenseRisk === 'high') {
    return {
      allowed: false,
      reason: `License "${license}" is not approved for commercial workflows.`,
      source,
      license,
      sourceTrustScore,
      licenseRisk,
      metadata: {
        planId: input.planId,
        entitlementSource: input.entitlementSource,
        forCommercialUse,
        policyTier: tier,
      },
    }
  }

  if ((input.planId === 'starter' || input.planId === 'basic') && source === 'custom_url') {
    return {
      allowed: false,
      reason: 'custom_url source requires Pro plan or higher due compliance risk.',
      source,
      license,
      sourceTrustScore,
      licenseRisk,
      metadata: {
        planId: input.planId,
        entitlementSource: input.entitlementSource,
        forCommercialUse,
        policyTier: tier,
      },
    }
  }

  return {
    allowed: true,
    reason: null,
    source,
    license,
    sourceTrustScore,
    licenseRisk,
    metadata: {
      planId: input.planId,
      entitlementSource: input.entitlementSource,
      forCommercialUse,
      policyTier: tier,
    },
  }
}
