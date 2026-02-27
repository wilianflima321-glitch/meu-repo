#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const failures = []

function resolvePath(p) {
  return path.resolve(ROOT, p)
}

function exists(p) {
  return fs.existsSync(resolvePath(p))
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(resolvePath(file), 'utf8'))
}

function checkPackageScriptPaths() {
  const pkg = readJson('package.json')
  const scripts = pkg.scripts || {}
  const pathRegex = /(?:cd|--prefix)\s+([^\s"']+)/g

  for (const [name, command] of Object.entries(scripts)) {
    const matches = command.matchAll(pathRegex)
    for (const match of matches) {
      const scriptPath = match[1]
      if (!exists(scriptPath)) {
        failures.push(`script "${name}" references missing path "${scriptPath}"`)
      }
    }
  }
}

function checkTsconfigReferences() {
  const tsconfigPath = 'tsconfig.json'
  if (!exists(tsconfigPath)) return

  const tsconfig = readJson(tsconfigPath)
  const refs = tsconfig.references || []
  for (const ref of refs) {
    if (!ref?.path) continue
    if (!exists(ref.path)) {
      failures.push(`tsconfig reference missing: "${ref.path}"`)
    }
  }
}

function checkGitmodulesPaths() {
  const gitmodulesPath = '.gitmodules'
  if (!exists(gitmodulesPath)) return

  const content = fs.readFileSync(resolvePath(gitmodulesPath), 'utf8')
  const pathLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('path = '))
    .map((line) => line.replace('path = ', '').trim())

  for (const modulePath of pathLines) {
    if (!exists(modulePath)) {
      failures.push(`.gitmodules path missing on disk: "${modulePath}"`)
    }
  }
}

function checkJunkFiles() {
  const junk = [
    'package-lock.json.broken',
    'ci.yml',
    'ci-playwright.yml',
    'eslint.config.cjs.disabled.bak',
    'infra-playwright-ci.patch',
    'infra-playwright-ci-ensemble.patch',
    'infra-playwright-ci-ensemble.ci.patch',
    'infra-playwright-ci.bundle',
    'infra-playwright-ci-changes.zip',
    'infra-playwright-ci-ensemble.zip',
  ]

  for (const file of junk) {
    if (exists(file)) {
      failures.push(`legacy artifact still present: "${file}"`)
    }
  }
}

function checkTrackedVenvArtifacts() {
  try {
    const output = execSync('git ls-files "cloud-web-app/web/.venv/**"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const files = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (files.length > 0) {
      failures.push(`tracked .venv artifacts detected (${files.length})`)
    }
  } catch {
    // if git command fails, do not block; other checks already cover file presence
  }
}

checkPackageScriptPaths()
checkTsconfigReferences()
checkGitmodulesPaths()
checkJunkFiles()
checkTrackedVenvArtifacts()

if (failures.length > 0) {
  console.error('[repo-connectivity] FAIL')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('[repo-connectivity] PASS')
