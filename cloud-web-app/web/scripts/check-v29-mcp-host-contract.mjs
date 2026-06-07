#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

requireToken('lib/mcp/host.ts', 'AethelMcpHostRegistry', 'host registry contract')
requireToken('lib/mcp/host.ts', "defaultPolicy: 'deny-unapproved-tools'", 'deny unapproved tools policy')
requireToken('lib/mcp/host.ts', "receiptPolicy: 'required-for-every-tool-call'", 'receipt policy')
requireToken('lib/mcp/host.ts', 'validateAethelMcpToolCall', 'tool call validator')
requireToken('lib/mcp/host.ts', 'approvalToken', 'human approval token')
requireToken('lib/mcp/host.ts', 'AETHEL_MCP_HOST_PROHIBITED_CLAIMS', 'forbidden MCP claims')
requireToken('lib/runtime/v29-forensic-runtime-backlog.ts', 'mcp-plugin-host', 'forensic backlog block')
requireToken('lib/runtime/v29-forensic-runtime-backlog.ts', 'cloud-web-app/web/lib/mcp/host.ts', 'MCP host evidence ref')
requireToken('__tests__/mcp/mcp-host.test.ts', 'blocks unregistered servers', 'MCP host regression test')

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts?.['qa:v29-mcp-host-contract'] !== 'node scripts/check-v29-mcp-host-contract.mjs') failures.push('package.json: missing qa:v29-mcp-host-contract')
if (!read('scripts/check-v29-total-spine.mjs').includes('check-v29-mcp-host-contract.mjs')) failures.push('v29 total spine must include MCP host contract')

if (failures.length) {
  console.error('[v29-mcp-host-contract] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-mcp-host-contract] PASS registry=deny-unapproved-tools receipts=required')
