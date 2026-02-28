import type { CopilotWorkflowSummary } from '@/lib/api'

type DashboardCopilotWorkflowBarProps = {
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
}

export function DashboardCopilotWorkflowBar({
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
}: DashboardCopilotWorkflowBarProps) {
  const controlsDisabled = copilotWorkflowsLoading || connectBusy

  return (
    <div className="aethel-flex aethel-items-center aethel-gap-2 aethel-mb-4">
      <span className="aethel-text-sm aethel-text-slate-400">Trabalho</span>
      <select
        value={activeWorkflowId ?? ''}
        onChange={(event) => {
          const value = event.target.value
          if (value === '__new__') {
            onCreateWorkflow()
            return
          }
          if (value) {
            onSelectWorkflow(value)
          }
        }}
        className="aethel-input"
        disabled={controlsDisabled}
      >
        {copilotWorkflows.map((workflow) => (
          <option key={String(workflow.id)} value={String(workflow.id)}>
            {workflow.title || 'Fluxo'}
          </option>
        ))}
        <option value="__new__">+ Novo trabalho</option>
      </select>

      <button type="button" onClick={onRenameWorkflow} className="aethel-button aethel-button-secondary" disabled={!activeWorkflowId}>
        Renomear
      </button>
      <button type="button" onClick={onArchiveWorkflow} className="aethel-button aethel-button-secondary" disabled={!activeWorkflowId}>
        Arquivar
      </button>

      <select
        value={connectFromWorkflowId}
        onChange={(event) => onConnectFromWorkflowChange(event.target.value)}
        className="aethel-input"
        disabled={controlsDisabled}
      >
        <option value="">Conectar...</option>
        {copilotWorkflows
          .filter((workflow) => String(workflow.id) !== String(activeWorkflowId))
          .map((workflow) => (
            <option key={String(workflow.id)} value={String(workflow.id)}>
              {workflow.title || 'Fluxo'}
            </option>
          ))}
      </select>

      <button
        type="button"
        onClick={onCopyHistory}
        className="aethel-button aethel-button-secondary"
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Copia historico da thread selecionada para o trabalho atual"
      >
        {connectBusy ? 'Processando...' : 'Copiar historico'}
      </button>

      <button
        type="button"
        onClick={onImportContext}
        className="aethel-button aethel-button-secondary"
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Importa contexto do trabalho selecionado"
      >
        {connectBusy ? 'Processando...' : 'Importar contexto'}
      </button>

      <button
        type="button"
        onClick={onMergeWorkflow}
        className="aethel-button aethel-button-secondary"
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Mescla historico e contexto do trabalho selecionado"
      >
        {connectBusy ? 'Processando...' : 'Mesclar'}
      </button>
    </div>
  )
}
