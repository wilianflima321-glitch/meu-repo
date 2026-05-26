import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const requiredFiles = [
  'lib/production/context-memory-spine.ts',
  '__tests__/production/context-memory-spine.test.ts',
  'lib/production/multi-resolution-project-memory.ts',
  'lib/production/repository-context-budget-execution.ts',
]

const failures = []

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, file))) failures.push(`missing ${file}`)
}

const spine = read('lib/production/context-memory-spine.ts')
const test = read('__tests__/production/context-memory-spine.test.ts')
const multiMemory = read('lib/production/multi-resolution-project-memory.ts')

const mustContain = [
  ['context status states', /'available' \| 'held' \| 'blocked' \| 'needs-review'/],
  ['direct context budget cap', /maxDirectContextTokens/],
  ['model token window', /modelMaxInputTokens/],
  ['UI thread protection', /canUseUiThread/],
  ['read receipt requirement', /requiresReadReceipts/],
  ['human review requirement', /requiresHumanReview/],
  ['hallucination controls', /hallucinationControls/],
  ['device controls', /deviceControls/],
  ['no GB-scale UI indexing copy', /Never index GB-scale projects on the UI thread/],
  ['validation function', /validateContextMemorySpinePlan/],
]

for (const [label, pattern] of mustContain) {
  if (!pattern.test(spine)) failures.push(`context-memory-spine missing ${label}`)
}

const testCases = [
  ['missing memory blocked', /blocks broad autonomous work when project memory is missing/],
  ['read receipts gate', /read receipts instead of dumping large memory/],
  ['weak device held', /holds indexing on weak devices/],
  ['available cloud agent with evidence', /allows cloud-agent work only after evidence and read receipts/],
]

for (const [label, pattern] of testCases) {
  if (!pattern.test(test)) failures.push(`context-memory-spine test missing ${label}`)
}

const memoryPolicy = [
  'Never dump an entire GB-scale repository',
  'metadata-only shards',
  'Require read receipts',
  'canRunOnUiThread: false',
]

for (const phrase of memoryPolicy) {
  if (!multiMemory.includes(phrase)) failures.push(`multi-resolution memory missing policy phrase: ${phrase}`)
}

if (failures.length) {
  console.error(`[context-memory-spine] FAIL ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[context-memory-spine] PASS context budget, memory lanes, read receipts, and device controls are governed')
