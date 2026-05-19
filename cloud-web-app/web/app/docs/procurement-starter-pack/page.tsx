import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BadgeHelp, CheckCircle2, ClipboardList, FileCheck2, ShieldCheck, Users2 } from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Procurement Starter Pack | Aethel Docs',
  description: 'Public buyer packet for reading order, trust artifacts, due-diligence questions, and enterprise evaluation handoff.',
}

const STARTER_METRICS = [
  { label: 'MFA', value: 'Live', detail: 'TOTP with QR setup, manual setup, and backup codes is already represented as delivered capability.' },
  { label: 'SSO / SAML', value: 'Assisted', detail: 'Technical readiness exists, while the public story remains assisted rollout rather than self-serve GA.' },
  { label: 'SOC 2 / GDPR', value: 'No overclaim', detail: 'Formal certifications and compliance claims stay framed as preparation until public proof exists.' },
]

const REVIEW_STEPS = [
  { title: '1. Start with trust and status', description: 'Read /security, /compliance, and /status before any call. They show what is live, what is partial, and where Aethel is intentionally explicit about gaps.' },
  { title: '2. Compare pricing and customer proof', description: 'Use /pricing and /customers to understand the commercial focus, the self-serve to enterprise line, and the teams that already find value.' },
  { title: '3. Prepare requirements', description: 'Bring questions about identity, rollout, logging, contracts, timeline, and ownership. That turns discovery into real triage.' },
  { title: '4. Contact sales with scope', description: 'When the conversation becomes procurement, technical champion work, or enterprise rollout, send context through /contact-sales.' },
]

const ARTIFACTS = [
  { eyebrow: 'Trust', title: 'Security overview', href: '/security', description: 'Honest summary of MFA, operational status, SSO/SAML, and current enterprise narrative limits.' },
  { eyebrow: 'Governance', title: 'Compliance overview', href: '/compliance', description: 'Current governance base, audits, and what is not yet published as formal certification.' },
  { eyebrow: 'Operations', title: 'Operational status', href: '/status', description: 'Readiness checks, dependencies, and runtime health without decorative uptime claims.' },
  { eyebrow: 'Commercial', title: 'Pricing and readiness', href: '/pricing', description: 'Where self-serve ends, where enterprise conversation starts, and how billing readiness is handled publicly.' },
  { eyebrow: 'Proof', title: 'Beta customers', href: '/customers', description: 'Team archetypes and composite journey proof without fake logos or inflated counts.' },
  { eyebrow: 'Contact', title: 'Talk to sales', href: '/contact-sales?source=procurement-pack', description: 'The right channel for questionnaires, procurement timelines, identity requirements, or assisted rollout.' },
]

const QUESTIONNAIRE_COLUMNS = [
  {
    title: 'Security and identity',
    bullets: [
      'Whether TOTP with backup codes covers your current hardening baseline.',
      'Whether evaluation depends on SSO, SAML, or OIDC with assisted rollout.',
      'Which audit trail, admin visibility, and incident posture expectations matter.',
    ],
  },
  {
    title: 'Rollout and operations',
    bullets: [
      'Which product surface is under evaluation: Apps, Research, preview, or commercial readiness.',
      'Whether the team needs a controlled pilot, technical champion path, or direct stack comparison.',
      'Which timeline matters: exploratory, 30 days, 90 days, or semester planning.',
    ],
  },
  {
    title: 'Commercial and procurement',
    bullets: [
      'Who decides, who approves, and who must review trust artifacts before purchase.',
      'Whether contracts, billing, legal, or governance join the first round.',
      'Which answers can stay public and which require bilateral review.',
    ],
  },
]

const FAQS = [
  { question: 'Do you publish a logo wall or official customer count?', answer: 'No. Public proof uses beta design-partner archetypes and composite journey snapshots without invented brands, volumes, or closed outcomes.' },
  { question: 'Is SSO / SAML a self-serve purchase checkbox?', answer: 'Not yet. The current public state is technical readiness plus assisted conversation, not canonical self-serve enterprise GA.' },
  { question: 'Is there a published SOC 2 certification today?', answer: 'No. When it exists, the public page must show scope, date, and audit limits with the same frankness.' },
  { question: 'What is the best reading order for a technical champion?', answer: 'Security, compliance, status, pricing, customers, then contact-sales. This pack exists to reduce repeated discovery before the call.' },
]

export default function ProcurementStarterPackPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[460px] w-[460px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] blur-[150px]" />
      </div>
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to docs
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
              <ClipboardList className="h-4 w-4" />
              Procurement starter pack
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">The best public starting point for buyers without fake proof or vague promises.</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">This pack organizes what a technical champion, security reviewer, or procurement partner can read today using only public Aethel surfaces: less brochure, more navigable evidence.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryLink href="/contact-sales?source=procurement-pack-hero">Open enterprise conversation</PrimaryLink>
              <SecondaryLink href="/security">Start with trust center</SecondaryLink>
            </div>
          </div>
          <aside className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]"><BadgeHelp className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />Honest reading</div>
            <h2 className="mt-3 text-2xl font-semibold">What this pack does not do</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {['It does not replace bilateral questionnaires, legal review, or rollout conversations once requirements become specific.', 'It does not invent customer logos, customer counts, certifications, or SSO GA to shorten the journey.', 'It does not hide gaps: when something is roadmap or assisted, we make that explicit early.'].map((item) => <Note key={item}>{item}</Note>)}
            </div>
          </aside>
        </section>

        <MetricGrid />
        <ReviewSteps />
        <Artifacts />
        <Questionnaire />
        <FaqAndCta />
      </main>
      <PublicFooter />
    </div>
  )
}

function MetricGrid() {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {STARTER_METRICS.map((metric) => <article key={metric.label} className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{metric.label}</p><p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{metric.value}</p><p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{metric.detail}</p></article>)}
    </section>
  )
}

function ReviewSteps() {
  return (
    <section className="mt-14">
      <SectionIntro eyebrow="Reading order" title="How a buyer normally uses this pack." body="The ROI comes from arriving at the call with better context. These four steps summarize the most useful public path today." />
      <div className="mt-8 grid gap-4 xl:grid-cols-4">{REVIEW_STEPS.map((step) => <article key={step.title} className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.22)]"><h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{step.description}</p></article>)}</div>
    </section>
  )
}

function Artifacts() {
  return (
    <section className="mt-14">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionIntro eyebrow="Public artifacts" title="What you can validate now." body="These links connect trust center, commercial proof, and product limits without depending on claims that do not belong on a public page yet." />
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />No placeholders</div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">{ARTIFACTS.map((artifact) => <Link key={artifact.href} href={artifact.href} className="group rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-5 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{artifact.eyebrow}</p><div className="mt-3 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{artifact.title}</h3><ArrowRight className="h-4 w-4 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" /></div><p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{artifact.description}</p></Link>)}</div>
    </section>
  )
}

function Questionnaire() {
  return (
    <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
      <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6"><div className="flex items-center gap-3"><Users2 className="h-5 w-5 text-[var(--aethel-info-light)]" /><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">What to send us</p></div><h2 className="mt-3 text-2xl font-semibold">Enter the call with less improvisation.</h2><p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">If you send this context in the first contact, the response will be more useful than a generic discovery call.</p></div>
      <div className="grid gap-4 xl:grid-cols-3">{QUESTIONNAIRE_COLUMNS.map((column) => <article key={column.title} className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-5"><h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{column.title}</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{column.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-3"><span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-primary-light)]" /><span>{bullet}</span></li>)}</ul></article>)}</div>
    </section>
  )
}

function FaqAndCta() {
  return (
    <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]">
      <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-6"><div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-[var(--aethel-primary-light)]" /><h2 className="text-2xl font-semibold">Early due-diligence questions</h2></div><div className="mt-5 space-y-4">{FAQS.map((faq) => <article key={faq.question} className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4"><h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{faq.question}</h3><p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{faq.answer}</p></article>)}</div></div>
      <aside className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-6"><div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]"><ShieldCheck className="h-4 w-4" />Next best step</div><h2 className="mt-3 text-2xl font-semibold">If this reading helped, move through here.</h2><p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">The goal is to improve the next conversation. If scope is clear, turn the reading into a brief with ownership and timeline.</p><div className="mt-6 grid gap-3"><PrimaryLink href="/contact-sales?source=procurement-pack-cta">Send enterprise brief</PrimaryLink><SecondaryLink href="/customers">Review customer proof</SecondaryLink></div></aside>
    </section>
  )
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="max-w-3xl"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{eyebrow}</p><h2 className="mt-2 text-3xl font-semibold">{title}</h2><p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">{body}</p></div>
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3">{children}</div>
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110">{children}</Link>
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]">{children}</Link>
}
