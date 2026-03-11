import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'

import { AIThinkingPanel } from '../ai/AIThinkingPanel'
import AIProviderSetupGuide from '../ai/AIProviderSetupGuide'
import { DashboardCopilotWorkflowBar } from './DashboardCopilotWorkflowBar'

type ChatMode = 'chat' | 'agent' | 'canvas'

type DashboardAIChatTabProps = {
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
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
}

export function DashboardAIChatTab({
  chatMode,
  onChatModeChange,
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
}: DashboardAIChatTabProps) {
  return (
    <div className="aethel-p-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between mb-6">
        <h2 className="text-2xl font-bold">Chat IA</h2>
        <div className="aethel-flex aethel-gap-2">
          <button
            type="button"
            onClick={() => onChatModeChange('chat')}
            className={`px-4 py-2 aethel-rounded-lg text-sm font-medium ${chatMode === 'chat' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('agent')}
            className={`px-4 py-2 aethel-rounded-lg text-sm font-medium ${chatMode === 'agent' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Modo agente
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange('canvas')}
            className={`px-4 py-2 aethel-rounded-lg text-sm font-medium ${chatMode === 'canvas' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
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
          <div className="mb-4 text-sm text-slate-400">
            Chat conversacional padrao com os agentes avancados do Aethel.
          </div>
          {chatHistory.length === 0 && !isStreaming && (
            <div className="aethel-state aethel-state-empty mb-4">
              <p className="aethel-state-title">Nenhuma conversa iniciada</p>
              <p className="text-xs mt-1">Envie uma mensagem para iniciar o fluxo Planner/Coder/Reviewer.</p>
            </div>
          )}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`aethel-p-3 aethel-rounded-lg ${msg.role === 'user' ? 'bg-blue-500/20 ml-12' : 'bg-slate-700/50 mr-12'}`}>
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
          <div className="mb-4 text-sm text-slate-400">
            Modo de agente autonomo em passos auditaveis, com validacao antes de aplicar mudancas.
          </div>
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-4">
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Pesquisa e analise</h3>
                <p className="text-sm text-slate-400">Coletar informacoes, analisar dados e gerar insights</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Criacao de conteudo</h3>
                <p className="text-sm text-slate-400">Gerar artigos, codigo, documentacao e conteudo criativo</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Automacao</h3>
                <p className="text-sm text-slate-400">Criar fluxos, scripts e processos automatizados</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Resolucao de problemas</h3>
                <p className="text-sm text-slate-400">Depurar codigo, otimizar performance e resolver issues complexas</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Geracao de codigo</h3>
                <p className="text-sm text-slate-400">Gerar, depurar e otimizar codigo em varias linguagens</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Analise de dados</h3>
                <p className="text-sm text-slate-400">Analisar datasets, criar visualizacoes e extrair insights</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Design criativo</h3>
                <p className="text-sm text-slate-400">Desenhar UI/UX, graficos e conceitos criativos</p>
              </button>
              <button type="button" className="aethel-card aethel-p-4 text-left hover:bg-slate-700/50 aethel-transition">
                <h3 className="font-semibold mb-2">Estrategia de negocios</h3>
                <p className="text-sm text-slate-400">Planejamento estrategico e analise de mercado</p>
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
          <div className="mb-4 text-sm text-slate-400">
            Canvas visual para colaboracao com IA.
          </div>
          <div className="bg-slate-800 aethel-rounded-lg aethel-p-4 min-h-96 border border-slate-700 relative">
            <div className="absolute top-4 left-4 aethel-flex aethel-gap-2">
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Desenhar</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Formas</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Texto</button>
              <button type="button" disabled className="aethel-button aethel-button-ghost text-xs opacity-60">Melhorar com IA</button>
            </div>
            <div className="text-center text-slate-500 py-32">
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
