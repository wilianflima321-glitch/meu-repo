import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'

import { AIThinkingPanel } from '../ai/AIThinkingPanel'
import AIProviderSetupGuide from '../ai/AIProviderSetupGuide'
import { EmptyState } from '../ui/EmptyState'
import { DashboardCopilotWorkflowBar } from './DashboardCopilotWorkflowBar'

type ChatMode = 'chat' | 'agent' | 'canvas'

type DashboardAIChatTabProps = {
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
  entryMission?: string | null
  chatHistory: ChatMessage[]
  chatMessage: string
  onChatMessageChange: (value: string) => void
  onSendChatMessage: () => void
  onStopStreaming?: () => void
  isStreaming: boolean
  activeWorkflowId: string | null
  copilotWorkflows: CopilotWorkflowSummary[]
  copilotWorkflowsLoading: boolean
  connectBusy: boolean
  connectFromWorkflowId: string
  onCreateWorkflow: () => void
  onSelectWorkflow: (workflowId: string) => void
  onRenameWorkflow: () => void
  onArchiveWorkflow: () => void
  onConnectFromWorkflowChange: (workflowId: string) => void
  onCopyHistory: () => void
  onImportContext: () => void
  onMergeWorkflow: () => void
  providerSetupGate?: {
    message: string
    capabilityStatus?: string
    setupUrl?: string
  } | null
  onOpenProviderSettings?: () => void
  onOpenProjects?: () => void
  onOpenIde?: () => void
}

const SESSION_PROMPTS = [
  {
    id: 'plan',
    label: 'Planejar stack e escopo',
    description: 'Transformar a ideia em plano tecnico, milestones e riscos.',
    prompt: 'Quero transformar esta ideia em um plano tecnico com escopo, stack, milestones, riscos e criterio de sucesso.',
  },
  {
    id: 'research',
    label: 'Pesquisar e comparar',
    description: 'Analisar concorrentes, experiencia alvo e lacunas do produto.',
    prompt: 'Pesquise a melhor experiencia para este produto, compare com os principais concorrentes e proponha o nosso delta.',
  },
  {
    id: 'build',
    label: 'Preparar para construir',
    description: 'Sair do chat com briefing pronto para projeto e IDE.',
    prompt: 'Consolide um briefing executavel para eu seguir para projeto, IDE e preview sem perder contexto.',
  },
  {
    id: 'review',
    label: 'Revisar e validar',
    description: 'Criticar o que ja foi feito e apontar o proximo bloco de qualidade.',
    prompt: 'Revise o estado atual, identifique riscos reais e diga o proximo bloco de trabalho com maior impacto.',
  },
] as const

const AGENT_PLAYBOOK = [
  {
    title: 'Research',
    description: 'Comparar mercado, consolidar evidencias e fechar estrategia.',
    prompt: 'Pesquise, compare e resuma o melhor benchmark para este fluxo de produto.',
  },
  {
    title: 'Planner',
    description: 'Quebrar o objetivo em backlog, fases e gates operacionais.',
    prompt: 'Quebre esta meta em backlog executavel com fases, dependencias e criterios de saida.',
  },
  {
    title: 'Builder',
    description: 'Preparar handoff para projeto, IDE, preview e runtime.',
    prompt: 'Converta esta missao em um handoff pronto para projeto, IDE e preview.',
  },
  {
    title: 'Operator',
    description: 'Organizar automacoes, runtime, observabilidade e operacao.',
    prompt: 'Defina os passos operacionais e de runtime para executar esta tarefa sem lacunas.',
  },
  {
    title: 'Reviewer',
    description: 'Criticar UX, fluxo, arquitetura e regressao antes de seguir.',
    prompt: 'Critique este estado com rigor, apontando regressao, inconsistencias e proxima melhora.',
  },
  {
    title: 'Asset Maker',
    description: 'Preparar conteudo, docs, imagens e superfícies de apresentacao.',
    prompt: 'Monte os assets e materiais necessarios para apresentar e validar esta entrega.',
  },
] as const

export function DashboardAIChatTab({
  chatMode,
  onChatModeChange,
  entryMission,
  chatHistory,
  chatMessage,
  onChatMessageChange,
  onSendChatMessage,
  onStopStreaming,
  isStreaming,
  activeWorkflowId,
  copilotWorkflows,
  copilotWorkflowsLoading,
  connectBusy,
  connectFromWorkflowId,
  onCreateWorkflow,
  onSelectWorkflow,
  onRenameWorkflow,
  onArchiveWorkflow,
  onConnectFromWorkflowChange,
  onCopyHistory,
  onImportContext,
  onMergeWorkflow,
  providerSetupGate,
  onOpenProviderSettings,
  onOpenProjects,
  onOpenIde,
}: DashboardAIChatTabProps) {
  const starterPrompt = entryMission || 'Quero criar um app SaaS com dashboard e autenticacao.'
  const activeModeDescription =
    chatMode === 'chat'
      ? 'Conversa continua e rapida para pensar, ajustar e seguir.'
      : chatMode === 'agent'
        ? 'Fluxo estruturado para delegar pesquisa, plano, execucao e revisao.'
        : 'Espaco de exploracao visual e handoff entre conceito e implementacao.'

  return (
    <div className="aethel-p-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Studio Copilot</p>
          <h2 className="text-2xl font-bold">Chat IA</h2>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">Orquestracao multi-agent com contexto do studio.</p>
        </div>
        <div className="aethel-flex aethel-gap-2">
          <button
            type="button"
            onClick={() => onChatModeChange('chat')}
            className={`aethel-button rounded-full px-4 py-2 text-sm font-medium transition ${
              chatMode === 'chat'
                ? 'bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-[var(--aethel-text-primary)] border border-sky-400/30'
                : 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('agent')}
            className={`aethel-button rounded-full px-4 py-2 text-sm font-medium transition ${
              chatMode === 'agent'
                ? 'bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-[var(--aethel-text-primary)] border border-sky-400/30'
                : 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'
            }`}
          >
            Modo agente
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('canvas')}
            className={`aethel-button rounded-full px-4 py-2 text-sm font-medium transition ${
              chatMode === 'canvas'
                ? 'bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-[var(--aethel-text-primary)] border border-sky-400/30'
                : 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'
            }`}
          >
            Canvas
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(8,47,73,0.18),rgba(15,23,42,0.7))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Jornada guiada</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              Use o chat para transformar contexto em plano executavel.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? entryMission
                : 'Descreva o que quer construir, alinhe escopo, depois siga para projeto e IDE com o mesmo handoff.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChatMessageChange(starterPrompt)}
              className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]"
            >
              Carregar briefing
            </button>
            {onOpenProjects ? (
              <button
                type="button"
                onClick={onOpenProjects}
                className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Ir para projetos
              </button>
            ) : null}
            {onOpenIde ? (
              <button
                type="button"
                onClick={onOpenIde}
                className="rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
              >
                Abrir IDE
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Experiencia alvo</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
            Menos chat solto, mais sessao de trabalho com contexto continuo.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {activeModeDescription} O objetivo aqui e sair do Studio Copilot com briefing pronto, proxima acao clara e contexto preservado para projetos, IDE e preview.
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Qualidades que estamos perseguindo</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Contexto persistente</p>
              <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">Missao, origem e proxima etapa continuam entre surfaces.</p>
            </div>
            <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Operacao guiada</p>
              <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">Pesquisa, plano, build e revisao aparecem como trilhos reais.</p>
            </div>
            <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Handoff sem quebra</p>
              <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">Chat, projetos, IDE e preview funcionam como um studio unico.</p>
            </div>
          </div>
        </div>
      </div>

      <DashboardCopilotWorkflowBar
        activeWorkflowId={activeWorkflowId}
        copilotWorkflows={copilotWorkflows}
        copilotWorkflowsLoading={copilotWorkflowsLoading}
        connectBusy={connectBusy}
        connectFromWorkflowId={connectFromWorkflowId}
        onCreateWorkflow={onCreateWorkflow}
        onSelectWorkflow={onSelectWorkflow}
        onRenameWorkflow={onRenameWorkflow}
        onArchiveWorkflow={onArchiveWorkflow}
        onConnectFromWorkflowChange={onConnectFromWorkflowChange}
        onCopyHistory={onCopyHistory}
        onImportContext={onImportContext}
        onMergeWorkflow={onMergeWorkflow}
      />

      {providerSetupGate && (
        <div className="mb-6">
          <AIProviderSetupGuide
            source="dashboard"
            message={providerSetupGate.message}
            capabilityStatus={providerSetupGate.capabilityStatus}
            settingsHref={providerSetupGate.setupUrl}
            onOpenSettings={onOpenProviderSettings}
          />
        </div>
      )}

      {chatMode === 'chat' && (
        <div className="aethel-card aethel-p-6 max-w-4xl mx-auto">
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            Chat conversacional padrao com os agentes avancados do Aethel.
          </div>
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            {SESSION_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChatMessageChange(entryMission ? `${entryMission}\n\n${item.prompt}` : item.prompt)}
                className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-4 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]"
              >
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.description}</p>
              </button>
            ))}
          </div>
          {chatHistory.length === 0 && !isStreaming && (
            <div className="mb-6">
              <EmptyState
                title="Inicie o chat"
                description="Descreva o que voce quer construir. O Aethel responde com um plano e os proximos passos."
                action={{
                  label: 'Usar prompt inicial',
                  onClick: () => onChatMessageChange(starterPrompt),
                }}
                secondaryAction={{
                  label: 'Ver exemplos',
                  onClick: () => onChatMessageChange('Mostre exemplos de prompts e boas praticas.'),
                }}
              />
            </div>
          )}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`aethel-p-3 aethel-rounded-lg border border-[var(--aethel-border-subtle)] ${
                  msg.role === 'user'
                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.22),rgba(14,165,233,0.12))] ml-12'
                    : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] mr-12'
                }`}
              >
                <p className="text-sm font-medium mb-1">{msg.role === 'user' ? 'Voce' : 'IA'}</p>
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
            {isStreaming && <AIThinkingPanel isStreaming={isStreaming} position="floating" />}
          </div>
          <div className="aethel-flex aethel-gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(event) => onChatMessageChange(event.target.value)}
              disabled={isStreaming}
              aria-label="Mensagem para o chat de IA"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSendChatMessage()
                }
              }}
              placeholder="Digite sua mensagem..."
              className="aethel-input flex-1"
            />
            <button
              type="button"
              onClick={onSendChatMessage}
              className="aethel-button aethel-button-primary"
              disabled={isStreaming || chatMessage.trim().length === 0}
            >
              {isStreaming ? 'Processando...' : 'Enviar'}
            </button>
            {isStreaming && onStopStreaming && (
              <button
                type="button"
                onClick={onStopStreaming}
                className="aethel-button aethel-button-ghost text-xs"
              >
                Interromper
              </button>
            )}
          </div>
        </div>
      )}

      {chatMode === 'agent' && (
        <div className="aethel-card aethel-p-6 max-w-4xl mx-auto">
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            Modo de agente autonomo em passos auditaveis, com validacao antes de aplicar mudancas.
          </div>
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-4">
              {AGENT_PLAYBOOK.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onChatMessageChange(entryMission ? `${entryMission}\n\n${item.prompt}` : item.prompt)}
                  className="aethel-card aethel-p-4 text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] aethel-transition"
                >
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-[var(--aethel-text-secondary)]">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="aethel-flex aethel-gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(event) => onChatMessageChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSendChatMessage()
                }
              }}
              placeholder="Descreva a tarefa para o agente..."
              className="aethel-input flex-1"
            />
            <button type="button" onClick={onSendChatMessage} className="aethel-button aethel-button-primary">
              Executar
            </button>
          </div>
        </div>
      )}

      {chatMode === 'canvas' && (
        <div className="aethel-card aethel-p-6 max-w-6xl mx-auto">
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            Canvas visual para colaboracao com IA.
          </div>
          <div className="min-h-96 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4 relative">
            <div className="absolute top-4 left-4 aethel-flex aethel-gap-2">
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Desenhar</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Formas</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Texto</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Melhorar com IA</button>
            </div>
            <div className="text-center text-[var(--aethel-text-tertiary)] py-32">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="text-lg font-medium mb-2">Canvas interativo</p>
              <div className="aethel-state aethel-state-empty mx-auto max-w-xl text-xs">
                <p className="aethel-state-title mb-1">Capability status: PARTIAL</p>
                <p>Ferramentas de desenho no Studio Home ainda estao limitadas. Use o modo avancado em /ide para edicao completa.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
