#!/usr/bin/env node
/**
 * Fix-up codemod: repair missing spaces inside `className={`...`}` template
 * literals that were introduced by the aggressive `trim()` in the legacy-aethel
 * codemod.
 *
 * Symptoms:
 *   className={`${BUTTON_SECONDARY_CLASS}border-red-500 ...`}   // no space
 *   className={`... ${cond ? 'a' : 'b'}hover:bg-... ${x}text-lg`} // no space
 *
 * We ONLY operate inside `className={`...`}` template literals. Inside the
 * literal body we insert a space at:
 *   1)  `}<letter|underscore|opening-bracket>`  (after a `${...}` closing)
 *   2)  `<letter><space>*${`                     (before a `${...}` opening)
 *
 * We are conservative to avoid corrupting math/layout like `${x}px` or
 * `${p}%` – so when the char following `}` is a letter that forms a known
 * CSS unit (`px|em|rem|ch|vh|vw|%|deg|s`) we SKIP. Those are rare in className
 * values anyway (classes never contain raw `px` etc at token start there).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const WEB_DIR = join(process.cwd(), 'cloud-web-app/web')

// Characters that indicate "start of a new className token" when directly
// preceded by a `${expr}`. Letters, underscore and bracket are Tailwind tokens.
const STARTS_NEW_CLASS = /[A-Za-z_\[]/

// Units that should NOT trigger a space insertion (e.g. `${w}px`, `${x}rem`).
// Listed as full token matches right after `}`.
const UNIT_PREFIXES = [
  'px', 'em', 'rem', 'ch', 'vh', 'vw', 'vmin', 'vmax', 'pt', 'pc',
  'mm', 'cm', 'in', 'deg', 'rad', 'turn', 's', 'ms', 'fr',
]

function startsWithUnit(str) {
  for (const u of UNIT_PREFIXES) {
    if (str.startsWith(u)) {
      const after = str[u.length]
      // unit must end (no more letters) – e.g. `px,` `px ` `px)` `px\``
      if (!after || /[^A-Za-z0-9_-]/.test(after)) return true
    }
  }
  return false
}

function fixClassTemplate(body) {
  // Walk through the string tracking `${...}` regions.
  let out = ''
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    // Detect start of ${...}
    if (ch === '$' && body[i + 1] === '{') {
      // Ensure there's a space before the `${` if the previous emitted char
      // looks like the end of a class token (letter/digit/]/)) or `}` from a
      // previous expression (adjacent `${a}${b}` -> `${a} ${b}`).
      const prev = out[out.length - 1]
      if (prev && /[A-Za-z0-9\])}]/.test(prev)) {
        out += ' '
      }
      // Capture the balanced ${...}
      let depth = 0
      let j = i
      while (j < body.length) {
        const c = body[j]
        if (c === '{') depth++
        else if (c === '}') {
          depth--
          if (depth === 0) { j++; break }
        }
        j++
      }
      const exprRaw = body.slice(i + 2, j - 1) // inside the ${...}
      // If the expression itself contains a nested backtick template, recurse
      // into the template bodies so that nested class literals are fixed too.
      const exprFixed = fixNestedTemplates(exprRaw)
      out += '${' + exprFixed + '}'
      i = j
      // Ensure there's a space after the `${...}` if next char starts a new
      // class token and is not a CSS unit.
      const rest = body.slice(i)
      if (rest.length > 0 && STARTS_NEW_CLASS.test(rest[0]) && !startsWithUnit(rest)) {
        out += ' '
      }
      continue
    }
    out += ch
    i++
  }
  // Collapse runs of spaces, but keep a single space.
  return out.replace(/[ \t]{2,}/g, ' ')
}

function fixNestedTemplates(expr) {
  // Replace each `\`...\`` within the expression by recursively fixing
  // its body as if it were a className template.
  let out = ''
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === '`') {
      // find matching backtick (allowing nested ${...} with their own `)
      let j = i + 1
      let depth = 0
      while (j < expr.length) {
        const c = expr[j]
        if (c === '\\') { j += 2; continue }
        if (c === '$' && expr[j + 1] === '{') { depth++; j += 2; continue }
        if (c === '}' && depth > 0) { depth--; j++; continue }
        if (c === '`' && depth === 0) break
        j++
      }
      const body = expr.slice(i + 1, j)
      out += '`' + fixClassTemplate(body) + '`'
      i = j + 1
      continue
    }
    out += ch
    i++
  }
  return out
}

function processFile(file) {
  const original = readFileSync(file, 'utf-8')
  if (!original.includes('className')) return false

  const next = original.replace(
    /(className\s*=\s*\{)(`)([\s\S]*?)\2(\})/g,
    (match, pre, openTick, body, close) => {
      if (!body.includes('${')) return match
      const fixed = fixClassTemplate(body)
      if (fixed === body) return match
      return `${pre}${openTick}${fixed}${openTick}${close}`
    }
  )

  if (next !== original) {
    writeFileSync(file, next)
    return true
  }
  return false
}

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

console.log(`\nTemplate space fix-up done. Touched ${touched} files.`)
