#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const envLocalPath = path.join(webRoot, '.env.local')

function hasRealSecret(value, knownFallbacks = []) {
  if (!value) return false
  return !knownFallbacks.includes(value)
}

function checkDockerDaemon() {
  const result = spawnSync('docker', ['info'], { stdio: 'ignore', shell: true })
  return result.status === 0
}

const readiness = {
  envLocalPresent: fs.existsSync(envLocalPath),
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  jwtConfigured: hasRealSecret(process.env.JWT_SECRET, [
    'your-secret-key-change-in-production',
    'aethel-secret-key',
    'aethel-super-secret-key-change-in-production',
  ]),
  csrfConfigured: hasRealSecret(process.env.CSRF_SECRET || process.env.JWT_SECRET, [
    'fallback-secret-change-me',
    'your-secret-key-change-in-production',
    'aethel-secret-key',
    'aethel-super-secret-key-change-in-production',
  ]),
  dockerCliPresent: spawnSync('docker', ['--version'], { stdio: 'ignore', shell: true }).status === 0,
  dockerDaemonReady: false,
}

if (readiness.dockerCliPresent) {
  readiness.dockerDaemonReady = checkDockerDaemon()
}

const blockers = []
if (!readiness.envLocalPresent) blockers.push('ENV_LOCAL_MISSING')
if (!readiness.databaseConfigured) blockers.push('DATABASE_URL_MISSING')
if (!readiness.jwtConfigured) blockers.push('JWT_SECRET_MISSING')
if (!readiness.csrfConfigured) blockers.push('CSRF_SECRET_MISSING')
if (!readiness.dockerCliPresent) blockers.push('DOCKER_CLI_MISSING')
else if (!readiness.dockerDaemonReady) blockers.push('DOCKER_DAEMON_NOT_RUNNING')

const summary = {
  ...readiness,
  probeReady: readiness.envLocalPresent && readiness.databaseConfigured && readiness.jwtConfigured,
  sandboxReady:
    readiness.envLocalPresent &&
    readiness.databaseConfigured &&
    readiness.jwtConfigured &&
    readiness.dockerCliPresent &&
    readiness.dockerDaemonReady,
  blockers,
}

console.log(JSON.stringify(summary, null, 2))
process.exit(blockers.length === 0 ? 0 : 1)
