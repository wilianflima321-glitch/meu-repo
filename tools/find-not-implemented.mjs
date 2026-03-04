#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_SCAN_ROOT = path.join(ROOT, 'cloud-web-app', 'web', 'app', 'api')
const DEFAULT_OUTPUT = path.join(ROOT, 'docs', 'master', 'not-implemented-scan.csv')

function parseArgs(argv) {
  const out = {
    output: DEFAULT_OUTPUT,
    scanRoot: DEFAULT_SCAN_ROOT,
  }
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--output' && argv[i + 1]) {
      out.output = path.resolve(ROOT, argv[i + 1])
      i += 1
      continue
    }
    if (arg === '--scan-root' && argv[i + 1]) {
      out.scanRoot = path.resolve(ROOT, argv[i + 1])
      i += 1
      continue
    }
  }
  return out
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
      continue
    }
    if (!entry.isFile()) continue
    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) continue
    files.push(fullPath)
  }
  return files
}

function toPosixRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/')
}

function toEndpointFromRouteFile(relPath) {
  const marker = 'cloud-web-app/web/app/api/'
  const idx = relPath.indexOf(marker)
  if (idx < 0) return ''
  const apiPath = relPath.slice(idx + marker.length).replace(/\/route\.tsx?$/, '')
  return `/api/${apiPath}`.replace(/\/+/g, '/')
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

async function main() {
  const args = parseArgs(process.argv)
  const files = await walk(args.scanRoot)
  const rows = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    const relPath = toPosixRel(file)

    const hasNotImplementedError = /error:\s*['"`]NOT_IMPLEMENTED['"`]/.test(content)
    const hasNotImplementedStatus = /capabilityStatus:\s*['"`]NOT_IMPLEMENTED['"`]/.test(content)
    const hasNotImplementedHelper = /notImplementedCapability\s*\(/.test(content)

    if (!hasNotImplementedError && !hasNotImplementedStatus && !hasNotImplementedHelper) {
      continue
    }

    const endpoint = toEndpointFromRouteFile(relPath)
    rows.push({
      endpoint,
      file: relPath,
      hasNotImplementedError,
      hasNotImplementedStatus,
      hasNotImplementedHelper,
      status: 'OPEN',
      risk: endpoint.includes('/ai/') ? 'high' : endpoint.includes('/billing/') ? 'high' : 'medium',
      owner: endpoint.includes('/ai/') ? 'ai-platform' : endpoint.includes('/admin/') ? 'admin-platform' : 'platform',
      estHours: '',
      deps: '',
    })
  }

  const lines = [
    'endpoint,file,hasNotImplementedError,hasNotImplementedStatus,hasNotImplementedHelper,status,risk,owner,deps,est_hours',
    ...rows.map((row) =>
      [
        row.endpoint,
        row.file,
        row.hasNotImplementedError,
        row.hasNotImplementedStatus,
        row.hasNotImplementedHelper,
        row.status,
        row.risk,
        row.owner,
        row.deps,
        row.estHours,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ]

  await fs.mkdir(path.dirname(args.output), { recursive: true })
  await fs.writeFile(args.output, `${lines.join('\n')}\n`, 'utf8')

  console.log(
    `[find-not-implemented] scanRoot=${toPosixRel(args.scanRoot)} rows=${rows.length} output=${toPosixRel(args.output)}`
  )
}

main().catch((error) => {
  console.error('[find-not-implemented] FAIL', error)
  process.exit(1)
})

