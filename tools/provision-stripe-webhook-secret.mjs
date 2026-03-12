#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const envLocalPath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

function ensureLine(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const line = `${key}=${value}`
  if (new RegExp(`^${escapedKey}=`, 'm').test(content)) {
    return content.replace(new RegExp(`^${escapedKey}=.*$`, 'm'), line)
  }
  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n'
  return `${content}${suffix}${line}\n`
}

function isConfigured(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return false
  const lowered = normalized.toLowerCase()
  if (lowered.includes('replace_me') || lowered.includes('replace-with')) return false
  if (normalized.endsWith('...')) return false
  return true
}

function buildWebhookUrl(env) {
  const explicit = String(env.STRIPE_WEBHOOK_URL || process.env.STRIPE_WEBHOOK_URL || '').trim()
  if (explicit) return explicit

  const base =
    String(process.env.AETHEL_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
      .trim()
      .replace(/\/+$/, '')
  return `${base}/api/billing/webhook`
}

async function createWebhookEndpoint({ secretKey, webhookUrl }) {
  const body = new URLSearchParams()
  body.set('url', webhookUrl)
  body.append('enabled_events[]', 'checkout.session.completed')
  body.append('enabled_events[]', 'customer.subscription.updated')
  body.append('enabled_events[]', 'customer.subscription.deleted')
  body.append('enabled_events[]', 'invoice.payment_succeeded')
  body.append('enabled_events[]', 'invoice.payment_failed')
  body.set('description', 'Aethel Billing Webhook')

  const response = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const reason = payload?.error?.message || payload?.error?.code || `HTTP_${response.status}`
    throw new Error(`STRIPE_WEBHOOK_CREATE_FAILED: ${reason}`)
  }
  return payload
}

async function main() {
  if (!fs.existsSync(envLocalPath)) {
    console.error('Missing cloud-web-app/web/.env.local')
    process.exit(1)
  }

  const env = {
    ...parseEnvFile(envLocalPath),
    ...process.env,
  }

  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim()
  if (!isConfigured(secretKey)) {
    console.error('STRIPE_SECRET_KEY missing or placeholder in .env.local')
    process.exit(1)
  }

  const currentWebhookSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (isConfigured(currentWebhookSecret)) {
    console.log('STRIPE_WEBHOOK_SECRET already configured. Skipping.')
    process.exit(0)
  }

  const webhookUrl = buildWebhookUrl(env)
  const endpoint = await createWebhookEndpoint({ secretKey, webhookUrl })
  const signingSecret = String(endpoint?.secret || '').trim()
  if (!signingSecret) {
    throw new Error('Stripe endpoint created but signing secret was not returned.')
  }

  const current = fs.readFileSync(envLocalPath, 'utf8')
  const next = ensureLine(current, 'STRIPE_WEBHOOK_SECRET', signingSecret)
  fs.writeFileSync(envLocalPath, next, 'utf8')

  console.log(
    JSON.stringify(
      {
        success: true,
        webhookUrl,
        endpointId: endpoint?.id || null,
        mode: endpoint?.livemode ? 'live' : 'test',
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
