'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
  { id: 'readiness', name: 'App readiness', endpoint: '/api/health/ready', required: true },
  { id: 'ai', name: 'AI providers', endpoint: '/api/health/ai' },
  { id: 'database', name: 'Database', endpoint: '/api/health/db', required: true },
  { id: 'cache', name: 'Cache / rate limiting', endpoint: '/api/health/cache' },
  { id: 'storage', name: 'Asset storage', endpoint: '/api/health/storage' },
  { id: 'stripe', name: 'Stripe gateway', endpoint: '/api/health/stripe' },
  { id: 'billing', name: 'Billing runtime', endpoint: '/api/billing/readiness' },
]

function stateStyles(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    case 'partial':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-200'
    case 'unhealthy':
      return 'bg-red-500/10 border-red-500/30 text-red-300'
    default:
      return 'bg-slate-500/10 border-slate-500/20 text-slate-300'
  }
}

function stateLabel(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'Healthy'
    case 'partial':
      return 'Partial'
    case 'unhealthy':
      return 'Unavailable'
    default:
      return 'Unknown'
  }
}

function summarizePayload(checkId: string, payload: any, ok: boolean): { state: SurfaceState; detail: string; latency?: number } {
  const latency = typeof payload?.latency === 'number' ? payload.latency : undefined

  if (checkId === 'runtime') {
    return {
      state: ok ? 'healthy' : 'unhealthy',
      detail: ok ? 'HTTP liveness route responding.' : 'Base runtime probe failed.',
      latency,
    }
  }

  if (checkId === 'readiness') {
    return {
      state: payload?.status === 'ready' ? 'healthy' : ok ? 'partial' : 'unhealthy',
      detail:
        payload?.status === 'ready'
          ? 'Required runtime dependencies are available.'
          : 'Runtime still missing one or more required dependencies.',
      latency,
    }
  }

  if (checkId === 'ai') {
    if (payload?.ai?.configured) {
      const provider = payload?.ai?.provider ?? 'provider configured'
      return { state: 'healthy', detail: `Configured via ${provider}.`, latency }
    }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.ai?.message ?? 'No AI provider configured yet.',
      latency,
    }
  }

  if (checkId === 'database') {
    if (payload?.database?.connected) {
      const projects = payload?.database?.stats?.projects
      return {
        state: 'healthy',
        detail: typeof projects === 'number' ? `Connected. ${projects} projects visible.` : 'Connected.',
        latency,
      }
    }
    return { state: 'unhealthy', detail: payload?.database?.error ?? 'Database connection failed.', latency }
  }

  if (checkId === 'cache') {
    if (payload?.cache?.configured) return { state: 'healthy', detail: 'Configured and reachable.', latency }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.cache?.message ?? payload?.cache?.error ?? 'Cache not configured.',
      latency,
    }
  }

  if (checkId === 'storage') {
    if (payload?.storage?.configured) {
      return { state: 'healthy', detail: `Configured on ${payload?.storage?.type ?? 'storage'}.`, latency }
    }
    return {
      state: payload?.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: payload?.storage?.message ?? payload?.storage?.error ?? 'Storage not configured.',
      latency,
    }
  }

  if (checkId === 'stripe') {
    if (payload?.healthy) return { state: 'healthy', detail: 'Stripe gateway is ready for checkout.', latency }
    const priceCoverage =
      typeof payload?.configuredPriceCount === 'number' && typeof payload?.requiredPriceCount === 'number'
        ? ` prices=${payload.configuredPriceCount}/${payload.requiredPriceCount}.`
        : ''
    const missingEnv = Array.isArray(payload?.missingEnv) && payload.missingEnv.length > 0
      ? ` Missing: ${payload.missingEnv.join(', ')}.`
      : ''
    return {
      state: ok ? 'partial' : 'unhealthy',
      detail: `Gateway=${payload?.gateway ?? 'unknown'}, checkout=${payload?.checkoutEnabled ? 'enabled' : 'disabled'}, provider=${payload?.providerLabel ?? payload?.provider ?? 'unknown'}.${priceCoverage}${missingEnv}`.trim(),
      latency,
    }
  }

  if (checkId === 'billing') {
    if (payload?.checkoutReady) return { state: 'healthy', detail: 'Checkout runtime is ready.', latency }
    const gateway = payload?.gateway?.activeGateway ?? payload?.gateway?.gateway ?? 'unknown'
    const provider = payload?.provider?.label ?? payload?.provider?.id ?? 'unknown'
    const priceCoverage =
      typeof payload?.stripe?.configuredPriceCount === 'number' && typeof payload?.stripe?.requiredPriceCount === 'number'
        ? ` prices=${payload.stripe.configuredPriceCount}/${payload.stripe.requiredPriceCount}.`
        : ''
    const missingEnv = Array.isArray(payload?.stripe?.missingEnv) && payload.stripe.missingEnv.length > 0
      ? ` Missing: ${payload.stripe.missingEnv.join(', ')}.`
      : ''
    return {
      state: payload?.status === 'partial' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: `Billing runtime still partial. Gateway=${gateway}, provider=${provider}.${priceCoverage}${missingEnv}`.trim(),
      latency,
    }
  }

  return {
    state: ok ? 'healthy' : 'unhealthy',
    detail: ok ? 'Operational.' : 'Endpoint failed.',
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
      detail: error instanceof Error ? error.message : 'Request failed.',
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
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-600/5 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-600/5 blur-[150px]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/branding/aethel-icon-source.png" alt="Aethel" width={36} height={36} className="rounded-xl" />
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-slate-400 transition-colors hover:text-white">
              Precos
            </Link>
            <Link href="/contact-sales" className="text-slate-400 transition-colors hover:text-white">
              Contato
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative px-6 pb-16 pt-32">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10 text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.18em] text-sky-300">Public Runtime Status</p>
            <h1 className="text-4xl font-bold sm:text-5xl">Status publico baseado em checks reais</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              Esta pagina nao usa uptime inventado, incidentes ficticios ou SLAs simulados. Ela mostra apenas o que os checks publicos conseguem provar agora.
            </p>
          </header>

          <section className={`mb-8 rounded-2xl border p-6 ${stateStyles(overall)}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{overallTitle}</h2>
                <p className="mt-2 text-sm opacity-80">{overallDescription}</p>
              </div>
              <div className="text-sm opacity-80">
                {isLoading ? 'Atualizando checks...' : `Ultima atualizacao: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pt-BR') : 'agora'}`}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {SURFACE_CHECKS.map((check) => {
              const result = surfaces.find((surface) => surface.id === check.id)
              const state = result?.state ?? 'unknown'
              return (
                <article key={check.id} className={`rounded-2xl border p-5 ${stateStyles(state)}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{check.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">
                        {check.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                    <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium">
                      {stateLabel(state)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 opacity-90">
                    {result?.detail ?? 'Aguardando resposta do endpoint.'}
                  </p>
                  {typeof result?.latency === 'number' && (
                    <p className="mt-3 text-xs opacity-70">Latencia reportada: {result.latency}ms</p>
                  )}
                </article>
              )
            })}
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Limites desta pagina</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              <li>Checks publicos nao substituem evidencia de producao para L4/L5.</li>
              <li>Historico de incidentes e uptime rolling ainda nao sao publicados aqui.</li>
              <li>Billing pode aparecer parcial mesmo com pricing publico pronto, porque depende de runtime real do gateway.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
