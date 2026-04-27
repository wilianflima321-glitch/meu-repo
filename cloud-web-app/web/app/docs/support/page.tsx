import { LifeBuoy } from 'lucide-react'
import DocsResourcePage from '@/app/docs/docs-resource-page'

const CARDS = [
  {
    eyebrow: 'Support path',
    title: 'Problemas de plataforma e runtime',
    description:
      'Use a status page para checar readiness, dependencias e sinais gerais do runtime antes de abrir uma solicitacao mais longa.',
    links: [{ label: 'Abrir status', href: '/status' }],
  },
  {
    eyebrow: 'Support path',
    title: 'Billing, rollout e comercial',
    description:
      'Se o assunto envolver planos, rollout, onboarding de time, governance ou compra enterprise, o melhor caminho hoje e a pagina de vendas.',
    links: [
      { label: 'Falar com vendas', href: '/contact-sales' },
      { label: 'Ver pricing', href: '/pricing' },
    ],
  },
  {
    eyebrow: 'Support path',
    title: 'Produto e fluxo de uso',
    description:
      'Quando a duvida e de como navegar pelo studio, workbench, APIs ou readiness, entre primeiro pelas docs publicas e pelo changelog.',
    links: [
      { label: 'Ler docs', href: '/docs' },
      { label: 'Ler changelog', href: '/docs/changelog' },
    ],
  },
]

export default function SupportPage() {
  return (
    <DocsResourcePage
      eyebrow="Suporte"
      title="Caminhos oficiais para suporte e escalacao"
      description="Aethel ainda esta elevando a camada publica de trust, entao esta pagina deixa o fluxo de ajuda o mais claro possivel sem inventar canais que ainda nao existem."
      icon={LifeBuoy}
      accentClassName="text-[var(--aethel-success)]"
      summary="Hoje o suporte publico e mais documentation-first e status-first do que um helpdesk enterprise completo. O melhor caminho depende do tipo de problema."
      cards={CARDS}
      calloutTitle="O que incluir quando voce pedir ajuda"
      calloutDescription="Se possivel, inclua a rota afetada, o fluxo que tentou executar, o estado visto no preview ou status, e se o problema aconteceu em onboarding, editor, preview, deploy ou billing. Isso acelera muito a triagem."
      calloutLinks={[
        { label: 'Abrir status', href: '/status' },
        { label: 'Falar com vendas', href: '/contact-sales' },
        { label: 'Abrir docs do IDE', href: '/docs/ide' },
      ]}
    />
  )
}
