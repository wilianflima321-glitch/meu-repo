#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const PORT = Number(process.env.RUNTIME_FAILURE_SMOKE_LOCAL_PORT ?? 3065)
const HOST = process.env.RUNTIME_FAILURE_SMOKE_LOCAL_HOST ?? '127.0.0.1'
const BASE_URL = `http://${HOST}:${PORT}`
const SERVER_TIMEOUT_MS = Number(process.env.RUNTIME_FAILURE_SMOKE_LOCAL_SERVER_TIMEOUT_MS ?? 90000)
const HAS_PRODUCTION_BUILD = fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))
const SERVER_MODE = process.env.RUNTIME_FAILURE_SMOKE_LOCAL_SERVER_MODE ?? (HAS_PRODUCTION_BUILD ? 'start' : 'dev')
const SHOULD_BUILD =
  SERVER_MODE === 'start' &&
  (process.env.RUNTIME_FAILURE_SMOKE_LOCAL_BUILD === '1' || !HAS_PRODUCTION_BUILD)
const VERBOSE_NEXT_LOGS = process.env.RUNTIME_FAILURE_SMOKE_LOCAL_VERBOSE === '1'
const NODE_BIN = process.execPath
const NPM_CLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')

const jwtSecret =
  process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key-change-in-production'
    ? process.env.JWT_SECRET
    : `aethel-v29-smoke-${crypto.randomBytes(16).toString('hex')}`

const baseEnv = {
  ...process.env,
  JWT_SECRET: jwtSecret,
  RUNTIME_FAILURE_SMOKE_BASE_URL: BASE_URL,
  RUNTIME_FAILURE_SMOKE_USER_ID: process.env.RUNTIME_FAILURE_SMOKE_USER_ID ?? 'runtime-smoke-user',
  RUNTIME_FAILURE_SMOKE_EMAIL: process.env.RUNTIME_FAILURE_SMOKE_EMAIL ?? 'runtime-smoke@aethel.local',
  RUNTIME_FAILURE_SMOKE_ROLE: process.env.RUNTIME_FAILURE_SMOKE_ROLE ?? 'admin',
  AUTHENTICATED_UX_BASE_URL: BASE_URL,
  AUTHENTICATED_UX_LOCAL_API_FALLBACK: '1',
  AUTHENTICATED_UX_RATE_LIMIT_FALLBACK: '1',
  AETHEL_RATE_LIMIT_FALLBACK: 'local',
  NEXT_PUBLIC_APP_URL: BASE_URL,
  NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI: process.env.NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI ?? '0',
}

function commandName(name) {
  if (name === 'node') return process.execPath
  return process.platform === 'win32' ? `${name}.cmd` : name
}

function shouldUseShell(command) {
  return process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: options.env ?? baseEnv,
      stdio: options.stdio ?? 'inherit',
      shell: shouldUseShell(command),
      windowsHide: true,
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve({ code, signal })
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code ?? signal}`))
    })
  })
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '')
}

function shouldSuppressNextLine(line) {
  if (VERBOSE_NEXT_LOGS) return false
  const clean = stripAnsi(line)

  if (/lint TP\d+/.test(clean)) return true
  if (/^\s*\d+\s*\|/.test(clean)) return true
  if (/^\s*\|/.test(clean)) return true
  if (/^\s*[-*]\s+\*\d+\*/.test(clean)) return true
  if (/unknown (object|callee|mutation)|side effects|process\.cwd|Node\.js process|function calls are not analysed/.test(clean)) {
    return true
  }
  if (/^\s*\^+\s*$/.test(clean)) return true

  return false
}

async function waitForServer() {
  const startedAt = Date.now()
  let lastError = ''

  while (Date.now() - startedAt < SERVER_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/api/health/live`, { cache: 'no-store' })
      if (response.ok) return
      lastError = `health returned ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for ${BASE_URL}; last error: ${lastError}`)
}

async function main() {
  if (SHOULD_BUILD) {
    console.log('[v29-runtime-failure-smoke-local] building production artifact')
    await run(NODE_BIN, [NPM_CLI, 'run', 'build:production'])
  }

  if (SERVER_MODE !== 'start' && SERVER_MODE !== 'dev') {
    throw new Error(`Unsupported RUNTIME_FAILURE_SMOKE_LOCAL_SERVER_MODE=${SERVER_MODE}; expected start or dev.`)
  }

  console.log(`[v29-runtime-failure-smoke-local] starting Next ${SERVER_MODE} server at ${BASE_URL}`)
  const serverArgs =
    SERVER_MODE === 'start'
      ? [NEXT_BIN, 'start', '-p', String(PORT), '-H', HOST]
      : [NEXT_BIN, 'dev', '--turbo', '-p', String(PORT), '-H', HOST]
  const server = spawn(NODE_BIN, serverArgs, {
    cwd: ROOT,
    env: baseEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
  })

  const forward = (prefix, chunk) => {
    const text = chunk.toString()
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      if (shouldSuppressNextLine(line)) continue
      console.log(`${prefix} ${line}`)
    }
  }
  server.stdout.on('data', (chunk) => forward('[next-start]', chunk))
  server.stderr.on('data', (chunk) => forward('[next-start:err]', chunk))

  let serverExited = false
  server.on('exit', () => {
    serverExited = true
  })

  try {
    await waitForServer()
    if (serverExited) throw new Error('Next server exited before V29 runtime failure smoke.')

    await run(commandName('node'), ['scripts/run-v29-runtime-failure-smoke-runner.mjs'], { env: baseEnv })

    console.log(`[v29-runtime-failure-smoke-local] PASS mode=${SERVER_MODE} baseUrl=${BASE_URL}`)
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM')
      setTimeout(() => {
        if (!server.killed) server.kill('SIGKILL')
      }, 3000).unref?.()
    }
  }
}

main().catch((error) => {
  console.error(`[v29-runtime-failure-smoke-local] FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
