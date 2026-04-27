import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { GlassCard, GlowBadge } from '@/components/ui/premium'
import LandingMissionBox from '@/app/landing-v3-mission-box'

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

const TRUST_NOTES = [
  'Workspace unico para pesquisa, implementacao e validacao.',
  'Papeis multi-agent com trilha operacional explicita.',
  'Governanca, rollback e readiness visiveis no mesmo fluxo.',
]

const PRICING_TEASER = [
  {
    title: 'Gratis',
    price: '$0',
    desc: 'Explore o studio e valide o fluxo principal.',
    features: ['1 projeto ativo', 'Limites de IA diarios', 'Preview inline (fallback)'],
    cta: 'Comecar gratis',
    href: '/dashboard?onboarding=1&source=landing-pricing-free',
  },
  {
    title: 'Pro',
    price: '$49',
    desc: 'Para devs e squads que precisam de capacidade extra.',
    features: ['Preview gerenciado (quando disponivel)', 'Contexto RAG expandido', 'Creditos de IA extras'],
    cta: 'Ver detalhes',
    href: '/billing?source=landing-pricing-pro',
    highlight: true,
  },
  {
    title: 'Enterprise',
    price: 'Sob consulta',
    desc: 'Governanca, compliance e suporte dedicado.',
    features: ['SSO/SAML', 'SLA + trilhas de auditoria', 'Limites customizados'],
    cta: 'Falar com vendas',
    href: '/contact-sales?source=landing-pricing-enterprise',
  },
]

const PROOF_STRIP = [
  { label: 'Fluxo orientado a entrega', detail: 'Da missao ao ambiente validavel' },
  { label: 'Governanca visivel', detail: 'Status e readiness no mesmo studio' },
  { label: 'Experiencia unificada', detail: 'Pesquisa, codigo e preview no mesmo fluxo' },
]

const BENCHMARK_COMPARISONS = [
  {
    title: 'Cockpit de codigo',
    benchmark: 'Cursor / Windsurf / VS Code',
    market:
      'Os melhores editores unem ghost text, navegacao por simbolo, multiplos loops de AI e atalhos densos no mesmo cockpit.',
    aethel:
      'O Aethel ja entrega shell canonica, AI Console por modo, terminal de primeira classe, breadcrumbs com symbol truth e Inline Edit no fluxo principal.',
    gap:
      'Ainda falta transformar Inline AI, memoria persistente e mais automacao de agentes em superficie canonicamente inevitavel.',
  },
  {
    title: 'Preview e deploy',
    benchmark: 'Replit / Windsurf / Vercel / v0',
    market:
      'Os lideres mantem preview, deploy, share e review no mesmo loop com URLs reais, feedback visual e rollback facil.',
    aethel:
      'O Aethel ja expoe preview trust, share/deploy state, link de review e build compile-mode viavel dentro do proprio studio.',
    gap:
      'Ainda precisamos fechar prerender parity total e deixar o review/share igualmente forte em todos os estados de runtime.',
  },
  {
    title: 'Operacao e confianca',
    benchmark: 'Linear / Notion / Vercel',
    market:
      'Os melhores produtos deixam status, docs, triagem, seguranca e governanca faceis de encontrar e coerentes com o produto principal.',
    aethel:
      'Ja temos auditorias canonicamente honestas, status publico, MFA, readiness visivel e governanca de repo mais madura que a media.',
    gap:
      'Ainda faltam docs com busca melhor, prova comercial mais forte e paginas publicas de confianca enterprise mais completas.',
  },
]

const TRUST_ACTIONS = [
  { label: 'Ver status', href: '/status' },
  { label: 'Ler docs', href: '/docs' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Pricing real', href: '/pricing' },
  { label: 'Customer proof', href: '/customers' },
]

function ScreenshotCard({
  src,
  alt,
  title,
  subtitle,
  priority = false,
}: {
  src: string
  alt: string
  title: string
  subtitle: string
  priority?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] shadow-[0_24px_90px_rgba(2,6,23,0.42)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{title}</p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_78%,transparent)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_78%,transparent)]" />
        </div>
      </div>
      <Image src={src} alt={alt} width={1600} height={960} className="h-auto w-full object-cover" priority={priority} />
    </div>
  )
}

export default function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-info)_10%,transparent),transparent_24%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[170px]" />
      </div>

      <PublicHeader />

      <main id="main-content" className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)] lg:items-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
                <Sparkles className="h-3.5 w-3.5" />
                Software studio operacional
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-6xl">
                Crie apps com IA sem perder o controle do que realmente funciona.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                O Aethel conecta pesquisa, implementacao, preview e readiness no mesmo fluxo. O foco principal hoje e{' '}
                <span className="font-medium text-[var(--aethel-text-primary)]">Apps + Pesquisa</span>, com governanca explicita e sem promessas falsas.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)]">Entregue mais rapido com contexto unico</span>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-success-light)]">Preview e validacao no mesmo fluxo</span>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-primary-light)]">Governanca pronta para equipes</span>
              </div>

              <LandingMissionBox />

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=landing-primary-cta"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                >
                  Comecar gratis
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  Ver planos
                </Link>
                <Link
                  href="/workbench-preview.html"
                  className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_38%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)]"
                >
                  Ver referencia do workbench
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {TRUST_ACTIONS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-500 delay-100">
              <ScreenshotCard
                src="/screenshots/dashboard.png"
                alt="Dashboard do Aethel"
                title="Studio Home"
                subtitle="projetos, onboarding, billing e sinais de readiness"
                priority
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[26px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Por que equipes escolhem o studio</p>
                  <ul className="mt-4 space-y-3">
                    {TRUST_NOTES.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[26px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">Fluxo unico</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    Dashboard, editor, preview e status funcionam como um unico studio para reduzir troca de contexto e acelerar entrega.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <GlassCard variant="elevated" border={false} className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <GlowBadge color="info">Studio real</GlowBadge>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Veja o fluxo completo em uma tela</h2>
                <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                  Missao, contexto, execucao e validacao no mesmo ambiente operacional.
                </p>
              </div>
              <span className="text-xs text-[var(--aethel-text-secondary)]">Captura real</span>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] shadow-[0_20px_70px_rgba(2,6,23,0.45)]">
              <Image
                src="/screenshots/editor.png"
                alt="Aethel Studio com editor, contexto e preview integrados"
                width={1600}
                height={960}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {PROOF_STRIP.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-4 py-4">
                  <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.28)] sm:p-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                Comparacao honesta
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)] sm:text-4xl">
                O que os melhores do mercado fazem bem e o que o Aethel ja entrega.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-tertiary)]">
                Em vez de fingir equivalencia total, mostramos onde ja temos um studio forte e onde ainda estamos elevando a barra para chegar no melhor nivel de Cursor, Windsurf, Replit, Linear e Vercel.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {BENCHMARK_COMPARISONS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                    {item.benchmark}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">{item.title}</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
                        Benchmark
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.market}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
                        Aethel hoje
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.aethel}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-warning-light)]">
                        Proximo salto
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.gap}</p>
                    </div>
                  </div>
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
                <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)]">Planos transparentes para cada fase</h2>
                <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">Escolha um plano para explorar, escalar o time ou abrir conversa enterprise com contexto claro.</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] px-4 py-2 text-xs text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]"
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
                    <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{plan.title}</h3>
                    {plan.highlight ? <GlowBadge color="primary">Mais usado</GlowBadge> : null}
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-[var(--aethel-text-primary)]">{plan.price}</p>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--aethel-text-secondary)]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-4 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                  >
                    {plan.cta}
                  </Link>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">Fluxo de produto</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)] sm:text-4xl">
                Fluxo unico, do onboarding ao estado operacional.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--aethel-text-tertiary)]">
                Entrar, iniciar, iterar e validar no mesmo ambiente. Esse e o padrao que a experiencia inteira precisa seguir.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {WORKFLOW.map((item) => (
                <div key={item.step} className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)]">{item.step}</p>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-tertiary)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 rounded-[32px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-8 shadow-[0_24px_90px_rgba(2,6,23,0.42)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Proximo passo</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)]">Entre pelo studio e siga com o fluxo real do produto.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--aethel-text-tertiary)]">
                Para avaliar compra, veja pricing. Para testar o produto, abra o studio e siga pelo onboarding.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/dashboard?onboarding=1&source=landing-bottom-cta"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
              >
                Abrir studio
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Ler documentacao
              </Link>
              <Link
                href="/contact-sales"
                className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-primary-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]"
              >
                Falar com vendas
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
