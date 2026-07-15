#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const envLocalPath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local')
const envExamplePath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local.example')

function ensureLine(content, key, value, { preserveExisting = false } = {}) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${value}`
  if (pattern.test(content)) {
    if (preserveExisting) {
      const current = content.match(pattern)?.[0]?.slice(key.length + 1).trim()
      if (current) {
        return content
      }
    }
    return content.replace(pattern, line)
  }
  return `${content.trimEnd()}\n${line}\n`
}

if (!fs.existsSync(envExamplePath)) {
  console.error(JSON.stringify({ success: false, error: 'ENV_LOCAL_EXAMPLE_MISSING', path: envExamplePath }, null, 2))
  process.exit(1)
}

let content = fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, 'utf8')
  : fs.readFileSync(envExamplePath, 'utf8')

const placeholders = {
  STRIPE_SECRET_KEY: 'sk_test_replace_me',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_replace_me',
  STRIPE_WEBHOOK_SECRET: 'whsec_replace_me',
  STRIPE_PRICE_STARTER: 'price_starter_replace_me',
  STRIPE_PRICE_BASIC: 'price_basic_replace_me',
  STRIPE_PRICE_PRO: 'price_pro_replace_me',
  STRIPE_PRICE_STUDIO: 'price_studio_replace_me',
  STRIPE_PRICE_ENTERPRISE: 'price_enterprise_replace_me',
}

for (const [key, value] of Object.entries(placeholders)) {
  content = ensureLine(content, key, value, { preserveExisting: true })
}

fs.writeFileSync(envLocalPath, content, 'utf8')

console.log(
  JSON.stringify(
    {
      success: true,
      path: envLocalPath,
      nextSteps: [
        'Replace Stripe placeholders with real values',
        'Register the Stripe webhook endpoint',
        'Run npm run qa:billing-runtime-readiness',
      ],
    },
    null,
    2
  )
)
