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

function checkLooseWebRootMarkdown() {
  const webRoot = resolvePath('cloud-web-app/web')
  if (!fs.existsSync(webRoot)) return

  const allowed = new Set(['README.md'])
  const loose = fs
    .readdirSync(webRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .filter((name) => !allowed.has(name))

  if (loose.length > 0) {
    failures.push(`loose markdown files in cloud-web-app/web root: ${loose.join(', ')}`)
  }
}

function checkTrackedSecretLikeFiles() {
  const trackedSecretPatterns = [
    '.gh_token',
    '**/.gh_token',
    '**/.env.local',
    '**/.env.production',
  ]

  for (const pattern of trackedSecretPatterns) {
    try {
      const output = execSync(`git ls-files "${pattern}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      const files = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      if (files.length > 0) {
        failures.push(`tracked secret-like files detected for pattern "${pattern}" (${files.length})`)
      }
    } catch {
      // ignore git wildcard errors for unmatched patterns
    }
  }
}

function checkCanonicalDocsPresence() {
  const requiredDocs = [
    'docs/master/00_INDEX.md',
    'docs/master/00_FONTE_CANONICA.md',
    'docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md',
    'docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md',
    'docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md',
    'docs/master/15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md',
    'docs/master/16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md',
    'docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md',
    'docs/master/18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md',
    'docs/master/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md',
    'docs/master/20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md',
    'docs/master/22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md',
    'docs/master/23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md',
    'docs/master/24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md',
    'docs/master/25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md',
    'docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md',
  ]

  for (const docPath of requiredDocs) {
    if (!exists(docPath)) {
      failures.push(`required canonical doc missing: "${docPath}"`)
    }
  }
}

checkPackageScriptPaths()
checkTsconfigReferences()
checkGitmodulesPaths()
checkJunkFiles()
checkTrackedVenvArtifacts()
checkLooseWebRootMarkdown()
checkTrackedSecretLikeFiles()
checkCanonicalDocsPresence()

if (failures.length > 0) {
  console.error('[repo-connectivity] FAIL')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('[repo-connectivity] PASS')
