import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | Aethel Platform',
  description: 'Políticas e termos de uso vigentes para a plataforma Aethel.',
}

export default function TermsPage() {
  return (
    <main className="aethel-min-h-screen aethel-bg-slate-900 aethel-text-slate-100 aethel-px-6 aethel-py-12">
      <section className="aethel-max-w-4xl aethel-mx-auto aethel-space-y-6">
        <header className="aethel-space-y-3">
          <p className="aethel-text-sm aethel-text-slate-400">Documentação Legal</p>
          <h1 className="aethel-text-3xl aethel-font-bold">Termos de Uso da Plataforma Aethel</h1>
          <p className="aethel-text-sm aethel-text-slate-400">
            Esta página centraliza as políticas de utilização, responsabilidades e regras de faturamento relacionadas aos
            serviços Aethel. Revise com atenção antes de ativar recursos pagos ou compartilhar acesso com sua equipe.
          </p>
        </header>

        <article className="aethel-space-y-4">
          <h2 className="aethel-text-xl aethel-font-semibold">Escopo dos Serviços</h2>
          <p className="aethel-text-sm aethel-text-slate-300">
            A plataforma Aethel oferece ferramentas de automação, agentes assistidos por IA, integrações e infraestrutura
            de execução. Recursos adicionais, como laboratórios de IA e módulos de visualização, podem estar sujeitos a
            contratos específicos ou planos superiores.
          </p>
        </article>

        <article className="aethel-space-y-4">
          <h2 className="aethel-text-xl aethel-font-semibold">Uso Acceptável</h2>
          <p className="aethel-text-sm aethel-text-slate-300">
            É proibido utilizar os serviços para atividades ilegais, envio de spam, exploração de vulnerabilidades ou
            qualquer ação que viole leis locais ou internacionais. A Aethel reserva o direito de suspender contas que
            descumprirem estas diretrizes.
          </p>
        </article>

        <article className="aethel-space-y-4">
          <h2 className="aethel-text-xl aethel-font-semibold">Faturamento e Créditos</h2>
          <p className="aethel-text-sm aethel-text-slate-300">
            Planos pagos, créditos adicionais e transferências entre carteiras seguem as políticas descritas no painel de
            billing. Encargos adicionais podem ser aplicados para integrações personalizadas ou suporte premium.
          </p>
        </article>

        <article className="aethel-space-y-4">
          <h2 className="aethel-text-xl aethel-font-semibold">Proteção de Dados</h2>
          <p className="aethel-text-sm aethel-text-slate-300">
            Dados coletados durante o uso da plataforma são processados conforme nossa política de privacidade. Solicitações
            de eliminação ou portabilidade podem ser feitas através do canal de privacidade ou suporte.
          </p>
        </article>

        <footer className="aethel-space-y-3 aethel-border-t aethel-border-slate-800 aethel-pt-4">
          <p className="aethel-text-xs aethel-text-slate-500">Última atualização: {new Date().toLocaleDateString()}</p>
          <div className="aethel-flex aethel-gap-3 aethel-text-sm">
            <Link href="/dashboard" className="aethel-button aethel-button-secondary">Voltar ao painel</Link>
            <a href="mailto:legal@aethel.ai" className="aethel-button aethel-button-ghost">Contato jurídico</a>
          </div>
        </footer>
      </section>
    </main>
  )
}
