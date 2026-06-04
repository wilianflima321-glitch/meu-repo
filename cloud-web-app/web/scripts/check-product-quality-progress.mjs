#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const failures = []

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'storybook-static', 'dist', 'build'].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, predicate, out)
    } else if (predicate(abs)) {
      out.push(abs)
    }
  }
  return out
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
  }
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) {
    failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
  }
}

function requirePatternAcross(relativePaths, pattern, reason) {
  const missingFiles = relativePaths.filter((relativePath) => !exists(relativePath))
  if (missingFiles.length) {
    failures.push(`${missingFiles.join(', ')}: missing (${reason})`)
    return
  }
  const content = relativePaths.map((relativePath) => read(relativePath)).join('\n')
  if (!pattern.test(content)) {
    failures.push(`${relativePaths.join(' + ')}: missing pattern ${pattern} (${reason})`)
  }
}

const storyFiles = walk(
  path.join(ROOT, 'components'),
  (file) => file.endsWith('.stories.tsx')
)
if (storyFiles.length < 30) {
  failures.push(`Storybook catalogue too small: expected >=30 stories, found ${storyFiles.length}`)
}

requireFile('.storybook/main.ts', 'Storybook config must exist')
requirePattern('.storybook/main.ts', /viteFinal/, 'Storybook must resolve app aliases in Vite builds')
requirePattern('.storybook/main.ts', /'@'\s*:\s*resolve\(__dirname,\s*'\.\.'\)/, 'Storybook must resolve @ to the web root')
requirePattern('../../.gitignore', /\*\*\/storybook-static\//, 'generated Storybook output must stay out of git')

requireFile('../../.github/workflows/lighthouse-ci.yml', 'Lighthouse CI workflow must exist at repo root')
requireFile('lighthouserc.js', 'Lighthouse CI config must exist')

requirePattern('app/layout.tsx', /GlobalCommandSurface/, 'global command surface must wrap app routes')
requirePattern('components/ide/GlobalCommandSurface.tsx', /KeyboardShortcutsDialog/, 'global shortcuts dialog must be wired')
requirePattern('components/ide/GlobalCommandSurface.tsx', /event\.key === '\?'/, 'question-mark shortcut must open help')
requirePattern('components/ide/fullscreen/types.ts', /'research'/, 'Workbench sidebar must expose a research tab')
requirePattern('components/ide/fullscreen/WorkbenchSidebar.tsx', /AethelResearch/, 'agentic research must be available inside the IDE sidebar')
requirePatternAcross(
  ['components/editor/MonacoEditorPro.tsx', 'components/editor/MonacoEditorPro.shell.tsx'],
  /InlineAIChat/,
  'Monaco must expose the inline AI chat surface',
)
requirePattern('components/editor/MonacoEditorPro.actions.ts', /aethel\.inlineChat/, 'Monaco must register a dedicated inline chat action')
requirePattern('components/editor/MonacoEditorPro.actions.ts', /KeyCode\.KeyL/, 'Inline chat must use Cmd/Ctrl+L for Cursor-grade local flow')
requireFile('lib/admin/admin-consolidation.ts', 'admin console must be consolidated into 6 operating areas')
requirePatternAcross(
  [
    'app/admin/admin-ops-layout-client.tsx',
    'app/admin/admin-ops-layout.parts.tsx',
    'app/admin/admin-ops-layout.sidebar.tsx',
    'app/admin/admin-ops-layout.header.tsx',
    'app/admin/admin-ops-layout.model.tsx',
  ],
  /ADMIN_CONSOLIDATED_SECTIONS/,
  'admin sidebar must use the consolidated registry',
)
requirePattern('package.json', /qa:admin-consolidation/, 'enterprise gate must include admin consolidation')
requireFile('lib/project-scaffolds.ts', 'onboarding must have reusable real scaffold definitions')
requirePattern('lib/project-scaffolds.ts', /game-3d/, 'game onboarding scaffold must exist')
requirePattern('lib/project-scaffolds.ts', /film-story/, 'film onboarding scaffold must exist')
requireFile('app/api/onboarding/scaffold/[templateId]/route.ts', 'onboarding must create real scaffolded projects')
requirePattern('app/api/onboarding/scaffold/[templateId]/route.ts', /files:\s*{\s*create:/s, 'scaffold route must persist seed files')
requireFile('lib/server/stripe-connect.ts', 'marketplace must have Stripe Connect payout helpers')
requireFile('app/api/marketplace/creator/connect/route.ts', 'creator payouts must expose a Connect onboarding API')
requirePattern('components/marketplace/CreatorDashboardTabPanels.tsx', /CreatorPayoutConnectCard/, 'creator dashboard must surface payout onboarding')
requirePattern('components/marketplace/CreatorDashboardTabPanels.tsx', /\/api\/marketplace\/creator\/connect/, 'creator dashboard must call the payout onboarding API')
requireFile('prisma/migrations/20260512032000_marketplace_creator_connect/migration.sql', 'creator payout state must have a migration')
requirePattern('app/api/billing/webhook/route.ts', /account\.updated/, 'Stripe webhook must synchronize Connect account status')
requirePattern('app/api/billing/webhook/route.ts', /syncCreatorPayoutAccountStatus/, 'Stripe webhook must update creator payout readiness')
requireFile('lib/security/scim.ts', 'enterprise provisioning must have a SCIM contract')
requireFile('lib/security/saml.ts', 'enterprise SAML must have a service-provider contract')
requireFile('lib/security/enterprise-identity-readiness.ts', 'SAML/SCIM must expose honest readiness vs GA state')
requirePattern('lib/security/enterprise-identity-readiness.ts', /forbiddenClaims/, 'enterprise identity must prevent SAML/SCIM overclaiming')
requirePattern('lib/security/enterprise-identity-readiness.ts', /gaBlockers/, 'enterprise identity must list blockers before self-serve GA')
requireFile('app/api/auth/scim/v2/ServiceProviderConfig/route.ts', 'SCIM service provider config must exist')
requireFile('app/api/auth/scim/v2/Users/route.ts', 'SCIM user collection endpoint must exist')
requireFile('app/api/auth/scim/v2/Users/[id]/route.ts', 'SCIM user lifecycle endpoint must exist')
requireFile('app/api/auth/saml/metadata/route.ts', 'SAML metadata endpoint must exist for IdP setup')
requireFile('app/api/auth/saml/login/route.ts', 'SAML redirect login endpoint must exist')
requireFile('app/api/auth/saml/acs/route.ts', 'SAML ACS endpoint must fail safely until assertion validation is enabled')
requirePattern('app/api/security/sso/route.ts', /scimConfigured/, 'SSO readiness must expose SCIM readiness')
requirePattern('app/api/security/sso/route.ts', /samlMetadataUrl/, 'SSO readiness must expose SAML metadata URL')
requirePattern('app/api/security/sso/route.ts', /enterpriseIdentity/, 'SSO readiness must expose enterprise identity readiness')
requirePattern('lib/security/saml.ts', /deflateRawSync/, 'SAML login must use HTTP-Redirect binding compression')
requirePattern('lib/security/saml.ts', /coerceSafeRelayState/, 'SAML login must block open redirect relay states')
requireFile('lib/server/magic-link.ts', 'auth UX must support governed magic-link login')
requireFile('app/api/auth/magic-link/request/route.ts', 'magic-link request route must exist')
requireFile('app/api/auth/magic-link/verify/route.ts', 'magic-link verify route must exist')
requireFile('lib/server/webauthn-passkeys.ts', 'auth UX must support WebAuthn passkey rollout')
requireFile('components/settings/PasskeysPanel.tsx', 'settings security must expose passkey registration')
requirePattern('app/security/page.tsx', /passkeys in technical rollout/i, 'public security page must describe passkeys accurately')
requirePattern('package.json', /qa:auth-modernization/, 'enterprise gate must include auth modernization QA')
requireFile('scripts/check-mobile-pwa-readiness.mjs', 'mobile/PWA readiness gate must exist')
requirePattern('package.json', /qa:mobile-pwa-readiness/, 'enterprise gate must include mobile/PWA readiness')
requirePattern('lighthouserc.js', /'categories:pwa'/, 'Lighthouse must assert PWA readiness')
requireFile('app/offline/page.tsx', 'offline route must exist for installable/mobile experience')
requireFile('lib/mobile/mobile-companion-contract.ts', 'mobile companion must be a governed control-plane, not a heavy IDE clone')
requirePattern('lib/mobile/mobile-companion-contract.ts', /blockedHeavyRuntimeLanes/, 'mobile companion must block heavy runtime lanes')
requirePattern('lib/mobile/mobile-companion-contract.ts', /Task Evidence Ledger/, 'mobile approvals must require evidence ledger visibility')
requireFile('instrumentation.ts', 'Next.js instrumentation must initialize observability')
requireFile('lib/observability/tracing.ts', 'trace propagation helpers must exist')
requirePattern('lib/observability/tracing.ts', /withTraceSpan/, 'observability must expose span wrappers for long-running jobs')
requirePattern('lib/observability/tracing.ts', /traceparent/, 'observability must propagate W3C traceparent across jobs and APIs')
requireFile('app/api/observability/readiness/route.ts', 'observability readiness endpoint must exist')
requirePattern('app/api/observability/readiness/route.ts', /drainsConfigured/, 'observability readiness must expose drain configuration state')
requirePattern('package.json', /qa:observability-readiness/, 'enterprise gate must include observability readiness')
requireFile('lib/server/agent-observability.ts', 'agent observability must summarize persisted agent runtime state')
requirePattern('app/api/ai/agents/route.ts', /listAgentSnapshots/, 'agent overview must use persisted agent snapshots')
requirePattern('app/api/ai/agents/executions/route.ts', /listAgentSnapshots/, 'agent executions must use persisted agent snapshots')
requirePattern('app/api/ai/agents/metrics/route.ts', /buildAgentMetrics/, 'agent metrics must be derived from persisted agent snapshots')
requirePattern('package.json', /qa:agent-observability/, 'enterprise gate must include agent observability')
requireFile('lib/production/research-intelligence-bridge.ts', 'external research must bridge into repository cartography and Mission Ledger')
requirePattern('lib/production/research-intelligence-bridge.ts', /huggingface-hub/, 'research intelligence must support Hugging Face metadata-first sources')
requirePattern('lib/production/research-intelligence-bridge.ts', /browser-operator/, 'research intelligence must support browser operator replay requirements')
requireFile('app/api/projects/[id]/production-state/research-intelligence/route.ts', 'research intelligence must have a production-state API route')
requirePattern('package.json', /qa:research-intelligence/, 'enterprise gate must include research intelligence')
requireFile('lib/production/agent-read-receipts.ts', 'agents must have read receipts before high-trust apply')
requirePattern('lib/production/agent-read-receipts.ts', /evaluateAgentReadinessForApply/, 'read receipts must gate agent apply readiness')
requirePattern('lib/production/agent-read-receipts.ts', /repository-cartography/, 'read receipts must force Repository Cartography acknowledgement')
requirePattern('lib/production/agent-read-receipts.ts', /research-intelligence/, 'read receipts must force Research Intelligence acknowledgement')
requireFile('app/api/projects/[id]/production-state/read-receipts/route.ts', 'read receipts must have a production-state API route')
requirePattern('app/api/ai/change/apply/route.ts', /applyAiChanges/, 'AI apply route must delegate to the split governed executor')
requirePattern('lib/server/ai-change-apply/types.ts', /enforceReadReceipts/, 'AI apply must support read receipt enforcement in its split request body')
requirePattern('lib/server/ai-change-apply/agent-guards.ts', /evaluateAgentReadinessForApply/, 'AI apply split guards must evaluate read receipt readiness')
requirePattern('components/ai/AgentFleetCoordinatorStrip.tsx', /Agent read receipt details/, 'read receipts must be visible in Agent Fleet UX')
requirePattern('components/ai/AgentFleetCoordinatorStrip.tsx', /Acknowledge context/, 'Agent Fleet must let coordinators acknowledge cartography/research context')
requirePattern('package.json', /qa:agent-read-receipts/, 'enterprise gate must include agent read receipts')
requireFile('lib/agent-orchestrator.ts', 'agent orchestrator must expose the governed specialist fleet')
requirePattern('lib/agent-orchestrator.ts', /huggingface-curator/, 'agent fleet must include Hugging Face metadata curation')
requirePattern('lib/agent-orchestrator.ts', /github-cartographer/, 'agent fleet must include repository cartography specialists')
requirePattern('lib/agent-orchestrator.ts', /browser-operator/, 'agent fleet must include governed browser operation')
requirePattern('package.json', /qa:agent-orchestrator-scale/, 'enterprise gate must include agent orchestrator scale QA')
requireFile('lib/production/agent-tool-bus.ts', 'internal spine must expose a canonical Agent Tool Bus')
requireFile('lib/production/multi-resolution-project-memory.ts', 'internal spine must expose multi-resolution project memory')
requirePattern('lib/production/multi-resolution-project-memory.ts', /planGbScaleProjectIndexing/, 'multi-resolution memory must plan GB-scale indexing without UI thread work')
requireFile('lib/production/task-evidence-ledger.ts', 'internal spine must expose task evidence ledgers')
requireFile('lib/production/browser-operator-safety.ts', 'internal spine must expose Browser Operator safety policy')
requireFile('lib/production/high-risk-action-firewall.ts', 'internal spine must block high-risk autonomous actions')
requireFile('lib/production/engine-module-integration-plan.ts', 'dead/low-import engine modules must have wire-or-retire decisions')
requirePattern('lib/production/engine-module-integration-plan.ts', /validateEngineModuleIntegrationPlan/, 'engine module decisions must be testable')
requirePattern('package.json', /qa:internal-spine/, 'enterprise gate must include internal spine QA')
requirePattern('package.json', /qa:enterprise-identity/, 'enterprise gate must include SAML/SCIM readiness QA')
requirePattern('package.json', /qa:coverage-ratchet/, 'enterprise gate must include coverage ratchet QA')
requirePattern('package.json', /qa:console-ratchet/, 'enterprise gate must include console debt ratchet QA')

const sourceFiles = walk(
  ROOT,
  (file) =>
    /\.(ts|tsx)$/.test(file) &&
    /[\\\/](components|lib)[\\\/]/.test(file) &&
    !/[\\\/]__tests__[\\\/]/.test(file) &&
    !file.endsWith('.stories.tsx')
)
const forbiddenConsole = /\bconsole\.(log|info|debug)\s*\(/
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8')
  if (forbiddenConsole.test(content)) {
    failures.push(`${rel(file)}: console.log/info/debug is not allowed; use logger or an intentional warn/error`)
  }
}

if (failures.length) {
  console.error('[product-quality-progress] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[product-quality-progress] PASS stories=${storyFiles.length}, sourceFiles=${sourceFiles.length}`
)
