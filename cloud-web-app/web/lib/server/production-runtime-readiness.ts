import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawnSync } from 'node:child_process'

export interface ProductionRuntimeReadiness {
  envLocalPresent: boolean
  databaseConfigured: boolean
  databaseReachable: boolean
  databaseTarget: string | null
  jwtConfigured: boolean
  csrfConfigured: boolean
  dockerCliPresent: boolean
  dockerDaemonReady: boolean
  authReady: boolean
  probeReady: boolean
  blockers: string[]
  instructions: string[]
  recommendedCommands: string[]
}

async function canReachDatabaseTarget(databaseUrl: string | undefined): Promise<{ reachable: boolean; target: string | null }> {
  if (!databaseUrl) return { reachable: false, target: null }
  try {
    const parsed = new URL(databaseUrl)
    const host = parsed.hostname
    const port = Number.parseInt(parsed.port || '5432', 10)
    const target = `${host}:${port}`
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port })
      let settled = false
      const finish = (value: boolean) => {
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

function checkDockerCliPresent() {
  return spawnSync('docker', ['--version'], {
    stdio: 'ignore',
    shell: true,
    timeout: 1500,
  }).status === 0
}

function checkDockerDaemon() {
  return spawnSync('docker', ['info'], {
    stdio: 'ignore',
    shell: true,
    timeout: 2500,
  }).status === 0
}

function isLocalDatabaseHost(databaseUrl: string | undefined): boolean {
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

export async function getProductionRuntimeReadiness(): Promise<ProductionRuntimeReadiness> {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envLocalPresent = fs.existsSync(envLocalPath)
  const databaseConfigured = Boolean(process.env.DATABASE_URL)
  const databaseProbe = await canReachDatabaseTarget(process.env.DATABASE_URL)
  const jwtConfigured = Boolean(process.env.JWT_SECRET) && process.env.JWT_SECRET !== 'aethel-secret-key'
  const csrfConfigured = Boolean(process.env.CSRF_SECRET || process.env.JWT_SECRET)
  const dockerCliPresent = checkDockerCliPresent()
  const dockerDaemonReady = dockerCliPresent ? checkDockerDaemon() : false
  const dockerRequired = isLocalDatabaseHost(process.env.DATABASE_URL)
  const blockers: string[] = []
  const instructions: string[] = []
  const recommendedCommands: string[] = []

  if (!envLocalPresent) blockers.push('ENV_LOCAL_MISSING')
  if (!databaseConfigured) blockers.push('DATABASE_URL_MISSING')
  else if (!databaseProbe.reachable) blockers.push('DATABASE_UNREACHABLE')
  if (!jwtConfigured) blockers.push('JWT_SECRET_MISSING')
  if (!csrfConfigured) blockers.push('CSRF_SECRET_MISSING')
  if (dockerRequired) {
    if (!dockerCliPresent) blockers.push('DOCKER_CLI_MISSING')
    else if (!dockerDaemonReady) blockers.push('DOCKER_DAEMON_NOT_RUNNING')
  }

  if (!envLocalPresent || !jwtConfigured || !csrfConfigured || !databaseConfigured) {
    instructions.push('Bootstrap the local runtime env before running the production probe.')
    recommendedCommands.push('npm run setup:local-runtime')
  }

  if (dockerRequired) {
    if (!dockerCliPresent) {
      instructions.push('Install Docker Desktop or ensure the docker CLI is available in PATH.')
    } else if (!dockerDaemonReady) {
      instructions.push('Start the Docker daemon before bringing up the local database stack.')
    }
  }

  if (!databaseReachableAfterConfig(databaseConfigured, databaseProbe.reachable)) {
    if (dockerRequired) {
      instructions.push('Bring up the local Postgres/Redis stack and apply the Prisma schema before probing.')
      recommendedCommands.push('npm run setup:local-db')
    } else {
      instructions.push('Ensure remote DATABASE_URL is reachable and credentials are valid before probing.')
    }
  }

  if (envLocalPresent && databaseConfigured && databaseProbe.reachable && jwtConfigured) {
    instructions.push('Runtime preflight is ready for authenticated production-probe execution.')
    recommendedCommands.push('npm run qa:core-loop-production-probe')
  } else {
    recommendedCommands.push('npm run qa:production-runtime-readiness')
  }

  return {
    envLocalPresent,
    databaseConfigured,
    databaseReachable: databaseProbe.reachable,
    databaseTarget: databaseProbe.target,
    jwtConfigured,
    csrfConfigured,
    dockerCliPresent,
    dockerDaemonReady,
    authReady: databaseConfigured && databaseProbe.reachable && jwtConfigured,
    probeReady: envLocalPresent && databaseConfigured && databaseProbe.reachable && jwtConfigured,
    blockers,
    instructions,
    recommendedCommands: Array.from(new Set(recommendedCommands)),
  }
}

function databaseReachableAfterConfig(configured: boolean, reachable: boolean) {
  return configured && reachable
}
