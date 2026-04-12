import type { CopilotWorkflowSummary } from '@/lib/api'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

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
  const inputClass = `h-11 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const buttonClass = `inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center">
      <span className="text-sm text-[var(--aethel-text-secondary)]">Trabalho</span>
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
        aria-label="Selecionar trabalho ativo do Copilot"
        className={`${inputClass} min-w-[12rem]`}
        disabled={controlsDisabled}
      >
        {copilotWorkflows.map((workflow) => (
          <option key={String(workflow.id)} value={String(workflow.id)}>
            {workflow.title || 'Fluxo'}
          </option>
        ))}
        <option value="__new__">+ Novo trabalho</option>
      </select>

      <button type="button" onClick={onRenameWorkflow} aria-label="Renomear trabalho atual do Copilot" className={buttonClass} disabled={!activeWorkflowId}>
        Renomear
      </button>
      <button type="button" onClick={onArchiveWorkflow} aria-label="Arquivar trabalho atual do Copilot" className={buttonClass} disabled={!activeWorkflowId}>
        Arquivar
      </button>

      <select
        value={connectFromWorkflowId}
        onChange={(event) => onConnectFromWorkflowChange(event.target.value)}
        aria-label="Selecionar trabalho para conectar contexto"
        className={`${inputClass} min-w-[12rem]`}
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
        aria-label="Copiar histórico do trabalho selecionado para o trabalho atual"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Copia historico da thread selecionada para o trabalho atual"
      >
        {connectBusy ? 'Processando...' : 'Copiar historico'}
      </button>

      <button
        type="button"
        onClick={onImportContext}
        aria-label="Importar contexto do trabalho selecionado"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Importa contexto do trabalho selecionado"
      >
        {connectBusy ? 'Processando...' : 'Importar contexto'}
      </button>

      <button
        type="button"
        onClick={onMergeWorkflow}
        aria-label="Mesclar histórico e contexto do trabalho selecionado"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Mescla historico e contexto do trabalho selecionado"
      >
        {connectBusy ? 'Processando...' : 'Mesclar'}
      </button>
    </div>
  )
}
