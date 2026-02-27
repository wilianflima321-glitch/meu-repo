#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const checks = [
  {
    file: 'app/api/workspace/tree/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      'trackCompatibilityRouteHit',
      "deprecatedSince: '2026-02-11'",
      "removalCycleTarget: '2026-cycle-2'",
      "deprecationPolicy: 'phaseout_after_2_cycles'",
    ],
    name: 'workspace/tree deprecation contract',
  },
  {
    file: 'app/api/workspace/files/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      'trackCompatibilityRouteHit',
      "deprecatedSince: '2026-02-11'",
      "removalCycleTarget: '2026-cycle-2'",
      "deprecationPolicy: 'phaseout_after_2_cycles'",
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
      "deprecatedSince: '2026-02-11'",
      "removalCycleTarget: '2026-cycle-2'",
      "deprecationPolicy: 'phaseout_after_2_cycles'",
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
      "deprecatedSince: '2026-02-11'",
      "removalCycleTarget: '2026-cycle-2'",
      "deprecationPolicy: 'phaseout_after_2_cycles'",
    ],
    name: 'auth/sessions/[id] deprecation contract',
  },
  {
    file: 'app/api/admin/compatibility-routes/route.ts',
    patterns: [
      'candidateForRemoval',
      'removalCandidates',
      'requiredSilentDays: 14',
      "deprecationMode: 'phaseout_after_2_cycles'",
      "supportsCutoff && (item.hits === 0 || silentForMs >= cutoffWindowMs)",
    ],
    name: 'admin/compatibility-routes cutoff policy contract',
  },
  {
    file: 'app/api/auth/2fa/route.ts',
    patterns: [
      "error: 'DEPRECATED_ROUTE'",
      'status: 410',
      'deprecatedSince:',
      'removalCycleTarget:',
      'deprecationPolicy:',
      'availableRoutes:',
    ],
    name: 'auth/2fa aggregate deprecation contract',
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
    file: 'lib/server/files-compat-policy.ts',
    patterns: ['deprecatedSince:', 'removalCycleTarget:', 'deprecationPolicy:'],
    name: 'files compatibility policy metadata contract',
  },
  {
    file: 'app/api/files/read/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/read compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/write/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/write compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/list/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/list compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/create/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/create compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/delete/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/delete compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/copy/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/copy compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/move/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/move compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/files/rename/route.ts',
    patterns: ["status: 'compatibility-wrapper'", '...FILES_COMPAT_METADATA'],
    name: 'files/rename compatibility-wrapper metadata contract',
  },
  {
    file: 'app/api/ai/chat/route.ts',
    patterns: [
      "error: 'NOT_IMPLEMENTED'",
      'status: 501',
      "error: 'PROVIDER_NOT_CONFIGURED'",
      "capability: 'AI_CHAT'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
    ],
    name: 'ai/chat provider-gate contract',
  },
  {
    file: 'app/api/ai/complete/route.ts',
    patterns: [
      "error: 'NOT_IMPLEMENTED'",
      'status: 501',
      "error: 'PROVIDER_NOT_CONFIGURED'",
      "capability: 'AI_COMPLETE'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
      'suggestion',
      'text: suggestion',
    ],
    name: 'ai/complete provider-gate contract',
  },
  {
    file: 'app/api/ai/action/route.ts',
    patterns: [
      "error: 'NOT_IMPLEMENTED'",
      'status: 501',
      "error: 'PROVIDER_NOT_CONFIGURED'",
      "capability: 'AI_ACTION'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
    ],
    name: 'ai/action provider-gate contract',
  },
  {
    file: 'app/api/ai/query/route.ts',
    patterns: [
      "error: 'PROVIDER_NOT_CONFIGURED'",
      'status: 503',
      "capability: 'AI_QUERY'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
    ],
    name: 'ai/query provider-gate contract',
  },
  {
    file: 'app/api/ai/stream/route.ts',
    patterns: [
      "error: 'AI_BACKEND_NOT_CONFIGURED'",
      'status: 503',
      "capability: 'AI_STREAM_BACKEND'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'ai/stream backend-gate contract',
  },
  {
    file: 'app/api/ai/inline-edit/route.ts',
    patterns: [
      "error: 'NOT_IMPLEMENTED'",
      'status: 501',
      "error: 'PROVIDER_NOT_CONFIGURED'",
      "capability: 'AI_INLINE_EDIT'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
    ],
    name: 'ai/inline-edit provider-gate contract',
  },
  {
    file: 'app/api/ai/inline-completion/route.ts',
    patterns: [
      "error: 'PROVIDER_NOT_CONFIGURED'",
      'status: 503',
      "capability: 'AI_INLINE_COMPLETION'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'INVALID_PROVIDER'",
      'suggestion',
      'text: suggestion',
    ],
    name: 'ai/inline-completion provider-gate + payload contract',
  },
  {
    file: 'app/api/render/jobs/[jobId]/cancel/route.ts',
    patterns: [
      'queueBackendUnavailableCapability',
      "capability: 'RENDER_JOB_CANCEL'",
      "milestone: 'P1'",
      "reason: 'queue-runtime-not-wired'",
    ],
    name: 'render/jobs/[jobId]/cancel queue-backend-unavailable contract',
  },
  {
    file: 'app/api/ai/image/generate/route.ts',
    patterns: ["error: 'PROVIDER_NOT_CONFIGURED'", 'status: 503', "capability: 'AI_IMAGE_GENERATION'", "capabilityStatus: 'PARTIAL'"],
    name: 'ai/image/generate provider-gate contract',
  },
  {
    file: 'app/api/ai/voice/generate/route.ts',
    patterns: ["error: 'PROVIDER_NOT_CONFIGURED'", 'status: 503', "capability: 'AI_VOICE_GENERATION'", "capabilityStatus: 'PARTIAL'"],
    name: 'ai/voice/generate provider-gate contract',
  },
  {
    file: 'app/api/ai/music/generate/route.ts',
    patterns: ["error: 'PROVIDER_NOT_CONFIGURED'", 'status: 503', "capability: 'AI_MUSIC_GENERATION'", "capabilityStatus: 'PARTIAL'"],
    name: 'ai/music/generate provider-gate contract',
  },
  {
    file: 'app/api/ai/3d/generate/route.ts',
    patterns: ["error: 'PROVIDER_NOT_CONFIGURED'", 'status: 503', "capability: 'AI_3D_GENERATION'", "capabilityStatus: 'PARTIAL'"],
    name: 'ai/3d/generate provider-gate contract',
  },
  {
    file: 'app/api/ai/change/apply/route.ts',
    patterns: [
      "capability: 'AI_CHANGE_APPLY'",
      "error: 'STALE_CONTEXT'",
      'status: 409',
      "error: 'VALIDATION_BLOCKED'",
      'status: 422',
      'rollback:',
    ],
    name: 'ai/change/apply deterministic contract',
  },
  {
    file: 'app/api/ai/change/rollback/route.ts',
    patterns: [
      "capability: 'AI_CHANGE_ROLLBACK'",
      "error: 'ROLLBACK_TOKEN_INVALID'",
      'status: 404',
      "error: 'ROLLBACK_STALE_CONTEXT'",
      'status: 409',
      'restoredAt',
    ],
    name: 'ai/change/rollback deterministic contract',
  },
  {
    file: 'app/api/studio/session/start/route.ts',
    patterns: [
      "capability: 'STUDIO_HOME_SESSION'",
      "capabilityStatus: 'IMPLEMENTED'",
      'requestedQualityMode',
      'appliedQualityMode',
      'qualityModeDowngraded',
      'allowedQualityModes',
    ],
    name: 'studio/session/start capability contract',
  },
  {
    file: 'app/api/studio/session/[id]/route.ts',
    patterns: [
      "capability: 'STUDIO_HOME_SESSION'",
      "capabilityStatus: 'IMPLEMENTED'",
      'metadata:',
      'budgetAlert',
    ],
    name: 'studio/session/[id] read telemetry contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/run/route.ts',
    patterns: [
      'capabilityResponse({',
      "capability: 'STUDIO_HOME_TASK_RUN'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'TASK_RUN_BLOCKED'",
      "error: 'SESSION_NOT_ACTIVE'",
      "error: 'TASK_RUN_NOT_ALLOWED'",
      "error: 'VARIABLE_USAGE_BLOCKED'",
      "capability: 'STUDIO_HOME_VARIABLE_USAGE'",
      "executionReality: 'orchestration-checkpoint'",
    ],
    name: 'studio/tasks/[id]/run capability contract',
  },
  {
    file: 'app/api/studio/tasks/run-wave/route.ts',
    patterns: [
      'capabilityResponse({',
      "error: 'SESSION_NOT_ACTIVE'",
      "error: 'RUN_WAVE_REQUIRES_PLAN'",
      "error: 'RUN_WAVE_ALREADY_COMPLETE'",
      "error: 'TASK_RUN_BLOCKED'",
      "capability: 'STUDIO_HOME_TASK_RUN_WAVE'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'VARIABLE_USAGE_BLOCKED'",
      "capability: 'STUDIO_HOME_VARIABLE_USAGE'",
      "executionReality: 'orchestration-checkpoint'",
      'strategy:',
      'requestedStrategy',
      'maxStepsApplied',
      'strategyReason',
    ],
    name: 'studio/tasks/run-wave capability contract',
  },
  {
    file: 'app/api/studio/cost/live/route.ts',
    patterns: [
      "capability: 'STUDIO_HOME_COST_LIVE'",
      "capabilityStatus: 'IMPLEMENTED'",
      'budgetAlert',
      'budgetExceeded',
    ],
    name: 'studio/cost/live telemetry contract',
  },
  {
    file: 'app/api/studio/tasks/plan/route.ts',
    patterns: [
      'capabilityResponse({',
      "error: 'PLAN_ALREADY_EXISTS'",
      "error: 'SESSION_NOT_ACTIVE'",
      "capability: 'STUDIO_HOME_SUPER_PLAN'",
      "capabilityStatus: 'PARTIAL'",
      "executionReality: 'orchestration-checkpoint'",
    ],
    name: 'studio/tasks/plan existing-plan gate contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/validate/route.ts',
    patterns: [
      'capabilityResponse({',
      "error: 'SESSION_NOT_ACTIVE'",
      "error: 'REVIEW_GATE_REQUIRED'",
      "error: 'VALIDATION_NOT_READY'",
      "error: 'VALIDATION_ALREADY_PASSED'",
      "error: 'VALIDATION_ALREADY_FAILED'",
      "capability: 'STUDIO_HOME_TASK_VALIDATE'",
      "capabilityStatus: 'PARTIAL'",
      "executionReality: 'orchestration-checkpoint'",
      'totalChecks',
      'failedIds',
    ],
    name: 'studio/tasks/[id]/validate gate contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/apply/route.ts',
    patterns: [
      'capabilityResponse({',
      "error: 'VALIDATION_REQUIRED'",
      "error: 'APPLY_ALREADY_COMPLETED'",
      "error: 'SESSION_NOT_ACTIVE'",
      "capability: 'STUDIO_HOME_TASK_APPLY'",
      "capabilityStatus: 'PARTIAL'",
      "executionReality: 'orchestration-checkpoint'",
      'externalApplyRequired: true',
    ],
    name: 'studio/tasks/[id]/apply gate contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/rollback/route.ts',
    patterns: [
      'capabilityResponse({',
      "error: 'SESSION_NOT_ACTIVE'",
      "error: 'ROLLBACK_NOT_AVAILABLE'",
      "error: 'ROLLBACK_TOKEN_MISMATCH'",
      "capability: 'STUDIO_HOME_TASK_ROLLBACK'",
      "capabilityStatus: 'PARTIAL'",
      "executionReality: 'orchestration-checkpoint'",
    ],
    name: 'studio/tasks/[id]/rollback gate contract',
  },
  {
    file: 'app/api/studio/access/full/route.ts',
    patterns: [
      "error: 'FEATURE_NOT_ALLOWED'",
      "error: 'ACTION_CLASS_BLOCKED'",
      "error: 'ACTION_CLASS_NOT_ALLOWED_FOR_SCOPE'",
      "error: 'MANUAL_CONFIRMATION_REQUIRED'",
      'allowedScopes',
      'manualConfirmActionClasses',
      'blockedActionClasses',
      "capability: 'STUDIO_HOME_FULL_ACCESS'",
      "capabilityStatus: 'PARTIAL'",
    ],
    name: 'studio/access/full plan gate contract',
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
