#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const failures = []

function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    failures.push(`${file}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function requirePattern(file, pattern, message) {
  const source = read(file)
  if (!pattern.test(source)) failures.push(`${file}: ${message}`)
}

function readAll(files) {
  return files.map((file) => read(file)).join('\n')
}

function requirePatternIn(files, pattern, message) {
  const source = readAll(files)
  if (!pattern.test(source)) failures.push(`${files[0]}: ${message}`)
}

function forbidPatternIn(files, pattern, message) {
  const source = readAll(files)
  if (pattern.test(source)) failures.push(`${files[0]}: ${message}`)
}

function requireOrderIn(files, firstToken, secondToken, message) {
  const source = readAll(files)
  const first = source.indexOf(firstToken)
  const second =
    first === -1 ? -1 : source.indexOf(secondToken, first + firstToken.length)
  if (first === -1 || second === -1 || first > second)
    failures.push(`${files[0]}: ${message}`)
}

function forbidPattern(file, pattern, message) {
  const source = read(file)
  if (pattern.test(source)) failures.push(`${file}: ${message}`)
}

function requireOrder(file, firstToken, secondToken, message) {
  const source = read(file)
  const first = source.indexOf(firstToken)
  const second =
    first === -1 ? -1 : source.indexOf(secondToken, first + firstToken.length)
  if (first === -1 || second === -1 || first > second)
    failures.push(`${file}: ${message}`)
}

const FIRST_FOLD_SURFACES = [
  'app/download/page.tsx',
  'app/marketplace/MarketplaceHero.tsx',
  'app/marketplace/MarketplaceFilters.tsx',
  'app/pricing/_components/PricingHero.tsx',
  'app/contact-sales/contact-sales-content.tsx',
  'app/contact-sales/contact-sales.parts.tsx',
  'app/(auth)/login/login-v2.tsx',
  'components/ai-chat/AIChatHeader.tsx',
  'components/ai-chat/AIChatHeaderActions.tsx',
  'components/ai-chat/AIChatModeMenu.tsx',
  'components/viewport/ViewportAICommandPanel.tsx',
  'components/viewport/ViewportTopToolbar.tsx',
  'components/viewport/SceneViewportInspector.tsx',
  'components/preview/SceneViewportWorkflowDrawer.tsx',
  'components/media/MediaStudioPanels.tsx',
  'components/editors/VFXGraphEditor.tsx',
  'components/animation/AnimationBlueprintEditor.tsx',
  'components/animation/AnimationBlueprintEditorPanels.tsx',
]

function collectProductFiles(dir) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectProductFiles(rel)
    if (!entry.isFile()) return []
    return /\.(tsx|ts)$/.test(entry.name) ? [rel] : []
  })
}

requirePattern(
  'app/(auth)/login/login-v2.tsx',
  /<details[\s\S]*More sign-in options[\s\S]*OAUTH_PROVIDERS/,
  'secondary OAuth providers must stay behind a disclosure instead of competing with passkey/email',
)
requirePattern(
  'app/(auth)/login/login-v2.tsx',
  /<details[\s\S]*Use password fallback/,
  'password login must stay a fallback disclosure on the compact auth door',
)
requirePattern(
  'components/auth/AuthExperiencePanel.tsx',
  /<details[\s\S]*Workspace context[\s\S]*<details[\s\S]*Session signals/,
  'auth side panel proof and stats must stay behind disclosures instead of competing with the form',
)

const DOWNLOAD_SURFACE_FILES = [
  'app/download/page.tsx',
  'app/download/download-page.parts.tsx',
]
requirePatternIn(
  DOWNLOAD_SURFACE_FILES,
  /Open release details/,
  'release matrix and runtime targets must be collapsed behind one public disclosure',
)
requirePatternIn(
  DOWNLOAD_SURFACE_FILES,
  /Open release details[\s\S]*StudioLocalReleaseReadinessMatrix[\s\S]*TARGETS\.map/,
  'download release disclosure must include both release matrix and runtime target details',
)
requirePatternIn(
  DOWNLOAD_SURFACE_FILES,
  /publicRuntimeCopy/,
  'download page must translate internal runtime labels before rendering public copy',
)
forbidPatternIn(
  DOWNLOAD_SURFACE_FILES,
  /Studio Local beta|Break past browser limits|Depth modes|No storage ceiling|Heavy work handoff/,
  'download page must avoid legacy explanatory product copy',
)

forbidPattern(
  'app/marketplace/MarketplaceHero.tsx',
  /License checked|Scoped permissions|Rollback ready/,
  'marketplace hero must not show three proof chips above the fold',
)
requirePattern(
  'app/marketplace/MarketplaceHero.tsx',
  /<details[\s\S]*Review policy[\s\S]*Review stack: license, permissions, provenance, rollback/,
  'marketplace review stack must stay in a concise disclosure',
)
requirePattern(
  'app/pricing/_components/PricingHero.tsx',
  /Simple plans for real work/,
  'pricing hero must keep a short market-grade headline',
)
forbidPattern(
  'app/pricing/_components/PricingHero.tsx',
  /Workbench|Visible readiness|workflow pressure/,
  'pricing hero must not expose internal product jargon',
)
forbidPattern(
  'app/compare/CompareHero.tsx',
  /Studio evidence|EVIDENCE_ITEMS/,
  'compare hero must not show an extra evidence card in the first fold',
)
requirePattern(
  'app/docs/docs-content.tsx',
  /<details[\s\S]*More paths[\s\S]*Procurement pack/,
  'docs hero secondary paths must stay collapsed behind one primary getting-started action',
)
requirePattern(
  'app/docs/procurement-starter-pack/procurement-starter-pack.parts.tsx',
  /More limits[\s\S]*More review links[\s\S]*More questions/,
  'procurement pack must keep limits, secondary artifacts, and secondary FAQs behind disclosures',
)
forbidPattern(
  'app/docs/procurement-starter-pack/procurement-starter-pack.parts.tsx',
  /No overclaim|decorative uptime|invented brands|invented logos/i,
  'procurement pack must use proof/limits language without meta-audit jargon',
)
requirePattern(
  'app/help/_components/HelpQuickLinks.tsx',
  /visibleLinks = links\.slice\(0, 3\)[\s\S]*More help/,
  'help quick links must expose at most three primary paths before overflow',
)
requirePattern(
  'app/contact-sales/contact-sales.parts.tsx',
  /<details[\s\S]*Trust and rollout context[\s\S]*enterpriseFeatures/,
  'contact-sales hero trust links and rollout proof must stay behind disclosure',
)
forbidPattern(
  'app/contact-sales/contact-sales.parts.tsx',
  /<details[\s\S]*Rollout proof points[\s\S]*SALES_PROOF_CARDS/,
  'contact-sales proof cards must not compete with the briefing form',
)
requirePattern(
  'app/contact-sales/contact-sales.parts.tsx',
  /Procurement pack[\s\S]*Public status/,
  'contact-sales aside must expose only the next step plus two proof links',
)
forbidPattern(
  'app/contact-sales/contact-sales.parts.tsx',
  /Recommended starter pack|Signals and buyer FAQ/,
  'contact-sales aside must not show redundant starter-pack or FAQ panels',
)

for (const [file, pattern, message] of [
  [
    'app/docs/docs-content.tsx',
    /Find the live surface|inspect readiness/,
    'docs hero must use guide/action language instead of internal surface/readiness copy',
  ],
  [
    'app/docs/docs-directory-client.tsx',
    /APIs, or surfaces/,
    'docs search placeholder must not expose internal surface language',
  ],
  [
    'app/docs/support/page.tsx',
    /public surfaces|surface or route/,
    'support docs must say page/route instead of internal surface language',
  ],
  [
    'app/docs/changelog/page.tsx',
    /customer proof surface|evidence surfaces|Studio surfaces|Public surfaces|large surfaces|Shipped surfaces/,
    'changelog must describe pages/screens instead of internal surface language',
  ],
  [
    'app/help/_components/help-content.ts',
    /canonical preview surface/,
    'help answers must describe the viewer in customer language',
  ],
  [
    'app/compliance/page.tsx',
    /about readiness|status, readiness|status and readiness/,
    'compliance page must describe controls/current limits, not readiness jargon',
  ],
  [
    'app/security-policy/page.tsx',
    /affected surface|Public surfaces/,
    'security policy must say page/route instead of surface',
  ],  [
    'app/marketplace/marketplace-page.data.ts',
    /Internal preview|Telemetry pending/,
    'marketplace cards must use customer-facing review and usage copy',
  ],
  [
    'components/dashboard/DashboardMainContent.tsx',
    /Agents, readiness and evidence without another cockpit|Surface compressed|full commercial surface/,
    'dashboard activity lane must use calm status/proof copy',
  ],
  [
    'components/dashboard/DashboardOverviewTab.tsx',
    /Preview surface|service readiness/,
    'dashboard overview must not expose internal surface/readiness copy',
  ],
  [
    'components/dashboard/DashboardWorkspaceLaunch.tsx',
    /Studio Local readiness/,
    'dashboard launch should describe user-visible desktop status',
  ],
  [
    'components/dashboard/DashboardProjectsTab.tsx',
    /full cockpit|bg-\[linear-gradient/,
    'projects tab must avoid cockpit copy and decorative gradient chrome',
  ],
  [
    'components/dashboard/FirstValueGuide.tsx',
    /preview readiness|Preview readiness|bg-\[linear-gradient/,
    'first-value guide must use status copy and solid product chrome',
  ],
]) {
  forbidPattern(file, pattern, message)
}

requirePattern(
  'components/viewport/SceneViewportInspector.tsx',
  /className="sr-only">Selection details and safe edits\./,
  'viewport inspector must not show explanatory release-safe copy in the default chrome',
)
requirePattern(
  'components/viewport/SceneViewportInspector.tsx',
  /<details[\s\S]*Advanced gizmo[\s\S]*gizmoConstraint/,
  'advanced gizmo constraints must stay behind disclosure',
)
requirePattern(
  'components/viewport/SceneViewportInspector.tsx',
  /<details[\s\S]*Playtest & prompt[\s\S]*Try: move up 2/,
  'viewport AI/playtest prompt examples must stay behind disclosure',
)
requirePattern(
  'components/ai-chat/AIChatModeMenu.tsx',
  /data-ai-copilot-mode-menu="progressive"/,
  'copilot mode switcher must stay as one compact menu',
)
requirePattern(
  'components/ai-chat/AIChatHeaderActions.tsx',
  /data-ai-copilot-actions-menu="progressive"/,
  'copilot secondary actions must stay in an overflow menu',
)
requirePattern(
  'components/viewport/ViewportAICommandPanel.tsx',
  /<details[\s\S]*Context[\s\S]*Assets:/,
  'viewport contextual guidance and asset intake must stay behind the edit drawer disclosure',
)
forbidPattern(
  'components/viewport/ViewportAICommandPanel.tsx',
  /W\/E\/R tools<\/div>/,
  'viewport chrome must not show tutorial copy by default',
)
forbidPattern(
  'components/viewport/ViewportTopToolbar.tsx',
  /gizmoSummary\.chips/,
  'viewport top toolbar must not render status chips beyond W/E/R, snap, space, and camera',
)

for (const file of FIRST_FOLD_SURFACES) {
  const source = read(file)
  const forbidden = [
    /\bcapabilityStatus\b/,
    /\bmissionLedger\b/,
    /\bCloud held\b/i,
    /\bCloud Stream\b/,
    /\bStudio Local\b/,
    /\bcockpit\b/i,
    /\breadiness\b/i,
  ].filter((pattern) => pattern.test(source))
  if (forbidden.length > 0) {
    failures.push(
      `${file}: first-fold copy still exposes internal capability/readiness jargon`,
    )
  }
}

const COPY_SURFACES = Array.from(
  new Set([
    ...FIRST_FOLD_SURFACES,
    ...collectProductFiles('app'),
    ...collectProductFiles('components'),
  ]),
)

for (const file of COPY_SURFACES) {
  const source = read(file)
  const forbidden = [
    /Selecionar /,
    /Alternar para modo/,
    /Gerar (Musica|Voz|3D|musica|voz)/,
    /Prompt de musica/,
    /Texto de voz/,
    /Ferramenta contextual/,
    /Add novo/,
  ].filter((pattern) => pattern.test(source))
  if (forbidden.length > 0) {
    failures.push(
      `${file}: premium product surface still contains PT-BR control copy`,
    )
  }
}

if (failures.length > 0) {
  console.error(`[public-first-fold-budget] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(
  `[public-first-fold-budget] PASS surfaces=${FIRST_FOLD_SURFACES.length}`,
)
