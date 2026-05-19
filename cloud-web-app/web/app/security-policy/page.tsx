import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import DocsResourcePage from '@/app/docs/docs-resource-page'

export const metadata: Metadata = {
  title: 'Security Policy | Aethel Studio',
  description:
    'Responsible disclosure policy publica do Aethel Studio com safe harbor, escopo, regras de teste e limites honestos do programa atual.',
}

const cards = [
  {
    eyebrow: 'Contato',
    title: 'Responsible disclosure',
    description:
      'O canal principal para vulnerabilidades continua sendo security@aethel.dev. Inclua impacto, passos de reproducao, superficie afetada e qualquer evidencia minima que ajude a triagem.',
    links: [{ label: 'Enviar email', href: 'mailto:security@aethel.dev', external: true }],
  },
  {
    eyebrow: 'Safe harbor',
    title: 'Boa-fe, nao destrutivo e coordenado',
    description:
      'Se a pesquisa seguir esta politica, for conduzida de boa-fe, nao acessar dados de terceiros e nao interromper o servico, trataremos a atividade como autorizada para fins de coordenacao responsavel.',
  },
  {
    eyebrow: 'Escopo',
    title: 'Superficies publicas e contas proprias',
    description:
      'Inclua testes em paginas publicas, fluxos autenticados da sua propria conta, APIs publicas, Studio Web, billing self-service, auth, deploy, marketplace e rotas de preview que voce controla.',
  },
  {
    eyebrow: 'Fora de escopo',
    title: 'Sem abuso, spam, exfiltracao ou impacto operacional',
    description:
      'Nao faca DoS, brute force, engenharia social, spam, scraping agressivo, acesso a dados de outras pessoas, exploracao persistente, alteracao destrutiva ou tentativa de contornar pagamentos.',
  },
  {
    eyebrow: 'AI / agentes',
    title: 'Teste agentes com cuidado extra',
    description:
      'Failures involving agents, browser operator, memory, local/cloud runtime, tool calls, prompts, files, or human approval must be reported with safe steps and without executing irreversible actions.',
  },
  {
    eyebrow: 'Expectativa',
    title: 'Response targets, nao SLA juridico',
    description:
      'Nossa meta inicial e confirmar recebimento em ate 48 horas uteis, triagem inicial em ate 5 dias uteis e atualizacoes proporcionais a severidade. Isso nao e SLA contratual nem bounty formal.',
  },
]

export default function SecurityPolicyPage() {
  return (
    <DocsResourcePage
      eyebrow="Security policy"
      title="Politica publica de divulgacao responsavel com safe harbor, escopo claro e limites honestos."
      description="A melhor leitura desta politica hoje e simples: como relatar vulnerabilidades, como testar sem causar dano, o que esta em escopo e quais promessas ainda nao fazemos."
      icon={ShieldCheck}
      accentClassName="text-[var(--aethel-success-light)]"
      summary="Ainda nao transformamos seguranca em um programa performatico. O foco publico agora e dar um caminho claro de coordinated disclosure, safe harbor de boa-fe, triagem e follow-up, mantendo a mesma honestidade das paginas de trust, security, compliance e status."
      cards={cards}
      calloutTitle="Melhor trilha publica para reporte ou security review"
      calloutDescription="Para reportar vulnerabilidade, comece por security@aethel.dev e preserve coordenacao. Para due diligence, use esta politica junto de /trust, /security, /compliance, /status e do procurement starter pack."
      calloutLinks={[
        { label: 'Trust center', href: '/trust' },
        { label: 'Security acknowledgments', href: '/security-acknowledgments' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Status', href: '/status' },
        { label: 'Procurement starter pack', href: '/docs/procurement-starter-pack' },
      ]}
    />
  )
}
