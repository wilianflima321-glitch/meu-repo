#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const envLocalPath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local')
const requiredPriceKeys = [
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_STUDIO',
  'STRIPE_PRICE_ENTERPRISE',
]

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
  if (normalized.endsWith('...')) return false
  return true
}

const secretKeyConfigured = isRuntimeConfigured(env.STRIPE_SECRET_KEY)
const publishableKeyConfigured = isRuntimeConfigured(env.STRIPE_PUBLISHABLE_KEY)
const webhookSecretConfigured = isRuntimeConfigured(env.STRIPE_WEBHOOK_SECRET)
const configuredPrices = requiredPriceKeys.filter((key) => isRuntimeConfigured(env[key]))
const missingEnv = [
  ...(secretKeyConfigured ? [] : ['STRIPE_SECRET_KEY']),
  ...(publishableKeyConfigured ? [] : ['STRIPE_PUBLISHABLE_KEY']),
  ...(webhookSecretConfigured ? [] : ['STRIPE_WEBHOOK_SECRET']),
  ...requiredPriceKeys.filter((key) => !isRuntimeConfigured(env[key])),
]

const checkoutReady = secretKeyConfigured && publishableKeyConfigured && configuredPrices.length === requiredPriceKeys.length
const portalReady = secretKeyConfigured
const webhookReady = secretKeyConfigured && webhookSecretConfigured
const blockers = []
const instructions = []
const recommendedCommands = []

if (!fs.existsSync(envLocalPath)) {
  blockers.push('ENV_LOCAL_MISSING')
  instructions.push('Bootstrap local runtime env before validating billing.')
  recommendedCommands.push('npm run setup:local-runtime')
}
if (!secretKeyConfigured) blockers.push('STRIPE_SECRET_KEY_MISSING')
if (!publishableKeyConfigured) blockers.push('STRIPE_PUBLISHABLE_KEY_MISSING')
if (!webhookSecretConfigured) blockers.push('STRIPE_WEBHOOK_SECRET_MISSING')
if (configuredPrices.length !== requiredPriceKeys.length) blockers.push('STRIPE_PRICE_IDS_INCOMPLETE')

if (blockers.length > 0) {
  instructions.push('Populate Stripe billing envs in cloud-web-app/web/.env.local before claiming billing-ready runtime.')
  recommendedCommands.push('npm run setup:billing-runtime')
  recommendedCommands.push('Edit cloud-web-app/web/.env.local')
  recommendedCommands.push('GET /api/billing/readiness')
} else {
  instructions.push('Billing env preflight passed. Validate checkout, portal, and webhook flow against a live Stripe project.')
  recommendedCommands.push('Open /pricing and complete a checkout flow')
  recommendedCommands.push('Trigger a Stripe webhook to /api/billing/webhook')
}

const summary = {
  envLocalPresent: fs.existsSync(envLocalPath),
  status: checkoutReady && portalReady && webhookReady ? 'ready' : 'partial',
  checkoutReady,
  portalReady,
  webhookReady,
  configuredPriceCount: configuredPrices.length,
  requiredPriceCount: requiredPriceKeys.length,
  missingEnv,
  blockers,
  instructions,
  recommendedCommands: Array.from(new Set(recommendedCommands)),
  note: 'CLI billing preflight validates env closure only. Gateway config and live Stripe webhook registration still require runtime validation.',
}

console.log(JSON.stringify(summary, null, 2))
process.exit(blockers.length === 0 ? 0 : 1)
