import type { Metadata } from 'next'
import { HeartHandshake } from 'lucide-react'

import DocsResourcePage from '@/app/docs/docs-resource-page'

export const metadata: Metadata = {
  title: 'Security Acknowledgments | Aethel Studio',
  description:
    'Pagina publica de acknowledgments para pesquisas de seguranca coordenadas com o time do Aethel Studio.',
}

const cards = [
  {
    eyebrow: 'Como funciona',
    title: 'Agradecimentos coordenados',
    description:
      'Quando um reporte for validado e puder ser divulgado com seguranca, usamos esta pagina para agradecer o pesquisador sem expor detalhes sensiveis antes da hora.',
  },
  {
    eyebrow: 'Estado atual',
    title: 'Sem hall da fama inflado',
    description:
      'Nao inventamos lista de pesquisadores ou bounty winners. Esta superficie existe para quando houver casos reais, coordenados e publicaveis.',
  },
  {
    eyebrow: 'Canal correto',
    title: 'Comece pela security policy',
    description:
      'Se voce encontrou um problema, o primeiro passo continua sendo /security-policy e security@aethel.dev, nao uma divulgacao publica prematura.',
  },
]

export default function SecurityAcknowledgmentsPage() {
  return (
    <DocsResourcePage
      eyebrow="Security acknowledgments"
      title="Agradecimentos publicos so quando houver casos reais para publicar."
      description="Esta pagina fecha o loop de disclosure responsavel: primeiro o reporte coordenado, depois a triagem, e so entao o acknowledgement publico quando fizer sentido para todas as partes."
      icon={HeartHandshake}
      accentClassName="text-[var(--aethel-info-light)]"
      summary="Os melhores produtos do mercado nao inflam um hall da fama vazio. Eles deixam claro como a pesquisa entra, como a triagem acontece e quando a divulgacao publica faz sentido. Esta pagina segue a mesma filosofia."
      cards={cards}
      calloutTitle="Precisa relatar algo agora?"
      calloutDescription="Use a security policy e o trust center como rota principal. Se a conversa tambem envolver rollout enterprise, procurement ou requisitos de buyer, siga para compliance e contact-sales depois da triagem inicial."
      calloutLinks={[
        { label: 'Security policy', href: '/security-policy' },
        { label: 'Trust center', href: '/trust' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Contact sales', href: '/contact-sales' },
      ]}
    />
  )
}
