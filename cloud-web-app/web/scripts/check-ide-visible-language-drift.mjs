#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FILES = [
  'components/ui/CookieConsent.tsx',
  'components/Onboarding.tsx',
  'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
  'components/ide/fullscreen/WorkbenchPreviewPane.tsx',
  'components/ide/modern-shell/chromeHeaderParts.tsx',
  'components/ide/modern-shell/chromeStatusBar.tsx',
  'components/ide/modern-shell/chromeStatusBar.parts.tsx',
  'components/ide/DebugPanel.tsx',
  'components/ide/DebugPanel.parts.tsx',
  'components/ide/DevicePreview.tsx',
  'components/ide/ErrorHighlighting.tsx',
  'components/ide/FileExplorerPro.tsx',
  'components/ide/FileExplorerPro.parts.tsx',
  'components/ide/GitIntegration.tsx',
  'components/ide/IdeWorkbenchCommandExtras.tsx',
  'components/ide/InlineCompletion.tsx',
  'components/ide/InlineCompletion.parts.tsx',
  'components/ide/InlineAIChatComposerSurface.tsx',
  'components/ide/InlineAIChatPrimitives.tsx',
  'components/ide/KeyboardShortcutsDialog.tsx',
  'components/ide/MemoryPanel.tsx',
  'components/ide/MonacoChatDiffPanel.tsx',
  'components/ide/ApprovalCard.tsx',
  'components/ide/PreviewPanel.tsx',
  'components/ide/PreviewPanel.parts.ts',
  'components/ide/PreviewRuntimeToolbar.tsx',
  'components/ide/PreviewRuntimeToolbar.parts.tsx',
  'components/preview/RuntimePreviewSurface.tsx',
  'components/preview/SceneViewportSurface.tsx',
  'components/preview/ViewportWorkbenchShell.tsx',
  'components/preview/SceneViewportWorkflowDrawer.tsx',
  'components/preview/MagicWandChat.tsx',
  'components/preview/CanonicalPreviewSurface.tsx',
  'components/preview/PreviewLifecycleChrome.tsx',
  'components/preview/usePreviewRuntimeHealthMonitor.ts',
  'components/preview/usePreviewDeployTrust.ts',
  'components/preview/previewRuntime.types.ts',
  'components/preview/PreviewRuntimeTrustNotice.tsx',
  'components/preview/previewRuntimeState.ts',
  'components/preview/usePreviewRuntime.ts',
  'hooks/usePreviewRuntimeManager.ts',
  'components/ai-chat/AIChatComposer.tsx',
  'components/ai-chat/AIChatHeader.tsx',
  'components/ai-chat/AIChatModeMenu.tsx',
  'components/ai-chat/AIChatModelPicker.tsx',
  'components/ai-chat/AIChatHeaderActions.tsx',
  'components/ai-chat/AIChatAgentLane.tsx',
  'components/ai-chat/AIChatMessagesPane.tsx',
  'components/ai-chat/AIChatSessionBanner.tsx',
  'components/ai-chat/MessageBubble.tsx',
  'components/ai-chat/MessageBubbleActionBar.tsx',
  'components/ai/AgentModePanel.tsx',
  'components/ide/AIChatPanelChrome.tsx',
  'components/ide/CommandPalette.tsx',
  'components/ide/CommandPalette.parts.tsx',
  'components/ide/ConsoleIntegration.tsx',
  'components/SearchReplace.tsx',
  'components/search/GlobalSearch.tsx',
  'components/visual-scripting/VisualScriptEditor.tsx',
  'components/nexus/AethelResearch.tsx',
  'components/nexus/NexusChatMultimodal.tsx',
  'components/nexus/NexusCanvasV2.tsx',
  'components/ai/DirectorNotePanel.tsx',
  'components/engine/ProjectSettings.tsx',
  'components/engine/LevelEditor.tsx',
  'components/engine/LandscapeEditor.tsx',
  'components/engine/BlueprintEditor.tsx',
  'components/engine/WorldOutliner.tsx',
  'components/engine/WorldOutlinerParts.tsx',
  'components/engine/EngineContentBrowser.tsx',
  'components/engine/content-browser-controls.tsx',
  'components/engine/AnimationBlueprintPanels.tsx',
  'components/engine/AbilityEditor.tsx',
  'components/dashboard/AIAgentDashboard.tsx',
  'components/dashboard/HealthDashboard.tsx',
  'components/dashboard/JobQueueDashboard.tsx',
  'components/dashboard/NewProjectWizard.tsx',
  'components/dashboard/ProjectsDashboardCollection.tsx',
  'components/dashboard/RenderProgress.tsx',
  'components/dashboard/SecurityDashboard.tsx',
  'components/dashboard/SecurityDashboard.parts.tsx',
  'components/dashboard/tabs/ProjectsTab.tsx',
  'components/dashboard/useDashboardActions.ts',
  'app/nexus/page.tsx',
]

const DRIFT =
  /\b(Usamos|Usar|Apenas|Aceitar|Saiba|Primeiros|concluidos|Reverificar|Parcial|Viewport compacto|Substituir|Diagnosticos|Executar|IA Render|experiencia|Alternar|Pergunte|Selecionado|Pausar|Reproduzir|Tela cheia|Opcionais|Conquistas|Pular|Comecar|Proximo|Desconhecido|Faltam|Status geral|Ferramentas|Empilhar|Dividir|Pesquisa|Direcao|Orquestracao|renderizacao|verificacao|Coletando|Pontuando|sintese|confianca|Latencia|Otimizado|soberano|animacao|superficie|Inicie|Iniciar|Aquecendo|Desatualizado|Validando|Clique|confiavel|Capacidade|extensao|desconhecida|bloqueado|inacessivel|invalida|Cena|Painel|Capacidades|Nao|Sem runtime|Somente|Todos|usuario|usu??rio|Autentique|Execucao|Pendente|Executando|Pausada|Falhou|Cancelado|Codigo|servicos|avancado|separador|Registra|Graficos|Finalizando|Pausado|Arquivado|Inicializando|Gerando|Gerar|Compilando|Acordando|Instrucoes|expressao|ajustes|Redefinir|Descreva|Mensagem|Chave|atalho|Atalhos|can[o?]nico|permanece|carregando|Salvar|Cancelar|Excluir|Enviando|sugestao|rapida|aplicado|automaticamente|caracteres|envia|Rejeitar|Aprovar|selecionado|Comparador|editavel|Diagn[o?]sticos|Aplicar|Abrir|Fechar|Copiar|Limpar|botao|saida|linguagem|Tamanho|Geral|Desfazer|Refazer|Focar)\b|Ã|â/gi

const findings = []
for (const file of FILES) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    findings.push(`${file}: missing`)
    continue
  }
  const content = fs.readFileSync(abs, 'utf8')
  const matches = content.match(DRIFT) ?? []
  if (matches.length > 0)
    findings.push(
      `${file}: ${matches.length} [${[...new Set(matches)].slice(0, 12).join(', ')}]`,
    )
}

if (findings.length > 0) {
  console.error(`[ide-visible-language-drift] FAIL\n${findings.join('\n')}`)
  process.exit(1)
}

console.log(`[ide-visible-language-drift] PASS files=${FILES.length}`)
