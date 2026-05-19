#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_DIR = path.join(ROOT, 'docs')
const REPORT_FILE = path.join(DOCS_DIR, 'UX_MARKET_STANDARD_SPINE.md')

const CHECKS = [
  {
    id: 'public-chrome-no-inline-style',
    description: 'Public chrome must use the design-system class grammar, not inline style blocks.',
    files: ['components/ui/PublicHeader.tsx', 'components/ui/PublicFooter.tsx'],
    test: (content) => (content.match(/\bstyle=\{/g) ?? []).length,
    limit: 0,
  },
  {
    id: 'public-chrome-mobile-nav',
    description: 'Public header must expose mobile navigation and active-route affordances.',
    files: ['components/ui/PublicHeader.tsx'],
    test: (content) => Number(!content.includes('aria-expanded') || !content.includes('usePathname') || !content.includes('aria-current')),
    limit: 0,
  },
  {
    id: 'auth-three-tier-visible',
    description: 'Login must expose passkey, magic link, OAuth, and password fallback because the backend already supports governed passwordless auth.',
    files: ['app/(auth)/login/login-v2.tsx'],
    test: (content) => {
      const required = ['startAuthentication', 'Continue with passkey', 'Send magic link', 'startOAuth', 'Use password fallback']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'public-entry-no-inline-style',
    description: 'Auth, help, and status entry points must stay on canonical classes so the UI does not collapse into ad hoc spacing and browser defaults.',
    files: [
      'app/(auth)/login/login-v2.tsx',
      'app/(auth)/register/register-v2.tsx',
      'components/auth/AuthExperiencePanel.tsx',
      'app/help/_components/HelpPageClient.tsx',
      'app/help/_components/HelpFaqSections.tsx',
      'app/help/_components/HelpQuickLinks.tsx',
      'app/status/_components/StatusPageClient.tsx',
    ],
    test: (content) => (content.match(/\bstyle=\{/g) ?? []).length,
    limit: 0,
  },
  {
    id: 'landing-copy-language-drift',
    description: 'Landing surfaces must avoid mixed Portuguese/English hardcoded product copy until locale routing owns translation.',
    files: ['app/landing-v3.tsx', 'app/landing-v3-mission-box.tsx', 'app/landing-v3-studio-proof.tsx'],
    test: (content) => (content.match(/\b(missao|poluicao|aprovacao|aprovacoes|decisoes|dominio|automacoes|colecao|ja|estao|nao|so)\b/gi) ?? []).length,
    limit: 0,
  },
  {
    id: 'marketplace-trust-grammar',
    description: 'Marketplace must show verified/community tabs, permissions, provenance, risk, and install confirmation.',
    files: ['app/marketplace/page.tsx', 'app/marketplace/marketplace-page.parts.tsx', 'app/marketplace/marketplace-page.data.ts'],
    combined: true,
    test: (content) => {
      const required = ['trustFilter', 'Permissions', 'Provenance', 'Risk', 'Confirm install', 'verified']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'public-screenshot-billboard',
    description: 'Public entry surfaces must not use raw screenshot billboards as the primary proof.',
    files: ['app/landing-v3.tsx', 'app/pricing/page.tsx', 'app/marketplace/page.tsx', 'components/ui/PublicHeader.tsx', 'components/ui/PublicFooter.tsx'],
    test: (content) => (content.match(/\/screenshots\//g) ?? []).length,
    limit: 0,
  },
  {
    id: 'internal-cockpit-language-drift',
    description: 'Dashboard and IDE cockpit surfaces must not mix Portuguese fallback copy into the premium English shell.',
    files: [
      'components/dashboard/DashboardShell.tsx',
      'components/dashboard/DashboardOverviewTab.tsx',
      'components/dashboard/DashboardWalletTab.tsx',
      'components/dashboard/DashboardCreationWorkbench.tsx',
      'components/dashboard/DashboardCopilotWorkflowBar.tsx',
      'components/dashboard/DashboardRoutingNotice.tsx',
      'components/dashboard/FirstValueGuide.tsx',
      'components/dashboard/aethel-dashboard-entry-triage.ts',
      'components/dashboard/aethel-dashboard-defaults.ts',
      'components/dashboard/aethel-dashboard-livepreview-ai-utils.ts',
      'components/ide/WorkbenchMissionBar.tsx',
      'components/ide/PreviewPanel.tsx',
      'components/ide/PreviewViewport3D.tsx',
      'components/ide/AIChatContextPanels.tsx',
      'components/ide/InlineAIChatMessageSurface.tsx',
      'components/ide/InlineAIChatSections.tsx',
      'components/ide/AIChatPanelContainer.tsx',
      'components/ide/fullscreen/useWorkbenchEntryConvergence.ts',
      'components/ide/fullscreen/workbench-entry-triage.ts',
      'components/ide/fullscreen/useWorkbenchRealtimeCollaboration.ts',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Voce|voce|Contexto|Assistente|Sessao|Fluxo|missao|proxima|proximas|disponivel|Historico|historico|Metricas|metrica|Agentes|conteudo|visualizacao|creditos|credito|assinatura|Retomar|Ocultar|Mostrar|Resetar|Previa|previa|Botao|origem|Abrir|Copiar|Fechar|configuracao|operacao|mudanca|execucao|navegacao|revisao|codigo|autenticacao|transacao|Recebiveis|Referencia|Valor|acoes|producao|secao|saude|estetica|intencao|Quantidade|Transferir|Processando|Atualizado|Recebimento|prontidao|governanca|friccao|mensagens|Tentar)\b/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'studio-surface-orphan-wiring',
    description: 'Scene, Level, and Film Studio surfaces must expose engine-spine modules directly, not only on the hub summary.',
    files: [
      'components/studio/StudioEngineModuleMiniPanel.tsx',
      'components/scene-editor/SceneEditor.tsx',
      'components/engine/LevelEditor.tsx',
      'app/studio/film/FilmStudioClient.tsx',
      'lib/studio/engine-spine-modules.ts',
    ],
    combined: true,
    test: (content) => {
      const required = [
        'StudioEngineModuleMiniPanel',
        'SCENE_ENGINE_MODULES',
        'LEVEL_ENGINE_MODULES',
        'FILM_ENGINE_MODULES',
        'getEngineSpineModulesByIds',
        'behavior-tree-system',
        'world-streaming',
        'cutscene-system',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-engine-spine-evidence',
    description: 'Studio hub must expose hidden engine systems as honest work packets instead of burying paid code behind marketing claims.',
    files: ['app/studio/page.tsx', 'components/studio/EngineSpineReadinessPanel.tsx', 'lib/studio/engine-spine-modules.ts'],
    combined: true,
    test: (content) => {
      const required = ['EngineSpineReadinessPanel', 'ENGINE_SPINE_MODULES', 'adapter-needed', 'worker-held', 'Honest status', 'Next safe move']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'agent-workforce-window-visible',
    description: 'The IDE composer must expose the governed agent workforce with scope locks, replay, and production-state data instead of hiding agent value in backend-only code.',
    files: ['components/agents/AgentsWindow.tsx', 'components/ide/AIChatPanelContainer.tsx'],
    combined: true,
    test: (content) => {
      const required = [
        'AgentsWindow',
        'AgentFleetCoordinatorStrip',
        'production-state/agent-fleet',
        'Composer',
        'Agents',
        'scope locks',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
]

function rel(file) {
  return file.replace(/\\/g, '/')
}

function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf8')
}

const results = []
for (const check of CHECKS) {
  let total = 0
  const fileResults = []
  const contents = []

  for (const file of check.files) {
    const content = read(file)
    if (content === null) {
      total += 1
      fileResults.push({ file, value: 1, note: 'missing' })
      continue
    }

    contents.push(content)

    if (!check.combined) {
      const value = check.test(content)
      total += value
      fileResults.push({ file, value, note: value > 0 ? 'finding' : 'ok' })
    } else {
      fileResults.push({ file, value: 0, note: 'included' })
    }
  }

  if (check.combined) {
    const value = check.test(contents.join('\n'))
    total += value
    fileResults.push({ file: '[combined]', value, note: value > 0 ? 'finding' : 'ok' })
  }

  results.push({ ...check, total, fileResults })
}

fs.mkdirSync(DOCS_DIR, { recursive: true })
const lines = []
lines.push('# UX Market Standard Spine')
lines.push('')
lines.push('Generated by `npm run qa:ux-market-standard`. This gate keeps Aethel aligned with the local UX arsenal: mission-first entry, disciplined public chrome, trust-first marketplace, and no screenshot billboard regressions.')
lines.push('')
lines.push('## Summary')
for (const result of results) {
  lines.push(`- \`${result.id}\`: ${result.total} (limit ${result.limit})`)
}
lines.push('')
lines.push('## Findings')
for (const result of results) {
  lines.push(`### ${result.id}`)
  lines.push('')
  lines.push(result.description)
  lines.push('')
  lines.push('| File | Count | Note |')
  lines.push('| --- | ---: | --- |')
  for (const item of result.fileResults) {
    lines.push(`| \`${rel(item.file)}\` | ${item.value} | ${item.note} |`)
  }
  lines.push('')
}
lines.push('## Policy')
lines.push('')
lines.push('- Public pages must show a compact workflow, not decorative proof walls.')
lines.push('- Public chrome is a design-system surface and should not drift into inline styling.')
lines.push('- Marketplace install flows must expose trust, permissions, provenance, and risk before mutation.')
lines.push('- Locale mixing is blocked on the landing spine until i18n owns route-level language selection.')
lines.push('')

fs.writeFileSync(REPORT_FILE, `${lines.join('\n')}\n`, 'utf8')

const failures = results.filter((result) => result.total > result.limit)
if (failures.length > 0) {
  console.error(`[ux-market-standard] FAIL ${failures.map((result) => `${result.id}=${result.total} limit=${result.limit}`).join('; ')} report=${rel(path.relative(ROOT, REPORT_FILE))}`)
  process.exit(1)
}

console.log(`[ux-market-standard] PASS report=${rel(path.relative(ROOT, REPORT_FILE))}`)
