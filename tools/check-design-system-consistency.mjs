#!/usr/bin/env node
/**
 * QA: Design System Consistency Check
 * Verifies canonical design system usage across the codebase.
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const WEB_DIR = join(process.cwd(), 'cloud-web-app/web')
const RESULTS = {
  legacyClasses: [],
  inlineTokens: [],
  hardcodedColors: [],
  missingAriaLabels: [],
  missingFocusRing: [],
}

function walkFiles(dir, ext = ['.tsx', '.ts']) {
  const files = []
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
      try {
        const stat = statSync(full)
        if (stat.isDirectory()) files.push(...walkFiles(full, ext))
        else if (ext.some(e => full.endsWith(e))) files.push(full)
      } catch {}
    }
  } catch {}
  return files
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const relPath = relative(WEB_DIR, filePath)
  const lines = content.split('\n')

  lines.forEach((line, i) => {
    const lineNum = i + 1

    // Check for legacy aethel-* classes (not CSS vars)
    const legacyMatch = line.match(/className.*?aethel-(?!surface|text|border|primary|secondary|info|success|warning|error|accent|bg|panel)/g)
    if (legacyMatch) {
      RESULTS.legacyClasses.push({ file: relPath, line: lineNum, match: legacyMatch[0].slice(0, 80) })
    }

    // Check for inline tokens.colors usage (should use CSS vars)
    if (line.includes('tokens.colors.') && !filePath.includes('design-tokens') && !filePath.includes('primitives')) {
      RESULTS.inlineTokens.push({ file: relPath, line: lineNum })
    }

    // Check for hardcoded hex colors in className
    const hexInClass = line.match(/className.*?#[0-9a-fA-F]{3,8}/g)
    if (hexInClass && !filePath.includes('design-tokens') && !filePath.includes('globals.css')) {
      RESULTS.hardcodedColors.push({ file: relPath, line: lineNum, match: hexInClass[0].slice(0, 60) })
    }

    // Check buttons without aria-label or text content
    if (line.includes('<button') && line.includes('type="button"')) {
      const hasAriaLabel = line.includes('aria-label')
      const hasTextChild = lines.slice(i, i + 3).join('').match(/>[\w\s]+</)
      if (!hasAriaLabel && !hasTextChild) {
        RESULTS.missingAriaLabels.push({ file: relPath, line: lineNum })
      }
    }
  })
}

console.log('🔍 Checking design system consistency...\n')

const files = walkFiles(join(WEB_DIR, 'components')).concat(walkFiles(join(WEB_DIR, 'app')))
files.forEach(checkFile)

console.log(`📂 Scanned ${files.length} files\n`)

if (RESULTS.legacyClasses.length > 0) {
  console.log(`⚠️  Legacy aethel-* classes: ${RESULTS.legacyClasses.length}`)
  RESULTS.legacyClasses.slice(0, 10).forEach(r => console.log(`   ${r.file}:${r.line}`))
  if (RESULTS.legacyClasses.length > 10) console.log(`   ... and ${RESULTS.legacyClasses.length - 10} more`)
}

if (RESULTS.inlineTokens.length > 0) {
  console.log(`⚠️  Inline tokens.colors usage: ${RESULTS.inlineTokens.length}`)
  RESULTS.inlineTokens.slice(0, 10).forEach(r => console.log(`   ${r.file}:${r.line}`))
}

if (RESULTS.hardcodedColors.length > 0) {
  console.log(`⚠️  Hardcoded hex in className: ${RESULTS.hardcodedColors.length}`)
  RESULTS.hardcodedColors.slice(0, 10).forEach(r => console.log(`   ${r.file}:${r.line}`))
}

if (RESULTS.missingAriaLabels.length > 0) {
  console.log(`⚠️  Buttons without aria-label: ${RESULTS.missingAriaLabels.length}`)
  RESULTS.missingAriaLabels.slice(0, 10).forEach(r => console.log(`   ${r.file}:${r.line}`))
}

const total = RESULTS.legacyClasses.length + RESULTS.inlineTokens.length + RESULTS.hardcodedColors.length + RESULTS.missingAriaLabels.length
console.log(`\n${total === 0 ? '✅' : '⚠️'} Total findings: ${total}`)
process.exit(total > 200 ? 1 : 0) // Fail if too many issues
