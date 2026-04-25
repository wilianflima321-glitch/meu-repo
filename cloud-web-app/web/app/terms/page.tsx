import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const LAST_UPDATED_LABEL = '25/04/2026'

export const metadata = {
  title: 'Termos de Uso | Aethel Studio',
  description: 'Politicas e termos de uso vigentes para a plataforma Aethel.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.05] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-6 py-14">
        <section className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Documentacao legal</p>
            <h1 className="text-3xl font-bold">Termos de uso do Aethel Studio</h1>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Esta pagina descreve politicas de uso, responsabilidades e regras de faturamento.
              Revise antes de ativar recursos pagos ou compartilhar acesso com sua equipe.
            </p>
          </header>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Escopo dos servicos</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              O Aethel oferece ferramentas de automacao, agentes assistidos por IA, integracoes
              e infraestrutura de execucao. Alguns recursos podem depender de planos especificos
              ou configuracao de credenciais externas.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Uso aceitavel</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              E proibido utilizar os servicos para atividades ilegais, spam, exploracao de
              vulnerabilidades ou qualquer acao que viole leis locais ou internacionais.
              O Aethel pode suspender contas que descumprirem estas diretrizes.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Faturamento e creditos</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Planos pagos e creditos adicionais seguem as politicas descritas no painel de billing.
              Encargos adicionais podem ser aplicados para integracoes personalizadas ou suporte premium.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Protecao de dados</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Dados coletados durante o uso da plataforma sao processados conforme a politica de
              privacidade. Solicitacoes de eliminacao ou portabilidade podem ser feitas via suporte.
            </p>
          </article>

          <footer className="space-y-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Ultima atualizacao: {LAST_UPDATED_LABEL}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded-xl px-4 py-2 text-sm">
                Voltar ao painel
              </Link>
              <a href="mailto:legal@aethel.ai" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded-xl px-4 py-2 text-sm">
                Contato juridico
              </a>
              <Link href="/privacy" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded-xl px-4 py-2 text-sm">
                Politica de privacidade
              </Link>
            </div>
          </footer>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
