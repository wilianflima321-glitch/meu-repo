import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

type ResourceLink = {
  label: string
  href: string
  external?: boolean
}

type ResourceCard = {
  eyebrow: string
  title: string
  description: string
  links?: ResourceLink[]
}

interface DocsResourcePageProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  accentClassName: string
  summary: string
  cards: ResourceCard[]
  calloutTitle: string
  calloutDescription: string
  calloutLinks: ResourceLink[]
}

function RenderLink({ link }: { link: ResourceLink }) {
  const content = (
    <>
      <span>{link.label}</span>
      {link.external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </>
  )

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-info-light)] transition hover:text-[var(--aethel-text-primary)]"
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={link.href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-info-light)] transition hover:text-[var(--aethel-text-primary)]"
    >
      {content}
    </Link>
  )
}

export default function DocsResourcePage({
  eyebrow,
  title,
  description,
  icon: Icon,
  accentClassName,
  summary,
  cards,
  calloutTitle,
  calloutDescription,
  calloutLinks,
}: DocsResourcePageProps) {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12" data-docs-resource-surface="compact">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to docs
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              <Icon className={`h-4 w-4 ${accentClassName}`} />
              {eyebrow}
            </div>
            <h1 className="mt-5 text-4xl font-bold sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--aethel-text-secondary)]">{description}</p>
          </div>

          <aside className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] p-5 shadow-[0_24px_60px_rgba(2,8,23,0.28)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              Honest read
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">{summary}</p>
          </aside>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] p-6 shadow-[0_18px_50px_rgba(2,8,23,0.2)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)]">
                {card.eyebrow}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">{card.title}</h2>
              <details className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                  Open details
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.description}</p>
              </details>
              {card.links?.length ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {card.links.map((link) => (
                    <RenderLink key={`${card.title}-${link.href}`} link={link} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-8 shadow-[0_18px_56px_rgba(2,8,23,0.22)]">
          <h2 className="text-2xl font-semibold text-[var(--aethel-text-primary)]">{calloutTitle}</h2>
          <details className="mt-4 max-w-3xl rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Open callout details
            </summary>
            <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">{calloutDescription}</p>
          </details>
          <div className="mt-6 flex flex-wrap gap-3">
            {calloutLinks.map((link) => (
              <RenderLink key={`callout-${link.href}`} link={link} />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
