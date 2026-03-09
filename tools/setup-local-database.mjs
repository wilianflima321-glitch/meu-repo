#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawnSync } from 'node:child_process'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const envLocalPath = path.join(webRoot, '.env.local')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const values = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }
  return values
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    stdio: options.stdio || 'inherit',
    shell: true,
    env: { ...process.env, ...(options.env || {}) },
  })
  return result
}

function dockerDaemonReady() {
  return run('docker', ['info'], { stdio: 'ignore' }).status === 0
}

async function waitForPort(host, port, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port })
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        socket.destroy()
        resolve(value)
      }
      socket.setTimeout(1000)
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
      socket.once('timeout', () => finish(false))
    })
    if (ok) return true
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

const dryRun = process.argv.includes('--dry-run')
const envLocal = parseEnvFile(envLocalPath)
const databaseUrl = envLocal.DATABASE_URL || process.env.DATABASE_URL || ''

if (!databaseUrl) {
  console.error(JSON.stringify({ success: false, error: 'DATABASE_URL_MISSING', path: envLocalPath }, null, 2))
  process.exit(1)
}

let dbTarget = null
try {
  const parsed = new URL(databaseUrl)
  dbTarget = {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || '5432', 10),
  }
} catch {
  console.error(JSON.stringify({ success: false, error: 'DATABASE_URL_INVALID', value: databaseUrl }, null, 2))
  process.exit(1)
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun: true,
        compose: 'docker compose up -d postgres redis',
        dbPush: 'npm --prefix cloud-web-app/web run db:push',
        databaseTarget: `${dbTarget.host}:${dbTarget.port}`,
      },
      null,
      2
    )
  )
  process.exit(0)
}

if (!dockerDaemonReady()) {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: 'DOCKER_DAEMON_NOT_RUNNING',
        nextSteps: ['Start Docker Desktop or another Docker daemon', 'Retry npm run setup:local-db'],
      },
      null,
      2
    )
  )
  process.exit(1)
}

const composeResult = run('docker', ['compose', 'up', '-d', 'postgres', 'redis'])
if (composeResult.status !== 0) {
  console.error(JSON.stringify({ success: false, error: 'DOCKER_COMPOSE_UP_FAILED' }, null, 2))
  process.exit(composeResult.status || 1)
}

const reachable = await waitForPort(dbTarget.host, dbTarget.port, 60_000)
if (!reachable) {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: 'DATABASE_START_TIMEOUT',
        databaseTarget: `${dbTarget.host}:${dbTarget.port}`,
      },
      null,
      2
    )
  )
  process.exit(1)
}

const dbPushResult = run('npm', ['--prefix', 'cloud-web-app/web', 'run', 'db:push'])
if (dbPushResult.status !== 0) {
  console.error(JSON.stringify({ success: false, error: 'PRISMA_DB_PUSH_FAILED' }, null, 2))
  process.exit(dbPushResult.status || 1)
}

console.log(
  JSON.stringify(
    {
      success: true,
      databaseTarget: `${dbTarget.host}:${dbTarget.port}`,
      stepsCompleted: ['docker compose up -d postgres redis', 'npm --prefix cloud-web-app/web run db:push'],
      nextSteps: ['Run npm run qa:production-runtime-readiness', 'Run npm run qa:core-loop-production-probe'],
    },
    null,
    2
  )
)
