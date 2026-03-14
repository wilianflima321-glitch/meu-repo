#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const baseUrl = String(process.env.AETHEL_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const defaultRuns = Number.parseInt(process.env.AETHEL_PROBE_RUNS || '6', 10)

function parseArgs(argv) {
  const out = {
    runs: Number.isFinite(defaultRuns) && defaultRuns > 0 ? defaultRuns : 6,
    submitFeedback: false,
    feedback: 'accepted',
    feedbackSinceMinutes: 60,
  }
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--runs' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.runs = Math.min(parsed, 50)
      i += 1
    }
    if (arg === '--submit-feedback') {
      out.submitFeedback = true
    }
    if (arg === '--feedback' && argv[i + 1]) {
      const value = String(argv[i + 1]).trim().toLowerCase()
      if (value === 'accepted' || value === 'rejected' || value === 'needs_work') {
        out.feedback = value
      }
      i += 1
    }
    if (arg === '--feedback-since-minutes' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.feedbackSinceMinutes = Math.min(parsed, 24 * 60)
      i += 1
    }
  }
  return out
}

function sanitizedEnv(overrides = {}) {
  const env = { ...process.env, ...overrides }
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])
  )
}

function killProcessTree(pid) {
  if (!pid) return Promise.resolve()
  if (process.platform !== 'win32') {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {}
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
    })
    killer.on('error', () => resolve())
    killer.on('exit', () => resolve())
  })
}

function resolveNpmCliPath() {
  const fromEnv = String(process.env.npm_execpath || '').trim()
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

  const nodeDir = path.dirname(process.execPath)
  const candidates = [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ]

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate)
    if (fs.existsSync(normalized)) return normalized
  }
  return ''
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      stdio: options.stdio || 'inherit',
      shell: false,
      env: sanitizedEnv(options.env || {}),
    })
    child.on('error', (error) => {
      reject(
        new Error(
          `[runCommand] failed to spawn "${command}" ${args.join(' ')} (cwd=${options.cwd || repoRoot}): ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      )
    })
    child.on('exit', (code) => {
      if (code === 0) resolve({ code })
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function waitForRuntime(url, timeoutMs = 180_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' })
      if (response.status >= 200 && response.status < 500) {
        return true
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  return false
}

function parseOperatorTokenFromOutput(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  try {
    const payload = JSON.parse(trimmed)
    return String(payload?.token || '').trim()
  } catch {
    return ''
  }
}

async function generateOperatorToken() {
  return new Promise((resolve, reject) => {
    let stdout = ''
    const child = spawn(process.execPath, [path.join(repoRoot, 'tools', 'bootstrap-operator-token.mjs')], {
      cwd: repoRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'inherit'],
      env: sanitizedEnv(),
    })
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.on('error', (error) => {
      reject(
        new Error(
          `[generateOperatorToken] failed to spawn bootstrap script: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      )
    })
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`bootstrap-operator-token exited with code ${code}`))
        return
      }
      const token = parseOperatorTokenFromOutput(stdout)
      if (!token) {
        reject(new Error('Failed to parse operator token from bootstrap output.'))
        return
      }
      resolve(token)
    })
  })
}

async function main() {
  const args = parseArgs(process.argv)
  let devProcess = null
  let startedByScript = false

  const stopDev = async () => {
    if (devProcess && startedByScript) {
      await killProcessTree(devProcess.pid)
    }
  }

  process.on('SIGINT', async () => {
    await stopDev()
    process.exit(130)
  })
  process.on('SIGTERM', async () => {
    await stopDev()
    process.exit(143)
  })

  try {
    let runtimeReady = await waitForRuntime(`${baseUrl}/api/health/live`, 3_000)
    if (!runtimeReady) {
      console.log(`[probe-wave] runtime not ready at ${baseUrl}; starting dev server...`)
      const npmCliPath = resolveNpmCliPath()
      if (!npmCliPath) {
        throw new Error('[probe-wave] failed to resolve npm-cli.js path for dev bootstrap')
      }
      const devCommand = process.execPath
      const devArgs = [npmCliPath, 'run', 'dev']
      try {
        devProcess = spawn(devCommand, devArgs, {
          cwd: webRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
          env: sanitizedEnv(),
        })
      } catch (error) {
        throw new Error(
          `[probe-wave] failed to spawn dev server (cwd=${webRoot}): ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
      devProcess.stdout?.on('data', (chunk) => process.stdout.write(String(chunk)))
      devProcess.stderr?.on('data', (chunk) => process.stderr.write(String(chunk)))
      devProcess.on('error', (error) => {
        console.error(
          `[probe-wave] failed to spawn dev server: ${error instanceof Error ? error.message : String(error)}`
        )
      })
      startedByScript = true
      runtimeReady = await waitForRuntime(`${baseUrl}/api/health/live`)
    }

    if (!runtimeReady) {
      throw new Error(`Local runtime did not become ready at ${baseUrl}/api/health/live`)
    }

    const token = await generateOperatorToken()

    await runCommand(process.execPath, [path.join(repoRoot, 'tools', 'check-production-runtime-readiness.mjs')], {
      cwd: repoRoot,
    })
    const waveStartedAt = Date.now()
    await runCommand(
      process.execPath,
      [
        path.join(repoRoot, 'tools', 'run-core-loop-production-probe.mjs'),
        '--runs',
        String(args.runs),
        '--token',
        token,
      ],
      { cwd: repoRoot }
    )
    if (args.submitFeedback) {
      await runCommand(
        process.execPath,
        [
          path.join(repoRoot, 'tools', 'submit-core-loop-feedback.mjs'),
          '--token',
          token,
          '--feedback',
          args.feedback,
          '--since',
          String(Math.max(1, Math.floor((Date.now() - waveStartedAt) / 60000) + args.feedbackSinceMinutes)),
        ],
        { cwd: repoRoot }
      )
    }
    try {
      await runCommand(process.execPath, [path.join(repoRoot, 'tools', 'check-operator-readiness.mjs')], {
        cwd: repoRoot,
      })
    } catch (error) {
      console.warn(
        `[probe-wave] operator-readiness is not fully green yet: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  } finally {
    await stopDev()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
