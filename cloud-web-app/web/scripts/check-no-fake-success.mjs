#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const API_DIR = path.join(ROOT, 'app', 'api')

const STATUS_BY_ERROR = {
  NOT_IMPLEMENTED: 501,
  DEPRECATED_ROUTE: 410,
  QUEUE_BACKEND_UNAVAILABLE: 503,
}

const SKIP_SEGMENTS = new Set(['node_modules', '.next', 'dist', 'build'])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_SEGMENTS.has(entry.name)) continue
      walk(abs, out)
      continue
    }
    if (entry.name === 'route.ts' || entry.name === 'route.js') {
      out.push(abs)
    }
  }
  return out
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function findPatternIndex(content, pattern) {
  return content.search(pattern)
}

function includesStatusNear(content, index, status) {
  if (index < 0) return false
  const start = Math.max(0, index - 1200)
  const end = Math.min(content.length, index + 1200)
  const windowText = content.slice(start, end)
  return new RegExp(`status\\s*:\\s*${status}`).test(windowText)
}

function checkErrorStatusContract(content, fileRel, failures) {
  for (const [errorCode, expectedStatus] of Object.entries(STATUS_BY_ERROR)) {
    const pattern = new RegExp(`error\\s*:\\s*['"\`]${errorCode}['"\`]`, 'g')
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (
        errorCode === 'NOT_IMPLEMENTED' &&
        content.includes('notImplementedCapability(')
      ) {
        continue
      }
      if (!includesStatusNear(content, match.index, expectedStatus)) {
        failures.push(
          `${fileRel}: ${errorCode} sem status ${expectedStatus} no mesmo bloco de resposta`
        )
      }
    }
  }
}

function checkFakeSuccess(content, fileRel, failures) {
  const calls = extractNextResponseCalls(content)
  for (const call of calls) {
    const hasSuccessTrue = /success\s*:\s*true/.test(call)
    const hasErrorField = /error\s*:/.test(call)
    if (hasSuccessTrue && hasErrorField) {
      failures.push(
        `${fileRel}: resposta mistura signal de erro com success=true (possivel fake success)`
      )
    }
  }

  const notImplemented200 = /NOT_IMPLEMENTED[\s\S]{0,220}status\s*:\s*200/g
  if (notImplemented200.test(content)) {
    failures.push(`${fileRel}: NOT_IMPLEMENTED nao pode retornar status 200`)
  }
}

function extractNextResponseCalls(content) {
  const calls = []
  let cursor = 0
  const token = 'NextResponse.json('

  while (true) {
    const start = content.indexOf(token, cursor)
    if (start === -1) break

    let i = start + token.length
    let depth = 1
    let quote = null

    while (i < content.length && depth > 0) {
      const ch = content[i]
      const prev = content[i - 1]

      if (quote) {
        if (ch === quote && prev !== '\\') {
          quote = null
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
      } else if (ch === '(') {
        depth += 1
      } else if (ch === ')') {
        depth -= 1
      }
      i += 1
    }

    calls.push(content.slice(start, i))
    cursor = i
  }

  return calls
}

function main() {
  const files = walk(API_DIR)
  const failures = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const fileRel = rel(file)

    if (findPatternIndex(content, /error\s*:/) < 0) continue
    checkErrorStatusContract(content, fileRel, failures)
    checkFakeSuccess(content, fileRel, failures)
  }

  if (failures.length > 0) {
    console.error('[no-fake-success] FAIL')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(`[no-fake-success] PASS files=${files.length}`)
}

main()
