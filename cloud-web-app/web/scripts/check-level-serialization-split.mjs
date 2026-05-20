#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')

const REQUIRED_FILES = [
  'lib/level-serialization.ts',
  'lib/level-serialization/types.ts',
  'lib/level-serialization/utils.ts',
  'lib/level-serialization/component-serializers.ts',
  'lib/level-serialization/serializer.ts',
  'lib/level-serialization/compression.ts',
  'lib/level-serialization/file-format.ts',
  'lib/level-serialization/manager.ts',
  'lib/level-serialization/history.ts',
]

const LINE_LIMITS = new Map([
  ['lib/level-serialization.ts', 120],
  ['lib/level-serialization/types.ts', 320],
  ['lib/level-serialization/component-serializers.ts', 360],
  ['lib/level-serialization/serializer.ts', 360],
  ['lib/level-serialization/compression.ts', 120],
  ['lib/level-serialization/file-format.ts', 160],
  ['lib/level-serialization/manager.ts', 420],
  ['lib/level-serialization/history.ts', 240],
])

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) throw new Error(`Missing level serialization split file: ${relativePath}`)
  return fs.readFileSync(abs, 'utf8')
}

function lineCount(content) {
  return content.split(/\r?\n/).length
}

const files = Object.fromEntries(REQUIRED_FILES.map((relativePath) => [relativePath, read(relativePath)]))
const failures = []

for (const [relativePath, limit] of LINE_LIMITS) {
  const lines = lineCount(files[relativePath])
  if (lines > limit) failures.push(`${relativePath}: ${lines} lines exceeds split budget ${limit}`)
}

const entry = files['lib/level-serialization.ts']
const serializer = files['lib/level-serialization/serializer.ts']
const componentSerializers = files['lib/level-serialization/component-serializers.ts']
const compression = files['lib/level-serialization/compression.ts']
const manager = files['lib/level-serialization/manager.ts']
const history = files['lib/level-serialization/history.ts']

if (!entry.includes("export * from './level-serialization/types'")) {
  failures.push('entrypoint must keep the legacy import path as a barrel')
}

if (/class\s+LevelSerializer/.test(entry) || /registerComponentSerializer\s*\(/.test(entry)) {
  failures.push('entrypoint must not inline serializer/component registry internals')
}

if (!serializer.includes('export class LevelSerializer')) {
  failures.push('serializer.ts must own LevelSerializer')
}

if (!componentSerializers.includes('export function registerComponentSerializer')) {
  failures.push('component-serializers.ts must own component serializer registration')
}

if (!compression.includes("import pako from 'pako'")) {
  failures.push('compression.ts must isolate the pako dependency')
}

if (entry.includes("from 'three'") || componentSerializers.includes("from 'three'") || compression.includes("from 'three'")) {
  failures.push('Three.js must stay isolated to serializer/manager runtime modules')
}

if (!manager.includes('export class LevelManager')) {
  failures.push('manager.ts must own LevelManager')
}

if (!history.includes('export class LevelHistory')) {
  failures.push('history.ts must own undo/redo history')
}

if (failures.length) {
  console.error('[level-serialization-split] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[level-serialization-split] PASS entryLines=${lineCount(entry)}, modules=8`)
