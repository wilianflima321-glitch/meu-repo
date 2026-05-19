#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'lib/pixel-streaming.ts',
  'lib/pixel-streaming/types.ts',
  'lib/pixel-streaming/codec.ts',
  'lib/pixel-streaming/signaling.ts',
  'lib/pixel-streaming/session.ts',
  'lib/pixel-streaming/cost.ts',
  'lib/pixel-streaming/react.ts',
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
const barrel = sources.get('lib/pixel-streaming.ts') ?? ''

if (countLines(barrel) > 80) failures.push('lib/pixel-streaming.ts must stay a thin compatibility barrel')
if (/class\s+PixelStreamingClient/.test(barrel)) failures.push('PixelStreamingClient implementation must live in lib/pixel-streaming/session.ts')
if (/function\s+usePixelStreaming/.test(barrel)) failures.push('usePixelStreaming implementation must live in lib/pixel-streaming/react.ts')
if (/new\s+WebSocket/.test(barrel)) failures.push('signaling socket creation must not live in the barrel')

const requiredExports = [
  ['lib/pixel-streaming/types.ts', /export\s+interface\s+PixelStreamingConfig/, 'PixelStreamingConfig'],
  ['lib/pixel-streaming/types.ts', /export\s+interface\s+StreamingStats/, 'StreamingStats'],
  ['lib/pixel-streaming/codec.ts', /export\s+const\s+DEFAULT_CONFIG/, 'DEFAULT_CONFIG'],
  ['lib/pixel-streaming/codec.ts', /export\s+function\s+prioritizeSdpCodec/, 'prioritizeSdpCodec'],
  ['lib/pixel-streaming/codec.ts', /export\s+class\s+AdaptiveQualityController/, 'AdaptiveQualityController'],
  ['lib/pixel-streaming/signaling.ts', /export\s+class\s+PixelStreamingSignalingClient/, 'PixelStreamingSignalingClient'],
  ['lib/pixel-streaming/session.ts', /export\s+class\s+PixelStreamingClient/, 'PixelStreamingClient'],
  ['lib/pixel-streaming/cost.ts', /export\s+function\s+estimatePixelStreamingCost/, 'estimatePixelStreamingCost'],
  ['lib/pixel-streaming/react.ts', /export\s+function\s+usePixelStreaming/, 'usePixelStreaming'],
]

for (const [file, pattern, label] of requiredExports) {
  if (!pattern.test(sources.get(file) ?? '')) failures.push(`${file}: missing export ${label}`)
}

const session = sources.get('lib/pixel-streaming/session.ts') ?? ''
if (!session.includes("from './signaling'")) failures.push('session.ts must depend on the signaling boundary')
if (!session.includes("from './codec'")) failures.push('session.ts must depend on the codec boundary')
if (/new\s+WebSocket/.test(session)) failures.push('session.ts must not create WebSocket directly')
if (!/PixelStreamingSignalingClient/.test(session)) failures.push('session.ts must use PixelStreamingSignalingClient')

const signaling = sources.get('lib/pixel-streaming/signaling.ts') ?? ''
if (!/new\s+WebSocket/.test(signaling)) failures.push('signaling.ts must own WebSocket creation')
if (/RTCPeerConnection/.test(signaling)) failures.push('signaling.ts must not own WebRTC session state')

const codec = sources.get('lib/pixel-streaming/codec.ts') ?? ''
if (/new\s+WebSocket|RTCPeerConnection|RTCDataChannel/.test(codec)) failures.push('codec.ts must stay pure policy/stats logic')

const cost = sources.get('lib/pixel-streaming/cost.ts') ?? ''
if (/new\s+WebSocket|RTCPeerConnection|RTCDataChannel/.test(cost)) failures.push('cost.ts must not depend on transport/runtime APIs')

const react = sources.get('lib/pixel-streaming/react.ts') ?? ''
if (!react.includes("'use client'")) failures.push('react.ts must be explicitly client-only')
if (!react.includes("from './session'")) failures.push('react.ts must consume the session boundary')

const maxLines = {
  'lib/pixel-streaming/session.ts': 900,
  'lib/pixel-streaming/codec.ts': 360,
  'lib/pixel-streaming/signaling.ts': 140,
  'lib/pixel-streaming/cost.ts': 140,
  'lib/pixel-streaming/react.ts': 180,
}

for (const [file, limit] of Object.entries(maxLines)) {
  const lines = countLines(sources.get(file) ?? '')
  if (lines > limit) failures.push(`${file}: ${lines} lines exceeds split ceiling ${limit}`)
}

if (failures.length) {
  console.error(`[pixel-streaming-split] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[pixel-streaming-split] PASS files=${REQUIRED_FILES.length}, barrelLines=${countLines(barrel)}, sessionLines=${countLines(session)}`)
