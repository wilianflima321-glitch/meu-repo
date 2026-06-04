#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const files = [
  'app/billing/_components/BillingPageClient.tsx',
  'app/billing/_components/BillingPageClient.parts.tsx',
]
const failures = []

const content = files
  .map((file) => {
    const absolutePath = path.join(ROOT, file)
    if (!fs.existsSync(absolutePath)) {
      failures.push(`missing ${file}`)
      return ''
    }
    return fs.readFileSync(absolutePath, 'utf8')
  })
  .join('\n')

if (content) {
  const required = [
    'BillingLoadingRunboard',
    'data-billing-loading-runboard',
    'Billing status',
    'Cost and checkout status are updating.',
    'Checkout paused',
    'Plans updating',
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
