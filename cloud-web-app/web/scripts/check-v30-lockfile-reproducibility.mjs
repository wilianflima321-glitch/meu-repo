#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const WEB_ROOT = process.cwd()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const failures = []

function readJson(relativePath) {
  const full = path.join(REPO_ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return {}
  }
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''))
}

function gitLsFiles(relativePath) {
  try {
    return execFileSync('git', ['ls-files', '--', relativePath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

function gitCheckIgnore(relativePath) {
  try {
    return execFileSync('git', ['check-ignore', '-v', relativePath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

const expectedLockfiles = [
  'package-lock.json',
  'cloud-web-app/web/package-lock.json',
  'apps/studio-local/package-lock.json',
  'apps/studio-local/src-tauri/Cargo.lock',
]

for (const lockfile of expectedLockfiles) {
  const full = path.join(REPO_ROOT, lockfile)
  if (!fs.existsSync(full)) failures.push(`${lockfile}: expected lockfile is missing`)
  const tracked = gitLsFiles(lockfile)
  if (!tracked) failures.push(`${lockfile}: expected lockfile must be tracked by git`)
  const ignored = gitCheckIgnore(lockfile)
  if (ignored) failures.push(`${lockfile}: must not be ignored (${ignored})`)
}

const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8')
if (/^package-lock\.json$/m.test(gitignore)) {
  failures.push('.gitignore: broad package-lock.json ignore rule breaks npm reproducibility')
}

const rootPackage = readJson('package.json')
const rootLock = readJson('package-lock.json')
const rootDependencies = rootPackage.dependencies ?? {}
const lockDependencies = rootLock.packages?.['']?.dependencies ?? {}

const removedRootDeps = [
  '@theia/filesystem',
  'puppeteer-extra-plugin-stealth',
  'technicalindicators',
  'crypto-js',
  'reflect-metadata',
]

const usedRootDeps = ['ccxt', 'inversify']

for (const dep of removedRootDeps) {
  if (dep in rootDependencies) failures.push(`package.json: remove unused root dependency ${dep}`)
  if (dep in lockDependencies) failures.push(`package-lock.json: root dependency ${dep} is still listed`)
}

const removedLockPathPrefixes = [
  'node_modules/@theia/',
  'node_modules/puppeteer-extra-plugin-stealth',
  'node_modules/technicalindicators',
  'node_modules/crypto-js',
]

for (const lockPath of Object.keys(rootLock.packages ?? {})) {
  if (removedLockPathPrefixes.some((prefix) => lockPath === prefix.slice(0, -1) || lockPath.startsWith(`${prefix}/`) || lockPath.startsWith(prefix))) {
    failures.push(`package-lock.json: removed dependency ghost remains at ${lockPath}`)
  }
}

for (const dep of usedRootDeps) {
  if (!(dep in rootDependencies)) failures.push(`package.json: ${dep} is still used by root source and must not be removed blindly`)
  if (!(dep in lockDependencies)) failures.push(`package-lock.json: ${dep} must remain listed while root source imports it`)
}

const webPackage = readJson('cloud-web-app/web/package.json')
const webLock = readJson('cloud-web-app/web/package-lock.json')
if (webPackage.name !== webLock.packages?.['']?.name) {
  failures.push('cloud-web-app/web/package-lock.json: root package name must match package.json')
}

const studioPackage = readJson('apps/studio-local/package.json')
const studioLock = readJson('apps/studio-local/package-lock.json')
if (studioPackage.name !== studioLock.packages?.['']?.name) {
  failures.push('apps/studio-local/package-lock.json: root package name must match package.json')
}

const reportDir = path.join(WEB_ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_LOCKFILE_REPRODUCIBILITY.md'),
  [
    '# V30 Lockfile Reproducibility',
    '',
    `Expected lockfiles: ${expectedLockfiles.join(', ')}`,
    `Removed root deps: ${removedRootDeps.join(', ')}`,
    `Preserved used root deps: ${usedRootDeps.join(', ')}`,
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-lockfile-reproducibility] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v30-lockfile-reproducibility] PASS lockfiles=${expectedLockfiles.length} removedRootDeps=${removedRootDeps.length}`)
