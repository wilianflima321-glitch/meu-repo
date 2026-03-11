import Stripe from 'stripe'
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
const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_STUDIO',
  'STRIPE_PRICE_ENTERPRISE',
  'STRIPE_PRICE_STARTER_ANNUAL',
  'STRIPE_PRICE_BASIC_ANNUAL',
  'STRIPE_PRICE_PRO_ANNUAL',
  'STRIPE_PRICE_STUDIO_ANNUAL',
  'STRIPE_PRICE_ENTERPRISE_ANNUAL'
]

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error('Missing required Stripe env vars:')
  for (const key of missing) console.error(`- ${key}`)
  process.exit(1)
}

const secretKey = process.env.STRIPE_SECRET_KEY
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY

if (!secretKey.startsWith('sk_')) {
  console.warn('Warning: STRIPE_SECRET_KEY does not start with sk_')
}
if (!publishableKey.startsWith('pk_')) {
  console.warn('Warning: STRIPE_PUBLISHABLE_KEY does not start with pk_')
}

const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })

const planConfigs = [
  { planId: 'starter', monthly: 'STRIPE_PRICE_STARTER', annual: 'STRIPE_PRICE_STARTER_ANNUAL' },
  { planId: 'basic', monthly: 'STRIPE_PRICE_BASIC', annual: 'STRIPE_PRICE_BASIC_ANNUAL' },
  { planId: 'pro', monthly: 'STRIPE_PRICE_PRO', annual: 'STRIPE_PRICE_PRO_ANNUAL' },
  { planId: 'studio', monthly: 'STRIPE_PRICE_STUDIO', annual: 'STRIPE_PRICE_STUDIO_ANNUAL' },
  { planId: 'enterprise', monthly: 'STRIPE_PRICE_ENTERPRISE', annual: 'STRIPE_PRICE_ENTERPRISE_ANNUAL' }
]

let errors = 0

async function validatePrice(planId, priceId, expectedInterval) {
  const price = await stripe.prices.retrieve(priceId)
  if (!price.active) {
    console.error(`Price inactive for ${planId}: ${priceId}`)
    errors += 1
    return
  }
  if (!price.recurring || price.recurring.interval !== expectedInterval) {
    console.error(`Price interval mismatch for ${planId}: expected ${expectedInterval}, got ${price.recurring?.interval || 'none'}`)
    errors += 1
  }
  if (price.currency !== 'usd') {
    console.error(`Price currency mismatch for ${planId}: expected usd, got ${price.currency}`)
    errors += 1
  }

  const productId = typeof price.product === 'string' ? price.product : price.product.id
  const product = await stripe.products.retrieve(productId)
  const planType = (product.metadata?.plan_type || '').toLowerCase()
  if (planType && planType !== planId) {
    console.warn(`Warning: product metadata plan_type mismatch for ${planId}: ${planType}`)
  }
}

async function run() {
  for (const cfg of planConfigs) {
    const monthlyId = process.env[cfg.monthly]
    const annualId = process.env[cfg.annual]
    await validatePrice(cfg.planId, monthlyId, 'month')
    await validatePrice(cfg.planId, annualId, 'year')
  }

  if (errors > 0) {
    console.error(`Stripe billing readiness failed with ${errors} error(s).`)
    process.exit(1)
  }

  console.log('Stripe billing readiness OK.')
}

run().catch((err) => {
  console.error('Stripe billing readiness failed:', err?.message || err)
  process.exit(1)
})


