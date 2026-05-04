import type { Metadata } from 'next'
import { Activity } from 'lucide-react'

import {
  TrustCenterPageShell,
  type TrustAction,
  type TrustFaq,
  type TrustMetric,
  type TrustResource,
  type TrustSection,
} from '../security/trust-center-shared'

export const metadata: Metadata = {
  title: 'Reliability | Aethel Studio',
  description:
    'Reliability e incident response do Aethel Studio: status publico, Sev 1-3, response targets e limites sem SLA inventado.',
}

const metrics: TrustMetric[] = [
  {
    label: 'Status checks',
    value: 'Live',
    detail: 'A rota /status ja mostra runtime, readiness e dependencias publicas sem transformar checks em uptime decorativo.',
    tone: 'live',
  },
  {
    label: 'Incident grammar',
    value: 'Sev 1-3',
    detail: 'Sev 1, Sev 2 e Sev 3 sao a linguagem publica para bloqueio, degradacao e cobertura incompleta.',
    tone: 'live',
  },
  {
    label: 'SLO/SLA',
    value: 'Targets',
    detail: 'Response targets ajudam triagem e comunicacao, mas isto nao e SLA contratual nem promessa de disponibilidade.',
    tone: 'partial',
  },
]

const sections: TrustSection[] = [
  {
    eyebrow: 'O que ja e verificavel',
    title: 'Reliability precisa ser prova operacional, nao selo bonito.',
    description:
      'Aethel ja tem checks publicos, readiness gates e gramatica de incidente. Esta pagina junta essas pecas para buyers e usuarios sem poluir Web Light ou Studio Home.',
    cards: [
      {
        eyebrow: 'Status publico',
        title: 'Checks vivos em /status',
        tone: 'live',
        description:
          'O status operacional separa runtime, readiness, AI, banco, cache, storage, Stripe e billing para que falhas parciais sejam legiveis.',
        bullets: [
          'Runtime e readiness aparecem como superficies diferentes.',
          'Dependencias criticas ficam visiveis sem esconder partial ou blocked.',
          'O refresh publico e curto o bastante para suporte e operacao acompanharem mudancas.',
        ],
      },
      {
        eyebrow: 'Incident response',
        title: 'Sev 1 / Sev 2 / Sev 3',
        tone: 'live',
        description:
          'A gramatica Sev evita copy generica. Cada incidente deve indicar escopo, impacto, mitigacao, dono e proxima atualizacao esperada.',
        bullets: [
          'Sev 1: bloqueio publico ou perda ampla de capacidade essencial.',
          'Sev 2: capacidade degradada com workaround ou escopo limitado.',
          'Sev 3: cobertura incompleta, monitoramento, ou comunicacao preventiva.',
        ],
      },
      {
        eyebrow: 'Readiness gates',
        title: 'Runtime, billing, preview e operator',
        tone: 'partial',
        description:
          'Os gates de readiness impedem que uma area pareca pronta quando o runtime real ainda precisa de configuracao, dependencia ou confirmacao humana.',
        bullets: [
          'Billing readiness separa Stripe configurado de billing apenas visual.',
          'Preview readiness evita tratar runtime parcial como deploy confiavel.',
          'Operator readiness mantem internet/browser work governado, nao magico.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Limites assumidos',
    title: 'O caminho certo e declarar limites antes de vender maturidade enterprise.',
    description:
      'Vercel e GitHub mostram status historico por componente. Aethel ainda nao deve copiar a metrica final sem ter historico proprio. O gate protege exatamente esse ponto.',
    cards: [
      {
        eyebrow: 'Historico',
        title: 'No rolling uptime ainda',
        tone: 'planned',
        description:
          'A pagina publica ainda nao possui no rolling uptime com janela historica propria. Quando existir, deve nascer de telemetria real e status provider, nao de copy.',
        bullets: [
          'Sem percentual de disponibilidade inventado em marketing.',
          'Sem disponibilidade extrema prometida sem contrato e evidencia.',
          'A prioridade agora e instrumentar historico confiavel por componente.',
        ],
      },
      {
        eyebrow: 'Incidentes',
        title: 'Public incident history ainda incompleto',
        tone: 'planned',
        description:
          'O produto ainda precisa de public incident history com postmortems, timelines, owner, causa raiz e prevencao. Ate la, /status e /trust sao o caminho factual.',
        bullets: [
          'Postmortem publico deve exigir timeline, impacto, mitigacao e follow-up.',
          'Incidentes de AI/runtime precisam nomear agente, permissao, dado e ambiente afetado.',
          'Sem apagar incidentes resolvidos para parecer mais maduro.',
        ],
      },
      {
        eyebrow: 'Contrato',
        title: 'Response targets nao sao SLA contratual',
        tone: 'partial',
        description:
          'Response targets servem para operacao e procurement inicial. SLA formal so deve aparecer em contrato enterprise, com escopo, regioes, exclusoes e creditos.',
        bullets: [
          'Esta pagina usa response targets como expectativa operacional, nao garantia legal.',
          'Enterprise precisa passar por contact-sales para due diligence e contrato.',
          'SLO/SLA futuro deve ser derivado de evidencia de producao, nao de ambicao.',
        ],
      },
    ],
  },
]

const resources: TrustResource[] = [
  {
    eyebrow: 'Status',
    title: 'Status operacional',
    description: 'Checks publicos de runtime, readiness e dependencias criticas.',
    href: '/status',
  },
  {
    eyebrow: 'Trust',
    title: 'Trust center',
    description: 'Mapa publico de seguranca, compliance, status, privacidade e disclosure.',
    href: '/trust',
  },
  {
    eyebrow: 'Security',
    title: 'Security policy',
    description: 'Responsible disclosure, safe harbor, escopo e limites de teste.',
    href: '/security-policy',
  },
  {
    eyebrow: 'Procurement',
    title: 'Procurement starter pack',
    description: 'Primeira trilha para buyers avaliarem risco, governanca e rollout.',
    href: '/docs/procurement-starter-pack',
  },
  {
    eyebrow: 'Enterprise',
    title: 'Contact sales',
    description: 'Handoff para SLA, SSO/SAML, compliance formal e revisao contratual.',
    href: '/contact-sales',
  },
]

const faqs: TrustFaq[] = [
  {
    question: 'O Aethel declara disponibilidade garantida nesta pagina?',
    answer:
      'Nao. Esta pagina fala de reliability, incident response e response targets. Ela nao e SLA contratual e nao declara percentual de uptime sem historico proprio.',
  },
  {
    question: 'Onde vejo a saude atual do produto?',
    answer:
      'Use /status para checar runtime, readiness e dependencias. /reliability explica a linguagem operacional por tras desses checks.',
  },
  {
    question: 'Como Sev 1, Sev 2 e Sev 3 devem ser usados?',
    answer:
      'Sev 1 cobre bloqueio amplo; Sev 2 cobre degradacao relevante; Sev 3 cobre cobertura incompleta, monitoramento ou comunicacao preventiva.',
  },
  {
    question: 'Quando o Aethel tera public incident history completo?',
    answer:
      'Esse ainda e um gap aberto. A proxima versao deve registrar incidentes resolvidos, postmortems, timelines, follow-ups e ownership por componente.',
  },
]

const actions: TrustAction[] = [
  { label: 'Ver status', href: '/status', tone: 'primary' },
  { label: 'Trust center', href: '/trust' },
  { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
  { label: 'Falar com vendas', href: '/contact-sales' },
]

export default function ReliabilityPage() {
  return (
    <TrustCenterPageShell
      badge="Reliability"
      heroIcon={Activity}
      title="Reliability e incident response claros, sem uptime inventado e sem SLA decorativo."
      description="Aethel precisa ganhar confianca do usuario final e do buyer enterprise mostrando o que esta vivo, como incidentes sao classificados, quais response targets guiam a operacao e quais limites ainda nao devem virar promessa comercial."
      summaryTitle="Contrato anti-overclaim"
      summaryBody="O melhor do mercado nao e prometer disponibilidade antes da evidencia. E mostrar status, comunicar incidente com gramatica clara e separar target operacional de contrato formal."
      summaryPoints={[
        'Public status primeiro: /status mostra os checks que o usuario consegue acompanhar.',
        'Incident response usa Sev 1, Sev 2 e Sev 3 para reduzir ambiguidade operacional.',
        'Response targets ajudam triagem, mas nao e SLA contratual.',
        'No rolling uptime e public incident history completo seguem como lacunas assumidas.',
      ]}
      metrics={metrics}
      sections={sections}
      resources={resources}
      faqs={faqs}
      actions={actions}
    />
  )
}
