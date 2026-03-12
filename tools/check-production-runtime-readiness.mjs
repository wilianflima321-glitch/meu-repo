#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import net from 'node:net'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const envLocalPath = path.join(webRoot, '.env.local')
const baseUrl = String(process.env.AETHEL_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

if (fs.existsSync(envLocalPath)) {
  const envLocalContent = fs.readFileSync(envLocalPath, 'utf8')
  for (const rawLine of envLocalContent.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function hasRealSecret(value, knownFallbacks = []) {
  if (!value) return false
  return !knownFallbacks.includes(value)
}

async function canReachDatabaseTarget(databaseUrl) {
  if (!databaseUrl) return { reachable: false, target: null }
  try {
    const parsed = new URL(databaseUrl)
    const host = parsed.hostname
    const port = Number.parseInt(parsed.port || '5432', 10)
    const target = `${host}:${port}`
    const reachable = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port })
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        socket.destroy()
        resolve(value)
      }
      socket.setTimeout(1500)
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
      socket.once('timeout', () => finish(false))
    })
    return { reachable, target }
  } catch {
    return { reachable: false, target: null }
  }
}

async function checkHttpEndpoint(url) {
  try {
    const response = await fetch(url, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

function checkDockerDaemon() {
  const result = spawnSync('docker', ['info'], { stdio: 'ignore', shell: true })
  return result.status === 0
}

function isLocalDatabaseHost(databaseUrl) {
  if (!databaseUrl) return false
  try {
    const host = new URL(databaseUrl).hostname.toLowerCase()
    if (!host) return false
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
    if (host.endsWith('.local')) return true
    return false
  } catch {
    return false
  }
}

const databaseProbe = await canReachDatabaseTarget(process.env.DATABASE_URL)
const appRuntimeReachable = await checkHttpEndpoint(`${baseUrl}/api/health/live`)

const readiness = {
  envLocalPresent: fs.existsSync(envLocalPath),
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  databaseReachable: databaseProbe.reachable,
  databaseTarget: databaseProbe.target,
  appRuntimeReachable,
  appBaseUrl: baseUrl,
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
  dockerRequired: isLocalDatabaseHost(process.env.DATABASE_URL),
}

if (readiness.dockerCliPresent) {
  readiness.dockerDaemonReady = checkDockerDaemon()
}

const blockers = []
if (!readiness.envLocalPresent) blockers.push('ENV_LOCAL_MISSING')
if (!readiness.databaseConfigured) blockers.push('DATABASE_URL_MISSING')
else if (!readiness.databaseReachable) blockers.push('DATABASE_UNREACHABLE')
if (!readiness.appRuntimeReachable) blockers.push('APP_RUNTIME_UNREACHABLE')
if (!readiness.jwtConfigured) blockers.push('JWT_SECRET_MISSING')
if (!readiness.csrfConfigured) blockers.push('CSRF_SECRET_MISSING')
if (readiness.dockerRequired) {
  if (!readiness.dockerCliPresent) blockers.push('DOCKER_CLI_MISSING')
  else if (!readiness.dockerDaemonReady) blockers.push('DOCKER_DAEMON_NOT_RUNNING')
}

const instructions = []
const recommendedCommands = []

if (!readiness.envLocalPresent || !readiness.jwtConfigured || !readiness.csrfConfigured || !readiness.databaseConfigured) {
  instructions.push('Bootstrap the local runtime env before running the production probe.')
  recommendedCommands.push('npm run setup:local-runtime')
}

if (readiness.dockerRequired) {
  if (!readiness.dockerCliPresent) {
    instructions.push('Install Docker Desktop or expose the docker CLI in PATH.')
  } else if (!readiness.dockerDaemonReady) {
    instructions.push('Start the Docker daemon before bringing up the local Postgres/Redis stack.')
  }
}

if (!(readiness.databaseConfigured && readiness.databaseReachable)) {
  if (readiness.dockerRequired) {
    instructions.push('Bring up the local Postgres/Redis stack and apply the Prisma schema before probing.')
    recommendedCommands.push('npm run setup:local-db')
  } else {
    instructions.push('Ensure remote DATABASE_URL is reachable and credentials are valid before probing.')
  }
}

if (!readiness.appRuntimeReachable) {
  instructions.push('Start the local web runtime before running authenticated production probes.')
  recommendedCommands.push('npm run dev')
}

const summary = {
  ...readiness,
  probeReady:
    readiness.envLocalPresent &&
    readiness.databaseConfigured &&
    readiness.databaseReachable &&
    readiness.jwtConfigured &&
    readiness.appRuntimeReachable,
  sandboxReady:
    readiness.envLocalPresent &&
    readiness.databaseConfigured &&
    readiness.databaseReachable &&
    readiness.jwtConfigured &&
    readiness.appRuntimeReachable &&
    readiness.dockerCliPresent &&
    readiness.dockerDaemonReady,
  blockers,
  instructions,
  recommendedCommands: Array.from(
    new Set([
      ...recommendedCommands,
      readiness.envLocalPresent && readiness.databaseConfigured && readiness.databaseReachable && readiness.jwtConfigured
        ? 'npm run qa:core-loop-production-probe'
        : 'npm run qa:production-runtime-readiness',
    ])
  ),
}

console.log(JSON.stringify(summary, null, 2))
process.exit(blockers.length === 0 ? 0 : 1)
