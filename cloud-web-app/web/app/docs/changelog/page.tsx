import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock3 } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Changelog | Aethel Docs',
  description: 'Atualizacoes publicas recentes do Aethel, com foco em trabalho realmente entregue e sem marketing inflado.',
}

const CHANGELOG_ENTRIES = [
  {
    date: '2026-04-27',
    title: 'Customer proof publico e trilha de docs fechada',
    summary:
      'Abrimos a surface publica de customers com discurso honesto sobre beta design partners e fechamos as rotas publicas de support, community e changelog.',
    bullets: [
      'Pagina /customers com fit por tipo de time e evidence surfaces publicas.',
      'Docs agora tem destinos reais para support, community e changelog.',
      'Navegacao publica passa a expor customer proof em vez de insistir em trust pages que ainda nao estao publicas.',
    ],
  },
  {
    date: '2026-04-26',
    title: 'Wave B de produto e estabilidade do compile-mode',
    summary:
      'A wave mais recente reduziu superficies grandes do studio e manteve o build compile-mode como caminho de producao viavel, sem fingir que o prerender probe ja fechou.',
    bullets: [
      'ProjectsDashboard, InlineAIChat e CreatorDashboard foram fatiados em seams reais.',
      'Onboarding ganhou persistencia mais duravel e share/deploy ficou mais estavel no preview.',
      'Build compile-mode continuou viavel enquanto build:prerender-probe permaneceu explicitamente aberto.',
    ],
  },
  {
    date: '2026-04-25',
    title: 'Shell publico e runtime ficaram menos frageis',
    summary:
      'As superficies publicas e o workbench passaram por um corte de simplificacao importante para reduzir handoff client-only desnecessario e melhorar a narrativa de trust do produto real.',
    bullets: [
      'Landing v3 voltou a server page com interacao isolada em island local.',
      'Status, preview trust e deploy state ficaram mais coerentes entre cockpit, topbar e pagina de deploy.',
      'A base publica ficou mais alinhada com a tese de anti-fake-success e readiness visivel.',
    ],
  },
  {
    date: '2026-04-24',
    title: 'Workbench wave com AI Console, terminal first-class e truth operacional',
    summary:
      'A iteracao forte do workbench deixou o cockpit menos monolitico e mais confiavel para uso real, com terminal first-class e status bar baseada em estado vivo.',
    bullets: [
      'AIChatPanelPro, SettingsUI e outras superficies grandes foram cortadas agressivamente.',
      'Terminal virou lane canonica do shell em vez de capability escondida.',
      'Status bar e preview passaram a falar com estado real de editor, runtime e source control.',
    ],
  },
]

export default function ChangelogDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-success)_12%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent))] p-6 shadow-[0_20px_80px_rgba(2,8,23,0.22)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-success-light)]">Changelog publico</p>
          <h1 className="mt-3 text-4xl font-bold">O que realmente mudou no produto recentemente</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            Este changelog e curado para trabalho com impacto real em produto e confianca operacional. Ele nao tenta listar cada detalhe interno, nem transformar auditoria em marketing inflado.
          </p>
        </section>

        <section className="mt-10 space-y-5">
          {CHANGELOG_ENTRIES.map((entry) => (
            <article
              key={entry.date + entry.title}
              className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.18)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {entry.date}
                </div>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)]">{entry.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">{entry.summary}</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                {entry.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-success-light)]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
