#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')

const REQUIRED_FILES = [
  'lib/mcp/aethel-mcp-server.ts',
  'lib/mcp/aethel/auth-policy.ts',
  'lib/mcp/aethel/filesystem.ts',
  'lib/mcp/aethel/register-tools.ts',
  'lib/mcp/aethel/response-schemas.ts',
  'lib/mcp/aethel/tool-definitions.ts',
  'lib/mcp/aethel/tool-handlers.ts',
  'lib/mcp/aethel/resources.ts',
  'lib/mcp/aethel/prompts.ts',
]

const LINE_LIMITS = new Map([
  ['lib/mcp/aethel-mcp-server.ts', 120],
  ['lib/mcp/aethel/filesystem.ts', 400],
  ['lib/mcp/aethel/tool-definitions.ts', 450],
  ['lib/mcp/aethel/tool-handlers.ts', 850],
  ['lib/mcp/aethel/resources.ts', 160],
  ['lib/mcp/aethel/prompts.ts', 160],
])

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) throw new Error(`Missing MCP split file: ${relativePath}`)
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

const entry = files['lib/mcp/aethel-mcp-server.ts']
const definitions = files['lib/mcp/aethel/tool-definitions.ts']
const handlers = files['lib/mcp/aethel/tool-handlers.ts']
const register = files['lib/mcp/aethel/register-tools.ts']
const auth = files['lib/mcp/aethel/auth-policy.ts']
const filesystem = files['lib/mcp/aethel/filesystem.ts']

if (/registerTool\s*\(/.test(entry) || /registerResource\s*\(/.test(entry) || /registerPrompt\s*\(/.test(entry)) {
  failures.push('entrypoint must not inline tool/resource/prompt registrations')
}

if (!entry.includes('registerAethelTools') || !entry.includes('registerAethelResources') || !entry.includes('registerAethelPrompts')) {
  failures.push('entrypoint must delegate tools, resources, and prompts')
}

if (!definitions.includes('AETHEL_TOOL_DEFINITIONS')) {
  failures.push('tool-definitions.ts must export AETHEL_TOOL_DEFINITIONS')
}

if (!handlers.includes('AETHEL_TOOL_HANDLERS')) {
  failures.push('tool-handlers.ts must export AETHEL_TOOL_HANDLERS')
}

const definitionCount = [...definitions.matchAll(/name:\s*['"][^'"]+['"]/g)].length
const handlerCount = [...handlers.matchAll(/async\s*\(/g)].length
if (definitionCount !== handlerCount) {
  failures.push(`tool definitions/handlers count mismatch: definitions=${definitionCount}, handlers=${handlerCount}`)
}

if (!register.includes('withMcpAuthPolicy')) {
  failures.push('register-tools.ts must apply the MCP auth policy wrapper')
}

if (!auth.includes('MCP_READONLY') || !auth.includes('MCP_DISABLE_TERMINAL')) {
  failures.push('auth-policy.ts must expose read-only and terminal disable guards')
}

if (!filesystem.includes('getFileSystemAdapter') || !filesystem.includes('setFileSystemMode')) {
  failures.push('filesystem.ts must preserve filesystem adapter exports')
}

if (failures.length) {
  console.error('[mcp-server-split] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[mcp-server-split] PASS entryLines=${lineCount(entry)}, tools=${definitionCount}`)
