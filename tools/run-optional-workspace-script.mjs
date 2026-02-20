#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function parseArgs(argv) {
  const args = { workspace: '', script: '', label: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]
    if (current === '--workspace' && next) {
      args.workspace = next
      index += 1
      continue
    }
    if (current === '--script' && next) {
      args.script = next
      index += 1
      continue
    }
    if (current === '--label' && next) {
      args.label = next
      index += 1
    }
  }
  return args
}

const { workspace, script, label } = parseArgs(process.argv.slice(2))
if (!workspace || !script) {
  console.error('Usage: node tools/run-optional-workspace-script.mjs --workspace <dir> --script <name> [--label <text>]')
  process.exit(1)
}

const repoRoot = process.cwd()
const workspacePath = path.resolve(repoRoot, workspace)
const packageJsonPath = path.join(workspacePath, 'package.json')
const targetLabel = label || `${workspace}:${script}`

if (!fs.existsSync(packageJsonPath)) {
  console.warn(`[optional-workspace] skip ${targetLabel}: missing ${workspace}/package.json`)
  process.exit(0)
}

const result = spawnSync('npm', ['--prefix', workspace, 'run', script], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (typeof result.status === 'number') {
  process.exit(result.status)
}

process.exit(1)
