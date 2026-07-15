#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')

const REQUIRED_FILES = [
  'lib/server/extension-host-runtime.ts',
  'lib/server/extension-host/api.ts',
  'lib/server/extension-host/types.ts',
]

const LIMITS = new Map([
  ['lib/server/extension-host-runtime.ts', 900],
  ['lib/server/extension-host/api.ts', 650],
  ['lib/server/extension-host/types.ts', 650],
])

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing required extension-host split file: ${relativePath}`)
  }
  return fs.readFileSync(abs, 'utf8')
}

function lineCount(content) {
  return content.split(/\r?\n/).length
}

const files = Object.fromEntries(REQUIRED_FILES.map((relativePath) => [relativePath, read(relativePath)]))
const failures = []

for (const [relativePath, limit] of LIMITS) {
  const lines = lineCount(files[relativePath])
  if (lines > limit) failures.push(`${relativePath}: ${lines} lines exceeds split budget ${limit}`)
}

const runtime = files['lib/server/extension-host-runtime.ts']
const api = files['lib/server/extension-host/api.ts']
const types = files['lib/server/extension-host/types.ts']

if (!runtime.includes("import { ExtensionAPI } from './extension-host/api'")) {
  failures.push('runtime must delegate sandbox API facade to extension-host/api.ts')
}

if (runtime.includes('class ExtensionAPI')) {
  failures.push('runtime must not inline ExtensionAPI after the split')
}

if (!api.includes("import type { ExtensionHostRuntime } from '../extension-host-runtime'")) {
  failures.push('api facade must keep a type-only host dependency')
}

if (!api.includes('export class ExtensionAPI')) {
  failures.push('api facade must export ExtensionAPI')
}

if (!types.includes('export interface ExtensionManifest')) {
  failures.push('types.ts must own ExtensionManifest')
}

if (!types.includes('export class RuntimePosition')) {
  failures.push('types.ts must own VS Code-like geometry types')
}

if (api.includes('worker_threads') || types.includes('worker_threads')) {
  failures.push('split modules must not import worker_threads; supervision stays in runtime')
}

if (failures.length) {
  console.error('[extension-host-split] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[extension-host-split] PASS runtimeLines=${lineCount(runtime)}, modules=2`)
