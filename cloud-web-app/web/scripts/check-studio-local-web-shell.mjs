#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const WEB_ROOT = process.cwd()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const failures = []

function full(relativePath) {
  return path.join(REPO_ROOT, relativePath)
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath))
}

function read(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full(relativePath), 'utf8')
}

function readJson(relativePath) {
  const content = read(relativePath)
  if (!content) return {}
  try {
    return JSON.parse(content)
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error.message})`)
    return {}
  }
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (content && !content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function forbidFile(relativePath, reason) {
  if (exists(relativePath)) failures.push(`${relativePath}: forbidden (${reason})`)
}

const packageJson = readJson('apps/studio-local/package.json')
for (const script of ['vite:dev', 'vite:build', 'typecheck', 'dev', 'build', 'test']) {
  if (!packageJson.scripts?.[script]) failures.push(`apps/studio-local/package.json: missing script ${script}`)
}
for (const dep of ['@tauri-apps/api', 'react', 'react-dom']) {
  if (!packageJson.dependencies?.[dep]) failures.push(`apps/studio-local/package.json: missing dependency ${dep}`)
}
for (const dep of ['vite', 'typescript', '@vitejs/plugin-react']) {
  if (!packageJson.devDependencies?.[dep]) failures.push(`apps/studio-local/package.json: missing devDependency ${dep}`)
}

for (const file of [
  'apps/studio-local/index.html',
  'apps/studio-local/src/main.tsx',
  'apps/studio-local/src/StudioLocalApp.tsx',
  'apps/studio-local/src/panels/CapabilityProbe.tsx',
  'apps/studio-local/src/panels/SidecarManager.tsx',
  'apps/studio-local/src/panels/JobsLane.tsx',
  'apps/studio-local/src/panels/CloudHandoffBridge.tsx',
  'apps/studio-local/src/panels/LocalRuntimeStatus.tsx',
  'apps/studio-local/src/styles.css',
  'apps/studio-local/vite.config.ts',
  'apps/studio-local/tsconfig.json',
]) {
  read(file)
}
forbidFile('apps/studio-local/src/index.html', 'static fallback shell was replaced by the governed Vite/React app')

requireToken('apps/studio-local/index.html', '/src/main.tsx', 'Vite root script')
requireToken('apps/studio-local/src/StudioLocalApp.tsx', 'createDesktopAdapter', 'desktop bridge adapter')
requireToken('apps/studio-local/src/StudioLocalApp.tsx', 'CapabilityProbe', 'capability panel')
requireToken('apps/studio-local/src/StudioLocalApp.tsx', 'JobsLane', 'job lane panel')
requireToken('apps/studio-local/src/StudioLocalApp.tsx', 'SidecarManager', 'sidecar panel')
requireToken('apps/studio-local/src/StudioLocalApp.tsx', 'CloudHandoffBridge', 'cloud handoff panel')
requireToken('apps/studio-local/src/panels/JobsLane.tsx', 'catch (err)', 'job routing failure receipt')
requireToken('apps/studio-local/src/panels/JobsLane.tsx', "state: 'blocked'", 'blocked receipt on bridge failure')
requireToken('apps/studio-local/src/desktop-capability-manifest.ts', "shell: 'index.html'", 'desktop manifest shell path')
requireToken('apps/studio-local/src-tauri/tauri.conf.json', 'http://127.0.0.1:1420', 'local Vite dev URL')
requireToken('apps/studio-local/src-tauri/tauri.conf.json', '"frontendDist": "../dist"', 'Vite dist output')
requireToken('apps/studio-local/src-tauri/tauri.conf.json', 'npm run vite:build', 'Tauri build precommand')

const app = read('apps/studio-local/src/StudioLocalApp.tsx')
for (const forbidden of ['desktop ready', 'native renderer ready', 'signed installer', 'Unreal-grade']) {
  if (app.includes(forbidden)) failures.push(`apps/studio-local/src/StudioLocalApp.tsx: forbidden claim "${forbidden}"`)
}

if (failures.length) {
  console.error('[studio-local-web-shell] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-web-shell] PASS shell=vite-react bridge=governed claims=held')
