'use client'

export type ProjectItem = {
  id: string
  name: string
  members: number
  status: 'active' | 'paused' | 'archived' | string
  updatedAt: string
}

export type ReadinessResponse = {
  success: boolean
  capability: string
  capabilityStatus: string
  message: string
  readinessScore: number
  runtime: {
    redisConfigured: boolean
    websocketConfigured: boolean
    signalingConfigured: boolean
  }
  observed: {
    activeRooms30m: number
    onlineParticipants: number
    joinEvents7d: number
  }
  sloTargets: {
    availability: string
    p95LatencyMs: number
    reconnectS: number
    errorBudgetPercent: number
  }
  evidence: {
    syntheticConcurrency: boolean
    reconnectReplay: boolean
    conflictReplay: boolean
    stressProofAttached: boolean
    stressProofUrl: string | null
    stressProofSummary: string | null
    loadProofDate: string | null
    lastPassedAt?: {
      syntheticConcurrency?: string | null
      reconnectReplay?: string | null
      conflictReplay?: string | null
    }
    stale?: {
      syntheticConcurrency?: boolean
      reconnectReplay?: boolean
      conflictReplay?: boolean
      stressProof?: boolean
    }
    maxAgeDays?: number
  }
  evidenceHistory?: Array<{
    id: string
    evidenceType: 'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay'
    passed: boolean
    createdAt: string
    adminEmail: string | null
    notes: string | null
  }>
  promotionEligible?: boolean
  updatedAt: string
}


function statusLabel(status: ProjectItem['status']): string {
  const map: Record<string, string> = {
    active: 'Active',
    paused: 'Pausado',
    archived: 'Arquivado',
  }
  return map[status] || status
}

function readinessBadge(status: ReadinessResponse['capabilityStatus']): string {
  if (status === 'IMPLEMENTED') return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]'
  if (status === 'PARTIAL') return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]'
  return 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
}

export type ReadinessRuntimeRow = {
  label: string
  value: boolean
  stale: boolean
}

type CollaborationAdminViewProps = {
  projects: ProjectItem[]
  readiness: ReadinessResponse | null
  readinessRuntimeRows: ReadinessRuntimeRow[]
  loading: boolean
  error: string | null
  statusMessage: string | null
  submittingProjectId: string | null
  submittingEvidenceKey: string | null
  stressProofUrlInput: string
  stressProofSummaryInput: string
  fetchAll: () => void
  updateStatus: (projectId: string, status: 'active' | 'paused') => void
  recordEvidence: (
    evidenceType: 'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay',
    passed: boolean
  ) => void
  recordStressProof: () => void
  setStressProofUrlInput: (value: string) => void
  setStressProofSummaryInput: (value: string) => void
}

export function CollaborationAdminView({
  projects,
  readiness,
  readinessRuntimeRows,
  loading,
  error,
  statusMessage,
  submittingProjectId,
  submittingEvidenceKey,
  stressProofUrlInput,
  stressProofSummaryInput,
  fetchAll,
  updateStatus,
  recordEvidence,
  recordStressProof,
  setStressProofUrlInput,
  setStressProofSummaryInput,
}: CollaborationAdminViewProps) {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Colaboracao</h1>
          <p className="text-sm text-[var(--aethel-text-secondary)]">
            Operational governance of rooms/projects with a real-time readiness gate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchAll()
          }}
          className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)] mb-4">
          {error}
        </div>
      )}
      {statusMessage && !error && (
        <div role="status" aria-live="polite" className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 border-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)] mb-4">
          {statusMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-secondary)] mb-6">
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)] mb-2">Loading collaboration...</p>
          <div className="space-y-2">
            <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-full" />
            <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-5/6" />
            <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {readiness && (
        <section className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Readiness SLO gate</h2>
              <p className="text-xs text-[var(--aethel-text-secondary)]">
                Atualizado em {new Date(readiness.updatedAt).toLocaleString()} | {readiness.capability}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-1 text-xs ${readinessBadge(readiness.capabilityStatus)}`}>
                {readiness.capabilityStatus}
              </span>
              <span className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
                Score: {readiness.readinessScore}/100
              </span>
            </div>
          </div>

          <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{readiness.message}</p>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Rooms ativas (30m)</p>
              <p className="mt-1 text-xl font-semibold">{readiness.observed.activeRooms30m}</p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Participantes online</p>
              <p className="mt-1 text-xl font-semibold">{readiness.observed.onlineParticipants}</p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Eventos join (7d)</p>
              <p className="mt-1 text-xl font-semibold">{readiness.observed.joinEvents7d}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Disponibilidade alvo</p>
              <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{readiness.sloTargets.availability}</p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">P95 latencia</p>
              <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{readiness.sloTargets.p95LatencyMs} ms</p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Reconexao</p>
              <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">&lt;= {readiness.sloTargets.reconnectS}s</p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Error budget</p>
              <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{readiness.sloTargets.errorBudgetPercent}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {readinessRuntimeRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 px-3 py-2">
                <span className="text-sm text-[var(--aethel-text-secondary)]">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${ row.value ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]' }`}
                  >
                    {row.value ? 'OK' : 'PENDENTE'}
                  </span>
                  {row.stale ? (
                    <span className="rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] px-2 py-0.5 text-[11px] text-[var(--aethel-error)]">
                      STALE
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Evidence ledger</h3>
              <span
                className={`rounded border px-2 py-0.5 text-[11px] ${ readiness.promotionEligible ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]' }`}
              >
                {readiness.promotionEligible ? 'promotion-eligible' : 'pending-evidence'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
              {(
                [
                  ['syntheticConcurrency', 'Synthetic concurrency'],
                  ['reconnectReplay', 'Reconnect replay'],
                  ['conflictReplay', 'Conflict replay'],
                ] as const
              ).map(([evidenceType, label]) => {
                const passed = readiness.evidence[evidenceType]
                return (
                  <div key={evidenceType} className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">{label}</span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[11px] ${ passed ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]' }`}
                      >
                        {passed ? 'PASS' : 'PENDING'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submittingEvidenceKey !== null}
                        onClick={() => {
                          void recordEvidence(evidenceType, true)
                        }}
                        className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] rounded px-2 py-1 text-[11px] disabled:opacity-60"
                      >
                        {submittingEvidenceKey === `${evidenceType}:pass` ? 'Saving...' : 'Mark PASS'}
                      </button>
                      <button
                        type="button"
                        disabled={submittingEvidenceKey !== null}
                        onClick={() => {
                          void recordEvidence(evidenceType, false)
                        }}
                        className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded px-2 py-1 text-[11px] border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] text-[var(--aethel-warning-light)] disabled:opacity-60"
                      >
                        {submittingEvidenceKey === `${evidenceType}:fail` ? 'Saving...' : 'Mark FAIL'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
              Capability permanece PARTIAL ate evidence operacional + stress proof fora do painel.
            </p>
          </div>

          <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <h3 className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Stress proof bundle</h3>
            <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">
              Registre link do relatorio externo (k6/artillery/locust) para habilitar promocao factual.
            </p>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[2fr,1fr,auto]">
              <input
                type="url"
                value={stressProofUrlInput}
                onChange={(event) => setStressProofUrlInput(event.target.value)}
                placeholder="https://evidence.company.com/collab/stress-report"
                className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)]"
              />
              <input
                type="text"
                value={stressProofSummaryInput}
                onChange={(event) => setStressProofSummaryInput(event.target.value)}
                placeholder="Resumo curto (opcional)"
                className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)]"
              />
              <button
                type="button"
                disabled={submittingEvidenceKey !== null}
                onClick={() => {
                  void recordStressProof()
                }}
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] rounded px-3 py-2 text-xs disabled:opacity-60"
              >
                {submittingEvidenceKey === 'stress-proof' ? 'Saving...' : 'Registrar proof'}
              </button>
            </div>
            <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <span className="mr-2 text-[var(--aethel-text-tertiary)]">Status:</span>
              {readiness.evidence.stressProofAttached ? (
                <>
                  <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] px-1.5 py-0.5 text-[var(--aethel-success-light)]">ATTACHED</span>
                  {readiness.evidence.stale?.stressProof ? (
                    <span className="ml-2 rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] px-1.5 py-0.5 text-[var(--aethel-error)]">
                      STALE ({readiness.evidence.maxAgeDays || 30}d)
                    </span>
                  ) : null}
                  {readiness.evidence.stressProofUrl ? (
                    <a
                      className="ml-2 text-[var(--aethel-info-light)] underline hover:text-[var(--aethel-info-light)]"
                      href={readiness.evidence.stressProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      abrir evidence
                    </a>
                  ) : null}
                  {readiness.evidence.stressProofSummary ? (
                    <span className="ml-2 text-[var(--aethel-text-secondary)]">{readiness.evidence.stressProofSummary}</span>
                  ) : null}
                </>
              ) : (
                <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] px-1.5 py-0.5 text-[var(--aethel-warning-light)]">PENDING</span>
              )}
            </div>
          </div>

          {!!readiness.evidenceHistory?.length && (
            <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <h3 className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Recent evidence events</h3>
              <div className="space-y-1">
                {readiness.evidenceHistory.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-secondary)]">
                    <span className="font-mono text-[var(--aethel-text-secondary)]">{event.evidenceType}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 ${ event.passed ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]' }`}
                    >
                      {event.passed ? 'PASS' : 'FAIL'}
                    </span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                    {event.adminEmail && <span className="text-[var(--aethel-text-tertiary)]">by {event.adminEmail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {!loading && !readiness && !error && (
        <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] mb-6">
          Readiness de colaboracao indisponivel para o ambiente atual.
        </div>
      )}

      <section className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">Projects colaborassets</h2>

        {!loading && projects.length === 0 && (
          <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)]">
            No collaborative project found for the current scope.
          </div>
        )}

        {projects.length > 0 && (
          <div className="overflow-x-auto" role="region" aria-label="Collaborative projects table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] text-[var(--aethel-text-secondary)]">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Membros</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Atualizado</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)]">
                    <td className="p-2 text-[var(--aethel-text-primary)]">{project.name}</td>
                    <td className="p-2 text-[var(--aethel-text-secondary)]">{project.members}</td>
                    <td className="p-2">
                      <span className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] bg-[var(--aethel-surface-primary)]/40 px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
                        {statusLabel(project.status)}
                      </span>
                    </td>
                    <td className="p-2 text-[var(--aethel-text-secondary)]">{new Date(project.updatedAt).toLocaleString()}</td>
                    <td className="p-2">
                      {project.status === 'active' ? (
                        <button
                          type="button"
                          disabled={submittingProjectId === project.id}
                          onClick={() => {
                            void updateStatus(project.id, 'paused')
                          }}
                          className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {submittingProjectId === project.id ? 'Saving...' : 'Suspender'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={submittingProjectId === project.id}
                          onClick={() => {
                            void updateStatus(project.id, 'active')
                          }}
                          className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] rounded px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {submittingProjectId === project.id ? 'Saving...' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
