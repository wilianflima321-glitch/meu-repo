import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildBestMarketInternalSpineReport,
  coerceBestMarketInternalSpineInputFromSearchParams,
} from '@/lib/runtime/best-market-internal-spine'
import {
  buildRuntimeFailureSmokePackReport,
  validateRuntimeFailureSmokePackReport,
  type RuntimeFailureSmokePackInput,
} from '@/lib/runtime/runtime-failure-smoke-pack'

const logger = createComponentLogger('api.runtime.best-market-internal-spine')

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  if (/^(1|true|yes|on)$/i.test(value)) return true
  if (/^(0|false|no|off)$/i.test(value)) return false
  return undefined
}

function readEvidenceOverrides(value: unknown): RuntimeFailureSmokePackInput['evidenceOverrides'] {
  if (!isRecord(value)) return undefined
  const out: NonNullable<RuntimeFailureSmokePackInput['evidenceOverrides']> = {}
  for (const [key, refs] of Object.entries(value)) {
    if (!Array.isArray(refs)) continue
    const normalized = refs.filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0)
    if (normalized.length > 0) out[key as keyof NonNullable<RuntimeFailureSmokePackInput['evidenceOverrides']>] = normalized
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function buildFailureSmokePackResponse(input: RuntimeFailureSmokePackInput, userId: string) {
  const report = buildRuntimeFailureSmokePackReport(input)
  const validationErrors = validateRuntimeFailureSmokePackReport(report)
  const capabilityStatus = validationErrors.length > 0 ? 'blocked' : 'needs-review'

  logger.info('runtime_failure_smoke_pack.generated', {
    userId,
    scenarioCount: report.scenarioCount,
    governedFailureCount: report.governedFailureCount,
    recoveredWithReceiptsCount: report.recoveredWithReceiptsCount,
    blockedForReviewCount: report.blockedForReviewCount,
    validationErrors: validationErrors.length,
  })

  return NextResponse.json({
    report,
    validation: { valid: validationErrors.length === 0, errors: validationErrors },
    capability: report.capability,
    capabilityStatus,
    marketClaimAllowed: false,
    releaseReady: false,
    manualPublishRequired: true,
  }, {
    headers: {
      'x-aethel-capability': report.capability,
      'x-aethel-capability-status': capabilityStatus,
      'x-aethel-scenario-count': String(report.scenarioCount),
      'x-aethel-market-claim-allowed': 'false',
      'x-aethel-release-ready': 'false',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    if (request.nextUrl.searchParams.get('mode') === 'runtime-failure-smoke-pack') {
      return buildFailureSmokePackResponse({
        runPrefix: readString(request.nextUrl.searchParams.get('runPrefix')),
        generatedAt: readString(request.nextUrl.searchParams.get('generatedAt')),
        useCanonicalFixtures: readBoolean(request.nextUrl.searchParams.get('useCanonicalFixtures')) ?? true,
      }, user.userId)
    }

    const input = coerceBestMarketInternalSpineInputFromSearchParams(request.nextUrl.searchParams)
    const report = buildBestMarketInternalSpineReport(input)

    logger.info('best_market_internal_spine.snapshot', {
      userId: user.userId,
      state: report.state,
      domains: report.domainCount,
      gaps: report.gaps.length,
      p0GapCount: report.p0GapCount,
      heldOrBlockedDomainCount: report.heldOrBlockedDomainCount,
    })

    return NextResponse.json(report, {
      headers: {
        'x-aethel-capability': report.capability,
        'x-aethel-capability-status': report.state,
        'x-aethel-domain-count': String(report.domainCount),
        'x-aethel-held-domains': String(report.heldOrBlockedDomainCount),
        'x-aethel-p0-gaps': String(report.p0GapCount),
      },
    })
  } catch (error) {
    if (request.nextUrl.searchParams.get('mode') === 'runtime-failure-smoke-pack') {
      logger.error('runtime_failure_smoke_pack.get_failed', error)
    } else {
      logger.error('best_market_internal_spine.failed', error)
    }

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const body = (await request.json()) as unknown
    return buildFailureSmokePackResponse({
      runPrefix: isRecord(body) ? readString(body.runPrefix) : undefined,
      generatedAt: isRecord(body) ? readString(body.generatedAt) : undefined,
      evidenceOverrides: isRecord(body) ? readEvidenceOverrides(body.evidenceOverrides) : undefined,
      useCanonicalFixtures: isRecord(body) ? readBoolean(body.useCanonicalFixtures) ?? true : true,
    }, user.userId)
  } catch (error) {
    logger.error('runtime_failure_smoke_pack.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
