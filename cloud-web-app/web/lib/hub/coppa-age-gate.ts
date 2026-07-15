/**
 * I.4 — COPPA / age-gate helpers for Hub social surfaces.
 * Fail-closed for under-13 without verifiable parental consent.
 * Pure helpers — no fake age claims; party/deep-link stay behind this + moderation.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('coppa-age-gate')

/** US COPPA threshold — under this age requires parental consent for social. */
export const COPPA_AGE_THRESHOLD_YEARS = 13

export type CoppaAgeGateInput = {
  /** ISO date string (YYYY-MM-DD or full ISO) */
  birthDate?: string | null
  /** Explicit age in whole years when birthDate unavailable */
  ageYears?: number | null
  /** Verifiable parental consent on file */
  parentalConsentVerified?: boolean
  /** Clock override for tests */
  nowMs?: number
}

export type CoppaAgeGateResult = {
  allowed: boolean
  code:
    | 'AGE_OK'
    | 'AGE_UNKNOWN'
    | 'COPPA_UNDER_13'
    | 'COPPA_CONSENT_OK'
  reason: string
  ageYears: number | null
  requiresParentalConsent: boolean
}

/**
 * Compute whole years of age from birth date at `nowMs`.
 * Returns null when birthDate is missing or invalid.
 */
export function computeAgeYearsFromBirthDate(
  birthDate: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!birthDate || typeof birthDate !== 'string') return null
  const trimmed = birthDate.trim()
  if (!trimmed) return null
  const born = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00.000Z`)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date(nowMs)
  let years = now.getUTCFullYear() - born.getUTCFullYear()
  const monthDelta = now.getUTCMonth() - born.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < born.getUTCDate())) {
    years -= 1
  }
  if (years < 0 || years > 130) return null
  return years
}

/**
 * Gate Hub social participation (report/block still allowed for safety;
 * friend/party/deep-link must call this and fail-closed).
 */
export function evaluateCoppaAgeGate(input: CoppaAgeGateInput = {}): CoppaAgeGateResult {
  const nowMs = input.nowMs ?? Date.now()
  let ageYears: number | null = null

  if (typeof input.ageYears === 'number' && Number.isFinite(input.ageYears)) {
    ageYears = Math.floor(input.ageYears)
  } else {
    ageYears = computeAgeYearsFromBirthDate(input.birthDate, nowMs)
  }

  if (ageYears === null) {
    const result: CoppaAgeGateResult = {
      allowed: false,
      code: 'AGE_UNKNOWN',
      reason: 'Age not verified — Hub social fail-closed until birth date or ageYears provided',
      ageYears: null,
      requiresParentalConsent: true,
    }
    log.info('coppa_age_gate', { code: result.code, allowed: false })
    return result
  }

  if (ageYears < COPPA_AGE_THRESHOLD_YEARS) {
    if (input.parentalConsentVerified === true) {
      const result: CoppaAgeGateResult = {
        allowed: true,
        code: 'COPPA_CONSENT_OK',
        reason: 'Under-13 with verified parental consent',
        ageYears,
        requiresParentalConsent: true,
      }
      log.info('coppa_age_gate', { code: result.code, ageYears, allowed: true })
      return result
    }
    const result: CoppaAgeGateResult = {
      allowed: false,
      code: 'COPPA_UNDER_13',
      reason: `Under ${COPPA_AGE_THRESHOLD_YEARS} without parental consent — social party/friends fail-closed`,
      ageYears,
      requiresParentalConsent: true,
    }
    log.info('coppa_age_gate', { code: result.code, ageYears, allowed: false })
    return result
  }

  const result: CoppaAgeGateResult = {
    allowed: true,
    code: 'AGE_OK',
    reason: 'Age at or above COPPA threshold',
    ageYears,
    requiresParentalConsent: false,
  }
  log.info('coppa_age_gate', { code: result.code, ageYears, allowed: true })
  return result
}

/**
 * Safety surfaces (Report / Block) remain available even when COPPA holds party —
 * but only when the actor identity is present. Under-13 may still report/block.
 */
export function evaluateSocialSafetyActionGate(input: {
  actorUserId?: string | null
}): { allowed: boolean; code?: string; reason: string } {
  const actor = String(input.actorUserId || '').trim()
  if (!actor) {
    return {
      allowed: false,
      code: 'AUTH_REQUIRED',
      reason: 'Report / Block require signed-in actor',
    }
  }
  return { allowed: true, reason: 'safety_action_allowed' }
}
