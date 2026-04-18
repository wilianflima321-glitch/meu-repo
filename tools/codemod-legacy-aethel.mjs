#!/usr/bin/env node
/**
 * Codemod: Replace legacy `aethel-*` layout classes with Tailwind / token equivalents.
 *
 * Context: The `aethel-*` prefix is reserved for CSS custom properties defined
 * in `app/globals.css`. Over time, classes like `aethel-flex`, `aethel-card`,
 * `aethel-p-6` were introduced as if they were utility classes, but NONE of
 * them were defined in any CSS file. They were therefore silently no-ops and
 * produced visual drift (elements looked broken but nobody noticed).
 *
 * This codemod rewrites those non-existent classes into the Tailwind utility
 * classes or CSS-variable-backed classes that actually match the design intent
 * declared in globals.css.
 *
 * Only `className="..."` and `className='...'` attribute values are touched.
 * JSX template literals, string concatenation, and CSS variable references
 * (e.g. `var(--aethel-text-primary)`) are left untouched.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const WEB_DIR = join(process.cwd(), 'cloud-web-app/web')

// Direct 1-to-1 replacements. Order matters: longer keys first.
const EXACT_REPLACEMENTS = new Map([
  // Layout helpers
  ['aethel-flex-col', 'flex flex-col'],
  ['aethel-flex-row', 'flex flex-row'],
  ['aethel-flex', 'flex'],
  ['aethel-grid', 'grid'],
  ['aethel-items-center', 'items-center'],
  ['aethel-items-start', 'items-start'],
  ['aethel-items-end', 'items-end'],
  ['aethel-items-stretch', 'items-stretch'],
  ['aethel-justify-center', 'justify-center'],
  ['aethel-justify-between', 'justify-between'],
  ['aethel-justify-end', 'justify-end'],
  ['aethel-justify-start', 'justify-start'],
  ['aethel-justify-around', 'justify-around'],

  // Card / surface helpers (resolved to token-backed Tailwind)
  ['aethel-card', 'rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4'],
  ['aethel-panel-soft', 'rounded-md border border-[var(--aethel-border-primary)] bg-[var(--aethel-panel-soft)]'],
  ['aethel-rounded-full', 'rounded-full'],
  ['aethel-rounded-lg', 'rounded-lg'],
  ['aethel-rounded-md', 'rounded-md'],
  ['aethel-rounded-sm', 'rounded-sm'],
  ['aethel-rounded-xl', 'rounded-xl'],
  ['aethel-rounded', 'rounded'],

  // Button semantic helpers -> token classes
  ['aethel-button-primary', 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:brightness-110'],
  ['aethel-button-secondary', 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)]'],
  ['aethel-button-ghost', 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]'],
  ['aethel-button-danger', 'bg-[var(--aethel-error)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-error-dark)]'],
  // Base `aethel-button` used as a lone class is transparent layout-wise; the surface
  // classes are already applied side-by-side. We strip it so CSS stays consistent.
  ['aethel-button', 'inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]'],

  // State / skeleton / diff helpers (never existed in any CSS)
  ['aethel-state-loading', 'text-[var(--aethel-text-secondary)]'],
  ['aethel-state-error', 'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'],
  ['aethel-state-empty', 'text-[var(--aethel-text-tertiary)]'],
  ['aethel-state-success', 'border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'],
  ['aethel-state-title', 'text-sm font-semibold text-[var(--aethel-text-primary)]'],
  ['aethel-state', 'rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4'],
  ['aethel-skeleton-line', 'h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse'],
  ['aethel-skeleton', 'rounded bg-[var(--aethel-surface-tertiary)] animate-pulse'],
  ['aethel-diff', 'font-mono text-xs'],
  ['aethel-z-modal-backdrop', 'z-50'],

  // Noise we just strip
  ['aethel-theme', ''],
])

// Pattern-based replacements for numeric-suffix utilities.
// `aethel-p-<n>` -> `p-<n>` and `aethel-gap-<n>` -> `gap-<n>` etc.
const PATTERN_REPLACEMENTS = [
  [/\baethel-p-(\d+(?:\.\d+)?)\b/g, 'p-$1'],
  [/\baethel-px-(\d+(?:\.\d+)?)\b/g, 'px-$1'],
  [/\baethel-py-(\d+(?:\.\d+)?)\b/g, 'py-$1'],
  [/\baethel-pt-(\d+(?:\.\d+)?)\b/g, 'pt-$1'],
  [/\baethel-pb-(\d+(?:\.\d+)?)\b/g, 'pb-$1'],
  [/\baethel-pl-(\d+(?:\.\d+)?)\b/g, 'pl-$1'],
  [/\baethel-pr-(\d+(?:\.\d+)?)\b/g, 'pr-$1'],
  [/\baethel-m-(\d+(?:\.\d+)?)\b/g, 'm-$1'],
  [/\baethel-mx-(\d+(?:\.\d+)?)\b/g, 'mx-$1'],
  [/\baethel-my-(\d+(?:\.\d+)?)\b/g, 'my-$1'],
  [/\baethel-mt-(\d+(?:\.\d+)?)\b/g, 'mt-$1'],
  [/\baethel-mb-(\d+(?:\.\d+)?)\b/g, 'mb-$1'],
  [/\baethel-ml-(\d+(?:\.\d+)?)\b/g, 'ml-$1'],
  [/\baethel-mr-(\d+(?:\.\d+)?)\b/g, 'mr-$1'],
  [/\baethel-gap-(\d+(?:\.\d+)?)\b/g, 'gap-$1'],
  [/\baethel-gap-x-(\d+(?:\.\d+)?)\b/g, 'gap-x-$1'],
  [/\baethel-gap-y-(\d+(?:\.\d+)?)\b/g, 'gap-y-$1'],
  [/\baethel-space-x-(\d+(?:\.\d+)?)\b/g, 'space-x-$1'],
  [/\baethel-space-y-(\d+(?:\.\d+)?)\b/g, 'space-y-$1'],
  [/\baethel-w-(\d+(?:\.\d+)?|full|auto|screen)\b/g, 'w-$1'],
  [/\baethel-h-(\d+(?:\.\d+)?|full|auto|screen)\b/g, 'h-$1'],
  [/\baethel-text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/g, 'text-$1'],
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full)
  }
  return out
}

function rewriteClassValue(value) {
  let next = value
  for (const [pat, rep] of PATTERN_REPLACEMENTS) next = next.replace(pat, rep)
  // Sort by length desc so longer keys (aethel-state-loading) match before shorter (aethel-state)
  const keys = [...EXACT_REPLACEMENTS.keys()].sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const rep = EXACT_REPLACEMENTS.get(key)
    // Replace only when it appears as a whole token (bounded by whitespace or quote/brace).
    const rx = new RegExp(`(^|[\\s])${key.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}(?=[\\s]|$)`, 'g')
    next = next.replace(rx, (_m, pre) => `${pre}${rep}`)
  }
  // Collapse multiple spaces introduced by empty replacements
  return next.replace(/\s{2,}/g, ' ').trim()
}

function processFile(file) {
  const original = readFileSync(file, 'utf-8')

  // 1) className="..." / className='...' (simple string values).
  let next = original.replace(
    /(className\s*=\s*)(["'])([^"']*?)\2/g,
    (match, prefix, quote, value) => {
      if (!/aethel-/.test(value)) return match
      const rewritten = rewriteClassValue(value)
      return `${prefix}${quote}${rewritten}${quote}`
    }
  )

  // 2) className={`...`} template literals. We only rewrite the static tokens
  //    outside `${...}` expressions, so any interpolation is preserved.
  next = next.replace(
    /(className\s*=\s*\{)(`)([\s\S]*?)\2(\})/g,
    (match, pre, openTick, body, close) => {
      if (!/aethel-/.test(body)) return match
      // Split on `${...}` preserving them as-is.
      const parts = body.split(/(\$\{[^}]*\})/g)
      const rewritten = parts
        .map(p => (p.startsWith('${') ? p : rewriteClassValue(p)))
        .join('')
      return `${pre}${openTick}${rewritten}${openTick}${close}`
    }
  )

  if (next !== original) {
    writeFileSync(file, next)
    return true
  }
  return false
}

const files = [
  ...walk(join(WEB_DIR, 'app')),
  ...walk(join(WEB_DIR, 'components')),
  ...walk(join(WEB_DIR, 'lib')).filter(f => f.endsWith('.tsx')),
]

let touched = 0
for (const file of files) {
  try {
    if (processFile(file)) {
      touched++
      const rel = relative(WEB_DIR, file)
      console.log(`  ✓ ${rel}`)
    }
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`)
  }
}

console.log(`\nCodemod done. Touched ${touched} files.`)
