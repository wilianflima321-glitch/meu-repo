import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

export const metadata = {
  title: 'Politica de Privacidade | Aethel Studio',
  description: 'Como dados sao processados e protegidos no Aethel.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-primary-dark)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-6 py-14">
        <section className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Documentacao legal</p>
            <h1 className="text-3xl font-bold">Politica de privacidade</h1>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Esta politica descreve como dados sao coletados, usados e protegidos. Se algo nao estiver claro,
              fale com o time de suporte.
            </p>
          </header>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Coleta de dados</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Coletamos informacoes de conta, telemetria operacional e dados de uso para melhorar o produto.
              Nenhum dado e coletado sem finalidade explicita.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Uso de dados</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Dados sao usados para autenticar usuarios, operar recursos, auditar mudancas e melhorar o
              desempenho. O codigo so e enviado para provedores de IA quando voce solicita uma acao.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Armazenamento e seguranca</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Dados sao criptografados em transito e, quando aplicavel, em repouso. Credenciais sensiveis
              devem ser armazenadas em vault quando o recurso estiver habilitado.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Direitos do usuario</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Voce pode solicitar exportacao, correcao ou exclusao de dados. Para isso, envie um email ao
              time de privacidade. Solicitacoes sao tratadas conforme os prazos legais aplicaveis.
            </p>
          </article>

          <footer className="space-y-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Ultima atualizacao: {new Date().toLocaleDateString('pt-BR')}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/terms" className="aethel-button aethel-button-secondary rounded-xl px-4 py-2 text-sm">
                Termos de uso
              </Link>
              <a href="mailto:privacy@aethel.ai" className="aethel-button aethel-button-ghost rounded-xl px-4 py-2 text-sm">
                Contato privacidade
              </a>
            </div>
          </footer>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
