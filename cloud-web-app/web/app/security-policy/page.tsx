import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import DocsResourcePage from '@/app/docs/docs-resource-page'

export const metadata: Metadata = {
  title: 'Security Policy | Aethel Studio',
  description:
    'Responsible disclosure policy publica do Aethel Studio com canais de contato, expectativa de resposta e limites honestos do programa atual.',
}

const cards = [
  {
    eyebrow: 'Contato',
    title: 'Responsible disclosure',
    description:
      'O canal principal para vulnerabilidades continua sendo security@aethel.dev. Use esse caminho para relatar achados antes de qualquer divulgacao publica.',
  },
  {
    eyebrow: 'Expectativa',
    title: 'Resposta inicial em ate 48 horas',
    description:
      'A meta publica atual e responder o recebimento em ate 48 horas e seguir com triagem, reproducao e proximo passo assim que o caso ficar claro.',
  },
  {
    eyebrow: 'Limites atuais',
    title: 'Sem bug bounty publico formal ainda',
    description:
      'Nao anunciamos bounty formal, SLA juridico ou certificacao que ainda nao exista. A politica publica vale como canal de coordenacao e disclosure responsavel.',
  },
]

export default function SecurityPolicyPage() {
  return (
    <DocsResourcePage
      eyebrow="Security policy"
      title="Politica publica de divulgacao responsavel sem claims inflados."
      description="A melhor leitura desta politica hoje e simples: como relatar vulnerabilidades, o que esperar da resposta inicial e quais limites ainda preferimos declarar com clareza."
      icon={ShieldCheck}
      accentClassName="text-[var(--aethel-success-light)]"
      summary="Ainda nao transformamos seguranca em um portal performatico. O foco publico agora e dar um caminho claro de disclosure, triagem e follow-up, mantendo a mesma honestidade das paginas de security, compliance e status."
      cards={cards}
      calloutTitle="Melhor trilha publica para security review"
      calloutDescription="Para due diligence, use esta politica junto de /security, /compliance, /status e do procurement starter pack. Isso reduz ping-pong inicial e evita tratar readiness parcial como promessa enterprise fechada."
      calloutLinks={[
        { label: 'Trust center', href: '/security' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Status', href: '/status' },
        { label: 'Procurement starter pack', href: '/docs/procurement-starter-pack' },
      ]}
    />
  )
}
