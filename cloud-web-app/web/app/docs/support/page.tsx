import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText, LifeBuoy, ShieldCheck, Wrench } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Support | Aethel Docs',
  description: 'Como pedir ajuda no Aethel, o que compartilhar no ticket e quais superficies publicas consultar antes de escalar.',
}

const SUPPORT_CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Ajuda de produto',
    description: 'Melhor para onboarding, fluxo principal do studio, billing e orientacao sobre onde cada recurso vive hoje.',
    actionLabel: 'Ler docs',
    href: '/docs',
  },
  {
    icon: ShieldCheck,
    title: 'Status e incidentes',
    description: 'Melhor quando voce precisa confirmar se o problema e local, conhecido ou ligado a runtime/deploy/readiness.',
    actionLabel: 'Ver status',
    href: '/status',
  },
  {
    icon: Wrench,
    title: 'Rollout comercial',
    description: 'Melhor para squads avaliando quota, governanca, onboarding assistido ou rollout enterprise.',
    actionLabel: 'Falar com vendas',
    href: '/contact-sales?source=docs-support',
  },
]

const REQUEST_CHECKLIST = [
  'Descreva o objetivo, nao so o erro. Ex: criar um fluxo de onboarding, validar preview, comparar planos.',
  'Inclua a rota ou superficie: dashboard, IDE, preview, billing, docs, marketplace ou admin.',
  'Se existir, compartilhe evidencias publicas relacionadas: status page, pricing readiness ou docs usada no fluxo.',
  'Quando for bug visual ou operacional, diga se aconteceu em ambiente local, preview compartilhado ou deploy publico.',
]

export default function SupportDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Voltar para Docs
        </Link>

        <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-info)_12%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent))] p-6 shadow-[0_20px_80px_rgba(2,8,23,0.22)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Support</p>
          <h1 className="mt-3 text-4xl font-bold">Como pedir ajuda sem cair em fila errada</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            O jeito mais rapido de destravar o Aethel hoje e entrar pelo canal certo: docs para orientar o fluxo, status para checar runtime/readiness e contato comercial quando a conversa ja virou rollout, procurement ou capacidade de equipe.
          </p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {SUPPORT_CHANNELS.map((channel) => {
            const Icon = channel.icon
            return (
              <article
                key={channel.title}
                className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] p-5"
              >
                <Icon className="h-5 w-5 text-[var(--aethel-info-light)]" />
                <h2 className="mt-4 text-lg font-semibold">{channel.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{channel.description}</p>
                <Link
                  href={channel.href}
                  className="mt-5 inline-flex items-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-info-light)]"
                >
                  {channel.actionLabel}
                </Link>
              </article>
            )
          })}
        </section>

        <section className="mt-10 rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--aethel-primary-light)]" />
            <h2 className="text-2xl font-semibold">Checklist para um pedido de ajuda bom</h2>
          </div>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
            {REQUEST_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-primary-light)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
