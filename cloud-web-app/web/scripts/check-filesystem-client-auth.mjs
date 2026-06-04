#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN_ROOTS = ['components', 'hooks', 'app', 'lib']
const EXTENSIONS = new Set(['.ts', '.tsx'])
const TARGET = '/api/files/fs'

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relative = path.relative(ROOT, fullPath).replaceAll(path.sep, '/')
    if (entry.isDirectory()) {
      if (
        relative.startsWith('app/api/') ||
        relative === 'lib/server' ||
        relative.startsWith('lib/server/') ||
        relative.includes('/__tests__') ||
        relative.includes('/node_modules/')
      ) {
        continue
      }
      walk(fullPath, out)
      continue
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(fullPath)
  }
  return out
}

function lineFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

const failures = []
const callsites = []

for (const rootName of SCAN_ROOTS) {
  for (const file of walk(path.join(ROOT, rootName))) {
    const content = fs.readFileSync(file, 'utf8')
    let index = content.indexOf(TARGET)
    while (index >= 0) {
      const window = content.slice(index, index + 700)
      const relative = path.relative(ROOT, file).replaceAll(path.sep, '/')
      callsites.push(`${relative}:${lineFor(content, index)}`)
      if (!/(authHeaders|getAuthHeaders|Authorization)/.test(window)) {
        failures.push(`${relative}:${lineFor(content, index)}`)
      }
      index = content.indexOf(TARGET, index + TARGET.length)
    }
  }
}

const helperPath = path.join(ROOT, 'components/ide/fullscreen/workbench-helpers.ts')
const helperContent = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : ''
if (!helperContent.includes("localStorage.getItem('aethel-token')")) {
  failures.push('components/ide/fullscreen/workbench-helpers.ts: getAuthHeaders must read aethel-token')
}

if (failures.length > 0) {
  console.error('[filesystem-client-auth] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[filesystem-client-auth] PASS callsites=${callsites.length}`)
