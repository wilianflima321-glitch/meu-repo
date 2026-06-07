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
  'check-v29-desktop-bridge-commands.mjs',
  'check-v29-creative-toolchain-contract.mjs',
  'check-v29-prisma-model-coverage.mjs',
  'check-v29-forensic-runtime-backlog.mjs',
  'check-v29-sequencer-kernel.mjs',
  'check-v29-mcp-host-contract.mjs',
  'check-v29-agent-runtime-tools.mjs',
  'check-v29-studio-local-native-kernel.mjs',
  'check-v29-cloud-render-export.mjs',
  'check-v29-webgpu-render-kernel.mjs',
  'check-v29-asset-library-quality.mjs',
  'check-v29-physics-ai-ondevice-photogrammetry.mjs',
  'check-v29-i18n-single-source.mjs',
  'check-v29-runtime-resilience-budgets.mjs',
  'check-v29-runtime-resilience-ledger.mjs',
  'check-v29-runtime-failure-smoke-pack.mjs',
  'check-v29-runtime-failure-smoke-api.mjs',
  'check-v29-runtime-failure-smoke-fixtures.mjs',
  'check-v29-runtime-failure-smoke-state.mjs',
  'check-v29-runtime-failure-smoke-harness.mjs',
  'check-v29-runtime-failure-smoke-runner.mjs',
  'check-v29-runtime-failure-smoke-local-runner.mjs',
  'check-v29-runtime-failure-smoke-runner-report.mjs',
  'check-v29-runtime-failure-smoke-browser-runner-state.mjs',
  'check-v29-bootstrap-reproducibility.mjs',
  'check-v29-sidecar-lifecycle.mjs',
  'check-v29-sidecar-install-manifest.mjs',
  'check-v29-sidecar-evidence-package-integration.mjs',
]

const scriptsDir = dirname(fileURLToPath(import.meta.url))

for (const script of scripts) {
  const result = spawnSync(process.execPath, [join(scriptsDir, script)], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[v29-total-spine] PASS gates=33')
