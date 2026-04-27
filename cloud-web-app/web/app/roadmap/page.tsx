import type { Metadata } from 'next'
import { Compass } from 'lucide-react'

import DocsResourcePage from '@/app/docs/docs-resource-page'

export const metadata: Metadata = {
  title: 'Roadmap | Aethel Studio',
  description:
    'Roadmap publico e honesto do Aethel Studio com o que esta live agora, o que esta em rollout e quais lacunas ainda seguram o benchmark-grade.',
}

const cards = [
  {
    eyebrow: 'Agora',
    title: 'Apps + Pesquisa como trilha principal',
    description:
      'A frente mais madura hoje continua sendo Apps + Pesquisa, com studio shell, AI Console, preview trust, onboarding e buyer path publico mais fortes.',
    links: [
      { label: 'Ver pricing', href: '/pricing' },
      { label: 'Ver clientes beta', href: '/customers' },
    ],
  },
  {
    eyebrow: 'Em rollout',
    title: 'AI loop, preview review e buyer trust',
    description:
      'As maiores evolucoes em curso estao no loop AI para artefato, na confianca de review/share/deploy e no material publico para procurement e seguranca.',
    links: [
      { label: 'Trust center', href: '/security' },
      { label: 'Procurement starter pack', href: '/docs/procurement-starter-pack' },
    ],
  },
  {
    eyebrow: 'Ainda aberto',
    title: 'Prerender parity, colaboracao provada e profundidade enterprise',
    description:
      'Os maiores gaps remanescentes continuam sendo fechar o probe antigo de build, provar coedicao em nivel benchmark e aprofundar a malha publica enterprise.',
    links: [
      { label: 'Status operacional', href: '/status' },
      { label: 'Contact sales', href: '/contact-sales' },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <DocsResourcePage
      eyebrow="Roadmap publico"
      title="Roadmap orientado por verdade operacional, nao por wishful thinking."
      description="Esta pagina resume a direcao publica do produto com a mesma regra que usamos nas auditorias internas: separar o que esta live, o que esta parcial e o que ainda precisa de prova antes de virar claim."
      icon={Compass}
      accentClassName="text-[var(--aethel-info-light)]"
      summary="O Aethel ja saiu da fase de descobrir o que quer ser. Agora a maior vantagem vem de executar, provar e aprofundar as superficies que ja colocam Apps + Pesquisa, preview e governanca no mesmo studio."
      cards={cards}
      calloutTitle="Como ler este roadmap sem se perder"
      calloutDescription="Se voce e usuario final, comece por pricing, docs e customers. Se voce e buyer ou champion tecnico, use trust center, procurement starter pack e contact-sales como trilha principal. Se voce esta avaliando maturidade de produto, acompanhe status e changelog antes de transformar o roadmap em promessa."
      calloutLinks={[
        { label: 'Pricing', href: '/pricing' },
        { label: 'Docs', href: '/docs' },
        { label: 'Status', href: '/status' },
        { label: 'Changelog', href: '/docs/changelog' },
      ]}
    />
  )
}
