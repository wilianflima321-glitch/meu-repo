'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import {
  INCIDENT_GRAMMAR,
  STATUS_LIMITS,
  STATUS_REFRESH_INTERVAL_MS,
  STATUS_TRUTHS,
  SURFACE_CHECKS,
  TRUST_EXPLAINERS,
} from './status.content'
import {
  fetchSurface,
  getCoverageSummary,
  getNextActions,
  getOverallDescription,
  getOverallTitle,
  getStateCounts,
  getStatusTimeline,
  stateLabel,
  stateStyles,
  summarizeOverallState,
} from './status.logic'
import type { SurfaceResult } from './status.types'

export default function StatusPage() {
  const [surfaces, setSurfaces] = useState<SurfaceResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const results = await Promise.all(SURFACE_CHECKS.map(fetchSurface))
      if (cancelled) return
      setSurfaces(results)
      setLastUpdated(new Date().toISOString())
      setIsLoading(false)
    }

    void load()
    const interval = window.setInterval(load, STATUS_REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const overall = useMemo(() => summarizeOverallState(surfaces, SURFACE_CHECKS), [surfaces])
  const counts = useMemo(() => getStateCounts(surfaces), [surfaces])
  const blockingSurfaces = useMemo(() => surfaces.filter((surface) => surface.state === 'unhealthy'), [surfaces])
  const partialSurfaces = useMemo(() => surfaces.filter((surface) => surface.state === 'partial'), [surfaces])
  const overallTitle = useMemo(() => getOverallTitle(overall), [overall])
  const overallDescription = useMemo(() => getOverallDescription(overall), [overall])
  const coverageSummary = useMemo(
    () => getCoverageSummary(surfaces, SURFACE_CHECKS, blockingSurfaces, partialSurfaces),
    [blockingSurfaces, partialSurfaces, surfaces]
  )
  const statusTimeline = useMemo(
    () => getStatusTimeline(overall, blockingSurfaces, partialSurfaces, lastUpdated),
    [blockingSurfaces, lastUpdated, overall, partialSurfaces]
  )
  const nextActions = useMemo(() => getNextActions(blockingSurfaces, partialSurfaces), [blockingSurfaces, partialSurfaces])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-success)_8%,transparent),transparent_28%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_6%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[520px] w-[520px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_5%,transparent)] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-success-light)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Status publico
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl">
                Status comercial com grammar de incidente, limites claros e evidencia verificavel.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Esta pagina nao vende uma confianca artificial. Ela mostra o que os checks publicos conseguem provar agora, explica o que ainda nao publicamos e traduz isso para impacto real em produto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {TRUST_EXPLAINERS.map((explainer) => (
                  <div
                    key={explainer.title}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-secondary)]"
                  >
                    <span className="text-[var(--aethel-text-primary)]">{explainer.title}</span>
                    <span className="mx-2 opacity-40">/</span>
                    <span>{explainer.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[30px] border p-6 ${stateStyles(overall)}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">Panorama</p>
                  <h2 className="mt-2 text-2xl font-semibold">{overallTitle}</h2>
                </div>
                {overall === 'healthy' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <p className="mt-3 text-sm leading-6 opacity-85">{overallDescription}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-current/15 bg-black/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Leitura cliente</p>
                  <p className="mt-2 text-sm leading-6 opacity-90">{coverageSummary.customerImpact}</p>
                </div>
                <div className="rounded-[22px] border border-current/15 bg-black/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Cadencia</p>
                  <p className="mt-2 text-sm leading-6 opacity-90">
                    {isLoading
                      ? 'Atualizando checks iniciais...'
                      : `Checks publicos renovados a cada ${STATUS_REFRESH_INTERVAL_MS / 1000}s.`}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs opacity-75">
                {isLoading
                  ? 'Atualizando checks...'
                  : `Ultima atualizacao: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pt-BR') : 'agora'}`}
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Checks totais</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{SURFACE_CHECKS.length}</p>
            </div>
            <div className="rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] p-5 text-[var(--aethel-success-light)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Operacionais</p>
              <p className="mt-2 text-3xl font-semibold">{counts.healthy}</p>
            </div>
            <div className="rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] p-5 text-[var(--aethel-warning-light)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Parciais</p>
              <p className="mt-2 text-3xl font-semibold">{counts.partial}</p>
            </div>
            <div className="rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-5 text-[var(--aethel-error-light)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Bloqueados</p>
              <p className="mt-2 text-3xl font-semibold">{counts.unhealthy}</p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Historico e postura atual</p>
              <div className="mt-4 space-y-3">
                {statusTimeline.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-[24px] border p-4 ${stateStyles(entry.tone)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{entry.label}</p>
                        <p className="mt-1 text-base font-semibold">{entry.title}</p>
                      </div>
                      <span className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                        {entry.timestampLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 opacity-90">{entry.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Cobertura desta pagina</p>
              <div className="mt-4 space-y-3">
                {coverageSummary.cards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] bg-[var(--aethel-surface-primary)]/10 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SURFACE_CHECKS.map((check) => {
              const result = surfaces.find((surface) => surface.id === check.id)
              const state = result?.state ?? 'unknown'
              return (
                <article key={check.id} className={`rounded-[26px] border p-5 ${stateStyles(state)}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{check.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] opacity-70">
                        {check.required ? 'Obrigatorio' : 'Opcional'}
                      </p>
                    </div>
                    <span className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                      {stateLabel(state)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 opacity-90">
                    {result?.detail ?? 'Aguardando resposta do endpoint.'}
                  </p>
                  {typeof result?.latency === 'number' && (
                    <p className="mt-4 inline-flex items-center gap-2 text-xs opacity-75">
                      <Clock3 className="h-3.5 w-3.5" />
                      {result.latency}ms
                    </p>
                  )}
                </article>
              )
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Como ler esta pagina</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {STATUS_TRUTHS.map((truth) => (
                  <li key={truth}>- {truth}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-warning-light)]">Limites assumidos em publico</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {STATUS_LIMITS.map((limit) => (
                  <li key={limit}>- {limit}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Grammar de incidente</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {INCIDENT_GRAMMAR.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{item.eyebrow}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Proxima melhor acao</p>
              <div className="mt-4 space-y-3">
                {nextActions.map((action) => (
                  <div key={action} className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)]">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-error-light)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Bloqueios publicos
              </div>
              <div className="mt-4 space-y-3">
                {blockingSurfaces.length > 0 ? (
                  blockingSurfaces.map((surface) => (
                    <div key={surface.id} className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-surface-primary)]/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{surface.name}</p>
                        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-error)_22%,transparent)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--aethel-error-light)]">
                          {stateLabel(surface.state)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{surface.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-surface-primary)]/10 p-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    Nenhum bloqueio publico ativo nos checks obrigatorios desta pagina.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-warning-light)]">
                <Clock3 className="h-3.5 w-3.5" />
                Ainda parcial
              </div>
              <div className="mt-4 space-y-3">
                {partialSurfaces.length > 0 ? (
                  partialSurfaces.map((surface) => (
                    <div key={surface.id} className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{surface.name}</p>
                        <span className="rounded-full border border-[var(--aethel-border-primary)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
                          {stateLabel(surface.state)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{surface.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-surface-primary)]/10 p-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    Nenhuma superficie opcional esta marcada como parcial neste momento.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
