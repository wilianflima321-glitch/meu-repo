#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const TARGET_FILES = [
  'cloud-web-app/web/app/admin/analytics/page.tsx',
  'cloud-web-app/web/app/admin/apis/page.tsx',
  'cloud-web-app/web/app/admin/collaboration/page.tsx',
  'cloud-web-app/web/app/admin/onboarding/page.tsx',
  'cloud-web-app/web/app/billing/page.tsx',
  'cloud-web-app/web/app/contact/page.tsx',
  'cloud-web-app/web/app/download/page.tsx',
  'cloud-web-app/web/app/forgot-password/page.tsx',
  'cloud-web-app/web/app/health/page.tsx',
  'cloud-web-app/web/app/help/page.tsx',
  'cloud-web-app/web/app/marketplace/page.tsx',
  'cloud-web-app/web/app/pricing/page.tsx',
  'cloud-web-app/web/app/privacy/page.tsx',
  'cloud-web-app/web/app/reset-password/page.tsx',
  'cloud-web-app/web/app/settings/page.tsx',
  'cloud-web-app/web/app/terms/page.tsx',
  'cloud-web-app/web/app/verify-email/page.tsx',
]

const EXACT_REPLACEMENTS = new Map([
  ['aethel-flex', 'flex'],
  ['aethel-flex-col', 'flex-col'],
  ['aethel-items-center', 'items-center'],
  ['aethel-justify-center', 'justify-center'],
  ['aethel-justify-between', 'justify-between'],
  ['aethel-gap-2', 'gap-2'],
  ['aethel-gap-4', 'gap-4'],
  ['aethel-p-1', 'p-1'],
  ['aethel-p-3', 'p-3'],
  ['aethel-p-6', 'p-6'],
  ['aethel-rounded', 'rounded'],
  [
    'aethel-card',
    'rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] shadow-[var(--aethel-shadow-md)]',
  ],
  [
    'aethel-button',
    'inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]',
  ],
  [
    'aethel-button-primary',
    'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)]',
  ],
  [
    'aethel-button-secondary',
    'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)]',
  ],
  [
    'aethel-button-ghost',
    'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]',
  ],
  [
    'aethel-button-danger',
    'bg-[var(--aethel-error)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-error-dark)]',
  ],
  [
    'aethel-state',
    'rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4',
  ],
  ['aethel-state-loading', 'text-[var(--aethel-text-secondary)]'],
  ['aethel-state-empty', 'text-[var(--aethel-text-tertiary)]'],
  [
    'aethel-state-error',
    'border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]',
  ],
  [
    'aethel-state-success',
    'border-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  ],
  ['aethel-state-title', 'text-sm font-semibold text-[var(--aethel-text-primary)]'],
  ['aethel-skeleton-line', 'h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse'],
])

function rewriteClassValue(value) {
  const tokens = value.split(/\s+/).filter(Boolean)
  const rewritten = []

  for (const token of tokens) {
    const replacement = EXACT_REPLACEMENTS.get(token)
    if (replacement) {
      rewritten.push(...replacement.split(/\s+/))
      continue
    }

    if (/^aethel-gap-(\d+)$/.test(token)) {
      rewritten.push(token.replace(/^aethel-/, ''))
      continue
    }

    if (/^aethel-p-(\d+)$/.test(token)) {
      rewritten.push(token.replace(/^aethel-/, ''))
      continue
    }

    rewritten.push(token)
  }

  return [...new Set(rewritten)].join(' ')
}

function rewriteQuotedClassNames(source) {
  return source.replace(
    /(className\s*=\s*)(["'])([^"']*?)\2/g,
    (match, prefix, quote, value) => {
      if (!value.includes('aethel-')) return match
      return `${prefix}${quote}${rewriteClassValue(value)}${quote}`
    },
  )
}

function rewriteTemplateClassNames(source) {
  return source.replace(
    /(className\s*=\s*\{`)([\s\S]*?)(`\})/g,
    (match, prefix, value, suffix) => {
      if (!value.includes('aethel-')) return match

      const parts = value.split(/(\$\{[^}]+\})/g)
      const rewritten = parts
        .map((part) => (part.startsWith('${') ? part : rewriteClassValue(part)))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      return `${prefix}${rewritten}${suffix}`
    },
  )
}

let touched = 0

for (const relativeFile of TARGET_FILES) {
  const file = path.join(ROOT, relativeFile)
  const original = readFileSync(file, 'utf8')
  let next = rewriteQuotedClassNames(original)
  next = rewriteTemplateClassNames(next)

  if (next !== original) {
    writeFileSync(file, next)
    touched += 1
    console.log(`updated ${relativeFile}`)
  }
}

console.log(`done: ${touched} files updated`)
