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
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501'],
    name: 'ai/chat provider-gate contract',
  },
  {
    file: 'app/api/ai/complete/route.ts',
    patterns: ["error: 'NOT_IMPLEMENTED'", 'status: 501'],
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
