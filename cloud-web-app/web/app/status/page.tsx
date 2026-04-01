'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

type SurfaceState = 'healthy' | 'partial' | 'unhealthy' | 'unknown'

interface SurfaceCheck {
  id: string
  name: string
  endpoint: string
  required?: boolean
}

interface SurfaceResult {
  id: string
  name: string
  state: SurfaceState
  detail: string
  latency?: number
}

const SURFACE_CHECKS: SurfaceCheck[] = [
  { id: 'runtime', name: 'Runtime base', endpoint: '/api/health/live', required: true },
  { id: 'readiness', name: 'Prontidao da aplicacao', endpoint: '/api/health/ready', required: true },
  { id: 'ai', name: 'Provedores de IA', endpoint: '/api/health/ai' },
  { id: 'database', name: 'Banco de dados', endpoint: '/api/health/db', required: true },
  { id: 'cache', name: 'Cache / rate limiting', endpoint: '/api/health/cache' },
  { id: 'storage', name: 'Armazenamento de assets', endpoint: '/api/health/storage' },
  { id: 'stripe', name: 'Gateway Stripe', endpoint: '/api/health/stripe' },
  { id: 'billing', name: 'Runtime de billing', endpoint: '/api/billing/readiness' },
]

function stateStyles(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
    case 'unhealthy':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)]'
  }
}

function stateLabel(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'Operacional'
    case 'partial':
      return 'Parcial'
    case 'unhealthy':
      return 'Indisponivel'
    default:
      return 'Desconhecido'
  }
}

function summarizePayload(checkId: string, payload: any, ok: boolean): { state: SurfaceState; detail: string; latency?: number } {
  const latency = typeof payload?.latency === 'number' ? payload.latency : undefined

  if (checkId === 'runtime') {
    return {
      state: ok ? 'healthy' : 'unhealthy',
      detail: ok ? 'Rota de liveness respondendo.' : 'Probe do runtime base falhou.',
      latency,
    }
  }

  if (checkId === 'readiness') {
    return {
      state: payload?.status === 'ready' ? 'healthy' : ok ? 'partial' : 'unhealthy',
      detail:
        payload?.status === 'ready'
          ? 'Dependencias obrigatorias do runtime estao disponiveis.'
          : 'Runtime ainda sem uma ou mais dependencias obrigatorias.',
      latency,
    }
  }

  if (checkId === 'ai') {
    if (payload?.ai?.configured) {
      const provider = payload?.ai?.provider ?? 'provedor configurado'
      return { state: 'healthy', detail: `Configurado via ${provider}.`, latency }
    }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.ai?.message ?? 'Nenhum provedor de IA configurado ainda.',
      latency,
    }
  }

  if (checkId === 'database') {
    if (payload?.database?.connected) {
      const projects = payload?.database?.stats?.projects
      return {
        state: 'healthy',
        detail: typeof projects === 'number' ? `Conectado. ${projects} projetos visiveis.` : 'Conectado.',
        latency,
      }
    }
    return { state: 'unhealthy', detail: payload?.database?.error ?? 'Falha na conexao com o banco.', latency }
  }

  if (checkId === 'cache') {
    if (payload?.cache?.configured) return { state: 'healthy', detail: 'Configurado e acessivel.', latency }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.cache?.message ?? payload?.cache?.error ?? 'Cache nao configurado.',
      latency,
    }
  }

  if (checkId === 'storage') {
    if (payload?.storage?.configured) {
      return { state: 'healthy', detail: `Configurado em ${payload?.storage?.type ?? 'storage'}.`, latency }
    }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.storage?.message ?? payload?.storage?.error ?? 'Armazenamento nao configurado.',
      latency,
    }
  }

  if (checkId === 'stripe') {
    if (payload?.healthy) return { state: 'healthy', detail: 'Gateway Stripe pronto para checkout.', latency }
    const priceCoverage =
      typeof payload?.configuredPriceCount === 'number' && typeof payload?.requiredPriceCount === 'number'
        ? ` prices=${payload.configuredPriceCount}/${payload.requiredPriceCount}.`
        : ''
    const missingEnv = Array.isArray(payload?.missingEnv) && payload.missingEnv.length > 0
      ? ` Ausentes: ${payload.missingEnv.join(', ')}.`
      : ''
    return {
      state: ok ? 'partial' : 'unhealthy',
      detail: `Gateway=${payload?.gateway ?? 'unknown'}, checkout=${payload?.checkoutEnabled ? 'habilitado' : 'desabilitado'}, provider=${payload?.providerLabel ?? payload?.provider ?? 'unknown'}.${priceCoverage}${missingEnv}`.trim(),
      latency,
    }
  }

  if (checkId === 'billing') {
    if (payload?.checkoutReady) return { state: 'healthy', detail: 'Runtime de checkout pronto.', latency }
    const gateway = payload?.gateway?.activeGateway ?? payload?.gateway?.gateway ?? 'unknown'
    const provider = payload?.provider?.label ?? payload?.provider?.id ?? 'unknown'
    const priceCoverage =
      typeof payload?.stripe?.configuredPriceCount === 'number' && typeof payload?.stripe?.requiredPriceCount === 'number'
        ? ` prices=${payload.stripe.configuredPriceCount}/${payload.stripe.requiredPriceCount}.`
        : ''
    const missingEnv = Array.isArray(payload?.stripe?.missingEnv) && payload.stripe.missingEnv.length > 0
      ? ` Ausentes: ${payload.stripe.missingEnv.join(', ')}.`
      : ''
    return {
      state: payload?.status === 'partial' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: `Runtime de billing ainda parcial. Gateway=${gateway}, provider=${provider}.${priceCoverage}${missingEnv}`.trim(),
      latency,
    }
  }

  return {
    state: ok ? 'healthy' : 'unhealthy',
    detail: ok ? 'Operacional.' : 'Falha no endpoint.',
    latency,
  }
}

async function fetchSurface(check: SurfaceCheck): Promise<SurfaceResult> {
  try {
    const response = await fetch(check.endpoint, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    const summary = summarizePayload(check.id, payload, response.ok)
    return { id: check.id, name: check.name, ...summary }
  } catch (error) {
    return {
      id: check.id,
      name: check.name,
      state: 'unhealthy',
      detail: error instanceof Error ? error.message : 'Falha na requisicao.',
    }
  }
}

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
    const interval = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const overall = useMemo(() => {
    if (surfaces.length === 0) return 'unknown'
    const required = surfaces.filter((surface) => SURFACE_CHECKS.find((check) => check.id === surface.id)?.required)
    if (required.some((surface) => surface.state === 'unhealthy')) return 'unhealthy'
    if (surfaces.some((surface) => surface.state === 'partial')) return 'partial'
    if (surfaces.every((surface) => surface.state === 'healthy')) return 'healthy'
    return 'unknown'
  }, [surfaces])

  const counts = useMemo(() => ({
    healthy: surfaces.filter((surface) => surface.state === 'healthy').length,
    partial: surfaces.filter((surface) => surface.state === 'partial').length,
    unhealthy: surfaces.filter((surface) => surface.state === 'unhealthy').length,
  }), [surfaces])

  const blockingSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.state === 'unhealthy'),
    [surfaces]
  )

  const partialSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.state === 'partial'),
    [surfaces]
  )

  const operationalTruths = useMemo(
    () => [
      'Sem uptime rolling artificial ou incidentes inventados.',
      'Status publico mede apenas o que os endpoints conseguem provar agora.',
      'Evidencia L4 continua separada: exige producao real, nao apenas health checks.',
    ],
    []
  )

  const nextActions = useMemo(() => {
    if (blockingSurfaces.some((surface) => surface.id === 'database')) {
      return [
        'Restabelecer conectividade com o banco de dados.',
        'Revalidar readiness e runtime publico apos a conexao voltar.',
      ]
    }

    if (blockingSurfaces.some((surface) => surface.id === 'runtime' || surface.id === 'readiness')) {
      return [
        'Recuperar liveness/readiness do app antes de promover qualquer narrativa publica.',
        'Executar novo ciclo de checks para confirmar estabilidade do runtime.',
      ]
    }

    if (partialSurfaces.some((surface) => surface.id === 'stripe' || surface.id === 'billing')) {
      return [
        'Completar checkout + webhook para transformar billing em capacidade vendavel.',
        'Validar os planos e price IDs com o runtime de billing real.',
      ]
    }

    if (partialSurfaces.some((surface) => surface.id === 'storage' || surface.id === 'cache' || surface.id === 'ai')) {
      return [
        'Fechar credenciais/configuracoes das dependencias opcionais ainda parciais.',
        'Executar um novo check publico para confirmar o ganho de cobertura operacional.',
      ]
    }

    return [
      'Manter os checks publicos respondendo e ampliar evidencias de producao real.',
      'Usar o admin de monitoramento para fechar os blockers de L4 que ainda nao aparecem aqui.',
    ]
  }, [blockingSurfaces, partialSurfaces])

  const overallTitle =
    overall === 'healthy'
      ? 'Runtime publico operacional'
      : overall === 'partial'
        ? 'Runtime publico parcial'
        : overall === 'unhealthy'
          ? 'Runtime com bloqueios ativos'
          : 'Coletando sinais'

  const overallDescription =
    overall === 'healthy'
      ? 'Os checks publicos configurados responderam sem bloqueios relevantes.'
      : overall === 'partial'
        ? 'A base publica responde, mas alguns subsistemas ainda estao em estado parcial.'
        : overall === 'unhealthy'
          ? 'Um ou mais blocos essenciais do runtime falharam na verificacao publica.'
          : 'Atualizando checks operacionais em tempo real.'

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
                Status baseado em evidencia e leitura operacional de verdade.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Esta pagina nao inventa uptime rolling nem incidentes que nao existem no backend. Ela organiza o que os checks publicos conseguem provar agora.
              </p>
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
              <p className="mt-4 text-xs opacity-75">
                {isLoading ? 'Atualizando checks...' : `Ultima atualizacao: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pt-BR') : 'agora'}`}
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
                <li>- Operacional significa que o endpoint respondeu e o payload indicou disponibilidade real.</li>
                <li>- Parcial significa que a superficie responde, mas depende de configuracao ou credencial ainda ausente.</li>
                <li>- Bloqueado significa falha publica ou dependencia obrigatoria indisponivel.</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Limites atuais</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                <li>- Ainda nao publicamos uptime rolling de 7, 30 ou 90 dias.</li>
                <li>- Ainda nao existe historico completo de incidentes nesta pagina.</li>
                <li>- Evidence L4 e uma trilha diferente: depende de producao real, nao so destes checks publicos.</li>
              </ul>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Verdade operacional</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {operationalTruths.map((truth) => (
                  <div key={truth} className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    {truth}
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
