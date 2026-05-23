#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'lib/server/websocket-server.ts',
  'lib/server/websocket/transport.ts',
  'lib/server/websocket/auth.ts',
  'lib/server/websocket/rooms.ts',
  'lib/server/websocket/presence.ts',
  'lib/server/websocket/event-bus.ts',
  'lib/server/websocket/ids.ts',
]

const failures = []

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function countLines(source) {
  return source.split(/\r?\n/).length
}

const sources = new Map(REQUIRED_FILES.map((file) => [file, read(file)]))
const server = sources.get('lib/server/websocket-server.ts') ?? ''
const transport = sources.get('lib/server/websocket/transport.ts') ?? ''
const auth = sources.get('lib/server/websocket/auth.ts') ?? ''
const rooms = sources.get('lib/server/websocket/rooms.ts') ?? ''
const presence = sources.get('lib/server/websocket/presence.ts') ?? ''
const eventBus = sources.get('lib/server/websocket/event-bus.ts') ?? ''
const ids = sources.get('lib/server/websocket/ids.ts') ?? ''

if (countLines(server) > 1120) failures.push(`lib/server/websocket-server.ts must stay below 1120 lines after split; got ${countLines(server)}`)
if (/import\s+jwt\s+from\s+['"]jsonwebtoken/.test(server)) failures.push('websocket-server.ts must not own JWT/auth policy')
if (/function\s+verifyJwtToken|private\s+verifyJwtToken|private\s+handleAuth/.test(server)) failures.push('auth lifecycle must live in websocket/auth.ts')
if (/function\s+sendRaw\s*\(|private\s+sendRaw\s*\([^)]*\)\s*:\s*void\s*{\s*if\s*\(/s.test(server)) failures.push('raw transport implementation must live in websocket/transport.ts')
if (/getConnectionCounts\s*\(|buildMetricsPayload\s*\(/.test(server) && !server.includes("require('./websocket/presence.ts')")) failures.push('presence metrics must route through websocket/presence.ts')

const requiredServerDeps = [
  "require('./websocket/auth.ts')",
  "require('./websocket/transport.ts')",
  "require('./websocket/rooms.ts')",
  "require('./websocket/presence.ts')",
]
for (const dep of requiredServerDeps) {
  if (!server.includes(dep)) failures.push(`websocket-server.ts missing boundary dependency ${dep}`)
}

const requiredExports = [
  ['lib/server/websocket/transport.ts', /export\s+function\s+sendRaw/, 'sendRaw'],
  ['lib/server/websocket/transport.ts', /export\s+function\s+sendToClient/, 'sendToClient'],
  ['lib/server/websocket/auth.ts', /export\s+function\s+handleClientAuth/, 'handleClientAuth'],
  ['lib/server/websocket/auth.ts', /export\s+function\s+ensureUserIdentity/, 'ensureUserIdentity'],
  ['lib/server/websocket/rooms.ts', /export\s+function\s+subscribeToChannel/, 'subscribeToChannel'],
  ['lib/server/websocket/rooms.ts', /export\s+function\s+broadcastToLegacyRoom/, 'broadcastToLegacyRoom'],
  ['lib/server/websocket/presence.ts', /export\s+function\s+startHeartbeat/, 'startHeartbeat'],
  ['lib/server/websocket/presence.ts', /export\s+function\s+buildMetricsPayload/, 'buildMetricsPayload'],
  ['lib/server/websocket/event-bus.ts', /export\s+const\s+eventBus/, 'eventBus'],
  ['lib/server/websocket/ids.ts', /export\s+function\s+createConnectionId/, 'createConnectionId'],
  ['lib/server/websocket/ids.ts', /export\s+function\s+createClientId/, 'createClientId'],
]
for (const [file, pattern, label] of requiredExports) {
  if (!pattern.test(sources.get(file) ?? '')) failures.push(`${file}: missing export ${label}`)
}

if (!/jsonwebtoken/.test(auth)) failures.push('websocket/auth.ts must own JWT verification')
if (/jsonwebtoken/.test(transport) || /jsonwebtoken/.test(rooms) || /jsonwebtoken/.test(presence)) failures.push('JWT dependency leaked outside websocket/auth.ts')
if (/createServer|WebSocketServer/.test(auth + rooms + presence + transport + eventBus + ids)) failures.push('transport/auth/rooms/presence/event-bus/ids modules must not create the server listener')
if (/JWT_SECRET/.test(server)) failures.push('JWT_SECRET must not be read by websocket-server.ts directly')
if (/setInterval/.test(server) && !server.includes('startHeartbeat')) failures.push('heartbeat interval must be delegated to websocket/presence.ts')

const maxLines = {
  'lib/server/websocket/transport.ts': 120,
  'lib/server/websocket/auth.ts': 190,
  'lib/server/websocket/rooms.ts': 240,
  'lib/server/websocket/presence.ts': 160,
  'lib/server/websocket/event-bus.ts': 80,
  'lib/server/websocket/ids.ts': 60,
}
for (const [file, max] of Object.entries(maxLines)) {
  const lines = countLines(sources.get(file) ?? '')
  if (lines > max) failures.push(`${file}: ${lines} lines exceeds split ceiling ${max}`)
}

if (failures.length) {
  console.error(`[websocket-runtime-split] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[websocket-runtime-split] PASS serverLines=${countLines(server)}, modules=${REQUIRED_FILES.length - 1}`)
