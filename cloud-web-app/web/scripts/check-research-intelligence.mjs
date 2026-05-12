#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

requireFile('lib/production/research-intelligence-bridge.ts', 'research must bridge external sources into Project Brain and Mission Ledger')
requirePattern('lib/production/research-intelligence-bridge.ts', /huggingface-hub/, 'Hugging Face Hub must be a first-class metadata-first source')
requirePattern('lib/production/research-intelligence-bridge.ts', /browser-operator/, 'browser operator research must require replay-aware evidence')
requirePattern('lib/production/research-intelligence-bridge.ts', /confirmed-by-repo/, 'claims must distinguish repo-confirmed evidence')
requirePattern('lib/production/research-intelligence-bridge.ts', /conflicts-with-repo/, 'claims must block conflicts with mapped repo evidence')
requirePattern('lib/production/research-intelligence-bridge.ts', /mergeResearchIntelligenceIntoProductionState/, 'research must merge into durable production state')
requirePattern('lib/production/research-intelligence-bridge.ts', /hf download <repo-id> --dry-run/, 'HF plan must avoid blind GB-scale downloads')
requireFile('app/api/projects/[id]/production-state/research-intelligence/route.ts', 'research intelligence API must exist')
requirePattern('app/api/projects/[id]/production-state/research-intelligence/route.ts', /readRepositoryCartographyManifestFromSettings/, 'research API must link to repository cartography')
requirePattern('app/api/projects/[id]/production-state/research-intelligence/route.ts', /writeAgenticProductionStateToSettings/, 'research API must persist Project Brain and Mission Ledger changes')
requireFile('__tests__/production/research-intelligence-bridge.test.ts', 'research bridge needs production tests')
requireFile('__tests__/api/production-state-research-intelligence-route.test.ts', 'research API needs route tests')
requirePattern('package.json', /qa:research-intelligence/, 'enterprise gate must include research intelligence')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:research-intelligence/, 'enterprise gate must run research intelligence')

if (failures.length) {
  console.error('[research-intelligence] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[research-intelligence] PASS external research is connected to cartography, ledger, and safe tool plans')
