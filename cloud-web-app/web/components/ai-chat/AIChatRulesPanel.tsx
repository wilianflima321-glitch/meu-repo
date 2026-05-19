'use client'

import { RefreshCw, Save, ScrollText, Sparkles } from 'lucide-react'

import { useAIChatProjectRules } from '@/components/ai-chat/useAIChatProjectRules'

export function AIChatRulesPanel({ projectId }: { projectId?: string }) {
  const {
    draft,
    error,
    hasRules,
    isDirty,
    isLoading,
    isSaving,
    loadRules,
    loadStarterTemplate,
    resetDraft,
    saveRules,
    scope,
    setDraft,
    sourcePath,
  } = useAIChatProjectRules(projectId)

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-[var(--aethel-info-light)]" />
          <div>
            <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">Project rules</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              persistent operator context
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadRules()}
          disabled={isLoading || isSaving}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="border-b border-[var(--aethel-border-primary)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]">
        <p>
          Versioned rules align AI work with the current workspace, similar to the rules and memory
          benchmark in the best copilots.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-1">
            scope {scope ?? 'repo'}
          </span>
          <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-1">
            {sourcePath ?? '.aethelrules'}
          </span>
          <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-1">
            {hasRules ? 'active' : 'empty'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="mb-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-error-light)]">
            {error}
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
            Use short bullets, verifiable constraints, and context worth keeping across sessions.
          </p>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
            {draft.length} chars
          </span>
        </div>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={18}
          spellCheck={false}
          placeholder="Add project rules here (.aethelrules)..."
          className="w-full resize-none rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-3 text-[12px] leading-6 text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)]"
        />
      </div>

      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadStarterTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Load template
          </button>
          <button
            type="button"
            onClick={resetDraft}
            disabled={!isDirty}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] disabled:opacity-50"
          >
            Revert
          </button>
        </div>
        <button
          type="button"
          onClick={() => void saveRules()}
          disabled={isSaving || !isDirty}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving rules...' : 'Save project rules'}
        </button>
      </div>
    </div>
  )
}
