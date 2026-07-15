#!/usr/bin/env node
/**
 * Block 9 / Law #48 — AgentShellPolicy CI gate.
 * Ensures agents cannot be wired to host PTY without the fail-closed policy module.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return exists(relativePath) ? fs.readFileSync(path.join(ROOT, relativePath), 'utf8') : ''
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) {
    failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
  }
}

requireFile(
  'lib/production/agent-shell-policy.ts',
  'AgentShellPolicy module is required (Law #48)',
)
requirePattern(
  'lib/production/agent-shell-policy.ts',
  /evaluateAgentShellPolicy/,
  'evaluateAgentShellPolicy must exist',
)
requirePattern(
  'lib/production/agent-shell-policy.ts',
  /law:\s*48/,
  'Law #48 must be cited on decisions',
)
requirePattern(
  'lib/production/agent-shell-policy.ts',
  /never spawn host OS PTY|must never spawn host OS PTY/,
  'host PTY ban copy must be explicit',
)
requirePattern(
  'lib/production/agent-shell-policy.ts',
  /detectAgentShellCaller/,
  'caller detection for API routes required',
)

requirePattern(
  'lib/ai/tools-registry.ts',
  /evaluateAgentShellPolicy|assertAgentMayNotHostPty/,
  'tools-registry run_command must gate via AgentShellPolicy',
)
requirePattern(
  'app/api/terminal/execute/route.ts',
  /detectAgentShellCaller|evaluateAgentShellPolicy/,
  'terminal execute must fail-closed for agent callers',
)

requireFile(
  '__tests__/production/block9-desktop-core.test.ts',
  'Block 9 production tests required',
)
requirePattern(
  '__tests__/production/block9-desktop-core.test.ts',
  /AgentShellPolicy|evaluateAgentShellPolicy/,
  'tests must cover AgentShellPolicy',
)

requirePattern('package.json', /qa:agent-shell-policy/, 'package.json must expose qa:agent-shell-policy')

requireFile(
  '../../runtime-templates/QUARANTINED.md',
  'Electron runtime-templates must be quarantined from ship claims',
)
requirePattern(
  '../../apps/studio-local/src/desktop-capability-manifest.ts',
  /quarantined-not-ship-path|QUARANTINED/,
  'desktop manifest must not ship Electron templates',
)

if (failures.length) {
  console.error('[agent-shell-policy] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-shell-policy] PASS Law #48 gate + Electron quarantine markers')
