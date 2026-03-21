'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  GitFork,
  Layers,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { GlassCard, GradientButton, GlowBadge } from '@/components/ui/premium'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Criar dashboard SaaS com auth, billing e deploy',
  'Planejar e implementar um app fullstack com Prisma',
  'Abrir o studio e seguir com onboarding guiado',
]

const VALUE_POINTS = [
  {
    icon: Layers,
    title: 'Multi-agent com papeis reais',
    description: 'Architect, Engineer e Critic operam com responsabilidades explicitas, nao como um chat monolitico.',
  },
  {
    icon: Shield,
    title: 'Politica anti-fake-success',
    description: 'Quando preview, billing ou outro runtime estiver parcial, o produto mostra isso em vez de simular sucesso.',
  },
  {
    icon: Search,
    title: 'Research -> Plan -> Code',
    description: 'Pesquisa, planejamento, implementacao e validacao ficam no mesmo fluxo operacional.',
  },
  {
    icon: GitFork,
    title: 'Rollback e auditoria',
    description: 'Apply, rollback e readiness seguem o mesmo contrato e deixam trilha operacional visivel.',
  },
]

const WORKFLOW = [
  {
    step: '01',
    title: 'Defina a missao',
    description: 'Entre pelo problema que quer resolver, nao por uma pilha de menus desconectados.',
  },
  {
    step: '02',
    title: 'Itere dentro do studio',
    description: 'Dashboard, chat, editor e preview convivem no mesmo shell em vez de espalhar contexto.',
  },
  {
    step: '03',
    title: 'Valide antes de prometer',
    description: 'Readiness, health e status deixam claro o que esta pronto, parcial ou bloqueado.',
  },
]

const HONESTY_NOTES = [
  'Apps + Research sao o foco principal do produto hoje.',
  'Games e Films continuam em estado experimental.',
  'Billing e preview real dependem de runtime e credenciais ativas.',
]

const PRICING_TEASER = [
  {
    title: 'Free',
    price: '$0',
    desc: 'Explorar o studio e experimentar o fluxo.',
    features: ['1 projeto ativo', 'Limites de IA diarios', 'Preview limitado'],
    cta: 'Comecar gratis',
    variant: 'secondary' as const,
  },
  {
    title: 'Pro',
    price: '$49',
    desc: 'Para devs e squads que precisam de velocidade.',
    features: ['Preview gerenciado', 'RAG + mentions', 'Deploy one-click'],
    cta: 'Assinar Pro',
    variant: 'primary' as const,
    highlight: true,
  },
  {
    title: 'Enterprise',
    price: 'Custom',
    desc: 'Governanca, compliance e suporte dedicado.',
    features: ['SSO/SAML', 'SLA + Audit Logs', 'Limites customizados'],
    cta: 'Falar com vendas',
    variant: 'ghost' as const,
  },
]

const SOCIAL_PROOF = [
  {
    icon: Activity,
    label: 'Beta privado em andamento',
    detail: 'Roadmap aberto com evidencias operacionais.',
  },
  {
    icon: Shield,
    label: 'Sistema anti-fake-success',
    detail: 'Readiness explicito antes do deploy.',
  },
  {
    icon: Layers,
    label: 'Studio unico',
    detail: 'Research, codigo e preview no mesmo shell.',
  },
]

function ScreenshotCard({
  src,
  alt,
  title,
  subtitle,
}: {
  src: string
  alt: string
  title: string
  subtitle: string
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.92))] shadow-[0_24px_90px_rgba(2,6,23,0.42)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
      </div>
      <Image src={src} alt={alt} width={1600} height={960} className="h-auto w-full object-cover" />
    </div>
  )
}

export default function LandingPageV3() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSuggestionIndex((current) => (current + 1) % QUICK_MISSIONS.length)
    }, 2600)
    return () => window.clearTimeout(timeout)
  }, [suggestionIndex])

  const placeholder = useMemo(() => QUICK_MISSIONS[suggestionIndex], [suggestionIndex])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mission = inputValue.trim()

    if (process.env.NEXT_PUBLIC_ENABLE_MARKETING_ANALYTICS === 'true') {
      analytics?.track('project', 'project_open', {
        metadata: { source: 'landing-mission-box', hasMission: mission.length > 0 },
      })
    }

    if (!mission) {
      router.push('/dashboard?onboarding=1&source=landing-v3')
      return
    }

    const params = new URLSearchParams()
    params.set('mission', mission)
    params.set('onboarding', '1')
    params.set('source', 'landing-v3')
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_24%),#020617] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-cyan-500/[0.08] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[170px]" />
      </div>

      <PublicHeader />

      <main id="main-content" className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Software studio operacional
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Crie apps com IA sem perder o controle do que realmente funciona.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                O Aethel conecta discovery, implementacao, preview e readiness no mesmo fluxo.
                O foco principal hoje e <span className="font-medium text-white">Apps + Research</span>, com governanca explicita e sem fake success.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">Apps como dominio principal</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">Readiness visivel</span>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-primary-light)]">Rollback deterministico</span>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 max-w-2xl">
                <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.92))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.42)] sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3">
                    <Sparkles className="h-4.5 w-4.5 shrink-0 text-cyan-300" />
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none sm:text-[15px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.92))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(56,189,248,0.24)] transition hover:brightness-110"
                  >
                    Abrir studio
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {QUICK_MISSIONS.map((mission) => (
                  <button
                    key={mission}
                    type="button"
                    onClick={() => setInputValue(mission)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    {mission}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=landing-primary-cta"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Comecar gratis
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                >
                  Ver planos
                </Link>
              </div>
            </motion.div>

            <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-4">
              <ScreenshotCard
                src="/screenshots/dashboard.png"
                alt="Dashboard do Aethel"
                title="Studio Home"
                subtitle="projetos, onboarding, billing e sinais de readiness"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estado atual</p>
                  <ul className="mt-4 space-y-3">
                    {HONESTY_NOTES.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[26px] border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Fluxo unico</p>
                  <p className="mt-4 text-sm leading-6 text-cyan-50/90">
                    Dashboard, editor, preview e status precisam parecer um unico produto. A landing agora aponta para isso com prova visual do studio.
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <GlassCard variant="elevated" border={false} className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <GlowBadge color="info">Demo guiada</GlowBadge>
                  <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Veja o fluxo completo em 90s</h2>
                </div>
                <span className="text-xs text-[var(--aethel-text-tertiary)]">Em producao</span>
              </div>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Estamos preparando um walkthrough completo com onboarding, editor e preview. Enquanto isso, use o studio
                para validar o fluxo real e nos ajudar a fechar o L4.
              </p>
              <div className="mt-6 aspect-video w-full rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] shadow-[0_20px_70px_rgba(2,6,23,0.45)]">
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
                  <Eye className="h-8 w-8 text-cyan-300" />
                  <span>Video demo em producao</span>
                  <span className="text-xs text-slate-500">Use a experiencia real do studio enquanto finalizamos a demo.</span>
                </div>
              </div>
            </GlassCard>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-[var(--aethel-text-tertiary)]">Prova social</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Sem promessas infladas: toda prova social reflete o estado atual do produto ou do beta fechado.
                  </p>
                </div>
                <GlowBadge color="emerald">Beta fechado</GlowBadge>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {SOCIAL_PROOF.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-4"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: '11', label: 'quality gates' },
                { value: '53+', label: 'docs canonicos' },
                { value: '0', label: 'fake success aceito' },
                { value: '174kB', label: 'dashboard bundle' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/[0.03] px-5 py-5 text-center">
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--aethel-text-tertiary)]">Planos</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Pricing transparente para cada fase</h2>
                <p className="mt-2 text-sm text-slate-400">O billing real entra assim que Stripe estiver validado.</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-white hover:bg-white/[0.1]"
              >
                Ver todos os planos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {PRICING_TEASER.map((plan) => (
                <GlassCard
                  key={plan.title}
                  variant={plan.highlight ? 'glow' : 'default'}
                  className="flex flex-col gap-4 p-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
                    {plan.highlight && <GlowBadge color="primary">Mais usado</GlowBadge>}
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-white">{plan.price}</p>
                    <p className="text-xs text-slate-400">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <GradientButton variant={plan.variant} onClick={() => router.push('/pricing')}>
                    {plan.cta}
                  </GradientButton>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Diferenciais</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              O produto precisa parecer um studio, nao um conjunto de telas soltas.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Esses blocos sao os que mais importam para perceber valor real na experiencia: contexto, seguranca de operacao e prova visual do workflow.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {VALUE_POINTS.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.90))] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.36)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-slate-950/35">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">Fluxo de produto</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  Fluxo unico, do onboarding ao estado operacional.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                  A plataforma precisa eliminar a sensacao de troca de produto entre marketing, dashboard e IDE. O caminho ideal e unico: entrar, iniciar, iterar e validar no mesmo ambiente.
                </p>
              </div>
              <ScreenshotCard
                src="/screenshots/editor.png"
                alt="Editor do Aethel"
                title="IDE e preview"
                subtitle="contexto, execucao e validacao no mesmo workbench"
              />
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {WORKFLOW.map((item) => (
                <div key={item.step} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.step}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.90))] p-8 shadow-[0_24px_90px_rgba(2,6,23,0.42)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Proximo passo</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Entre pelo studio e siga com o fluxo real do produto.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Se quiser avaliar compra, veja pricing com o estado atual do billing. Se quiser testar o produto, abra o studio direto e siga pelo onboarding.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/dashboard?onboarding=1&source=landing-bottom-cta"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Abrir studio
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                Ler documentacao
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
