#!/usr/bin/env node

import process from 'node:process'

const DEFAULT_BASE_URL = process.env.AETHEL_BASE_URL || 'http://localhost:3000'
const DEFAULT_RUNS = Number.parseInt(process.env.AETHEL_PROBE_RUNS || '6', 10)
const DEFAULT_PROJECT_ID = process.env.AETHEL_PROJECT_ID || 'default'
const AUTH_TOKEN = process.env.AETHEL_TOKEN || process.env.AETHEL_AUTH_TOKEN || ''

function parseArgs(argv) {
  const out = {
    baseUrl: DEFAULT_BASE_URL,
    runs: Number.isFinite(DEFAULT_RUNS) ? DEFAULT_RUNS : 6,
    projectId: DEFAULT_PROJECT_ID,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base-url' && argv[i + 1]) {
      out.baseUrl = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--runs' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.runs = parsed
      i += 1
      continue
    }
    if (arg === '--project-id' && argv[i + 1]) {
      out.projectId = argv[i + 1]
      i += 1
    }
  }

  out.baseUrl = String(out.baseUrl || '').replace(/\/+$/, '')
  out.runs = Math.max(1, Math.min(out.runs, 30))
  out.projectId = String(out.projectId || 'default').trim() || 'default'
  return out
}

function ensureToken() {
  if (!AUTH_TOKEN.trim()) {
    console.error('[core-loop-production-probe] missing token: set AETHEL_TOKEN (or AETHEL_AUTH_TOKEN)')
    process.exit(1)
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const reason = payload?.error || payload?.message || `HTTP ${response.status}`
    throw new Error(reason)
  }
  return payload
}

function collectFilePaths(nodes, out = []) {
  for (const node of nodes || []) {
    if (!node || typeof node !== 'object') continue
    if (node.type === 'file' && typeof node.path === 'string') out.push(node.path)
    if (node.type === 'directory' && Array.isArray(node.children)) collectFilePaths(node.children, out)
  }
  return out
}

function pickProbeFilePath(paths) {
  const preferredOrder = ['ts', 'tsx', 'js', 'jsx', 'md', 'json', 'css', 'html']
  const list = [...new Set(paths)]
  if (list.length === 0) return null

  const score = (filePath) => {
    const ext = String(filePath.split('.').pop() || '').toLowerCase()
    const idx = preferredOrder.indexOf(ext)
    return idx >= 0 ? idx : preferredOrder.length + 1
  }

  list.sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    if (sa !== sb) return sa - sb
    return a.localeCompare(b)
  })
  return list[0]
}

function probeSuffix(filePath, runIndex) {
  const ext = String(filePath.split('.').pop() || '').toLowerCase()
  const tag = `core-loop-production-probe-${runIndex + 1}`
  if (['ts', 'tsx', 'js', 'jsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'swift', 'kt'].includes(ext)) {
    return `\n// ${tag}\n`
  }
  if (['py', 'sh', 'rb', 'yaml', 'yml', 'toml', 'ini'].includes(ext)) {
    return `\n# ${tag}\n`
  }
  if (ext === 'md') {
    return `\n<!-- ${tag} -->\n`
  }
  if (['json', 'css', 'html'].includes(ext)) {
    return `\n/* ${tag} */\n`
  }
  return `\n/* ${tag} */\n`
}

async function main() {
  ensureToken()
  const args = parseArgs(process.argv)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN.trim()}`,
    'x-project-id': args.projectId,
  }

  const tree = await fetchJson(`${args.baseUrl}/api/files/tree`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      path: '/',
      maxDepth: 5,
      projectId: args.projectId,
    }),
  })

  const filePath = pickProbeFilePath(collectFilePaths(tree?.children || []))
  if (!filePath) {
    console.error('[core-loop-production-probe] no candidate files found in workspace tree')
    process.exit(1)
  }

  const readPayload = await fetchJson(`${args.baseUrl}/api/files/fs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'read',
      path: filePath,
      projectId: args.projectId,
    }),
  })

  const originalContent = typeof readPayload?.content === 'string' ? readPayload.content : ''
  let success = 0
  let blocked = 0
  let failed = 0

  for (let i = 0; i < args.runs; i += 1) {
    const modified = `${originalContent}${probeSuffix(filePath, i)}`

    try {
      await fetchJson(`${args.baseUrl}/api/ai/change/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: args.projectId,
          filePath,
          original: originalContent,
          fullDocument: modified,
          executionMode: 'sandbox',
        }),
      })
      success += 1
      // brief deterministic pacing
      await new Promise((resolve) => setTimeout(resolve, 80))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown'
      if (reason.includes('APPROVAL_REQUIRED') || reason.includes('FULL_ACCESS_GRANT_REQUIRED')) {
        blocked += 1
      } else {
        failed += 1
      }
    }
  }

  const total = success + blocked + failed
  const successRate = total > 0 ? success / total : 0

  console.log(
    `[core-loop-production-probe] baseUrl=${args.baseUrl} projectId=${args.projectId} file=${filePath} runs=${args.runs} success=${success} blocked=${blocked} failed=${failed} successRate=${successRate.toFixed(4)}`
  )
}

main().catch((error) => {
  console.error('[core-loop-production-probe] FAIL', error instanceof Error ? error.message : error)
  process.exit(1)
})
