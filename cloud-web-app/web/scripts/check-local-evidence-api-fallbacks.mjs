#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const AUDIT_DIR = path.join(ROOT, '.next', 'aethel-audits')
const AUDIT_PATH = path.join(AUDIT_DIR, 'LOCAL_EVIDENCE_API_FALLBACKS_AUDIT.md')

const requiredFiles = [
  {
    file: 'lib/server/local-evidence-fallback.ts',
    tokens: [
      'isLocalEvidenceRequest',
      'isRecoverableLocalEvidenceError',
      'shouldUseLocalEvidenceFallback',
      'x-aethel-local-evidence-fallback',
    ],
  },
  {
    file: 'app/api/wallet/summary/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'wallet.summary', 'transactions: []'],
  },
  {
    file: 'app/api/usage/status/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'usage.status', 'percentUsed: 0'],
  },
  {
    file: 'app/api/connectivity/status/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'connectivity.status', 'overall_status'],
  },
  {
    file: 'app/api/studio/cost/live/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'studio.cost.live', 'LOCAL_EVIDENCE_BILLING_BACKEND_UNAVAILABLE'],
  },
  {
    file: 'app/api/studio/access/full/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'studio.access.full', 'grants: []'],
  },
  {
    file: 'app/api/auth/profile/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'auth.profile', 'Aethel Visual QA'],
  },
  {
    file: 'app/api/runtime/local-capabilities/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'runtime.local-capabilities', 'snapshot: null'],
  },
  {
    file: 'app/api/deploy/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'deploy.readiness', 'canDeploy: false'],
  },
  {
    file: 'app/api/files/fs/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'FILESYSTEM_RUNTIME_HELD', 'entries: []'],
  },
  {
    file: 'app/api/admin/users/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'admin.users', 'realEmailsExcluded'],
  },
  {
    file: 'app/api/billing/readiness/route.ts',
    tokens: ["status: 'held'", "status: 200", 'x-aethel-capability-status'],
  },
  {
    file: 'app/api/billing/subscription/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'billing.subscription', 'subscription: null'],
  },
  {
    file: 'app/api/research/navigation-mesh/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'research.navigation-mesh', 'LOCAL_EVIDENCE_RESEARCH_BACKEND_UNAVAILABLE'],
  },
  {
    file: 'app/api/projects/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'localEvidenceHeaders', 'PROJECT_CREATE_HELD'],
  },
  {
    file: 'app/api/preview/runtime-readiness/route.ts',
    tokens: ["status: 'held'", "status: 200", 'x-aethel-capability-status'],
  },
  {
    file: 'app/api/ai/provider-status/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'ai.provider-status', "status: 'held'"],
  },
  {
    file: 'app/api/copilot/workflows/route.ts',
    tokens: ['shouldUseLocalEvidenceFallback', 'copilot.workflows', 'workflows: []'],
  },
  {
    file: 'components/viewport/ViewportSceneCanvas.tsx',
    tokens: ['ALLOW_EXTERNAL_HDRI', 'NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI', 'Environment preset'],
  },
]

const failures = []
const rows = []

for (const entry of requiredFiles) {
  const absolute = path.join(ROOT, entry.file)
  if (!fs.existsSync(absolute)) {
    failures.push(`missing ${entry.file}`)
    rows.push(`| ${entry.file} | missing | - |`)
    continue
  }

  const content = fs.readFileSync(absolute, 'utf8')
  const missing = entry.tokens.filter((token) => !content.includes(token))
  if (missing.length > 0) {
    failures.push(`${entry.file}: missing ${missing.join(', ')}`)
  }
  rows.push(`| ${entry.file} | ${missing.length === 0 ? 'pass' : 'fail'} | ${missing.join(', ') || '-'} |`)
}

fs.mkdirSync(AUDIT_DIR, { recursive: true })
fs.writeFileSync(
  AUDIT_PATH,
  [
    '# Local Evidence API Fallbacks Audit',
    '',
    'This gate ensures authenticated visual QA can review product surfaces locally without turning missing databases, billing providers, or Studio Local ledgers into fake success.',
    '',
    '| File | Status | Missing |',
    '| --- | --- | --- |',
    ...rows,
    '',
    `Result: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
  ].join('\n'),
)

if (failures.length > 0) {
  console.error(`[local-evidence-api-fallbacks] FAIL ${failures.join(' | ')}`)
  process.exit(1)
}

console.log(`[local-evidence-api-fallbacks] PASS report=${path.relative(ROOT, AUDIT_PATH)}`)
