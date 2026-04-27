'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, Users, Workflow } from 'lucide-react'

import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const enterpriseFeatures = [
  {
    icon: ShieldCheck,
    title: 'Governanca e readiness',
    desc: 'Controles operacionais, trust pages publicas e estado explicito por superficie.',
  },
  {
    icon: Workflow,
    title: 'Pesquisa -> plano -> codigo',
    desc: 'Fluxo unico para times que precisam sair da analise e entrar em execucao.',
  },
  {
    icon: Users,
    title: 'Procurement com contexto',
    desc: 'Briefings mais completos ajudam a encurtar a primeira conversa enterprise.',
  },
]

const DEAL_STEPS = [
  'Compartilhe contexto do time, necessidades de rollout e requisitos de seguranca ou procurement.',
  'Nossa equipe recebe o briefing e organiza o proximo passo comercial com a trilha certa.',
  'Voltamos por email com direcionamento, materiais adicionais e agenda quando necessario.',
]

const SALES_SIGNALS = [
  'SSO, SAML, rollout e trilha de auditoria entram melhor na conversa enterprise assistida.',
  'Apps + Pesquisa continuam sendo a frente comercial mais madura do produto.',
  'Preview, readiness e governanca devem ser tratados no mesmo rollout, nao em trilhas separadas.',
]

const TRUST_LINKS = [
  { label: 'Status operacional', href: '/status' },
  { label: 'Seguranca', href: '/security' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Roadmap publico', href: '/roadmap' },
  { label: 'Pack de procurement', href: '/docs/procurement-starter-pack' },
]

const PRIMARY_GOALS = [
  { value: '', label: 'Selecione' },
  { value: 'avaliar-piloto', label: 'Avaliar piloto / design partner' },
  { value: 'security-procurement', label: 'Security / procurement review' },
  { value: 'rollout-enterprise', label: 'Rollout enterprise assistido' },
  { value: 'pricing-billing', label: 'Pricing, billing ou contrato' },
]

const TIMELINE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'exploratorio', label: 'Exploratorio / sem data fechada' },
  { value: '0-30', label: '0-30 dias' },
  { value: '30-90', label: '30-90 dias' },
  { value: '90+', label: '90+ dias' },
]

const BRIEFING_PREP = [
  'Liste a superficie em avaliacao: Apps, Pesquisa, preview, readiness comercial ou trust / governance.',
  'Explique se a conversa depende de identidade corporativa, logging, procurement ou champion tecnico.',
  'Inclua prazo desejado, tamanho do time e o que precisa estar claro para a proxima etapa.',
]

const BUYER_FAQS = [
  {
    question: 'Preciso marcar call antes de ler trust material?',
    answer: 'Nao. O melhor primeiro passo publico hoje e o pack em /docs/procurement-starter-pack junto de /security, /compliance e /status.',
  },
  {
    question: 'SSO / SAML ja e self-serve?',
    answer: 'Ainda nao. A conversa certa hoje e assistida, com roteiro enterprise e alinhamento de rollout.',
  },
  {
    question: 'O que acelera nossa resposta?',
    answer: 'Briefings com contexto, timeline, dono da avaliacao e requisitos de seguranca evitam uma primeira resposta vaga.',
  },
]

const sourceReasonLabel = (source: string) => source.replace(/[-_]+/g, ' ').trim()

export default function ContactSalesPage() {
  const searchParams = useSearchParams()
  const source = searchParams?.get('source')?.trim() ?? ''

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    teamSize: '',
    primaryGoal: '',
    timeline: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredReady =
    formData.name.trim() && formData.email.trim() && formData.company.trim() && formData.message.trim()

  const fieldBase =
    'h-12 w-full rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'
  const textAreaBase =
    'w-full resize-none rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 py-3 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requiredReady) return

    setLoading(true)
    setError(null)

    const compiledMessage = [
      formData.message.trim(),
      '',
      '--- briefing metadata ---',
      formData.role.trim() ? `Cargo: ${formData.role.trim()}` : null,
      formData.teamSize ? `Tamanho do time: ${formData.teamSize}` : null,
      formData.primaryGoal ? `Objetivo principal: ${PRIMARY_GOALS.find((option) => option.value === formData.primaryGoal)?.label}` : null,
      formData.timeline ? `Timeline: ${TIMELINE_OPTIONS.find((option) => option.value === formData.timeline)?.label}` : null,
      source ? `Origem da jornada: ${sourceReasonLabel(source)}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          reason: source ? `enterprise-sales:${source}` : 'enterprise-sales',
          message: compiledMessage,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Nao foi possivel enviar seu briefing agora.')
      }

      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        company: '',
        role: '',
        teamSize: '',
        primaryGoal: '',
        timeline: '',
        message: '',
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nao foi possivel enviar seu briefing agora.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-primary)_10%,transparent),transparent_30%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <PublicHeader />
        <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-[var(--aethel-text-primary)]">Briefing enviado</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              Recebemos seu contexto comercial. Nosso objetivo e responder em ate 24 horas uteis com o melhor proximo passo para o seu time.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/docs/procurement-starter-pack"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
              >
                Revisar procurement pack
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-strong)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Revisar planos
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-primary)_10%,transparent),transparent_30%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_6%,transparent)] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(340px,0.72fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                Conversa enterprise
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl">
                Fale com vendas e desenhe o melhor rollout para o seu time.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Compartilhe objetivos, requisitos de seguranca, procurement e contexto operacional. Organizamos a conversa comercial para acelerar avaliacao, plano e proximos passos.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {enterpriseFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <article key={feature.title} className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] text-[var(--aethel-text-primary)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-[var(--aethel-text-primary)]">{feature.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-tertiary)]">{feature.desc}</p>
                    </article>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {TRUST_LINKS.map((item) => (
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

            <aside className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
              <div className="overflow-hidden rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Dashboard do Aethel Studio"
                  width={1600}
                  height={960}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
              <div className="mt-5 rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">O que voce ganha na conversa</p>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Recomendacao de plano, orientacao sobre rollout, requisitos enterprise e alinhamento sobre o fluxo ideal para seu time.
                </p>
              </div>
            </aside>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.52fr)]">
            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Contato comercial</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Compartilhe seu briefing enterprise</h2>
                  </div>
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-[var(--aethel-text-tertiary)]" />
                </div>

                <p className="max-w-2xl text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                  Use este formulario para compartilhar contexto comercial, requisitos tecnicos e prioridades de rollout. Nossa equipe responde com direcionamento claro e proximo passo recomendado.
                </p>

                {source ? (
                  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
                    Origem detectada: <span className="font-medium text-[var(--aethel-text-primary)]">{sourceReasonLabel(source)}</span>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error-light)]">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-sales-name" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Nome *
                    </label>
                    <input
                      id="contact-sales-name"
                      type="text"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className={fieldBase}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-sales-email" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Email corporativo *
                    </label>
                    <input
                      id="contact-sales-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className={fieldBase}
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-sales-company" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Empresa *
                    </label>
                    <input
                      id="contact-sales-company"
                      type="text"
                      value={formData.company}
                      onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                      className={fieldBase}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-sales-role" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Cargo
                    </label>
                    <input
                      id="contact-sales-role"
                      type="text"
                      value={formData.role}
                      onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                      className={fieldBase}
                      placeholder="Seu cargo"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="contact-sales-team-size" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Tamanho do time
                    </label>
                    <select
                      id="contact-sales-team-size"
                      value={formData.teamSize}
                      onChange={(event) => setFormData({ ...formData, teamSize: event.target.value })}
                      className={fieldBase}
                    >
                      {['', '1-10', '11-50', '51-200', '201-500', '500+'].map((value) => (
                        <option key={value || 'blank'} value={value} className="bg-[var(--aethel-surface-primary)]">
                          {value || 'Selecione'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-sales-primary-goal" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Objetivo principal
                    </label>
                    <select
                      id="contact-sales-primary-goal"
                      value={formData.primaryGoal}
                      onChange={(event) => setFormData({ ...formData, primaryGoal: event.target.value })}
                      className={fieldBase}
                    >
                      {PRIMARY_GOALS.map((option) => (
                        <option key={option.value || 'blank'} value={option.value} className="bg-[var(--aethel-surface-primary)]">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-sales-timeline" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Timeline
                    </label>
                    <select
                      id="contact-sales-timeline"
                      value={formData.timeline}
                      onChange={(event) => setFormData({ ...formData, timeline: event.target.value })}
                      className={fieldBase}
                    >
                      {TIMELINE_OPTIONS.map((option) => (
                        <option key={option.value || 'blank'} value={option.value} className="bg-[var(--aethel-surface-primary)]">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-sales-message" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                    Contexto e requisitos *
                  </label>
                  <textarea
                    id="contact-sales-message"
                    rows={6}
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    className={textAreaBase}
                    placeholder="Ex: precisamos avaliar SSO assistido, trust artifacts publicos, timeline de rollout, billing enterprise e ownership da revisao de seguranca."
                  />
                </div>

                <div className="grid gap-3 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Como escrever um briefing melhor</p>
                  {BRIEFING_PREP.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                      <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-info-light)]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!requiredReady || loading}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                      requiredReady && !loading
                        ? 'bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] text-[var(--aethel-text-primary)] shadow-lg hover:brightness-110'
                        : 'cursor-not-allowed border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-quaternary)]'
                    }`}
                  >
                    {loading ? 'Enviando briefing...' : 'Enviar briefing para vendas'}
                    {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                  <Link
                    href="/docs/procurement-starter-pack"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Ler procurement pack
                  </Link>
                </div>

                {!requiredReady ? (
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Preencha nome, email, empresa e contexto para enviar o briefing.
                  </p>
                ) : null}
              </form>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Sinais para a conversa</p>
                <div className="mt-4 space-y-3">
                  {SALES_SIGNALS.map((item) => (
                    <div key={item} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-4 py-3">
                      <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">O que acontece depois</p>
                <div className="mt-4 space-y-3">
                  {DEAL_STEPS.map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] text-[11px] font-semibold text-[var(--aethel-text-secondary)]">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Starter pack recomendado</p>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Se o seu processo envolve buyer, champion tecnico ou seguranca, use primeiro o pack publico para alinhar linguagem e reduzir perguntas repetidas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/docs/procurement-starter-pack"
                    className="inline-flex items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)]"
                  >
                    Abrir pack
                  </Link>
                  <Link
                    href="/status"
                    className="inline-flex items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
                  >
                    Ver status
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">FAQ rapida para buyers</p>
                <div className="mt-4 space-y-4">
                  {BUYER_FAQS.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
