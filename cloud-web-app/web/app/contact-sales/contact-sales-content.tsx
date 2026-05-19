'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, Users, Workflow } from 'lucide-react'

import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const enterpriseFeatures = [
  {
    icon: ShieldCheck,
    title: 'Governance and readiness',
    desc: 'Operational controls, public trust pages, and explicit status by surface.',
  },
  {
    icon: Workflow,
    title: 'Research -> plan -> code',
    desc: 'One workflow for teams that need to move from analysis into execution.',
  },
  {
    icon: Users,
    title: 'Procurement with context',
    desc: 'Complete briefings make the first enterprise conversation shorter and more useful.',
  },
]

const DEAL_STEPS = [
  'Share team context, rollout needs, and security or procurement requirements.',
  'Our team reviews the briefing and organizes the right commercial next step.',
  'We reply by email with guidance, additional materials, and scheduling when needed.',
]

const SALES_SIGNALS = [
  'SSO, SAML, rollout, and audit trail fit best in the assisted enterprise path.',
  'Apps + Research remain the most mature commercial surface of the product.',
  'Preview, readiness, and governance should be handled in one rollout, not separate tracks.',
]

const TRUST_LINKS = [
  { label: 'Operational status', href: '/status' },
  { label: 'Security', href: '/security' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Public roadmap', href: '/roadmap' },
  { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
]

const SALES_PROOF_CARDS = [
  { label: 'Rollout', value: '1 track', desc: 'Plan, security review, and procurement in one workflow.' },
  { label: 'Enterprise', value: 'SAML + SCIM', desc: 'Corporate identity handled as an entry requirement.' },
  { label: 'Readiness', value: 'Evidence', desc: 'Status, compliance, and clear limits before the call.' },
]

const PRIMARY_GOALS = [
  { value: '', label: 'Select' },
  { value: 'avaliar-piloto', label: 'Evaluate pilot / design partner' },
  { value: 'security-procurement', label: 'Security / procurement review' },
  { value: 'rollout-enterprise', label: 'Assisted enterprise rollout' },
  { value: 'pricing-billing', label: 'Pricing, billing ou contrato' },
]

const TIMELINE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'exploratorio', label: 'Exploratory / no fixed date' },
  { value: '0-30', label: '0-30 dias' },
  { value: '30-90', label: '30-90 dias' },
  { value: '90+', label: '90+ dias' },
]

const BRIEFING_PREP = [
  'List the surface under evaluation: Apps, Research, preview, commercial readiness, or trust/governance.',
  'Explain whether the conversation depends on corporate identity, logging, procurement, or a technical champion.',
  'Include desired timeline, team size, and what must be clear for the next step.',
]

const BUYER_FAQS = [
  {
    question: 'Do I need to schedule a call before reading trust materials?',
    answer: 'No. The best first public step today is the /docs/procurement-starter-pack together with /security, /compliance, and /status.',
  },
  {
    question: 'Is SSO / SAML self-serve today?',
    answer: 'Not yet. The right path today is assisted, with an enterprise rollout script and alignment.',
  },
  {
    question: 'What helps you reply faster?',
    answer: 'Briefings with context, timeline, evaluation owner, and security requirements prevent vague first replies.',
  },
]

const sourceReasonLabel = (source: string) => source.replace(/[-_]+/g, ' ').trim()

export default function ContactSalesContent({ initialSource = '' }: { initialSource?: string }) {
  const source = initialSource.trim()

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
      formData.role.trim() ? `Role: ${formData.role.trim()}` : null,
      formData.teamSize ? `Team size: ${formData.teamSize}` : null,
      formData.primaryGoal ? `Primary goal: ${PRIMARY_GOALS.find((option) => option.value === formData.primaryGoal)?.label}` : null,
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
        throw new Error(data?.error || 'Could not send your briefing right now.')
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
      setError(submitError instanceof Error ? submitError.message : 'Could not send your briefing right now.')
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
              We received your commercial context. Our goal is to reply within one business day with the best next step for your team.
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
                Talk with sales and design the right rollout for your team.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Share goals, security requirements, procurement, and operational context. We organize the commercial conversation to accelerate evaluation, planning, and next steps.
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
              <div className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--aethel-info)_18%,transparent),transparent_34%),color-mix(in_srgb,var(--aethel-surface-primary)_78%,transparent)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                      Enterprise briefing
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">
                      Less cold-call energy. More useful context.
                    </h2>
                  </div>
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
                    Assisted
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {SALES_PROOF_CARDS.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                          {card.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{card.value}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">What you get from the conversation</p>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Plan recommendation, rollout guidance, enterprise requirements, and alignment on the best workflow for your team.
                </p>
              </div>
            </aside>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.52fr)]">
            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Contact comercial</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Share your enterprise briefing</h2>
                  </div>
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-[var(--aethel-text-tertiary)]" />
                </div>

                <p className="max-w-2xl text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                  Use this form to share commercial context, technical requirements, and rollout priorities. Our team replies with clear guidance and a recommended next step.
                </p>

                {source ? (
                  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
                    Detected source: <span className="font-medium text-[var(--aethel-text-primary)]">{sourceReasonLabel(source)}</span>
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
                      Name *
                    </label>
                    <input
                      id="contact-sales-name"
                      type="text"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className={fieldBase}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-sales-email" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Work email *
                    </label>
                    <input
                      id="contact-sales-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className={fieldBase}
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-sales-company" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Company *
                    </label>
                    <input
                      id="contact-sales-company"
                      type="text"
                      value={formData.company}
                      onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                      className={fieldBase}
                      placeholder="Name da empresa"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-sales-role" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Role
                    </label>
                    <input
                      id="contact-sales-role"
                      type="text"
                      value={formData.role}
                      onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                      className={fieldBase}
                      placeholder="Your role"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="contact-sales-team-size" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Team size
                    </label>
                    <select
                      id="contact-sales-team-size"
                      value={formData.teamSize}
                      onChange={(event) => setFormData({ ...formData, teamSize: event.target.value })}
                      className={fieldBase}
                    >
                      {['', '1-10', '11-50', '51-200', '201-500', '500+'].map((value) => (
                        <option key={value || 'blank'} value={value} className="bg-[var(--aethel-surface-primary)]">
                          {value || 'Select'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-sales-primary-goal" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                      Primary goal
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
                    Context and requirements *
                  </label>
                  <textarea
                    id="contact-sales-message"
                    rows={6}
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    className={textAreaBase}
                    placeholder="Example: we need to evaluate assisted SSO, public trust artifacts, rollout timeline, enterprise billing, and security review ownership."
                  />
                </div>

                <div className="grid gap-3 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">How to write a better briefing</p>
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
                    {loading ? 'Sending briefing...' : 'Send briefing to sales'}
                    {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                  <Link
                    href="/docs/procurement-starter-pack"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Read procurement pack
                  </Link>
                </div>

                {!requiredReady ? (
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Fill in name, email, company, and context to send the briefing.
                  </p>
                ) : null}
              </form>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Signals for the conversation</p>
                <div className="mt-4 space-y-3">
                  {SALES_SIGNALS.map((item) => (
                    <div key={item} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-4 py-3">
                      <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">What happens next</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Recommended starter pack</p>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  If your process includes a buyer, technical champion, or security review, use the public pack first to align language and reduce repeated questions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/docs/procurement-starter-pack"
                    className="inline-flex items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)]"
                  >
                    Open pack
                  </Link>
                  <Link
                    href="/status"
                    className="inline-flex items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
                  >
                    View status
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Quick FAQ for buyers</p>
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

