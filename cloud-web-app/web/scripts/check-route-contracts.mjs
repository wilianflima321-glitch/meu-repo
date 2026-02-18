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
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501'],
    name: 'ai/chat provider-gate contract',
  },
  {
    file: 'app/api/ai/complete/route.ts',
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501', 'suggestion', 'text: suggestion'],
    name: 'ai/complete provider-gate contract',
  },
  {
    file: 'app/api/ai/action/route.ts',
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501'],
    name: 'ai/action provider-gate contract',
  },
  {
    file: 'app/api/ai/inline-edit/route.ts',
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501'],
    name: 'ai/inline-edit provider-gate contract',
  },
  {
    file: 'app/api/ai/inline-completion/route.ts',
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501', 'suggestion', 'text: suggestion'],
    name: 'ai/inline-completion provider-gate + payload contract',
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
    patterns: ["capability: 'STUDIO_HOME_SESSION'", "capabilityStatus: 'IMPLEMENTED'"],
    name: 'studio/session/start capability contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/run/route.ts',
    patterns: [
      "capability: 'STUDIO_HOME_TASK_RUN'",
      "capabilityStatus: 'PARTIAL'",
      "error: 'TASK_RUN_BLOCKED'",
      "error: 'SESSION_NOT_ACTIVE'",
    ],
    name: 'studio/tasks/[id]/run capability contract',
  },
  {
    file: 'app/api/studio/tasks/plan/route.ts',
    patterns: ["error: 'PLAN_ALREADY_EXISTS'", "capability: 'STUDIO_HOME_SUPER_PLAN'", "capabilityStatus: 'PARTIAL'"],
    name: 'studio/tasks/plan existing-plan gate contract',
  },
  {
    file: 'app/api/studio/tasks/[id]/apply/route.ts',
    patterns: ["error: 'VALIDATION_REQUIRED'", "capability: 'STUDIO_HOME_TASK_APPLY'", "capabilityStatus: 'PARTIAL'"],
    name: 'studio/tasks/[id]/apply gate contract',
  },
  {
    file: 'app/api/studio/access/full/route.ts',
    patterns: ["error: 'FEATURE_NOT_ALLOWED'", "capability: 'STUDIO_HOME_FULL_ACCESS'", "capabilityStatus: 'PARTIAL'"],
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
