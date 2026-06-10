// Executable UX market checks for qa:ux-market-standard.
// Split so the gate remains maintainable under the large-file ratchet.
export const PRODUCT_UX_CHECKS = [
  {
    id: 'internal-cockpit-language-drift',
    description:
      'Dashboard and IDE cockpit surfaces must not mix Portuguese fallback copy into the premium English shell.',
    files: [
      'components/dashboard/DashboardShell.tsx',
      'components/dashboard/DashboardOverviewTab.tsx',
      'components/dashboard/DashboardWorkspaceLaunch.tsx',
      'components/dashboard/DashboardRoutingNotice.tsx',
      'components/dashboard/FirstValueGuide.tsx',
      'components/dashboard/aethel-dashboard-entry-triage.ts',
      'components/dashboard/aethel-dashboard-defaults.ts',
      'components/dashboard/aethel-dashboard-livepreview-ai-utils.ts',
      'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
      'components/ide/PreviewPanel.tsx',
      'components/ide/fullscreen/WorkbenchPreviewPane.tsx',
      'components/preview/SceneViewportSurface.tsx',
      'components/preview/PreviewContextDock.tsx',
      'components/viewport/ViewportTopToolbar.tsx',
      'components/viewport/ViewportAICommandPanel.tsx',
      'components/ide/AIChatContextPanels.tsx',
      'components/ide/InlineAIChatMessageSurface.tsx',
      'components/ide/InlineAIChatSections.tsx',
      'components/ide/AIChatPanelContainer.tsx',
      'components/agents/chat/session/useAIChatSessionContext.ts',
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
    description:
      'Scene, Level, and Film Studio surfaces must expose engine-spine modules directly, not only on the hub summary.',
    files: [
      'components/studio/StudioEngineModuleMiniPanel.tsx',
      'components/scene-editor/SceneEditor.tsx',
      'components/engine/LevelEditor.tsx',
      'app/studio/film/FilmStudioClient.tsx',
      'lib/studio/engine-spine-modules.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'StudioEngineModuleMiniPanel',
        'SCENE_ENGINE_MODULES',
        'LEVEL_ENGINE_MODULES',
        'FILM_ENGINE_MODULES',
        'showWorldSystems',
        'Context drawer',
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
    id: 'studio-level-editor-panel-polish',
    description:
      'Level editor outliner and inspector must feel like compact production tools, not prototype panels.',
    files: ['components/engine/LevelEditorPanels.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'Level editor command toolbar',
        'Move',
        'Rotate',
        'Scale',
        'Scene hierarchy',
        'Context-aware properties',
        'No selection',
        'No objects yet',
        'W/E/R transform',
        'objects',
      ]
      const forbidden = ['Details -']
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'studio-engine-spine-evidence',
    description:
      'Studio hub must expose hidden engine systems as honest work packets instead of burying paid code behind marketing claims.',
    files: [
      'app/studio/page.tsx',
      'components/studio/EngineSpineReadinessPanel.tsx',
      'components/studio/EngineModuleAdapterCockpit.tsx',
      'lib/studio/engine-spine-modules.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'EngineSpineReadinessPanel',
        'EngineModuleAdapterCockpit',
        'ENGINE_SPINE_MODULES',
        'adapter-needed',
        'worker-held',
        'Read-only adapter evidence',
        'Honest status',
        'Next safe move',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'agent-workforce-window-visible',
    description:
      'The IDE composer must expose the governed agent workforce with scope locks, replay, and production-state data instead of hiding agent value in backend-only code.',
    files: [
      'components/agents/AgentsWindow.tsx',
      'components/ide/AIChatPanelContainer.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'AgentsWindow',
        'AgentFleetCoordinatorStrip',
        'production-state/agent-fleet',
        'Copilot',
        'Agents',
        'scope locks',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ai-conversation-live-readiness',
    description:
      'AI Copilot must expose a compact conversation lane for native audio readiness, barge-in, transcript, and governed tool use.',
    files: ['components/ai-chat/AIChatAgentLane.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'Agent lane',
        'Tool use',
        'Audio held',
        'Barge-in via Stop',
        'Transcript fallback',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ai-session-intent-compression',
    description:
      'Session handoff shortcuts should stay compact like premium copilot chips, not three explanatory cards.',
    files: ['components/agents/chat/session/AIChatSessionBanner.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'Quick intents',
        'title={intent.description}',
        'rounded-full',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ai-copilot-calm-chrome',
    description:
      'AI Copilot chrome must stay calm: no decorative gradients in the header/banner, composer details are progressive, and compact state markers remain explicit.',
    files: [
      'components/ai-chat/AIChatHeader.tsx',
      'components/ai-chat/AIChatModeMenu.tsx',
      'components/ai-chat/AIChatHeaderActions.tsx',
      'components/ai-chat/AIChatAgentLane.tsx',
      'components/ai-chat/AIChatComposer.tsx',
      'components/agents/chat/session/AIChatSessionBanner.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'data-ai-copilot-header="calm"',
        'data-ai-composer="calm"',
        'data-ai-session-banner="compact"',
        'Composer context',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        (content.match(/bg-\[linear-gradient/g) ?? []).length
      )
    },
    limit: 0,
  },
  {
    id: 'ide-visible-language-drift',
    description:
      'Cookie consent, onboarding, command chrome, and viewport controls must not leak Portuguese into screenshots of the authenticated IDE.',
    files: [
      'components/ui/CookieConsent.tsx',
      'components/Onboarding.tsx',
      'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
      'components/ide/modern-shell/chromeHeaderParts.tsx',
      'components/ide/fullscreen/WorkbenchPreviewPane.tsx',
      'components/preview/SceneViewportSurface.tsx',
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
    description:
      'IDE chat, live mode, history, tool calls, and context panels must not mix Portuguese fallback copy into the premium AI cockpit.',
    files: [
      'components/ai-chat/AIChatComposer.tsx',
      'components/ai-chat/AIChatHeader.tsx',
      'components/ai-chat/AIChatModeMenu.tsx',
      'components/ai-chat/AIChatModelPicker.tsx',
      'components/ai-chat/AIChatHeaderActions.tsx',
      'components/ai-chat/AIChatAgentLane.tsx',
      'components/agents/chat/messages/AIChatMessagesPane.tsx',
      'components/agents/chat/session/AIChatSessionBanner.tsx',
      'components/agents/chat/messages/MessageBubbleActionBar.tsx',
      'components/ide/AIChatContextPanels.tsx',
      'components/ide/AIChatPanelChrome.tsx',
      'components/agents/AgentsWindow.tsx',
      'components/ide/CommandPalette.tsx',
      'components/ide/CommandPalette.parts.tsx',
      'components/ide/InlineAIChatComposerSurface.tsx',
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
    id: 'ai-cockpit-compact-rail',
    description:
      'IDE copilot must use a compact Copilot/Agents rail with receipts, not explanatory tab cards that compete with the conversation.',
    files: ['components/ide/AIChatPanelContainer.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'data-ai-cockpit-rail="compact"',
        'cost metered',
        'replay ready',
        'Copilot',
        'Agents',
      ]
      const forbidden = ['Chat, voice, files', 'Locks, replay, cost']
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'command-palette-composition',
    description:
      'Command palette must stay split into a small shell plus typed command/search utilities, matching premium IDE maintainability.',
    files: [
      'components/ide/CommandPalette.tsx',
      'components/ide/CommandPalette.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'CommandPalette.parts',
        'createDefaultCommands',
        'fuzzyMatch',
        'highlightMatches',
      ]
      const main = read('components/ide/CommandPalette.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'function fuzzyMatch',
        'function highlightMatches',
        'const CATEGORY_ICONS',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 500 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'file-explorer-composition',
    description:
      'IDE file explorer must stay split into a compact data shell plus reusable tree/context menu parts.',
    files: [
      'components/ide/FileExplorerPro.tsx',
      'components/ide/FileExplorerPro.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'FileExplorerPro.parts',
        'FileTreeNode',
        'ContextMenu',
        'mapWorkspaceNode',
        'resolveProjectIdFromClient',
      ]
      const main = read('components/ide/FileExplorerPro.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'function FileTreeNode',
        'function ContextMenu',
        'const FILE_ICONS',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 430 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'preview-runtime-toolbar-composition',
    description:
      'Preview runtime toolbar must keep copy, metrics, chips, and status helpers outside the JSX-heavy shell.',
    files: [
      'components/ide/PreviewRuntimeToolbar.tsx',
      'components/ide/PreviewRuntimeToolbar.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'PreviewRuntimeToolbar.parts',
        'PREVIEW_RUNTIME_COPY',
        'CompactMetric',
        'getDeployStatusLabel',
      ]
      const main = read('components/ide/PreviewRuntimeToolbar.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'const PREVIEW_RUNTIME_COPY',
        'function CompactMetric',
        'function getReviewTargetBadge',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 590 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'inline-completion-composition',
    description:
      'Inline completion must keep provider, ghost text, status, and settings separate from the runtime shell.',
    files: [
      'components/ide/InlineCompletion.tsx',
      'components/ide/InlineCompletion.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'InlineCompletion.parts',
        'GhostTextProvider',
        'GhostTextOverlay',
        'CompletionSettings',
        'CompletionStatusBar',
      ]
      const main = read('components/ide/InlineCompletion.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'class GhostTextProvider',
        'function GhostTextOverlay',
        'function CompletionSettings',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 220 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'preview-panel-composition',
    description:
      'Deprecated IDE preview panel must keep render builders and mode resolution in a parts module until it is fully retired.',
    files: [
      'components/ide/PreviewPanel.tsx',
      'components/ide/PreviewPanel.parts.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'PreviewPanel.parts',
        'resolvePreviewMode',
        'buildJavaScriptPreview',
        'MAX_INLINE_PREVIEW_CHARS',
      ]
      const main = read('components/ide/PreviewPanel.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'function markdownToHtml',
        'function buildCssPreview',
        'const IMAGE_EXTENSIONS',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 320 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'ide-status-bar-composition',
    description:
      'IDE status bar must stay contextual and compact: metrics/builders live in parts, shell only lays out left and right lanes.',
    files: [
      'components/ide/modern-shell/chromeStatusBar.tsx',
      'components/ide/modern-shell/chromeStatusBar.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'chromeStatusBar.parts',
        'buildDiagnosticsMetrics',
        'buildSourceControlMetrics',
        'buildRuntimeMetric',
      ]
      const main = read('components/ide/modern-shell/chromeStatusBar.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'function buildDiagnosticsMetrics',
        'function buildSourceControlMetrics',
        'function formatFileLabel',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 230 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'preview-ai-action-no-gradient',
    description:
      'Preview inspect action should live in a compact edit menu and feel like product chrome, not a decorative 2022 magic-wand gradient.',
    files: [
      'components/preview/RuntimePreviewSurface.tsx',
      'components/preview/PreviewContextDock.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'data-preview-context-menu="collapsed"',
        'Preview edit menu',
        'Inspect with AI',
        'aria-label="Inspect preview with AI"',
        'bg-[var(--aethel-surface-elevated)]',
      ]
      const forbidden = [
        'Magic Wand - Click an element to edit with AI',
        'aria-label="Magic Wand"',
        'bg-[linear-gradient',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'viewport-progressive-edit-menu',
    description:
      '3D viewport editing must stay hidden behind a compact command menu like professional creative tools, instead of pinning a dense AI form over the canvas.',
    files: ['components/viewport/ViewportAICommandPanel.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'data-viewport-context-menu="collapsed"',
        'data-viewport-context-menu="expanded"',
        'Open viewport edit menu',
        'Viewport edit menu',
        'Apply safe edits',
      ]
      const forbidden = ['Informative AI']
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'viewport-top-toolbar-compact',
    description:
      'Viewport top chrome must behave like a compact creative tool rail with camera presets behind a view menu.',
    files: ['components/viewport/ViewportTopToolbar.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'data-viewport-top-toolbar="compact"',
        'Viewport compact tool rail',
        'data-viewport-camera-menu="progressive"',
        'View menu',
        'Open viewport view menu',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'viewport-inspector-progressive-disclosure',
    description:
      'Viewport inspector must keep advanced character/workflow tools behind disclosure and avoid mojibake or mixed-language examples.',
    files: ['components/viewport/SceneViewportInspector.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'Selection details and safe edits',
        '<details',
        'Character tools',
        'Logic tools',
        'Try: move up 2',
        'nodes /',
      ]
      const forbidden = [
        'sovereign viewport',
        'move este',
        'nodes ?',
        'Â',
        'â',
        '�',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'viewport-runtime-progressive-disclosure',
    description:
      'Viewport runtime capability, cost, and cloud status must be available without pinning a dense technical panel over the canvas.',
    files: ['components/viewport/ViewportRuntimeDepthStatus.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'data-viewport-runtime-status="collapsed"',
        'data-viewport-runtime-status="expanded"',
        'Open viewport runtime details',
        'Runtime details',
        'Collapse viewport runtime details',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'viewport-outliner-professional-empty-state',
    description:
      'Viewport hierarchy should expose selection context and a governed empty state instead of behaving like a raw object list.',
    files: ['components/viewport/SceneViewportOutliner.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'Scene graph connected to selection and inspector',
        'selected',
        'Scene graph is empty',
        'begin editing',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'scene-viewport-product-language',
    description:
      'Scene viewport must use user-facing product language instead of internal canonical-surface labels.',
    files: ['components/preview/SceneViewportSurface.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'title="Viewport 3D"',
        'Select, inspect, playtest, and review scene assets with evidence.',
      ]
      const forbidden = ['Canonical Preview Surface', 'generative inspector']
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'ide-loading-skeleton',
    description:
      'IDE loading must look like the actual workbench, not a generic spinner, so users keep spatial context during Monaco/bootstrap latency.',
    files: ['app/ide/page.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'IDELoadingShell',
        'grid-cols-[280px_minmax(0,1fr)_380px]',
        'h-[calc(100vh-44px)]',
      ]
      const missing = required.filter(
        (token) => !content.includes(token),
      ).length
      const genericSpinner = (
        content.match(/animate-spin|Loading workspace/g) ?? []
      ).length
      return missing + genericSpinner
    },
    limit: 0,
  },
  {
    id: 'debug-panel-composition',
    description:
      'Debug UI must stay composed into parts so IDE internals do not regress into a single DevTools god component.',
    files: [
      'components/ide/DebugPanel.tsx',
      'components/ide/DebugPanel.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'DebugPanel.parts',
        'ConsoleOutput',
        'BreakpointList',
        'WatchExpressions',
      ]
      const main = read('components/ide/DebugPanel.tsx') ?? ''
      const mainLines = main.split('\n').length
      const forbiddenInMain = [
        'function ConsoleOutput',
        'function BreakpointList',
        'function VariableTree',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 320 ? 1 : 0)
      )
    },
    limit: 0,
  },
]
