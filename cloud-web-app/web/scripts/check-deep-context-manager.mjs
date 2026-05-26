import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const files = [
  'lib/ai/deep-context-manager.ts',
  '__tests__/ai/deep-context-manager.test.ts',
]

const failures = []
for (const file of files) {
  if (!fs.existsSync(path.join(ROOT, file))) failures.push(`missing ${file}`)
}

const source = read('lib/ai/deep-context-manager.ts')
const test = read('__tests__/ai/deep-context-manager.test.ts')

const sourceChecks = [
  ['persistence adapter', /interface DeepContextPersistenceAdapter/],
  ['in-memory adapter', /class InMemoryDeepContextPersistenceAdapter/],
  ['durable snapshot', /interface DeepContextMemorySnapshot/],
  ['expanded categories', /'asset'[\s\S]*'research'[\s\S]*'evidence'/],
  ['source refs', /sourceRefs/],
  ['evidence refs', /evidenceRefs/],
  ['token budget', /maxTokens/],
  ['held chunks', /heldChunks/],
  ['bounded agent snapshot', /getSnapshotForAgent/],
  ['compat recall string API', /recallRelevantContext/],
]

for (const [label, pattern] of sourceChecks) {
  if (!pattern.test(source)) failures.push(`deep-context-manager missing ${label}`)
}

const bannedStubPhrases = [
  'Carregaria do banco',
  'Fallback simples',
  'Pinecone/Postgres pgvector',
]
for (const phrase of bannedStubPhrases) {
  if (source.includes(phrase)) failures.push(`deep-context-manager still contains stub phrase: ${phrase}`)
}

const testChecks = [
  ['persist reload scenario', /persists and reloads project memory/],
  ['budget ranking scenario', /respects token\/chunk budgets/],
  ['evidence hold scenario', /holds chunks without evidence/],
  ['agent snapshot scenario', /bounded agent snapshot/],
]

for (const [label, pattern] of testChecks) {
  if (!pattern.test(test)) failures.push(`deep-context-manager test missing ${label}`)
}

if (failures.length) {
  console.error(`[deep-context-manager] FAIL ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[deep-context-manager] PASS persistent memory, evidence refs, token budgets, and bounded snapshots are governed')
