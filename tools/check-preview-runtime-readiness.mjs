#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const envLocalPath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const values = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }
  return values
}

const env = {
  ...parseEnvFile(envLocalPath),
  ...process.env,
}

function isRuntimeConfigured(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return false
  const lowered = normalized.toLowerCase()
  if (lowered.includes('replace_me') || lowered.includes('replace-with')) return false
  if (lowered.includes('example.com')) return false
  return true
}

const provider = String(env.AETHEL_PREVIEW_PROVIDER || '').trim().toLowerCase()
const endpoint = isRuntimeConfigured(env.AETHEL_PREVIEW_PROVISION_ENDPOINT)
  ? String(env.AETHEL_PREVIEW_PROVISION_ENDPOINT || '').trim()
  : ''
const endpoints = isRuntimeConfigured(env.AETHEL_PREVIEW_PROVISION_ENDPOINTS)
  ? String(env.AETHEL_PREVIEW_PROVISION_ENDPOINTS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  : []
const tokenConfigured = isRuntimeConfigured(env.AETHEL_PREVIEW_PROVISION_TOKEN)
const nextPublicRuntimeUrl = String(env.NEXT_PUBLIC_PREVIEW_RUNTIME_URL || '').trim()

const configuredEndpoints = Array.from(new Set([endpoint, ...endpoints].filter(Boolean)))
const effectiveProvider = provider || (configuredEndpoints.length > 0 ? 'custom-endpoint' : 'inline')
const providerMode =
  effectiveProvider === 'webcontainers'
    ? 'browser-side'
    : effectiveProvider === 'inline'
      ? 'inline'
      : 'route-managed'
const routeProvisionSupported = providerMode === 'route-managed'

const blockers = []
const instructions = []
const recommendedCommands = []

if (!fs.existsSync(envLocalPath)) {
  blockers.push('ENV_LOCAL_MISSING')
  instructions.push('Bootstrap local runtime env before validating preview runtime readiness.')
  recommendedCommands.push('npm run setup:local-runtime')
}

if (effectiveProvider === 'inline') {
  blockers.push('MANAGED_PREVIEW_NOT_CONFIGURED')
  instructions.push('No managed preview provider is configured. The product will fall back to local discovery or inline preview.')
  recommendedCommands.push('npm run setup:preview-runtime')
  recommendedCommands.push('Set AETHEL_PREVIEW_PROVIDER=e2b or configure AETHEL_PREVIEW_PROVISION_ENDPOINT')
}

if (routeProvisionSupported && !tokenConfigured) {
  blockers.push('AETHEL_PREVIEW_PROVISION_TOKEN_MISSING')
  instructions.push('Managed preview route provisioning requires AETHEL_PREVIEW_PROVISION_TOKEN.')
  recommendedCommands.push('npm run setup:preview-runtime')
  recommendedCommands.push('Edit cloud-web-app/web/.env.local')
}

if (providerMode === 'browser-side') {
  instructions.push('WebContainers is browser-side-only. Route provisioning is expected to stay unavailable until browser-side boot wiring is complete.')
  recommendedCommands.push('Set NEXT_PUBLIC_PREVIEW_RUNTIME_URL or finish browser-side WebContainers boot path')
}

if (routeProvisionSupported && configuredEndpoints.length === 0 && effectiveProvider !== 'e2b') {
  blockers.push('AETHEL_PREVIEW_PROVISION_ENDPOINT_MISSING')
  instructions.push('Custom managed preview requires AETHEL_PREVIEW_PROVISION_ENDPOINT or AETHEL_PREVIEW_PROVISION_ENDPOINTS.')
}

if (nextPublicRuntimeUrl) {
  instructions.push(`NEXT_PUBLIC_PREVIEW_RUNTIME_URL is set to ${nextPublicRuntimeUrl}. Local preview can bind to this URL if reachable.`)
}

if (blockers.length === 0) {
  instructions.push('Preview env preflight passed. Validate managed provisioning or local runtime detection in the IDE toolbar.')
  recommendedCommands.push('Open /ide and validate Preview runtime toolbar')
}

const summary = {
  envLocalPresent: fs.existsSync(envLocalPath),
  provider: effectiveProvider,
  providerMode,
  routeProvisionSupported,
  configuredEndpoints,
  tokenConfigured,
  nextPublicRuntimeUrl: nextPublicRuntimeUrl || null,
  status: blockers.length === 0 ? 'ready' : 'partial',
  blockers,
  instructions,
  recommendedCommands: Array.from(new Set(recommendedCommands)),
  note: 'CLI preview preflight validates env/provider closure only. Managed preview execution still requires runtime validation in the app.',
}

console.log(JSON.stringify(summary, null, 2))
process.exit(blockers.length === 0 ? 0 : 1)
