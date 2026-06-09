#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scripts = [
  'check-v29-total-spine.mjs',
  'check-v30-internal-contracts.mjs',
  'check-v30-lockfile-reproducibility.mjs',
  'check-v30-no-new-fragmentation.mjs',
  'check-v30-heavy-runtime-boundaries.mjs',
  'codemod-three-imports.mjs',
  'check-v30-story-coverage-ratchet.mjs',
  'check-v30-quality-scorecard.mjs',
]

const scriptsDir = dirname(fileURLToPath(import.meta.url))

for (const script of scripts) {
  const args =
    script === 'codemod-three-imports.mjs'
      ? [join(scriptsDir, script), '--verify', '--max=126']
      : [join(scriptsDir, script)]
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`[v30-total-spine] PASS gates=${scripts.length}`)
