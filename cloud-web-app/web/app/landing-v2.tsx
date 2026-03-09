'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Criar dashboard SaaS com auth, billing e deploy',
  'Gerar MVP de jogo 2D com fisica e leaderboard',
  'Pesquisar, planejar e implementar um app fullstack',
]

const DIFFERENTIATORS = [
  {
    title: 'Multi-agent de verdade',
    description: 'Architect, Engineer e Critic trabalham com papeis explicitos em vez de um chat monolitico.',
  },
  {
    title: 'Sem fake success',
    description: 'Quando uma capacidade esta parcial ou indisponivel, o produto diz isso explicitamente.',
  },
  {
    title: 'Research -> Plan -> Code',
    description: 'Pesquisa, planejamento e execucao ficam no mesmo fluxo operacional.',
  },
]

const WORKFLOW_STEPS = [
  {
    title: '1. Defina a missao',
    body: 'Entre por app, game, film ou research e comece com um projeto guiado.',
  },
  {
    title: '2. Itere com agentes',
    body: 'Use chat, contexto explicito e preview para ajustar sem perder controle.',
  },
  {
    title: '3. Valide e promova',
    body: 'Apply, rollback, readiness e auditoria seguem o mesmo contrato operacional.',
  },
]

const PRODUCT_CLAIMS = [
  'Multi-agent com papeis especializados',
  'Audit trail e rollback deterministico',
  'Provider setup explicito e demo bridge para first value',
  'Preview canonico unificado para dashboard e IDE',
]

export default function LandingPageV2() {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mission = inputValue.trim()

    analytics?.track('project', 'project_open', {
      metadata: {
        source: 'landing-magic-box',
        hasMission: mission.length > 0,
      },
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

  const handleNavigate = (target: '/dashboard' | '/login' | '/docs' | '/pricing') => {
    analytics?.track?.('user', 'settings_change', {
      metadata: {
        source: 'landing-shortcuts',
        target,
      },
    })

    if (target === '/dashboard') {
      router.push('/dashboard?onboarding=1&source=landing-shortcuts')
      return
    }

    router.push(target)
  }

  const handleQuickMission = (mission: string) => {
    setInputValue(mission)
    analytics?.track?.('user', 'settings_change', {
      metadata: {
        source: 'landing-quick-mission',
        action: 'set-mission',
      },
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <a
        href="#landing-mission"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-zinc-100 focus:ring-2 focus:ring-sky-500"
      >
        Pular para o campo de missao
      </a>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_28%)] pointer-events-none" />

      <main className="relative z-10">
        <section id="landing-mission" className="mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm text-sky-200">
                <Image
                  src="/branding/aethel-icon-source.png"
                  alt="Aethel"
                  width={24}
                  height={24}
                  className="rounded-md"
                  priority
                />
                Multi-agent software studio with explicit capability contracts
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                O studio unificado para criar apps, research workflows e iteracoes assistidas por IA sem fake success.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                Aethel combina chat multi-agent, preview canonico, readiness operacional e auditoria explicita.
                O foco de mercado hoje e Apps + Research, com Games e Films ainda tratados de forma factual como superficies experimentais.
              </p>

              <form onSubmit={handleMagicSubmit} className="mt-8 w-full max-w-2xl" aria-label="Missao inicial do Studio Home">
                <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/70 via-sky-500/70 to-blue-600/70 blur-xl opacity-60" />
                  <div className="relative flex items-center rounded-2xl border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-sm">
                    <span className="pl-4 pr-2 text-zinc-400">
                      <Codicon name="sparkle" />
                    </span>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="Ex: criar app SaaS com auth, billing, dashboard e deploy"
                      aria-label="Descreva a missao inicial"
                      className="h-14 w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none sm:text-base"
                    />
                    <button
                      type="submit"
                      className="mr-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-slate-200"
                    >
                      Abrir no studio
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_MISSIONS.map((mission) => (
                  <button
                    key={mission}
                    type="button"
                    onClick={() => handleQuickMission(mission)}
                    className="rounded-full border border-zinc-700/90 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                  >
                    {mission}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleNavigate('/dashboard')}
                  className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-sky-400"
                >
                  Comecar gratis
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/pricing')}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                >
                  Ver pricing
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/docs')}
                  className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  Ler docs
                </button>
                <Link
                  href="/status"
                  className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  Ver status
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_30px_100px_-50px_rgba(14,165,233,0.45)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Claims que podemos defender</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Aethel agora</h2>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  Apps = L4 candidate
                </span>
              </div>

              <div className="space-y-3">
                {PRODUCT_CLAIMS.map((claim) => (
                  <div key={claim} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                      <Codicon name="check" />
                    </span>
                    <p className="text-sm leading-6 text-zinc-300">{claim}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-amber-300">Ainda parcial</p>
                  <p className="mt-2 text-sm text-zinc-200">Preview sandbox default, billing runtime, production evidence, mobile IDE.</p>
                </div>
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Expansao depois</p>
                  <p className="mt-2 text-sm text-zinc-200">Games e Films continuam experimentais ate Apps fechar L4 com evidencia real.</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Transparencia operacional</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Status publico, billing readiness e setup de providers agora tem superficies explicitas. Claims publicos devem seguir o mesmo contrato operacional do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-black/20">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
            {DIFFERENTIATORS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Como funciona</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Fluxo unico, sem trocar de produto a cada etapa</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
                O objetivo de curto prazo nao e prometer Unreal, Premiere ou Cursor ao mesmo tempo.
                O objetivo e entregar um fluxo de Apps + Research muito bom, coerente e auditavel.
              </p>
            </div>
            <div className="grid gap-4">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Comparacao direta</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Onde Aethel ja e forte e onde ainda precisa fechar produto</h2>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-zinc-200">
                    Forte agora: multi-agent, anti-fake-success, rollback deterministico, readiness e governanca.
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-zinc-200">
                    Gap principal: sandbox preview default, billing real, onboarding medido, contexto semantico product-grade.
                  </div>
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
                    Posicionamento correto: lancar Apps + Research primeiro; Games e Films entram como expansao depois da prova L4.
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-black/20 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Proximo passo</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Comece com uma missao real</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Abra o dashboard com onboarding ativo, use um starter guidado e leve a primeira iteracao para o IDE.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard?onboarding=1&source=landing-cta"
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-slate-200"
                  >
                    Abrir dashboard
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    Ver planos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
