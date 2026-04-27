import { Users } from 'lucide-react'
import DocsResourcePage from '@/app/docs/docs-resource-page'

const CARDS = [
  {
    eyebrow: 'Public loop',
    title: 'Repositorio e feedback aberto',
    description:
      'Hoje o loop publico mais forte do Aethel ainda passa pelo repositorio, pelas auditorias vivas e pela trilha de implementacao que vai ficando explicita no codigo.',
    links: [{ label: 'Abrir repositorio', href: 'https://github.com/wilianflima321-glitch/meu-repo', external: true }],
  },
  {
    eyebrow: 'Public loop',
    title: 'Docs e changelog como memoria publica',
    description:
      'A comunidade publica atual e mais orientada a documentacao, status e changelog do que a um grande espaco social estilo Discord ou forum robusto.',
    links: [
      { label: 'Ler docs', href: '/docs' },
      { label: 'Ler changelog', href: '/docs/changelog' },
    ],
  },
  {
    eyebrow: 'Public loop',
    title: 'Roadmap e rollout ainda em construcao',
    description:
      'Comparado com Vercel, Linear, Notion e Replit, ainda faltam espacos publicos mais fortes de comunidade, showcases e customer proof. Hoje a comunidade e menor, mas mais honesta sobre o que o produto ja entrega.',
    links: [
      { label: 'Ver status', href: '/status' },
      { label: 'Falar com vendas', href: '/contact-sales' },
    ],
  },
]

export default function CommunityPage() {
  return (
    <DocsResourcePage
      eyebrow="Comunidade"
      title="Como o loop publico do Aethel funciona hoje"
      description="Aethel ainda nao tem uma comunidade publica tao expansiva quanto os melhores players do mercado, mas ja tem uma base forte de transparencia operacional, docs e codigo publico."
      icon={Users}
      accentClassName="text-[var(--aethel-warning)]"
      summary="Hoje a comunidade e menor e menos social-first do que Replit ou Vercel. Em compensacao, o produto mostra mais claramente o que esta entregue, parcial ou aberto."
      cards={CARDS}
      calloutTitle="Onde o benchmark ainda esta na frente"
      calloutDescription="Os lideres do mercado costumam combinar docs profundas, customer stories, showcase de templates, changelog vivo e espacos comunitarios mais ativos. O Aethel ja tem a honestidade e o repositorio serio; agora precisa ampliar a superficie publica dessa conversa."
      calloutLinks={[
        { label: 'Abrir docs', href: '/docs' },
        { label: 'Abrir pricing', href: '/pricing' },
        { label: 'Repositorio no GitHub', href: 'https://github.com/wilianflima321-glitch/meu-repo', external: true },
      ]}
    />
  )
}
