import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'

import { AIThinkingPanel } from '../ai/AIThinkingPanel'
import { DashboardCopilotWorkflowBar } from './DashboardCopilotWorkflowBar'

type ChatMode = 'chat' | 'agent' | 'canvas'

type DashboardAIChatTabProps = {
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
  chatHistory: ChatMessage[]
  chatMessage: string
  onChatMessageChange: (value: string) => void
  onSendChatMessage: () => void
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
  } | null
  onOpenProviderSettings?: () => void
}

export function DashboardAIChatTab({
  chatMode,
  onChatModeChange,
  chatHistory,
  chatMessage,
  onChatMessageChange,
  onSendChatMessage,
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
}: DashboardAIChatTabProps) {
  return (
    <div className="aethel-p-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
        <h2 className="aethel-text-2xl aethel-font-bold">Chat IA</h2>
        <div className="aethel-flex aethel-gap-2">
          <button
            type="button"
            onClick={() => onChatModeChange('chat')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'chat' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('agent')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'agent' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
          >
            Modo agente
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('canvas')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'canvas' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
          >
            Canvas
          </button>
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
        <div className="aethel-card aethel-p-4 aethel-mb-6 aethel-border aethel-border-amber-500/30 aethel-bg-amber-500/10">
          <div className="aethel-flex aethel-items-center aethel-justify-between aethel-gap-3">
            <div>
              <p className="aethel-text-sm aethel-font-semibold aethel-text-amber-200">AI provider nao configurado</p>
              <p className="aethel-text-xs aethel-text-slate-300 aethel-mt-1">{providerSetupGate.message}</p>
              {providerSetupGate.capabilityStatus && (
                <p className="aethel-text-[11px] aethel-text-slate-400 aethel-mt-1">
                  capabilityStatus: {providerSetupGate.capabilityStatus}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenProviderSettings}
              className="aethel-button aethel-button-primary aethel-text-xs"
            >
              Configurar em /admin/apis
            </button>
          </div>
        </div>
      )}

      {chatMode === 'chat' && (
        <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
          <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
            Chat conversacional padrao com os agentes avancados do Aethel.
          </div>
          <div className="aethel-space-y-4 aethel-mb-4 aethel-max-h-96 aethel-overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`aethel-p-3 aethel-rounded-lg ${msg.role === 'user' ? 'aethel-bg-blue-500/20 aethel-ml-12' : 'aethel-bg-slate-700/50 aethel-mr-12'}`}>
                <p className="aethel-text-sm aethel-font-medium aethel-mb-1">{msg.role === 'user' ? 'Voce' : 'IA'}</p>
                <p className="aethel-text-sm">{msg.content}</p>
              </div>
            ))}
            {isStreaming && <AIThinkingPanel isStreaming={isStreaming} position="floating" />}
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
              placeholder="Digite sua mensagem..."
              className="aethel-input aethel-flex-1"
            />
            <button
              type="button"
              onClick={onSendChatMessage}
              className="aethel-button aethel-button-primary"
              disabled={isStreaming}
            >
              {isStreaming ? 'Processando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {chatMode === 'agent' && (
        <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
          <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
            Modo de agente autonomo em passos auditaveis, com validacao antes de aplicar mudancas.
          </div>
          <div className="aethel-space-y-4 aethel-mb-4">
            <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-4">
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Pesquisa e analise</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Coletar informacoes, analisar dados e gerar insights</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Criacao de conteudo</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Gerar artigos, codigo, documentacao e conteudo criativo</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Automacao</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Criar fluxos, scripts e processos automatizados</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Resolucao de problemas</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Depurar codigo, otimizar performance e resolver issues complexas</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Geracao de codigo</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Gerar, depurar e otimizar codigo em varias linguagens</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Analise de dados</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Analisar datasets, criar visualizacoes e extrair insights</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Design criativo</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Desenhar UI/UX, graficos e conceitos criativos</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                <h3 className="aethel-font-semibold aethel-mb-2">Estrategia de negocios</h3>
                <p className="aethel-text-sm aethel-text-slate-400">Planejamento estrategico e analise de mercado</p>
              </button>
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
              className="aethel-input aethel-flex-1"
            />
            <button type="button" onClick={onSendChatMessage} className="aethel-button aethel-button-primary">
              Executar
            </button>
          </div>
        </div>
      )}

      {chatMode === 'canvas' && (
        <div className="aethel-card aethel-p-6 aethel-max-w-6xl aethel-mx-auto">
          <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
            Canvas visual para colaboracao com IA.
          </div>
          <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-relative">
            <div className="aethel-absolute aethel-top-4 aethel-left-4 aethel-flex aethel-gap-2">
              <button type="button" className="aethel-button aethel-button-ghost aethel-text-xs">Desenhar</button>
              <button type="button" className="aethel-button aethel-button-ghost aethel-text-xs">Formas</button>
              <button type="button" className="aethel-button aethel-button-ghost aethel-text-xs">Texto</button>
              <button type="button" className="aethel-button aethel-button-ghost aethel-text-xs">Melhorar com IA</button>
            </div>
            <div className="aethel-text-center aethel-text-slate-500 aethel-py-32">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="text-lg font-medium mb-2">Canvas interativo</p>
              <p className="text-sm">Em breve com recursos completos de desenho e colaboracao</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
