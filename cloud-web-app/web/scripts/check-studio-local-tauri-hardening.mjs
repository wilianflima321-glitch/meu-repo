#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function readJson(relativePath) {
  const abs = path.join(REPO_ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'))
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : 'parse failed'})`)
    return null
  }
}

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function requireCspToken(csp, directive, token, label) {
  const value = csp?.[directive]
  if (typeof value !== 'string' || !value.includes(token)) {
    failures.push(`tauri.conf.json: ${directive} missing ${label}`)
  }
}

function forbidCspToken(csp, directive, token, label) {
  const value = csp?.[directive]
  if (typeof value === 'string' && value.includes(token)) {
    failures.push(`tauri.conf.json: ${directive} must not include ${label}`)
  }
}

function requireToken(file, token, reason = token) {
  const content = sources[file] ?? ''
  if (!content.includes(token)) failures.push(`${file}: missing ${reason}`)
}

const tauri = readJson('apps/studio-local/src-tauri/tauri.conf.json')
const security = tauri?.app?.security
const csp = security?.csp
const devCsp = security?.devCsp
const tauriRaw = fs.existsSync(path.join(REPO_ROOT, 'apps/studio-local/src-tauri/tauri.conf.json'))
  ? fs.readFileSync(path.join(REPO_ROOT, 'apps/studio-local/src-tauri/tauri.conf.json'), 'utf8')
  : ''

const sources = {
  'lib/studio-local/release-signing-readiness.ts': read('lib/studio-local/release-signing-readiness.ts'),
  'lib/studio-local/release-manifest.ts': read('lib/studio-local/release-manifest.ts'),
  'package.json': read('package.json'),
}

if (tauriRaw.includes('"csp": null')) {
  failures.push('tauri.conf.json: production CSP must not be null')
}

if (!csp || typeof csp !== 'object') {
  failures.push('tauri.conf.json: production CSP object is required')
}
if (!devCsp || typeof devCsp !== 'object') {
  failures.push('tauri.conf.json: devCSP object is required for localhost-only dev allowances')
}

requireCspToken(csp, 'default-src', "'self'", 'self default source')
requireCspToken(csp, 'connect-src', 'ipc:', 'Tauri IPC connect source')
requireCspToken(csp, 'connect-src', 'https://aethel.dev', 'owned production origin')
requireCspToken(csp, 'script-src', "'wasm-unsafe-eval'", 'WASM allowance for native/runtime preview')
requireCspToken(csp, 'worker-src', 'blob:', 'worker blob support')
forbidCspToken(csp, 'script-src', "'unsafe-eval'", 'production unsafe-eval')
forbidCspToken(csp, 'script-src', 'https:', 'remote production scripts')
forbidCspToken(csp, 'default-src', '*', 'wildcard default source')

requireCspToken(devCsp, 'connect-src', 'http://localhost:3000', 'Next.js dev server')
requireCspToken(devCsp, 'connect-src', 'ws://localhost:3000', 'Next.js dev websocket')
requireCspToken(devCsp, 'script-src', "'unsafe-eval'", 'dev-only eval for Next.js tooling')

if (tauri?.bundle?.windows?.signCommand && !tauri?.bundle?.windows?.signCommand.includes('%1')) {
  failures.push('tauri.conf.json: Windows signCommand must include the artifact placeholder %1')
}

if (tauri?.bundle?.createUpdaterArtifacts === true) {
  requireToken('lib/studio-local/release-signing-readiness.ts', 'publicKeyConfigured', 'updater public key evidence guard')
  requireToken('lib/studio-local/release-signing-readiness.ts', 'rollbackChannelDocumented', 'updater rollback evidence guard')
}

requireToken('lib/studio-local/release-signing-readiness.ts', 'Windows Azure Artifact Signing or EV/OV signing evidence', 'Windows signing evidence')
requireToken('lib/studio-local/release-signing-readiness.ts', 'macOS notarization and staple evidence', 'macOS notarization evidence')
requireToken('lib/studio-local/release-signing-readiness.ts', 'Tauri updater artifacts, public key, HTTPS endpoint, and rollback channel', 'updater evidence')
requireToken('lib/studio-local/release-manifest.ts', "signedInstallers: 'held'", 'signed installer truth state')
requireToken('package.json', 'qa:studio-local-tauri-hardening', 'package QA script')
requireToken('package.json', 'qa:studio-local-ci && npm run qa:studio-local-tauri-hardening && npm run qa:webgpu-compute-readiness', 'enterprise gate ordering')

if (failures.length > 0) {
  console.error(`[studio-local-tauri-hardening] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-tauri-hardening] PASS csp=restricted devCsp=localhost signing=held updater=guarded')
