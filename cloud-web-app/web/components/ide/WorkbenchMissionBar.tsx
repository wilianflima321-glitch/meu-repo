type WorkbenchMissionBarProps = {
  mission?: string | null
  source?: string | null
  projectId?: string | null
  previewEnabled: boolean
  runtimeStrategyLabel: string
  runtimeStateLabel: string
  onOpenAiPanel?: () => void
  onTogglePreview: () => void
  onOpenCommandPalette: () => void
  onBackToDashboard: () => void
}

export default function WorkbenchMissionBar({
  mission,
  source,
  projectId,
  previewEnabled,
  runtimeStrategyLabel,
  runtimeStateLabel,
  onOpenAiPanel,
  onTogglePreview,
  onOpenCommandPalette,
  onBackToDashboard,
}: WorkbenchMissionBarProps) {
  return (
    <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(79,70,229,0.08),rgba(14,165,233,0.06),rgba(255,255,255,0.02))] px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
              Handoff ativo
            </span>
            {source ? (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                origem {source}
              </span>
            ) : null}
            {projectId ? (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                projeto {projectId}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {mission || 'Continue a implementacao com o mesmo contexto vindo do Studio.'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2 py-1">
              preview {previewEnabled ? 'ativo' : 'desativado'}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2 py-1">
              estrategia {runtimeStrategyLabel}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2 py-1">
              runtime {runtimeStateLabel}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onOpenAiPanel ? (
            <button
              type="button"
              onClick={onOpenAiPanel}
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Abrir copiloto
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Command Palette
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            {previewEnabled ? 'Ocultar preview' : 'Mostrar preview'}
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
          >
            Voltar ao Studio
          </button>
        </div>
      </div>
    </div>
  )
}
