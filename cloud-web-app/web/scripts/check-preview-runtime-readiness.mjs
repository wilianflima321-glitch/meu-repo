import fs from 'fs'
import path from 'path'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const provider = String(process.env.AETHEL_PREVIEW_PROVIDER || '').trim().toLowerCase()
const errors = []
const warnings = []

const isRuntimeConfigured = (value) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) return false
  const lowered = normalized.toLowerCase()
  if (lowered.includes('replace_me') || lowered.includes('replace-with')) return false
  if (lowered.includes('example.com')) return false
  return true
}

if (provider === 'e2b') {
  const e2bKey = process.env.E2B_API_KEY
  const template = process.env.AETHEL_PREVIEW_E2B_TEMPLATE
  const allowedHosts = String(process.env.AETHEL_PREVIEW_ALLOWED_HOSTS || '')
  if (!isRuntimeConfigured(e2bKey)) errors.push('E2B_API_KEY')
  if (!isRuntimeConfigured(template)) errors.push('AETHEL_PREVIEW_E2B_TEMPLATE')

  const allowed = allowedHosts.split(',').map((v) => v.trim()).filter(Boolean)
  const allowedSet = new Set(allowed)
  const hostAllowed = allowedSet.has('.e2b.app') || allowedSet.has('e2b.app') || allowedSet.has('.e2b.dev') || allowedSet.has('e2b.dev')
  if (!hostAllowed) warnings.push('AETHEL_PREVIEW_ALLOWED_HOSTS should include .e2b.app or .e2b.dev')
} else if (provider === 'webcontainers') {
  // No required envs beyond provider itself
} else if (provider) {
  // custom-endpoint flow
  const endpoint = process.env.AETHEL_PREVIEW_PROVISION_ENDPOINT || process.env.AETHEL_PREVIEW_PROVISION_ENDPOINTS
  const token = process.env.AETHEL_PREVIEW_PROVISION_TOKEN
  if (!isRuntimeConfigured(endpoint)) errors.push('AETHEL_PREVIEW_PROVISION_ENDPOINT(S)')
  if (!isRuntimeConfigured(token)) errors.push('AETHEL_PREVIEW_PROVISION_TOKEN')
} else {
  errors.push('AETHEL_PREVIEW_PROVIDER')
}

if (errors.length) {
  console.error('Preview runtime readiness failed. Missing or invalid env vars:')
  for (const key of errors) console.error(`- ${key}`)
  process.exit(1)
}

if (warnings.length) {
  console.warn('Preview runtime readiness warnings:')
  for (const msg of warnings) console.warn(`- ${msg}`)
}

console.log('Preview runtime readiness OK (envs present).')
