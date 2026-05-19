import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, GitBranch, MessageSquare, Users2 } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Comunidade | Aethel Docs',
  description: 'Onde a comunidade do Aethel vive hoje, como participar sem prometer canais que ainda nao estao publicos e como virar design partner.',
}

const COMMUNITY_SURFACES = [
  {
    icon: GitBranch,
    title: 'GitHub publico',
    description: 'Hoje o centro mais real da comunidade continua sendo o repositorio publico, com auditorias, codigo e historico de execucao.',
    href: 'https://github.com/wilianflima321-glitch/meu-repo',
    actionLabel: 'Abrir repositorio',
  },
  {
    icon: MessageSquare,
    title: 'Feedback orientado por docs e status',
    description: 'Muita conversa produtiva comeca em uma superficie publica: docs, pricing, status ou customer proof, antes de virar ticket ou rollout.',
    href: '/docs',
    actionLabel: 'Explorar docs',
  },
  {
    icon: Users2,
    title: 'Design partner conversations',
    description: 'Quando o interesse ja e validar fit, backlog e rollout de equipe, a conversa certa hoje ainda passa por contato comercial e discovery guiado.',
    href: '/contact-sales?source=docs-community',
    actionLabel: 'Falar com o time',
  },
]

const HONEST_COMMUNITY_NOTES = [
  'Hoje nao estamos vendendo uma Discord community publica ou um Slack massivo que ainda nao existe.',
  'A melhor forma de participar e cruzar o repositorio, as auditorias, os docs e as superficies publicas do produto.',
  'Para design partners, o valor maior vem de feedback especifico sobre time, fluxo e rollout - nao de hype vazio de comunidade.',
]

export default function CommunityDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent))] p-6 shadow-[0_20px_80px_rgba(2,8,23,0.22)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">Comunidade</p>
          <h1 className="mt-3 text-4xl font-bold">A comunidade que existe hoje e a que ainda nao fingimos ter.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            O Aethel ja tem codigo publico, auditorias profundas e conversas de design partner. O que ainda nao tem - e nao vamos fingir nesta pagina - e uma camada de comunidade gigante cheia de badges e canais vazios.
          </p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {COMMUNITY_SURFACES.map((surface) => {
            const Icon = surface.icon
            const external = surface.href.startsWith('http')

            return (
              <article
                key={surface.title}
                className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] p-5"
              >
                <Icon className="h-5 w-5 text-[var(--aethel-primary-light)]" />
                <h2 className="mt-4 text-lg font-semibold">{surface.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{surface.description}</p>
                {external ? (
                  <a
                    href={surface.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] hover:text-[var(--aethel-primary-light)]"
                  >
                    {surface.actionLabel}
                  </a>
                ) : (
                  <Link
                    href={surface.href}
                    className="mt-5 inline-flex items-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] hover:text-[var(--aethel-primary-light)]"
                  >
                    {surface.actionLabel}
                  </Link>
                )}
              </article>
            )
          })}
        </section>

        <section className="mt-10 rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Notas honestas</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
            {HONEST_COMMUNITY_NOTES.map((note) => (
              <li key={note} className="flex items-start gap-3">
                <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-primary-light)]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
