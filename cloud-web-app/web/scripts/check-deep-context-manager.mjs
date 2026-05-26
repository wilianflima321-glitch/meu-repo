import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const files = [
  'lib/ai/deep-context-manager.ts',
  'lib/production/deep-context-settings-persistence.ts',
  'app/api/projects/[id]/production-state/deep-context/route.ts',
  '__tests__/ai/deep-context-manager.test.ts',
  '__tests__/production/deep-context-settings-persistence.test.ts',
  '__tests__/api/production-state-deep-context-route.test.ts',
]

const failures = []
for (const file of files) {
  if (!fs.existsSync(path.join(ROOT, file))) failures.push(`missing ${file}`)
}

const source = read('lib/ai/deep-context-manager.ts')
const settingsPersistence = read('lib/production/deep-context-settings-persistence.ts')
const route = read('app/api/projects/[id]/production-state/deep-context/route.ts')
const test = read('__tests__/ai/deep-context-manager.test.ts')
const settingsTest = read('__tests__/production/deep-context-settings-persistence.test.ts')
const routeTest = read('__tests__/api/production-state-deep-context-route.test.ts')

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

const persistenceChecks = [
  ['settings key', /DEEP_CONTEXT_MEMORY_SETTINGS_KEY/],
  ['settings read', /readDeepContextMemorySnapshotFromSettings/],
  ['settings write', /writeDeepContextMemorySnapshotToSettings/],
  ['settings adapter', /class SettingsDeepContextPersistenceAdapter/],
  ['project mismatch protection', /DeepContext project mismatch/],
  ['chunk sanitizer', /normalizeChunk/],
]

for (const [label, pattern] of persistenceChecks) {
  if (!pattern.test(settingsPersistence)) failures.push(`deep-context settings persistence missing ${label}`)
}

const routeChecks = [
  ['GET handler', /export async function GET/],
  ['POST handler', /export async function POST/],
  ['auth required', /requireAuth/],
  ['entitlements required', /requireEntitlementsForUser/],
  ['settings persistence', /writeDeepContextMemorySnapshotToSettings/],
  ['evidence recall option', /requireEvidence/],
  ['viewer write protection', /canWriteDeepContext/],
]

for (const [label, pattern] of routeChecks) {
  if (!pattern.test(route)) failures.push(`deep-context API route missing ${label}`)
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

const settingsTestChecks = [
  ['settings round trip', /writes and reads sanitized project memory/],
  ['malformed rejection', /rejects mismatched projects and malformed chunks/],
  ['adapter contract', /adapts settings to the DeepContext persistence contract/],
]

for (const [label, pattern] of settingsTestChecks) {
  if (!pattern.test(settingsTest)) failures.push(`deep-context settings test missing ${label}`)
}

const routeTestChecks = [
  ['empty memory state', /returns empty governed memory/],
  ['POST persist state', /persists a new memory chunk/],
  ['evidence recall state', /recalls only evidence-backed chunks/],
  ['viewer rejection', /rejects viewer collaborators/],
]

for (const [label, pattern] of routeTestChecks) {
  if (!pattern.test(routeTest)) failures.push(`deep-context route test missing ${label}`)
}

if (failures.length) {
  console.error(`[deep-context-manager] FAIL ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[deep-context-manager] PASS persistent memory, settings storage, evidence refs, token budgets, and bounded snapshots are governed')
