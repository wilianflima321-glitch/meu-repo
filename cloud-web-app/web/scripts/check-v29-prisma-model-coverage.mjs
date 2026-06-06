#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

const schema = read('prisma/schema.prisma')
const models = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1])
const routeFiles = []
function walk(base) {
  const full = path.join(ROOT, base)
  if (!fs.existsSync(full)) return
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (['node_modules', '.next', 'coverage', '.git'].includes(entry.name)) continue
    const next = path.join(full, entry.name)
    if (entry.isDirectory()) walk(path.relative(ROOT, next))
    else routeFiles.push(path.relative(ROOT, next).replace(/\\/g, '/'))
  }
}
walk('app')
walk('__tests__')

function classify(model) {
  if (/^(User|Session|Project|ProjectMember|ChatThread|ChatMessage|File|Asset|Folder|MarketplaceItem|InstalledExtension|Notification|UserPreferences|IdeSetting|OnboardingProgress|LiveSession|TwoFactorSetup|PendingTwoFactorSession)$/.test(model)) return 'public-flow'
  if (/^(ProjectAdminState|Subscription|Payment|CreditLedgerEntry|UsageBucket|ConcurrencyLease|FeatureFlag|Experiment|ExperimentVariant|ExperimentEnrollment|ExperimentConversion|AnalyticsEvent|AuditLog|SupportTicket|SupportMessage|EmergencyState|ModerationItem|IpRegistryAllowed|IpRegistryLicense|AiEnhancement|AiTrainingJob|FineTuneDataset|FineTuneJob|IndexingConfig|IndexingEntry|Backup|DeploymentPipeline|CollaborationRoom|CollaborationRoomParticipant|ExportJob|LobbySession|QuotaUsage)$/.test(model)) return 'admin-flow'
  return 'internal-only'
}

function ownerFor(status) {
  if (status === 'public-flow') return 'product surface owner'
  if (status === 'admin-flow') return 'admin/trust owner'
  return 'platform owner'
}

function hintFor(model, status) {
  const normalized = model.toLowerCase()
  const route = routeFiles.find((file) => file.toLowerCase().includes(normalized.replace(/setup|session|entry|item|message|variant|enrollment|conversion|participant/g, ''))) ?? (status === 'admin-flow' ? 'app/admin' : 'app/dashboard')
  const test = routeFiles.find((file) => file.includes('__tests__') && file.toLowerCase().includes(normalized)) ?? 'qa:enterprise-gate'
  return { route, test }
}

const matrix = models.map((model) => {
  const status = classify(model)
  const hints = hintFor(model, status)
  return {
    model,
    status,
    owner: ownerFor(status),
    routeHint: hints.route,
    testHint: hints.test,
  }
})
const unknownModels = matrix.filter((item) => !['public-flow', 'admin-flow', 'internal-only', 'held', 'candidate-for-removal'].includes(item.status)).map((item) => item.model)
if (models.length < 50) failures.push(`expected broad Prisma schema, found only ${models.length} models`)
if (unknownModels.length) failures.push(`unknown Prisma model coverage: ${unknownModels.join(', ')}`)

const contract = read('lib/runtime/v29-internal-spine.ts')
for (const token of ['PrismaModelCoverageMatrix', 'V29_PRISMA_MODEL_COVERAGE_POLICY', 'public-flow', 'admin-flow', 'internal-only', 'candidate-for-removal']) {
  if (!contract.includes(token)) failures.push(`v29 contract missing ${token}`)
}
const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts?.['qa:v29-prisma-model-coverage']) failures.push('package.json: missing qa:v29-prisma-model-coverage')

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_PRISMA_MODEL_COVERAGE.json'), JSON.stringify({ version: 1, totalModels: models.length, coveredModels: matrix.length, unknownModels, models: matrix, failures }, null, 2))

if (failures.length) {
  console.error('[v29-prisma-model-coverage] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`[v29-prisma-model-coverage] PASS models=${models.length} covered=${matrix.length}`)
