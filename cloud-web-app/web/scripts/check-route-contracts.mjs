#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

const checks = [
  {
    file: 'app/api/workspace/tree/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      'trackCompatibilityRouteHit',
      'deprecatedSince:',
      'removalCycleTarget:',
      'deprecationPolicy:',
    ],
    name: 'workspace/tree deprecation contract',
  },
  {
    file: 'app/api/workspace/files/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      'trackCompatibilityRouteHit',
      'deprecatedSince:',
      'removalCycleTarget:',
      'deprecationPolicy:',
    ],
    name: 'workspace/files deprecation contract',
  },
  {
    file: 'app/api/auth/sessions/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      "authModel: 'jwt'",
      'trackCompatibilityRouteHit',
      'deprecatedSince:',
      'removalCycleTarget:',
      'deprecationPolicy:',
    ],
    name: 'auth/sessions deprecation contract',
  },
  {
    file: 'app/api/auth/sessions/[id]/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      "authModel: 'jwt'",
      'trackCompatibilityRouteHit',
      'deprecatedSince:',
      'removalCycleTarget:',
      'deprecationPolicy:',
    ],
    name: 'auth/sessions/[id] deprecation contract',
  },
  {
    file: 'lib/server/compatibility-route-telemetry.ts',
    patterns: [
      'x-aethel-deprecated-since',
      'x-aethel-removal-cycle-target',
      'x-aethel-deprecation-policy',
    ],
    name: 'compatibility telemetry response-header contract',
  },
  {
    file: 'app/api/ai/chat/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'"],
    name: 'ai/chat provider-gate contract',
  },
  {
    file: 'app/api/ai/chat-advanced/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'"],
    name: 'ai/chat-advanced provider-gate contract',
  },
  {
    file: 'app/api/ai/complete/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'"],
    name: 'ai/complete provider-gate contract',
  },
  {
    file: 'app/api/ai/action/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'"],
    name: 'ai/action provider-gate contract',
  },
  {
    file: 'app/api/ai/inline-edit/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'"],
    name: 'ai/inline-edit provider-gate contract',
  },
  {
    file: 'app/api/ai/inline-completion/route.ts',
    patterns: ["error: 'AI_PROVIDER_NOT_CONFIGURED'", 'status: 503', "capabilityStatus: 'PARTIAL'", 'suggestion', 'text: suggestion'],
    name: 'ai/inline-completion provider-gate + payload contract',
  },
  {
    file: 'app/api/billing/checkout/route.ts',
    patterns: [
      "error: 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE'",
      'status: 503',
      "capabilityStatus: 'PARTIAL'",
      "capability: 'PAYMENT_GATEWAY_RUNTIME'",
      'supportedGateway:',
    ],
    name: 'billing/checkout gateway-runtime contract',
  },
  {
    file: 'app/api/billing/checkout-link/route.ts',
    patterns: [
      "error: 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE'",
      'status: 503',
      "capabilityStatus: 'PARTIAL'",
      "capability: 'PAYMENT_GATEWAY_RUNTIME'",
      'supportedGateway:',
    ],
    name: 'billing/checkout-link gateway-runtime contract',
  },
  {
    file: 'app/api/files/raw/route.ts',
    patterns: [
      "const PREVIEW_MAX_INLINE_MEDIA_BYTES",
      "intent === 'preview'",
      "error: 'FILE_TOO_LARGE_FOR_PREVIEW'",
      'status: 413',
      "capability: 'IDE_PREVIEW_MEDIA_INLINE'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'files/raw preview payload gate contract',
  },
  {
    file: 'app/api/ai/change/apply/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CHANGE_APPLY'",
      "const RUN_SOURCE = 'production'",
      "error: 'HIGH_RISK_APPROVAL_REQUIRED'",
      "error: 'FULL_ACCESS_GRANT_REQUIRED'",
      "error: 'DEPENDENCY_IMPACT_APPROVAL_REQUIRED'",
      "error: 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED'",
      "error: 'APPLY_WRITE_FAILED'",
      "'sandbox-simulated'",
      "normalizeExecutionMode",
      'runSource: RUN_SOURCE',
      'projectImpact',
      'rollbackToken',
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'ai/change/apply partial runtime contract',
  },
  {
    file: 'app/api/ai/change/rollback/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CHANGE_ROLLBACK'",
      "const RUN_SOURCE = 'production'",
      'rollbackTokens',
      'requestedRunId',
      "error: 'ROLLBACK_RUN_NOT_FOUND'",
      "error: 'ROLLBACK_TOKEN_NOT_FOUND'",
      "error: 'CURRENT_HASH_MISMATCH'",
      "error: 'ROLLBACK_WRITE_FAILED'",
      'runSource: RUN_SOURCE',
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'ai/change/rollback partial runtime contract',
  },
  {
    file: 'app/api/ai/change/runs/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CHANGE_RUNS'",
      'filterChangeRunLedgerBySample',
      'summarizeChangeRunLedger',
      'summarizeChangeRunGroups',
      'sampleClass',
      'summaryAll',
      'runGroups',
      "capabilityStatus: 'PARTIAL'",
      "message: 'Change run ledger loaded.'",
    ],
    name: 'ai/change/runs evidence contract',
  },
  {
    file: 'app/api/ai/change/readiness/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CHANGE_READINESS'",
      'computeCoreLoopReadiness',
      "message: 'Core-loop readiness loaded.'",
      "capabilityStatus: 'PARTIAL'",
      'reasonCounts',
      'feedbackCounts',
      'allFeedbackCounts',
      'executionModeCounts',
      'riskCounts',
      'trend',
      'recommendations',
      'samplePolicy',
      'metricsAll',
      'rehearsalMetrics',
      'learnFeedbackCoverage',
      'reviewedApplyRuns',
      'unreviewedApplyRuns',
      'runGroups',
    ],
    name: 'ai/change/readiness evidence contract',
  },
  {
    file: 'app/api/ai/change/feedback/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CHANGE_LEARN'",
      "error: 'FEEDBACK_REQUIRED'",
      "error: 'RUN_ID_REQUIRED'",
      "error: 'RUN_NOT_FOUND'",
      "error: 'LEARN_FEEDBACK_ALREADY_EXISTS'",
      "error: 'FEEDBACK_NOTES_TOO_LONG'",
      "message: 'Learn feedback saved.'",
      "eventType: 'learn_feedback'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'ai/change/feedback learn-stage contract',
  },
  {
    file: 'app/api/admin/ai/readiness/route.ts',
    patterns: [
      "const CAPABILITY = 'AI_CORE_LOOP_READINESS'",
      "capabilityStatus: 'PARTIAL'",
      'promotionEligible',
      'applySuccessRate',
      'regressionRate',
      'sandboxCoverage',
      'workspaceCoverage',
      'learnFeedbackCoverage',
      'reviewedApplyRuns',
      'unreviewedApplyRuns',
      'blockers',
      'feedbackCounts',
      'reasonPlaybook',
      'recommendations',
      'trend',
      'samplePolicy',
      'metricsAll',
      'rehearsalMetrics',
    ],
    name: 'admin/ai/readiness evidence contract',
  },
  {
    file: 'app/api/admin/ai/core-loop-metrics/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_AI_CORE_LOOP_METRICS'",
      "message: 'Core-loop metrics loaded.'",
      "capabilityStatus: 'PARTIAL'",
      'reasonCounts',
      'feedbackCounts',
      'allFeedbackCounts',
      'executionModeCounts',
      'riskCounts',
      'impactedEndpointCounts',
      'trend',
      'reasonPlaybook',
      'recommendations',
      'samplePolicy',
      'metricsAll',
      'rehearsalMetrics',
      'latest',
    ],
    name: 'admin/ai/core-loop-metrics evidence contract',
  },
  {
    file: 'app/api/admin/ai/core-loop-drill/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_AI_CORE_LOOP_DRILL'",
      'appendChangeRunLedgerEvent',
      "runSource: 'core_loop_drill'",
      "capabilityStatus: 'PARTIAL'",
      'samplePolicy',
    ],
    name: 'admin/ai/core-loop-drill rehearsal contract',
  },
  {
    file: 'app/api/admin/ai/core-loop-production-probe/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_AI_CORE_LOOP_PRODUCTION_PROBE'",
      "error: 'PRODUCTION_PROBE_FILE_NOT_FOUND'",
      "error: 'PRODUCTION_PROBE_AUTH_MISSING'",
      "samplePolicy: 'production_only_for_promotion'",
      "runSource: 'production'",
      "capabilityStatus: 'PARTIAL'",
      "message: 'Production evidence probe executed.'",
    ],
    name: 'admin/ai/core-loop-production-probe contract',
  },
  {
    file: 'app/api/admin/ai/ledger-integrity/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_AI_LEDGER_INTEGRITY'",
      "capabilityStatus: 'PARTIAL'",
      'integrityOk',
      'verifyChangeRunLedgerIntegrity',
      'daysLookback',
    ],
    name: 'admin/ai/ledger-integrity contract',
  },
  {
    file: 'app/api/admin/ai/full-access/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_FULL_ACCESS_AUDIT'",
      "message: 'Full access audit snapshot loaded.'",
      "capabilityStatus: 'PARTIAL'",
      'summary:',
      'grants:',
    ],
    name: 'admin/ai/full-access audit contract',
  },
  {
    file: 'app/api/admin/ai/core-loop-promotion/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_AI_CORE_LOOP_PROMOTION'",
      "samplePolicy: 'production_only_for_promotion'",
      'promotionEligible',
      'blockers',
      'production:',
      'rehearsal:',
    ],
    name: 'admin/ai/core-loop-promotion contract',
  },
  {
    file: 'app/api/admin/analytics/baseline/route.ts',
    patterns: [
      'firstValueProjectCreated',
      'firstValueAiSuccess',
      'firstValueIdeOpen',
      'firstValueCompleted',
      "action: 'analytics:settings_change'",
    ],
    name: 'admin/analytics baseline first-value funnel contract',
  },
  {
    file: 'app/api/admin/onboarding/stats/route.ts',
    patterns: [
      "capability: 'ADMIN_ONBOARDING_STATS'",
      "capabilityStatus: 'IMPLEMENTED'",
      'firstValueCompleted',
      'completionRateFromSignup',
      'medianFirstValueTimeMs',
      'sampleSize',
      'sloTargetMs',
      'sloStatus',
      "action: 'analytics_metric:first_value_time'",
    ],
    name: 'admin/onboarding stats contract',
  },
  {
    file: 'app/api/preview/runtime-discover/route.ts',
    patterns: [
      "const CAPABILITY = 'IDE_PREVIEW_RUNTIME_DISCOVERY'",
      'enforcePreviewRuntimeRateLimit',
      'PREVIEW_DISCOVERY_RATE_LIMIT',
      "error: 'RUNTIME_DISCOVERY_TOO_MANY_CANDIDATES'",
      "status: 400",
      "capabilityStatus: 'PARTIAL'",
      'preferredRuntimeUrl',
      "source: usingDefaultCandidates ? 'default' : 'request'",
    ],
    name: 'preview/runtime-discover contract',
  },
  {
    file: 'app/api/preview/runtime-provision/route.ts',
    patterns: [
      "const CAPABILITY = 'IDE_PREVIEW_RUNTIME_PROVISION'",
      'enforcePreviewRuntimeRateLimit',
      'PREVIEW_PROVISION_RATE_LIMIT',
      "error: 'RUNTIME_PROVISION_BACKEND_NOT_CONFIGURED'",
      "error: 'RUNTIME_PROVISION_FAILED'",
      "error: 'RUNTIME_PROVISION_INVALID_URL'",
      "error: 'RUNTIME_PROVISION_UNHEALTHY'",
      "error: 'RUNTIME_PROVISION_EXCEPTION'",
      "capabilityStatus: 'PARTIAL'",
      'runtimeUrl',
    ],
    name: 'preview/runtime-provision contract',
  },
  {
    file: 'app/api/preview/runtime-health/route.ts',
    patterns: [
      "'IDE_PREVIEW_RUNTIME_HEALTH'",
      'enforcePreviewRuntimeRateLimit',
      'PREVIEW_HEALTH_RATE_LIMIT',
      "error: 'RUNTIME_URL_REQUIRED'",
      "error: 'RUNTIME_URL_INVALID'",
      "error: 'RUNTIME_URL_NOT_ALLOWED'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'preview/runtime-health contract',
  },
  {
    file: 'app/api/render/jobs/[jobId]/cancel/route.ts',
    patterns: [
      "const CAPABILITY = 'RENDER_JOB_CANCEL'",
      "error: 'QUEUE_BACKEND_UNAVAILABLE'",
      "error: 'JOB_ACTIVE_CANNOT_CANCEL'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'render/jobs cancel runtime contract',
  },
  {
    file: 'app/api/admin/jobs/[id]/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_JOB_CANCEL'",
      "error: 'QUEUE_BACKEND_UNAVAILABLE'",
      "error: 'JOB_ACTIVE_CANNOT_CANCEL'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'admin/jobs cancel runtime contract',
  },
  {
    file: 'app/api/admin/jobs/[id]/retry/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_JOB_RETRY'",
      "error: 'QUEUE_BACKEND_UNAVAILABLE'",
      "error: 'JOB_NOT_FAILED'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'admin/jobs retry runtime contract',
  },
  {
    file: 'app/api/admin/jobs/[id]/pause/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_JOB_PAUSE'",
      "error: 'QUEUE_BACKEND_UNAVAILABLE'",
      "error: 'JOB_NOT_FOUND'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'admin/jobs pause runtime contract',
  },
  {
    file: 'app/api/admin/jobs/[id]/resume/route.ts',
    patterns: [
      "const CAPABILITY = 'ADMIN_JOB_RESUME'",
      "error: 'QUEUE_BACKEND_UNAVAILABLE'",
      "error: 'JOB_NOT_FOUND'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'admin/jobs resume runtime contract',
  },
  {
    file: 'app/api/agents/stream/route.ts',
    patterns: [
      "normalizeExecutionMode",
      "error: 'AI_PROVIDER_NOT_CONFIGURED'",
      "mode: 'provider-backed'",
      "availableModes: getAvailableModes()",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'agents/stream provider-backed partial contract',
  },
  {
    file: 'app/api/studio/access/full/route.ts',
    patterns: [
      "const CAPABILITY = 'STUDIO_FULL_ACCESS_GRANT'",
      "error: 'FULL_ACCESS_REASON_REQUIRED'",
      "error: 'STUDIO_FULL_ACCESS_GRANT_FAILED'",
      "message: 'Full access grant issued.'",
      "message: 'Full access grants loaded.'",
      "capabilityStatus: 'PARTIAL'",
      "samplePolicy: 'short_lived_scoped_audited'",
    ],
    name: 'studio/full-access grant+list contract',
  },
  {
    file: 'app/api/studio/access/full/[id]/route.ts',
    patterns: [
      "const CAPABILITY = 'STUDIO_FULL_ACCESS_REVOKE'",
      "error: 'FULL_ACCESS_GRANT_NOT_FOUND'",
      "error: 'FULL_ACCESS_REVOKE_FORBIDDEN'",
      "error: 'STUDIO_FULL_ACCESS_REVOKE_FAILED'",
      "message: 'Full access grant revoked.'",
      "capabilityStatus: 'PARTIAL'",
      "samplePolicy: 'short_lived_scoped_audited'",
    ],
    name: 'studio/full-access revoke contract',
  },
  {
    file: 'app/api/_lib/catchall-gate.ts',
    patterns: [
      "error: 'ROUTE_NOT_MAPPED'",
      "status: 404",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'catchall route partial contract',
  },
  {
    file: 'app/api/telemetry/event/route.ts',
    patterns: [
      "const CAPABILITY = 'TELEMETRY_EVENT_INGEST'",
      "error: 'TELEMETRY_EVENT_TYPE_REQUIRED'",
      "error: 'TELEMETRY_EVENT_TOO_LARGE'",
      "error: 'TELEMETRY_EVENT_PERSIST_FAILED'",
      "capabilityStatus: 'IMPLEMENTED'",
    ],
    name: 'telemetry/event ingest contract',
  },
]

async function read(relPath) {
  const absPath = path.join(ROOT, relPath)
  return fs.readFile(absPath, 'utf8')
}

async function main() {
  const failures = []

  for (const check of checks) {
    let content
    try {
      content = await read(check.file)
    } catch (error) {
      failures.push(`${check.name}: missing file ${check.file}`)
      continue
    }

    for (const pattern of check.patterns) {
      if (!content.includes(pattern)) {
        failures.push(`${check.name}: missing pattern "${pattern}"`)
      }
    }
  }

  if (failures.length > 0) {
    console.error('[route-contracts] FAIL')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(`[route-contracts] PASS checks=${checks.length}`)
}

main().catch((error) => {
  console.error('[route-contracts] ERROR', error)
  process.exit(1)
})
