#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const file = 'app/billing/_components/BillingPageClient.tsx'
const absolutePath = path.join(ROOT, file)
const failures = []

if (!fs.existsSync(absolutePath)) {
  failures.push(`missing ${file}`)
} else {
  const content = fs.readFileSync(absolutePath, 'utf8')
  const required = [
    'BillingLoadingRunboard',
    'data-billing-loading-runboard',
    'Billing runboard',
    'Cost and checkout readiness are syncing.',
    'Checkout guarded',
    'Plans syncing',
    'primaryPlanIds',
    'data-billing-primary-decision',
    'Compare starter, free, and enterprise options',
    '<details',
    'useState(false)',
  ]
  const forbidden = ['Loading plans...']

  for (const token of required) {
    if (!content.includes(token)) failures.push(`missing ${token}`)
  }
  for (const token of forbidden) {
    if (content.includes(token)) failures.push(`forbidden ${token}`)
  }
}

if (failures.length > 0) {
  console.error(`[billing-loading-runboard] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[billing-loading-runboard] PASS loading state is evidence-first')
