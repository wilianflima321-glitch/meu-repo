'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { analytics } from '@/lib/analytics'

// --- Data ---
const QUICK_MISSIONS = [
  'Criar dashboard SaaS com auth, billing e deploy',
  'Gerar MVP de jogo 2D com fisica e leaderboard',
  'Pesquisar, planejar e implementar um app fullstack',
  'Criar API REST com TypeScript, Prisma e testes',
]

const FEATURES = [
  {
    icon: 'layers',
    title: 'Multi-agent orquestrado',
    description: 'Architect, Engineer e Critic operam com papeis explicitos. Nao e um chat monolitico disfarciado.',
    badge: 'Core',
  },
  {
    icon: 'shield',
    title: 'Anti-fake-success',
    description: 'Quando algo esta parcial ou indisponivel, o sistema diz isso. Sem sucesso falso, sem ilusao.',
    badge: 'Policy',
  },
  {
    icon: 'search',
    title: 'Research -> Code',
    description: 'Pesquisa com citacoes, planejamento, implementacao e preview no mesmo fluxo operacional.',
    badge: 'Flow',
  },
  {
    icon: 'pulse',
    title: 'Readiness operacional',
    description: 'Gates de qualidade, preflights, metricas de core-loop e evidencia de producao visivel.',
    badge: 'Ops',
  },
  {
    icon: 'repo-forked',
    title: 'Rollback deterministico',
    description: 'Apply, rollback e auditoria seguem o mesmo contrato. Sem efeitos colaterais escondidos.',
    badge: 'Safety',
  },
  {
    icon: 'eye',
    title: 'Preview canonico',
    description: 'Um unico surface de preview unificado para dashboard, IDE e workbench. Sem fragmentacao.',
    badge: 'UX',
  },
]

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Defina sua missao',
    description: 'Comece por app, game, film ou research. O wizard guiado configura projeto, provider e dominio.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    step: '02',
    title: 'Itere com agentes',
    description: 'Chat com contexto explicito, @mentions, preview em tempo real e sugestoes multi-agent.',
    color: 'from-blue-500 to-sky-500',
  },
  {
    step: '03',
    title: 'Valide e publique',
    description: 'Apply/rollback, readiness check, audit trail e deploy. Tudo no mesmo contrato operacional.',
    color: 'from-cyan-500 to-sky-500',
  },
]

const METRICS = [
  { value: '53+', label: 'Docs canonicos' },
  { value: '11', label: 'Quality gates' },
  { value: '0', label: 'Fake success' },
  { value: '174kB', label: 'Bundle otimizado' },
]

const COMPARISON = [
  { feature: 'Multi-agent real', aethel: true, others: false },
  { feature: 'Anti-fake-success policy', aethel: true, others: false },
  { feature: 'Rollback deterministico', aethel: true, others: false },
  { feature: 'Research -> Plan -> Code', aethel: true, others: false },
  { feature: 'Quality gates automaticos', aethel: true, others: false },
  { feature: 'Preview sandbox', aethel: 'partial', others: true },
  { feature: 'Billing runtime', aethel: 'partial', others: true },
  { feature: 'Mobile IDE', aethel: 'partial', others: true },
]

const TESTIMONIALS_PLACEHOLDER = [
  {
    name: 'Developer Community',
    role: 'Early adopters',
    text: 'A governanca e transparencia do Aethel sao unicas. Nenhum outro IDE tem o nivel de honestidade tecnica que voces tem.',
    avatar: null,
  },
  {
    name: 'Tech Lead',
    role: 'Beta tester',
    text: 'Finalmente um IDE de IA que nao finge que tudo funciona. O multi-agent orquestrado faz diferenca real na qualidade do codigo.',
    avatar: null,
  },
]

// --- Landing Page V3 Premium ---
export default function LandingPageV2() {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [typingIdx, setTypingIdx] = useState(0)
  const [typingText, setTypingText] = useState('')
  const placeholderRef = useRef(QUICK_MISSIONS[0])
  const router = useRouter()

  /* Animated placeholder typing */
  useEffect(() => {
    const mission = QUICK_MISSIONS[typingIdx % QUICK_MISSIONS.length]
    placeholderRef.current = mission
    let charIdx = 0
    setTypingText('')
    const interval = setInterval(() => {
      charIdx++
      setTypingText(mission.slice(0, charIdx))
      if (charIdx >= mission.length) {
        clearInterval(interval)
        setTimeout(() => setTypingIdx((i) => i + 1), 2200)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [typingIdx])

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mission = inputValue.trim()
    analytics?.track('project', 'project_open', {
      metadata: { source: 'landing-magic-box', hasMission: mission.length > 0 },
    })
    if (!mission) {
      router.push('/dashboard?onboarding=1&source=landing-magic-box')
      return
    }
    const params = new URLSearchParams()
    params.set('mission', mission)
    params.set('onboarding', '1')
    params.set('source', 'landing-magic-box')
    router.push(`/dashboard?${params.toString()}`)
  }

  useEffect(() => {
    analytics?.trackPageLoad?.('landing')
  }, [])

  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      {/* Skip to content */}
      <a
        href="#landing-mission"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[var(--aethel-text-primary)] focus:shadow-lg"
      >
        Pular para conteudo principal
      </a>

      <PublicHeader />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--aethel-primary-dark)]/[0.07] blur-[180px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[150px]" />
        <div className="absolute bottom-1/3 left-0 h-[400px] w-[400px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_4%,transparent)] blur-[120px]" />
      </div>

      <main id="landing-mission" className="relative z-10">
        {/* HERO */}
        <section id="hero" className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col justify-center px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[13px] font-medium text-[var(--aethel-primary-light)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--aethel-primary-light)] animate-pulse" />
                Multi-agent studio OS
              </div>

              {/* Headline */}
              <h1 className="max-w-[680px] text-4xl font-bold leading-[1.1] tracking-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-[3.5rem]">
                Crie apps com IA que{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
                  nao mente
                </span>{' '}
                sobre o resultado.
              </h1>

              {/* Subheadline */}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--aethel-text-secondary)]">
                Aethel unifica research, planejamento, codigo, preview e readiness operacional.
                Multi-agent de verdade, rollback deterministico e politica anti-fake-success.
              </p>

              {/* Magic Box */}
              <form onSubmit={handleMagicSubmit} className="mt-8 w-full max-w-xl" aria-label="Campo de missao inicial">
                <div className={`relative transition-transform duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-sky-500/60 opacity-50 blur-xl transition-opacity duration-300" />
                  <div className="relative flex items-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] backdrop-blur-xl">
                    <span className="pl-4 pr-2 text-[var(--aethel-text-tertiary)]">
                      <Codicon name="sparkle" />
                    </span>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder={typingText || 'Descreva sua missao...'}
                      aria-label="Descreva sua missao inicial para o studio"
                      className="h-14 w-full bg-transparent text-[15px] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="mr-2 flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)] transition-all hover:bg-[var(--aethel-primary-dark)] hover:shadow-lg hover:shadow-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] active:scale-95"
                    >
                      Iniciar
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick missions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_MISSIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInputValue(m)}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition-all hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] hover:text-[var(--aethel-text-secondary)]"
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/dashboard?onboarding=1&source=landing-hero"
                  className="aethel-button aethel-button-primary rounded-xl px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-500/25"
                >
                  Comecar gratis
                </Link>
                <Link
                  href="/pricing"
                  className="aethel-button aethel-button-secondary rounded-xl px-5 py-3 text-sm font-medium"
                >
                  Ver planos
                </Link>
              </div>
            </div>

            {/* Right side - Live product card */}
            <div className="rounded-3xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-gradient-to-b from-white/[0.04] to-transparent p-6 shadow-2xl shadow-blue-500/[0.08] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Honestidade tecnica</p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--aethel-text-primary)]">Aethel agora</h2>
                </div>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-xs font-medium text-[var(--aethel-success)]">
                  Apps = L4 target
                </span>
              </div>

              {/* Product claims */}
              <div className="space-y-2.5">
                {[
                  'Multi-agent com papeis especializados',
                  'Audit trail e rollback deterministico',
                  'Provider setup explicito com demo bridge',
                  'Preview canonico unificado',
                ].map((claim) => (
                  <div key={claim} className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)] text-xs">
                      <Codicon name="check" />
                    </span>
                    <span className="text-sm text-[var(--aethel-text-secondary)]">{claim}</span>
                  </div>
                ))}
              </div>

              {/* Partial / Frozen */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_6%,transparent)] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-warning)]">Parcial</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
                    Preview sandbox, billing, mobile IDE, production evidence.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Congelado</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--aethel-text-tertiary)]">
                    Games e Films permanecem L2 ate Apps fechar L4.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics bar */}
        <section className="border-y border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-3xl font-bold text-[var(--aethel-text-primary)]">{m.value}</p>
                <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">Diferenciais</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)] sm:text-4xl">
              O que torna Aethel diferente
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--aethel-text-tertiary)]">
              Nao e so mais um wrapper de LLM. E um studio operacional completo com contratos reais.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="group relative rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6 transition-all duration-300 hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aethel-primary)]/10 text-[var(--aethel-primary-light)] transition-colors group-hover:bg-[var(--aethel-primary)]/15">
                    <Codicon name={f.icon} />
                  </div>
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--aethel-text-primary)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--aethel-text-tertiary)]">{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="border-y border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/40 py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info)]">Como funciona</p>
                <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)] sm:text-4xl">
                  Fluxo unico, sem trocar de produto
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--aethel-text-tertiary)]">
                  O objetivo e entregar um fluxo de Apps + Research coerente e auditavel.
                  Nao prometemos Unreal ou Premiere ao mesmo tempo.
                </p>
                <Link
                  href="/dashboard?onboarding=1&source=landing-workflow"
                  className="aethel-button aethel-button-primary mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Experimentar agora
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              <div className="space-y-5">
                {WORKFLOW_STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="group flex gap-5 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-5 transition-all hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]"
                  >
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-[var(--aethel-text-primary)] font-bold text-sm`}>
                      {s.step}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--aethel-text-primary)]">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--aethel-text-tertiary)]">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info)]">Comparacao</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)] sm:text-4xl">Aethel vs. Mercado</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[var(--aethel-text-tertiary)]">
              Onde ja somos fortes e onde ainda precisamos fechar produto.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)]">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Feature</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--aethel-primary-light)]">Aethel</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Outros IDEs AI</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-[var(--aethel-border-subtle)] ${i % 2 === 0 ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)]' : ''}`}>
                    <td className="px-5 py-3.5 text-sm text-[var(--aethel-text-secondary)]">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center">
                      {row.aethel === true ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)] text-xs"><Codicon name="check" /></span>
                      ) : row.aethel === 'partial' ? (
                        <span className="text-xs font-medium text-[var(--aethel-warning)]">Parcial</span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--aethel-error)]/10 text-[var(--aethel-error)] text-xs"><Codicon name="close" /></span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.others === true ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success)] text-xs"><Codicon name="check" /></span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--aethel-error)]/10 text-[var(--aethel-error)] text-xs"><Codicon name="close" /></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/40 py-24">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Comunidade</p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">O que dizem os early adopters</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {TESTIMONIALS_PLACEHOLDER.map((t) => (
                <blockquote
                  key={t.name}
                  className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6"
                >
                  <p className="text-sm leading-relaxed text-[var(--aethel-text-secondary)]">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-sm font-bold text-[var(--aethel-text-primary)]">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{t.name}</p>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">{t.role}</p>
                    </div>
                  </div>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-gradient-to-br from-blue-500/[0.08] via-sky-500/[0.05] to-transparent p-10 text-center sm:p-16">
            <h2 className="text-3xl font-bold text-[var(--aethel-text-primary)] sm:text-4xl">Comece com uma missao real</h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-[var(--aethel-text-secondary)]">
              Abra o dashboard, escolha um template e leve a primeira iteracao para o IDE.
              Sem cartao de credito para comecar.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard?onboarding=1&source=landing-final-cta"
                className="aethel-button aethel-button-primary rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg shadow-blue-500/25"
              >
                Abrir dashboard
              </Link>
              <Link
                href="/pricing"
                className="aethel-button aethel-button-secondary rounded-xl px-6 py-3.5 text-sm font-medium"
              >
                Ver planos
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
