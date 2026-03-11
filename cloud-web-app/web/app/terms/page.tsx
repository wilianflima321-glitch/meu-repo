import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | Aethel Platform',
  description: 'Políticas e termos de uso vigentes para a plataforma Aethel.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-12">
      <section className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-3">
          <p className="text-sm text-slate-400">Documentação Legal</p>
          <h1 className="text-3xl font-bold">Termos de Uso da Plataforma Aethel</h1>
          <p className="text-sm text-slate-400">
            Esta página centraliza as políticas de utilização, responsabilidades e regras de faturamento relacionadas aos
            serviços Aethel. Revise com atenção antes de ativar recursos pagos ou compartilhar acesso com sua equipe.
          </p>
        </header>

        <article className="space-y-4">
          <h2 className="text-xl font-semibold">Escopo dos Serviços</h2>
          <p className="text-sm text-slate-300">
            A plataforma Aethel oferece ferramentas de automação, agentes assistidos por IA, integrações e infraestrutura
            de execução. Recursos adicionais, como laboratórios de IA e módulos de visualização, podem estar sujeitos a
            contratos específicos ou planos superiores.
          </p>
        </article>

        <article className="space-y-4">
          <h2 className="text-xl font-semibold">Uso Acceptável</h2>
          <p className="text-sm text-slate-300">
            É proibido utilizar os serviços para atividades ilegais, envio de spam, exploração de vulnerabilidades ou
            qualquer ação que viole leis locais ou internacionais. A Aethel reserva o direito de suspender contas que
            descumprirem estas diretrizes.
          </p>
        </article>

        <article className="space-y-4">
          <h2 className="text-xl font-semibold">Faturamento e Créditos</h2>
          <p className="text-sm text-slate-300">
            Planos pagos, créditos adicionais e transferências entre carteiras seguem as políticas descritas no painel de
            billing. Encargos adicionais podem ser aplicados para integrações personalizadas ou suporte premium.
          </p>
        </article>

        <article className="space-y-4">
          <h2 className="text-xl font-semibold">Proteção de Dados</h2>
          <p className="text-sm text-slate-300">
            Dados coletados durante o uso da plataforma são processados conforme nossa política de privacidade. Solicitações
            de eliminação ou portabilidade podem ser feitas através do canal de privacidade ou suporte.
          </p>
        </article>

        <footer className="space-y-3 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500">Última atualização: {new Date().toLocaleDateString()}</p>
          <div className="aethel-flex aethel-gap-3 text-sm">
            <Link href="/dashboard" className="aethel-button aethel-button-secondary">Voltar ao painel</Link>
            <a href="mailto:legal@aethel.ai" className="aethel-button aethel-button-ghost">Contato jurídico</a>
          </div>
        </footer>
      </section>
    </main>
  )
}
