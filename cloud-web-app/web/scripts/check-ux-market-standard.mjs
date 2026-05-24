#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_DIR = path.join(ROOT, 'docs')
const REPORT_FILE = path.join(DOCS_DIR, 'UX_MARKET_STANDARD_SPINE.md')

const MARKET_REFERENCES = [
  {
    product: 'Linear Agent',
    standard: 'Contextual agent work lives where the user already works; chats, comments, skills, and MCP connections stay permission-aware.',
    source: 'https://linear.app/docs/linear-agent',
  },
  {
    product: 'Cursor Background Agents',
    standard: 'Async agents need visible status, takeover, branch handoff, environment setup, and security disclosure.',
    source: 'https://docs.cursor.com/en/background-agents',
  },
  {
    product: 'OpenAI Realtime API',
    standard: 'Browser voice agents need WebRTC/session state, ephemeral credentials, safety identifiers, tool events, and an obvious interrupt path.',
    source: 'https://platform.openai.com/docs/guides/realtime-webrtc',
  },
  {
    product: 'Gemini Live API',
    standard: 'Live AI interaction needs low-latency audio/video/text, barge-in, tool use, transcripts, and explicit preview/GA capability state.',
    source: 'https://ai.google.dev/gemini-api/docs/live-api/capabilities',
  },
  {
    product: 'v0 Platform API',
    standard: 'Prompt-to-product should expose clean chat, workflows, project management, deployment, and agent APIs without forcing users through an internal cockpit.',
    source: 'https://v0.app/docs/api/platform/overview',
  },
  {
    product: 'Replit Agent',
    standard: 'Agent-first creation works best when the user can preview what will be built before committing and see production primitives nearby.',
    source: 'https://replit.com/blog/2025-replit-in-review',
  },
  {
    product: 'Unreal Engine 5.6',
    standard: 'High-fidelity game tooling needs production-grade performance, asset organization, animation authoring, and runtime evidence before quality claims.',
    source: 'https://www.unrealengine.com/news/unreal-engine-5-6-is-now-available',
  },
  {
    product: 'Adobe Premiere Generative Extend',
    standard: 'Creative AI features should state limits, source media constraints, generated-media storage, and cloud requirements inside the workflow.',
    source: 'https://helpx.adobe.com/in/premiere/desktop/edit-projects/edit-with-generative-ai/generative-extend-overview.html',
  },
  {
    product: 'Canva Magic Studio',
    standard: 'Powerful AI should feel like one place, not a stack of disconnected tools; safety and marketplace trust are part of the creative surface.',
    source: 'https://www.canva.com/en_in/newsroom/news/magic-studio/',
  },
  {
    product: 'Figma Dev Mode',
    standard: 'Professional handoff depends on focus views, ready states, annotations, status, and plugins that reduce context switching.',
    source: 'https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode',
  },
]

const SURFACE_MATRIX = [
  {
    surface: 'Landing',
    route: '/',
    comparator: 'v0 + Replit prompt-first entry',
    decision: 'refine',
    principle: 'One mission input, one primary CTA, proof behind progressive disclosure.',
  },
  {
    surface: 'Auth',
    route: '/login, /register',
    comparator: 'Vercel + Linear auth',
    decision: 'refine',
    principle: 'Passkey, magic link, OAuth, and password fallback must be visible without jargon.',
  },
  {
    surface: 'Pricing',
    route: '/pricing',
    comparator: 'Linear + Vercel pricing',
    decision: 'compress',
    principle: 'Three first-choice plans; advanced comparison and policy details stay collapsed.',
  },
  {
    surface: 'Marketplace',
    route: '/marketplace',
    comparator: 'Canva app marketplace + browser extension permission review',
    decision: 'refine',
    principle: 'Default to verified, show permissions/provenance/risk/rollback before mutation.',
  },
  {
    surface: 'Dashboard',
    route: '/dashboard',
    comparator: 'Linear home + Replit app creation flow',
    decision: 'refine',
    principle: 'Answer active project, running agent, cost, approval, and next action in one glance.',
  },
  {
    surface: 'IDE',
    route: '/ide',
    comparator: 'Cursor agent sidebar',
    decision: 'keep/refine',
    principle: 'Agent status, scope locks, replay, cost, and takeover stay visible near the composer.',
  },
  {
    surface: 'Studio Hub',
    route: '/studio',
    comparator: 'Unreal project browser + Figma focus views',
    decision: 'refine',
    principle: 'Show primary surfaces first; deeper editors behind compact progressive navigation.',
  },
  {
    surface: 'Studio Editors',
    route: '/studio/*',
    comparator: 'Unreal/Unity editor panes',
    decision: 'adapter-needed',
    principle: 'Capability, maturity, runtime mode, evidence, and next action before dense editor controls.',
  },
  {
    surface: 'Cloud Stream',
    route: '/studio/cinematic',
    comparator: 'Unreal Pixel Streaming operations',
    decision: 'held-by-capability',
    principle: 'Available only with configured URL, cost, teardown, session, and runtime evidence.',
  },
  {
    surface: 'Evidence Center',
    route: '/evidence',
    comparator: 'Figma ready-for-dev + Linear activity context',
    decision: 'keep/refine',
    principle: 'Proof, blockers, readiness, and next action beat explanatory copy.',
  },
  {
    surface: 'Admin',
    route: '/admin',
    comparator: 'AWS/Vercel console IA',
    decision: 'hide legacy',
    principle: 'Six visible areas; compatibility drawer closed by default.',
  },
  {
    surface: 'Billing',
    route: '/billing',
    comparator: 'Stripe/Vercel billing',
    decision: 'refine',
    principle: 'Spend, limits, and readiness close to the workflow; no accounting wall.',
  },
  {
    surface: 'Settings',
    route: '/settings',
    comparator: 'Linear workspace settings',
    decision: 'refine',
    principle: 'Grouped decisions, current state, and enterprise paths without duplicated navigation.',
  },
  {
    surface: 'Mobile/PWA',
    route: 'mobile shell',
    comparator: 'Replit mobile + Linear mobile',
    decision: 'refine',
    principle: 'Review, approve, monitor, and resume; heavy editing remains desktop/local.',
  },
]

const SUBAREA_MATRIX = [
  {
    area: 'Landing mission entry',
    surface: '/',
    comparator: 'v0 prompt bar + Replit agent intake',
    critique: 'Good differentiation, but must keep proof and secondary modes behind disclosure so the first action stays obvious.',
    decision: 'keep compact',
  },
  {
    area: 'Public proof and claims',
    surface: '/, /pricing, /marketplace',
    comparator: 'Linear trust pages + Vercel launch pages',
    critique: 'Operational proof beats screenshots and grand claims; every big promise needs readiness, cost, or evidence nearby.',
    decision: 'evidence-first',
  },
  {
    area: 'Pricing first decision',
    surface: '/pricing',
    comparator: 'Linear pricing',
    critique: 'Users should choose between the common paths first; edge-case plans and comparisons should not dominate the first scan.',
    decision: 'compressed',
  },
  {
    area: 'Marketplace trust filters',
    surface: '/marketplace',
    comparator: 'Canva marketplace + browser extension review flows',
    critique: 'Trust tabs, search, and install review are primary; category taxonomies are secondary and should stay collapsible.',
    decision: 'category filters collapsed',
  },
  {
    area: 'Dashboard first answer',
    surface: '/dashboard',
    comparator: 'Linear home + Cursor agent status',
    critique: 'The authenticated home must answer current work, cost, approval, preview, and next action before any cockpit depth.',
    decision: 'one-glance operating state',
  },
  {
    area: 'IDE agent cockpit',
    surface: '/ide',
    comparator: 'Cursor Background Agents',
    critique: 'Agent power is only premium if scope locks, cost, replay, handoff, and takeover are always close to the composer.',
    decision: 'visible governance',
  },
  {
    area: 'AI conversation and live mode',
    surface: '/ide AI Copilot',
    comparator: 'OpenAI Realtime + Gemini Live + Cursor/Codex',
    critique: 'Voice/live cannot be a mystery icon; the UI must expose model lane, native-audio readiness, barge-in, transcript, and tool-use state compactly.',
    decision: 'conversation readiness chips',
  },
  {
    area: 'Studio primary navigation',
    surface: '/studio, /studio/*',
    comparator: 'Unreal project browser + Figma focus views',
    critique: 'Primary editors stay visible; specialized tooling should feel discoverable, not dumped into equal-weight chrome.',
    decision: 'progressive route map',
  },
  {
    area: 'Studio editor readiness',
    surface: '/studio/*',
    comparator: 'Unity package maturity + Unreal editor panels',
    critique: 'Each editor needs maturity, runtime mode, capability, evidence, and one next move before dense controls.',
    decision: 'adapter evidence before tools',
  },
  {
    area: 'Cloud Stream readiness',
    surface: '/studio/cinematic',
    comparator: 'Unreal Pixel Streaming operations',
    critique: 'Cloud render quality must be held unless URL, session lifecycle, teardown, and cost are real.',
    decision: 'held by capability',
  },
  {
    area: 'Evidence production bible',
    surface: '/evidence',
    comparator: 'Figma ready-for-dev + Linear issue evidence',
    critique: 'The Bible can be deep internally, but the UI must reveal summary, blockers, and next action first.',
    decision: 'deep details collapsed',
  },
  {
    area: 'Admin compatibility',
    surface: '/admin',
    comparator: 'AWS/Vercel consoles',
    critique: 'Six premium areas should feel like the product; legacy routes belong behind a closed compatibility drawer.',
    decision: 'legacy hidden',
  },
  {
    area: 'Mobile companion',
    surface: 'PWA/mobile',
    comparator: 'Linear mobile + Replit mobile',
    critique: 'Mobile should monitor, approve, and resume; heavy creative editing remains desktop/local/cloud.',
    decision: 'companion, not desktop clone',
  },
]

const BACKLOG = [
  ['P0', 'Authenticated screenshots', 'Capture real dashboard/IDE/Studio/admin/billing/settings states with JWT instead of relying on auth-gate screenshots.'],
  ['P0', 'Surface density ratchet', 'Keep pricing, landing, marketplace, and Studio nav below card-wall thresholds with progressive disclosure.'],
  ['P1', 'Dashboard first answer', 'The first authenticated screen must show active project, agent run, cost, approval, and next action without scrolling.'],
  ['P1', 'Studio editor readiness headers', 'Every editor route should show capability, runtime, evidence, maturity, and one next action before tools.'],
  ['P1', 'Game asset quality evidence', 'Raw AI draft assets stay blocked from final until provenance, license, LOD, PBR, collision/navmesh, perf trace, playtest, and human approval exist.'],
  ['P2', 'Runtime visual QA', 'Add Lighthouse/axe runtime evidence for public and authenticated routes before promoting WCAG/market-quality claims.'],
  ['P2', 'Storybook expansion', 'Cover Agent Cockpit, CostMeter, runtime selector, Evidence Center, marketplace review, and Studio quality cards.'],
]

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
    description: 'Marketplace must show verified/community tabs, permissions, provenance, risk, rollback, and a review-first install decision.',
    files: ['app/marketplace/page.tsx', 'app/marketplace/marketplace-page.parts.tsx', 'app/marketplace/marketplace-page.data.ts'],
    combined: true,
    test: (content) => {
      const required = ['trustFilter', 'Permissions', 'Provenance', 'Risk', 'Rollback', 'Install preview', 'Request review', 'verified']
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
    files: ['app/studio/page.tsx', 'components/studio/EngineSpineReadinessPanel.tsx', 'components/studio/EngineModuleAdapterCockpit.tsx', 'lib/studio/engine-spine-modules.ts'],
    combined: true,
    test: (content) => {
      const required = ['EngineSpineReadinessPanel', 'EngineModuleAdapterCockpit', 'ENGINE_SPINE_MODULES', 'adapter-needed', 'worker-held', 'Read-only adapter evidence', 'Honest status', 'Next safe move']
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
  {
    id: 'ai-conversation-live-readiness',
    description: 'AI Copilot must expose a compact conversation lane for native audio readiness, barge-in, transcript, and governed tool use.',
    files: ['components/ai-chat/AIChatHeader.tsx'],
    test: (content) => {
      const required = ['Conversation lane', 'Tool use governed', 'Native audio held', 'Barge-in via Stop', 'Transcript via mic fallback']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ai-session-intent-compression',
    description: 'Session handoff shortcuts should stay compact like premium copilot chips, not three explanatory cards.',
    files: ['components/ai-chat/AIChatSessionBanner.tsx'],
    test: (content) => {
      const required = ['Quick intents', 'title={intent.description}', 'rounded-full']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ai-copilot-calm-chrome',
    description: 'AI Copilot chrome must stay calm: no decorative gradients in the header/banner, composer details are progressive, and compact state markers remain explicit.',
    files: [
      'components/ai-chat/AIChatHeader.tsx',
      'components/ai-chat/AIChatComposer.tsx',
      'components/ai-chat/AIChatSessionBanner.tsx',
    ],
    combined: true,
    test: (content) => {
      const required = [
        'data-ai-copilot-header="calm"',
        'data-ai-composer="calm"',
        'data-ai-session-banner="compact"',
        'Composer context',
      ]
      return required.filter((token) => !content.includes(token)).length + (content.match(/bg-\[linear-gradient/g) ?? []).length
    },
    limit: 0,
  },
  {
    id: 'ide-visible-language-drift',
    description: 'Cookie consent, onboarding, command chrome, and viewport controls must not leak Portuguese into screenshots of the authenticated IDE.',
    files: [
      'components/ui/CookieConsent.tsx',
      'components/Onboarding.tsx',
      'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
      'components/ide/modern-shell/chromeHeaderParts.tsx',
      'components/ide/PreviewViewport3D.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Usamos|Apenas|Aceitar|Saiba|Primeiros|concluidos|Reverificar|Parcial|Viewport compacto|Substituir|Diagnosticos|Executar|IA Render|experiencia|Alternar|Pergunte|Selecionado|Pausar|Reproduzir|Tela cheia|Opcionais|Conquistas|Pular|Comecar|Proximo|Desconhecido|Faltam|Status geral|Ferramentas|Empilhar|Dividir)\b/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'ai-copilot-language-drift',
    description: 'IDE chat, live mode, history, tool calls, and context panels must not mix Portuguese fallback copy into the premium AI cockpit.',
    files: [
      'components/ai-chat/AIChatComposer.tsx',
      'components/ai-chat/AIChatHeader.tsx',
      'components/ai-chat/AIChatMessagesPane.tsx',
      'components/ai-chat/AIChatSessionBanner.tsx',
      'components/ai-chat/MessageBubbleActionBar.tsx',
      'components/ide/AIChatContextPanels.tsx',
      'components/ide/AIChatPanelChrome.tsx',
      'components/ide/AIAgentsPanelPro.tsx',
      'components/ide/CommandPalette.tsx',
      'components/ide/IDELayout.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Analisando|correspondencia|semantica|relevancia|resposta|anexo|Novo|Arquivar|Ouvindo|Pensando|Falando|Encerrar|Processo|passos|Concluida|Falhou|andamento|Objetivo|Etapas|Execucao|Executar|Parar|Reiniciar|Compilar|Depurar|Publicar|Preferencias|Paleta|Ajustes|Explorador|Busca|Extensoes|Saida|Problemas|Alternar|Pesquisa|Copiloto|Sincronizado)\b/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'marketplace-filter-compression',
    description: 'Marketplace category taxonomies must stay secondary to search, trust tabs, provenance, and install review.',
    files: ['app/marketplace/marketplace-page.parts.tsx'],
    test: (content) => {
      const required = ['trustFilter', 'Category filters', '<details', 'selectedCategory']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'landing-progressive-disclosure',
    description: 'Landing must reduce mode-card walls by keeping primary modes visible and moving secondary modes behind progressive disclosure.',
    files: ['app/landing-v3.tsx'],
    test: (content) => {
      const required = ['PRIMARY_START_MODES', 'SECONDARY_START_MODES', 'More modes']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'pricing-decision-compression',
    description: 'Pricing must keep the first decision to the common plans and move smaller steps/details out of the primary scan path.',
    files: ['app/pricing/_components/PricingPlansGrid.tsx', 'app/pricing/_components/PricingComparisonTable.tsx', 'app/pricing/_components/PricingFaq.tsx'],
    combined: true,
    test: (content) => {
      const required = ['featuredPlans', 'supportingPlans', 'Most common paths', 'Smaller steps', 'Open smaller plans', '<details', 'Detailed comparison', 'Open only if you need']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-progressive-navigation',
    description: 'Studio must not expose every specialized editor as equal-weight chrome; primary editors stay visible and advanced editors move behind a compact route picker.',
    files: ['app/studio/CreativeStudioShell.tsx', 'app/studio/creative-studio-routes.ts'],
    combined: true,
    test: (content) => {
      const required = ['PRIMARY_CREATIVE_HREFS', 'isPrimaryCreativeStudioRoute', 'primaryCreativeRoutes', 'secondaryCreativeRoutes', 'More editors']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-hub-card-compression',
    description: 'Studio hub must expose primary surfaces first and collapse specialized editors so the user does not meet the entire editor map at once.',
    files: ['app/studio/page.tsx', 'app/studio/creative-studio-routes.ts'],
    combined: true,
    test: (content) => {
      const required = ['primaryStudioRoutes', 'advancedStudioRoutes', 'Primary surfaces', 'Advanced editors', 'isPrimaryCreativeStudioRoute', 'data-studio-surface-board="operator-density"']
      const missing = required.filter((token) => !content.includes(token)).length
      const decorativeDebt = (content.match(/bg-\[(linear|radial)-gradient/g) ?? []).length
      return missing + decorativeDebt
    },
    limit: 0,
  },
  {
    id: 'dashboard-first-answer',
    description: 'Dashboard overview must answer project, run state, cost, approval, evidence, preview, and next action before deep cockpit details.',
    files: ['components/dashboard/DashboardOverviewTab.tsx'],
    test: (content) => {
      const required = ['Active runs', 'Approvals', 'Evidence', 'Preview', 'Next actions', 'Budget', 'Review pending proposal']
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'evidence-detail-compression',
    description: 'Evidence Center must keep the production bible deep internally while showing compact proof and next action first.',
    files: ['components/evidence/EvidenceCenter.tsx'],
    test: (content) => {
      const required = ['Production Bible preview', 'Open production bible details', '<details', 'uxDisclosure', 'nextAction']
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
lines.push('Generated by `npm run qa:ux-market-standard`. This gate keeps Aethel aligned with the local UX arsenal: mission-first entry, disciplined public chrome, trust-first marketplace, progressive Studio navigation, and no screenshot billboard regressions.')
lines.push('')
lines.push('## Market Standards Consulted')
lines.push('')
lines.push('| Product | Standard Aethel Must Match | Source |')
lines.push('| --- | --- | --- |')
for (const reference of MARKET_REFERENCES) {
  lines.push(`| ${reference.product} | ${reference.standard} | ${reference.source} |`)
}
lines.push('')
lines.push('## Surface Quality Matrix')
lines.push('')
lines.push('| Surface | Route | Comparator | Decision | Principle |')
lines.push('| --- | --- | --- | --- | --- |')
for (const surface of SURFACE_MATRIX) {
  lines.push(`| ${surface.surface} | \`${surface.route}\` | ${surface.comparator} | ${surface.decision} | ${surface.principle} |`)
}
lines.push('')
lines.push('## Prioritized UX Backlog')
lines.push('')
lines.push('| Priority | Area | Action |')
lines.push('| --- | --- | --- |')
for (const [priority, area, action] of BACKLOG) {
  lines.push(`| ${priority} | ${area} | ${action} |`)
}
lines.push('')
lines.push('## Subarea Quality Matrix')
lines.push('')
lines.push('| Subarea | Surface | Comparator | Critique | Decision |')
lines.push('| --- | --- | --- | --- | --- |')
for (const subarea of SUBAREA_MATRIX) {
  lines.push(`| ${subarea.area} | \`${subarea.surface}\` | ${subarea.comparator} | ${subarea.critique} | ${subarea.decision} |`)
}
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
