#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', '.venv', 'dist', 'build'])

function parseArgs(argv) {
  const args = { task: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    const next = argv[i + 1]
    if (current === '--task' && next) {
      args.task = next
      i += 1
    }
  }
  return args
}

function findAiIdePackageDir(repoRoot) {
  const stack = [repoRoot]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (SKIP_DIRS.has(entry.name)) continue

      const absolute = path.join(current, entry.name)
      const parent = path.basename(current)
      if (entry.name === 'ai-ide' && parent === 'packages') {
        const tsconfig = path.join(absolute, 'tsconfig.json')
        if (fs.existsSync(tsconfig)) {
          return absolute
        }
      }

      stack.push(absolute)
    }
  }

  return null
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (typeof result.status === 'number') {
    return result.status
  }
  return 1
}

function main() {
  const { task } = parseArgs(process.argv.slice(2))
  if (!task) {
    console.error('Usage: node tools/run-optional-ai-ide-task.mjs --task <check-ts|build|test>')
    process.exit(1)
  }

  const repoRoot = process.cwd()
  const aiIdeDir = findAiIdePackageDir(repoRoot)
  if (!aiIdeDir) {
    console.warn(`[optional-ai-ide] skip ${task}: packages/ai-ide workspace not present`)
    process.exit(0)
  }

  const tsconfigPath = path.join(aiIdeDir, 'tsconfig.json')
  const testRunnerPath = path.join(aiIdeDir, 'test', 'run-mocha.js')
  const relTsconfig = path.relative(repoRoot, tsconfigPath).replace(/\\/g, '/')
  const relTestRunner = path.relative(repoRoot, testRunnerPath).replace(/\\/g, '/')

  if (task === 'check-ts') {
    if (!fs.existsSync(tsconfigPath)) {
      console.warn('[optional-ai-ide] skip check-ts: missing ai-ide tsconfig')
      process.exit(0)
    }
    const status = runCommand('npx', ['-y', '-p', 'typescript', 'tsc', '--noEmit', '-p', relTsconfig], {
      cwd: repoRoot,
    })
    process.exit(status)
  }

  if (task === 'build') {
    if (!fs.existsSync(tsconfigPath)) {
      console.warn('[optional-ai-ide] skip build: missing ai-ide tsconfig')
      process.exit(0)
    }
    const status = runCommand('npx', ['-y', '-p', 'typescript', 'tsc', '-p', relTsconfig], {
      cwd: repoRoot,
    })
    process.exit(status)
  }

  if (task === 'test') {
    if (!fs.existsSync(testRunnerPath)) {
      console.warn('[optional-ai-ide] skip test: missing ai-ide test runner')
      process.exit(0)
    }
    const buildStatus = runCommand('node', ['tools/run-optional-ai-ide-task.mjs', '--task', 'build'], {
      cwd: repoRoot,
    })
    if (buildStatus !== 0) {
      process.exit(buildStatus)
    }
    const status = runCommand('node', [relTestRunner], { cwd: repoRoot })
    process.exit(status)
  }

  console.error(`[optional-ai-ide] unknown task: ${task}`)
  process.exit(1)
}

main()
