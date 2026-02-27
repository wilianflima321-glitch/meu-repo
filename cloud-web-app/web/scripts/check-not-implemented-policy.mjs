#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API_DIR = path.join(ROOT, 'app', 'api')
const ALLOWED_FILES = new Set([
  'app/api/ai/action/route.ts',
  'app/api/ai/chat/route.ts',
  'app/api/ai/complete/route.ts',
  'app/api/ai/inline-edit/route.ts',
])
const ERROR_PATTERN = /error:\s*['"]NOT_IMPLEMENTED['"]/g

async function listRouteFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listRouteFiles(absPath)))
      continue
    }
    if (entry.isFile() && absPath.endsWith(`${path.sep}route.ts`)) {
      files.push(absPath)
    }
  }
  return files
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

async function main() {
  const routeFiles = await listRouteFiles(API_DIR)
  const findings = []

  for (const file of routeFiles) {
    const content = await fs.readFile(file, 'utf8')
    const matches = content.match(ERROR_PATTERN)
    if (!matches || matches.length === 0) continue

    findings.push({
      file: rel(file),
      count: matches.length,
    })
  }

  const unexpected = findings.filter((item) => !ALLOWED_FILES.has(item.file))
  const missingAllowed = [...ALLOWED_FILES].filter((file) => !findings.some((item) => item.file === file))
  const multiCount = findings.filter((item) => ALLOWED_FILES.has(item.file) && item.count !== 1)

  if (unexpected.length > 0 || missingAllowed.length > 0 || multiCount.length > 0) {
    if (unexpected.length > 0) {
      console.error('[not-implemented-policy] unexpected NOT_IMPLEMENTED markers:')
      for (const item of unexpected) {
        console.error(`- ${item.file} (${item.count})`)
      }
    }
    if (missingAllowed.length > 0) {
      console.error('[not-implemented-policy] missing required NOT_IMPLEMENTED markers:')
      for (const file of missingAllowed) {
        console.error(`- ${file}`)
      }
    }
    if (multiCount.length > 0) {
      console.error('[not-implemented-policy] invalid marker multiplicity in allowed files:')
      for (const item of multiCount) {
        console.error(`- ${item.file} (${item.count})`)
      }
    }
    process.exit(1)
  }

  const summary = findings
    .map((item) => `${item.file}:${item.count}`)
    .join(', ')
  console.log(`[not-implemented-policy] PASS files=${findings.length} ${summary}`)
}

main().catch((error) => {
  console.error('[not-implemented-policy] ERROR', error)
  process.exit(1)
})
