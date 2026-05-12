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
requirePattern('components/editor/MonacoEditorPro.tsx', /InlineAIChat/, 'Monaco must expose the inline AI chat surface')
requirePattern('components/editor/MonacoEditorPro.actions.ts', /aethel\.inlineChat/, 'Monaco must register a dedicated inline chat action')
requirePattern('components/editor/MonacoEditorPro.actions.ts', /KeyCode\.KeyL/, 'Inline chat must use Cmd/Ctrl+L for Cursor-grade local flow')
requireFile('lib/admin/admin-consolidation.ts', 'admin console must be consolidated into 6 operating areas')
requirePattern('app/admin/admin-ops-layout-client.tsx', /ADMIN_CONSOLIDATED_SECTIONS/, 'admin sidebar must use the consolidated registry')
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
requireFile('app/api/auth/scim/v2/ServiceProviderConfig/route.ts', 'SCIM service provider config must exist')
requireFile('app/api/auth/scim/v2/Users/route.ts', 'SCIM user collection endpoint must exist')
requireFile('app/api/auth/scim/v2/Users/[id]/route.ts', 'SCIM user lifecycle endpoint must exist')
requireFile('app/api/auth/saml/metadata/route.ts', 'SAML metadata endpoint must exist for IdP setup')
requireFile('app/api/auth/saml/login/route.ts', 'SAML redirect login endpoint must exist')
requireFile('app/api/auth/saml/acs/route.ts', 'SAML ACS endpoint must fail safely until assertion validation is enabled')
requirePattern('app/api/security/sso/route.ts', /scimConfigured/, 'SSO readiness must expose SCIM readiness')
requirePattern('app/api/security/sso/route.ts', /samlMetadataUrl/, 'SSO readiness must expose SAML metadata URL')
requirePattern('lib/security/saml.ts', /deflateRawSync/, 'SAML login must use HTTP-Redirect binding compression')
requirePattern('lib/security/saml.ts', /coerceSafeRelayState/, 'SAML login must block open redirect relay states')
requireFile('scripts/check-mobile-pwa-readiness.mjs', 'mobile/PWA readiness gate must exist')
requirePattern('package.json', /qa:mobile-pwa-readiness/, 'enterprise gate must include mobile/PWA readiness')
requirePattern('lighthouserc.js', /'categories:pwa'/, 'Lighthouse must assert PWA readiness')
requireFile('app/offline/page.tsx', 'offline route must exist for installable/mobile experience')
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
