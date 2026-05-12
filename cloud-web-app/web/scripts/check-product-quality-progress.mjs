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
requireFile('app/api/auth/scim/v2/ServiceProviderConfig/route.ts', 'SCIM service provider config must exist')
requireFile('app/api/auth/scim/v2/Users/route.ts', 'SCIM user collection endpoint must exist')
requireFile('app/api/auth/scim/v2/Users/[id]/route.ts', 'SCIM user lifecycle endpoint must exist')
requirePattern('app/api/security/sso/route.ts', /scimConfigured/, 'SSO readiness must expose SCIM readiness')
requireFile('scripts/check-mobile-pwa-readiness.mjs', 'mobile/PWA readiness gate must exist')
requirePattern('package.json', /qa:mobile-pwa-readiness/, 'enterprise gate must include mobile/PWA readiness')
requirePattern('lighthouserc.js', /'categories:pwa'/, 'Lighthouse must assert PWA readiness')
requireFile('app/offline/page.tsx', 'offline route must exist for installable/mobile experience')

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
