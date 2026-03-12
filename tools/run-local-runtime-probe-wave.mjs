#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const baseUrl = String(process.env.AETHEL_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      stdio: options.stdio || 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        ...(options.env || {}),
      },
    })
    child.on('error', reject)
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
      env: { ...process.env },
    })
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.on('error', reject)
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
  const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: webRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })

  const stopDev = () => {
    if (!devProcess.killed) {
      devProcess.kill('SIGTERM')
    }
  }

  process.on('SIGINT', () => {
    stopDev()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    stopDev()
    process.exit(143)
  })

  try {
    const runtimeReady = await waitForRuntime(`${baseUrl}/api/health/live`)
    if (!runtimeReady) {
      throw new Error(`Local runtime did not become ready at ${baseUrl}/api/health/live`)
    }

    const token = await generateOperatorToken()

    await runCommand('npm', ['run', 'qa:production-runtime-readiness'], { cwd: repoRoot })
    await runCommand(
      'npm',
      ['run', 'qa:core-loop-production-probe', '--', '--runs', '6', '--token', token],
      { cwd: repoRoot }
    )
    await runCommand('npm', ['run', 'qa:operator-readiness'], { cwd: repoRoot })
  } finally {
    stopDev()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
