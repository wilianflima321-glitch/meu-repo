#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scripts = [
  'check-v29-baseline-inventory.mjs',
  'check-v29-subsystem-ownership.mjs',
  'check-v29-workbench-convergence.mjs',
  'check-v29-route-surface-convergence.mjs',
  'check-v29-desktop-capability-manifest.mjs',
  'check-v29-creative-toolchain-contract.mjs',
  'check-v29-prisma-model-coverage.mjs',
]

const scriptsDir = dirname(fileURLToPath(import.meta.url))

for (const script of scripts) {
  const result = spawnSync(process.execPath, [join(scriptsDir, script)], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[v29-total-spine] PASS gates=7')
