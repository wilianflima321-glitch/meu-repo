import type { Metadata } from 'next'
import { FileCheck2 } from 'lucide-react'

import {
  TrustCenterPageShell,
  type TrustAction,
  type TrustFaq,
  type TrustMetric,
  type TrustSection,
} from '../security/trust-center-shared'

export const metadata: Metadata = {
  title: 'Compliance | Aethel Studio',
  description:
    'Panorama publico minimo de compliance e governanca do Aethel Studio, com declaracoes honestas sobre readiness, auditorias e roadmap.',
}

const metrics: TrustMetric[] = [
  {
    label: 'SOC 2',
    value: 'Planejado',
    detail: 'O proprio footer publico ja trata SOC 2 como planejado, nao como certificacao publicada.',
    tone: 'planned',
  },
  {
    label: 'GDPR',
    value: 'Alvo',
    detail: 'Tratamos GDPR como alvo de maturidade e governanca, nao como claim absoluto de certificacao formal.',
    tone: 'planned',
  },
  {
    label: 'Auditorias',
    value: 'Canonicas',
    detail: 'O roadmap interno ja e pressionado por auditorias honestas e mapas de execucao, nao so por copy de marketing.',
    tone: 'live',
  },
]

const sections: TrustSection[] = [
  {
    eyebrow: 'Base atual',
    title: 'O que sustenta a conversa de compliance hoje.',
    description:
      'A maturidade atual vem mais de sinais verificaveis e governanca de execucao do que de um pacote cheio de selos. Isso e melhor do que overclaim, mas ainda nao fecha tudo.',
    cards: [
      {
        eyebrow: 'Readiness',
        title: 'Status publico e evidencias operacionais',
        tone: 'live',
        description:
          'A pagina /status ja organiza liveness, readiness e dependencias publicas com linguagem honesta sobre parcialidade, bloqueios e limites do que esta sendo medido.',
        bullets: [
          'Sem simular historico de incidente que ainda nao existe completo.',
          'Sem transformar placeholder em prova de prontidao.',
          'Boa base para procurement tecnico que quer ver sinais de verdade.',
        ],
      },
      {
        eyebrow: 'Governanca',
        title: 'Logs, politicas e superficies admin',
        tone: 'partial',
        description:
          'O produto ja possui superficies internas de seguranca e compliance apoiadas por logs e politicas, o que ajuda operacao real mesmo antes do trust center publico ficar completo.',
        bullets: [
          'Ha trilha administrativa para seguranca e conformidade.',
          'Isso ajuda mais a equipe operadora do que um comprador self-serve hoje.',
          'Ainda falta transformar essa base em pacote publico de procurement melhor acabado.',
        ],
      },
      {
        eyebrow: 'Execucao',
        title: 'Auditorias canonicamente honestas',
        tone: 'live',
        description:
          'O repositorio mantem auditorias e mapas de execucao que continuam corrigindo drift entre narrativa e codigo. Isso e um ativo real de governanca.',
        bullets: [
          'Os gaps continuam nomeados em vez de escondidos.',
          'As entregas novas ja corrigiram varios claims historicos vencidos.',
          'A postura e melhorar o produto antes de inflar a brochura.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Nao prometemos antes da hora',
    title: 'Lacunas que continuam abertas para o pacote enterprise.',
    description:
      'Compliance de verdade depende tanto de controles tecnicos quanto de artefatos comerciais e juridicos. Hoje ainda faltam algumas pecas para uma central publica completa.',
    cards: [
      {
        eyebrow: 'Certificacoes',
        title: 'Sem selo formal publicado',
        tone: 'planned',
        description:
          'Nao tratamos SOC 2, ISO 27001 ou equivalente como conquistas fechadas no site atual. Quando isso mudar, a pagina deve mostrar o que foi auditado e o que continua fora de escopo.',
        bullets: [
          'Melhor declarar o vazio do que insinuar uma certificacao inexistente.',
          'Planejamento e alvo continuam separados de certificacao emitida.',
          'A expectativa correta hoje e roadmap, nao atestado final.',
        ],
      },
      {
        eyebrow: 'Identidade corporativa',
        title: 'SSO / SAML ainda precisa de rollout publico',
        tone: 'partial',
        description:
          'Existe readiness tecnica para OIDC/SAML, mas o conjunto ainda nao aparece como fluxo publico canonico, suportado e pronto para operacao enterprise self-serve.',
        bullets: [
          'Readiness tecnica nao equivale a rollout comercial fechado.',
          'Faltam docs, onboarding e cobertura publica mais clara.',
          'A conversa atual ainda e assistida, nao de checkbox no pricing.',
        ],
      },
      {
        eyebrow: 'Procurement',
        title: 'Este trust center ainda e minimo',
        tone: 'planned',
        description:
          'Esta pagina ajuda a iniciar avaliacao, mas nao substitui questionario de seguranca, alinhamento juridico bilateral ou pacote formal de procurement.',
        bullets: [
          'A jornada publica ainda precisa de mais docs e artefatos dedicados.',
          'Incident history publico mais rico continua em aberto.',
          'A resposta certa hoje combina pagina publica com conversa humana.',
        ],
      },
    ],
  },
]

const faqs: TrustFaq[] = [
  {
    question: 'O Aethel ja e SOC 2?',
    answer:
      'Nao declaramos isso hoje. O estado publico atual e de planejamento, nao de certificacao formal publicada.',
  },
  {
    question: 'GDPR esta resolvido como claim de marketing?',
    answer:
      'Tambem nao. Tratamos GDPR como alvo de maturidade e governanca, e nao como frase solta para encerrar due diligence.',
  },
  {
    question: 'Como comecar uma avaliacao enterprise agora?',
    answer:
      'Use /security e /status para a leitura inicial e depois leve os pontos de rollout, procurement e requisitos contratuais para /contact-sales.',
  },
]

const actions: TrustAction[] = [
  { label: 'Ver seguranca', href: '/security', tone: 'primary' },
  { label: 'Ver status publico', href: '/status' },
  { label: 'Falar com vendas', href: '/contact-sales' },
]

export default function CompliancePage() {
  return (
    <TrustCenterPageShell
      badge="Compliance"
      heroIcon={FileCheck2}
      title="Compliance e governanca em modo honesto: base real agora, pacote enterprise completo ainda em construcao."
      description="O Aethel ja expoe status publico, readiness, auditorias canonicas e sinais administrativos de governanca. Ainda nao tratamos certificacoes formais, SSO/SAML GA ou pacote completo de procurement como se estivessem fechados."
      summaryTitle="O que esta valendo hoje"
      summaryBody="A postura atual e simples: mostrar a base real de confianca que ja existe, deixar as lacunas nomeadas e transformar o roadmap enterprise em algo verificavel com o tempo."
      summaryPoints={[
        'Status publico e readiness ja estao visiveis.',
        'Auditorias internas pressionam o roadmap de verdade.',
        'SOC 2, GDPR e SSO/SAML continuam tratados com cautela e sem overclaim.',
      ]}
      metrics={metrics}
      sections={sections}
      faqs={faqs}
      actions={actions}
    />
  )
}
