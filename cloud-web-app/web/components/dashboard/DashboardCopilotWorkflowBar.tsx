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
        aria-label="Select active Copilot work"
        className={`${inputClass} min-w-[12rem]`}
        disabled={controlsDisabled}
      >
        {copilotWorkflows.map((workflow) => (
          <option key={String(workflow.id)} value={String(workflow.id)}>
            {workflow.title || 'Flow'}
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
        aria-label="Select work to connect context"
        className={`${inputClass} min-w-[12rem]`}
        disabled={controlsDisabled}
      >
        <option value="">Conectar...</option>
        {copilotWorkflows
          .filter((workflow) => String(workflow.id) !== String(activeWorkflowId))
          .map((workflow) => (
            <option key={String(workflow.id)} value={String(workflow.id)}>
              {workflow.title || 'Flow'}
            </option>
          ))}
      </select>

      <button
        type="button"
        onClick={onCopyHistory}
        aria-label="Copy selected work history into the current work item"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Copy the selected thread history into the current work"
      >
        {connectBusy ? 'Processing...' : 'Copy history'}
      </button>

      <button
        type="button"
        onClick={onImportContext}
        aria-label="Import context from selected work"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Import context from selected work"
      >
        {connectBusy ? 'Processing...' : 'Import context'}
      </button>

      <button
        type="button"
        onClick={onMergeWorkflow}
        aria-label="Merge selected work history and context"
        className={buttonClass}
        disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
        title="Merge the selected work history and context"
      >
        {connectBusy ? 'Processing...' : 'Merge'}
      </button>
    </div>
  )
}
