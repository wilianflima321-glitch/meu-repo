import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeHelp,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  Users2,
} from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

const STARTER_METRICS = [
  {
    label: 'MFA',
    value: 'Live',
    detail: 'TOTP, QR/manual setup, and backup codes are delivered.',
  },
  {
    label: 'SSO / SAML',
    value: 'Assisted',
    detail: 'Technical groundwork exists; rollout is still assisted.',
  },
  {
    label: 'SOC 2 / GDPR',
    value: 'Planned',
    detail: 'Formal claims wait for public scope and dates.',
  },
]

const REVIEW_STEPS = [
  {
    title: '1. Read trust first',
    description: 'Open security, compliance, and status before a call.',
  },
  {
    title: '2. Check fit',
    description: 'Review pricing and customer-fit notes.',
  },
  {
    title: '3. Prepare scope',
    description: 'Bring identity, rollout, logging, timeline, and ownership needs.',
  },
  {
    title: '4. Send the brief',
    description: 'Use contact sales when procurement or rollout needs an owner.',
  },
]

const ARTIFACTS = [
  {
    eyebrow: 'Trust',
    title: 'Security overview',
    href: '/security',
    description: 'MFA, status, identity roadmap, and current limits.',
  },
  {
    eyebrow: 'Governance',
    title: 'Compliance overview',
    href: '/compliance',
    description: 'Current controls, audits, and certification boundaries.',
  },
  {
    eyebrow: 'Operations',
    title: 'Operational status',
    href: '/status',
    description: 'Runtime, dependencies, and measured public checks.',
  },
  {
    eyebrow: 'Commercial',
    title: 'Pricing and checkout status',
    href: '/pricing',
    description: 'Self-serve boundary, enterprise handoff, and checkout state.',
  },
  {
    eyebrow: 'Customers',
    title: 'Beta customers',
    href: '/trust',
    description: 'Team archetypes without fake logos or inflated counts.',
  },
  {
    eyebrow: 'Contact',
    title: 'Talk to sales',
    href: '/contact-sales?source=procurement-pack',
    description: 'Questionnaires, timelines, identity, and rollout.',
  },
]

const QUESTIONNAIRE_COLUMNS = [
  {
    title: 'Security and identity',
    bullets: [
      'Is TOTP with backup codes enough for the first review?',
      'Does rollout depend on SSO, SAML, or OIDC?',
      'Which audit, admin, and incident expectations matter?',
    ],
  },
  {
    title: 'Rollout and operations',
    bullets: [
      'Which area is under review: Apps, Research, preview, or rollout?',
      'Do you need a pilot, champion path, or stack comparison?',
      'Which timeline matters: exploratory, 30 days, 90 days, or later?',
    ],
  },
  {
    title: 'Commercial and procurement',
    bullets: [
      'Who decides, approves, and reviews trust artifacts?',
      'Do contracts, billing, legal, or governance join early?',
      'Which answers can stay public and which need bilateral review?',
    ],
  },
]

const FAQS = [
  {
    question: 'Do you publish a logo wall or official customer count?',
    answer: 'No. Customer material uses beta archetypes and composite journeys until names and counts are verified.',
  },
  {
    question: 'Is SSO / SAML a self-serve purchase checkbox?',
    answer: 'Not yet. Enterprise rollout remains assisted.',
  },
  {
    question: 'Is there a published SOC 2 certification today?',
    answer: 'No. Future claims must show scope, date, and audit limits.',
  },
  {
    question: 'What is the best reading order for a technical champion?',
    answer: 'Security, compliance, status, pricing, customers, then contact-sales.',
  },
]

export function ProcurementStarterPackContent() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main
        className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8"
        data-procurement-surface="compact"
      >
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to docs
        </Link>
        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
              <ClipboardList className="h-4 w-4" /> Procurement starter pack
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
              Enterprise review, pre-routed.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
              The essential trail before a live evaluation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryLink href="/contact-sales?source=procurement-pack-hero">
                Open enterprise conversation
              </PrimaryLink>
              <SecondaryLink href="/security">
                Start with trust center
              </SecondaryLink>
            </div>
          </div>
          <aside className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] py-6">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              <BadgeHelp className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
              Honest reading
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              Boundaries
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              This starts review. Legal, identity, rollout, and questionnaires still need an owner.
            </p>
            <details className="mt-4 border-t border-[var(--aethel-border-primary)] pt-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                More limits
              </summary>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {[
                  'Customer logos, customer counts, certifications, and SSO GA stay off the page until public scope and dates exist.',
                  'Roadmap and assisted rollout stay labeled until they become real purchase requirements.',
                ].map((item) => (
                  <Note key={item}>{item}</Note>
                ))}
              </div>
            </details>
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
    <section className="mt-10 grid overflow-hidden border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] md:grid-cols-3 md:divide-x md:divide-[var(--aethel-border-primary)]">
      {STARTER_METRICS.map((metric) => (
        <article
          key={metric.label}
          className="border-b border-[var(--aethel-border-primary)] p-5 last:border-b-0 md:border-b-0"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            {metric.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">
            {metric.value}
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Detail
            </summary>
            <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {metric.detail}
            </p>
          </details>
        </article>
      ))}
    </section>
  )
}

function ReviewSteps() {
  return (
    <section className="mt-14">
      <SectionIntro
        eyebrow="Reading order"
        title="The shortest useful path."
        body="Arrive with context instead of starting from discovery."
      />
      <div className="mt-8 grid gap-4 xl:grid-cols-4">
        {REVIEW_STEPS.map((step) => (
          <article
            key={step.title}
            className="border-t border-[var(--aethel-border-primary)] pt-5"
          >
            <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">
              {step.title}
            </h3>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                Open step details
              </summary>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {step.description}
              </p>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}

function Artifacts() {
  const primaryArtifacts = ARTIFACTS.slice(0, 3)
  const secondaryArtifacts = ARTIFACTS.slice(3)

  return (
    <section className="mt-14">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionIntro
          eyebrow="Public artifacts"
          title="What you can validate now."
          body="Trust, commercial review, and limits in one trail."
        />
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
          Review links
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {primaryArtifacts.map((artifact) => (
          <Link
            key={artifact.href}
            href={artifact.href}
            className="group border-t border-[var(--aethel-border-primary)] pt-5 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              {artifact.eyebrow}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">
                {artifact.title}
              </h3>
              <ArrowRight className="h-4 w-4 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {artifact.description}
            </p>
          </Link>
        ))}
      </div>
      {secondaryArtifacts.length ? (
        <details className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
            More review links
          </summary>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {secondaryArtifacts.map((artifact) => (
              <Link
                key={artifact.href}
                href={artifact.href}
                className="group border-t border-[var(--aethel-border-primary)] py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {artifact.eyebrow}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                    {artifact.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

function Questionnaire() {
  return (
    <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
      <div className="border-y border-[var(--aethel-border-primary)] py-6">
        <div className="flex items-center gap-3">
          <Users2 className="h-5 w-5 text-[var(--aethel-info-light)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
            What to send us
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          Bring the useful questions.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          Better context makes the first reply useful.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {QUESTIONNAIRE_COLUMNS.map((column) => (
          <article
            key={column.title}
            className="border-t border-[var(--aethel-border-primary)] pt-5"
          >
            <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">
              {column.title}
            </h3>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                Open buyer questions
              </summary>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {column.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-primary-light)]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}

function FaqAndCta() {
  const primaryFaqs = FAQS.slice(0, 2)
  const secondaryFaqs = FAQS.slice(2)

  return (
    <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]">
      <div className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-6">
        <div className="flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-[var(--aethel-primary-light)]" />
          <h2 className="text-2xl font-semibold">
            Early diligence questions
          </h2>
        </div>
        <div className="mt-5 space-y-4">
          {primaryFaqs.map((faq) => (
            <article
              key={faq.question}
              className="border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4"
            >
              <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {faq.answer}
              </p>
            </article>
          ))}
          {secondaryFaqs.length ? (
            <details className="border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                More questions
              </summary>
              <div className="mt-4 space-y-4">
                {secondaryFaqs.map((faq) => (
                  <article key={faq.question} className="border-t border-[var(--aethel-border-subtle)] pt-4">
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                      {faq.answer}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
      <aside className="border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-6">
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
          <ShieldCheck className="h-4 w-4" />
          Next best step
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          Ready to scope it?
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          Turn the reading into a brief with owner and timeline.
        </p>
        <div className="mt-6 grid gap-3">
          <PrimaryLink href="/contact-sales?source=procurement-pack-cta">
            Send enterprise brief
          </PrimaryLink>
          <SecondaryLink href="/trust">Review trust fit</SecondaryLink>
        </div>
      </aside>
    </section>
  )
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">
        {body}
      </p>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3">
      {children}
    </div>
  )
}

function PrimaryLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
    >
      {children}
    </Link>
  )
}

function SecondaryLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
    >
      {children}
    </Link>
  )
}
