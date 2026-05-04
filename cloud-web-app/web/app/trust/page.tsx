import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import {
  TrustCenterPageShell,
  type TrustAction,
  type TrustFaq,
  type TrustMetric,
  type TrustResource,
  type TrustSection,
} from '../security/trust-center-shared'

export const metadata: Metadata = {
  title: 'Trust Center | Aethel Studio',
  description:
    'A porta publica de confianca do Aethel Studio: seguranca, compliance, status, privacidade, responsible disclosure e limites sem overclaim.',
}

const metrics: TrustMetric[] = [
  {
    label: 'MFA',
    value: 'Live',
    detail: 'TOTP, QR/manual setup e backup codes ja existem como caminho factual de hardening da conta.',
    tone: 'live',
  },
  {
    label: 'Status',
    value: 'Publico',
    detail: 'Runtime, billing, preview e dependencias aparecem em /status com checks atuais, nao uptime decorativo.',
    tone: 'live',
  },
  {
    label: 'SOC 2',
    value: 'Preparation',
    detail: 'SOC 2 preparation e roadmap enterprise ficam separados de qualquer claim formal ainda nao emitido.',
    tone: 'planned',
  },
]

const sections: TrustSection[] = [
  {
    eyebrow: 'Leitura unica',
    title: 'Um ponto de entrada para buyer, champion tecnico e pesquisador.',
    description:
      'GitHub, Vercel e Linear tratam trust como uma superficie propria. No Aethel, /trust consolida o que ja podemos provar e aponta para as paginas profundas sem inflar a UI principal.',
    cards: [
      {
        eyebrow: 'Seguranca',
        title: 'Controles que ja estao no produto',
        tone: 'live',
        description:
          'A conta ja tem MFA/TOTP e a area de seguranca mostra atividade auditavel do usuario com escopo e redacao segura.',
        bullets: [
          'MFA live com backup codes em vez de uma promessa solta.',
          'User audit activity existe em Settings sem expor log administrativo bruto.',
          'Security policy e acknowledgments tem rotas publicas para disclosure.',
        ],
      },
      {
        eyebrow: 'Operacao',
        title: 'Readiness publico sem maquiagem',
        tone: 'live',
        description:
          'O status publico mostra checks reais e limites assumidos. Isso e mais importante que prometer SLO/SLA antes de ter historico operacional suficiente.',
        bullets: [
          'Status, preview readiness, billing readiness e operator readiness seguem verificaveis.',
          'Falhas e parciais nao sao escondidas atras de copy generica.',
          'A pagina evita transformar runtime parcial em selo enterprise.',
        ],
      },
      {
        eyebrow: 'Compliance',
        title: 'Preparacao clara, sem certificacao inventada',
        tone: 'planned',
        description:
          'A narrativa publica separa SOC 2 preparation, GDPR target e procurement assistido de certificacoes que ainda nao devem ser vendidas como concluidas.',
        bullets: [
          'Sem declarar certificacao SOC 2 ou ISO emitida quando nao ha prova publica.',
          'Procurement starter pack guia a due diligence antes da call.',
          'Compliance continua ligado a evidencias e limites, nao a logo wall.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Caminho de due diligence',
    title: 'A experiencia certa e progressiva: resumo primeiro, artefatos depois.',
    description:
      'Para nao poluir Web Light ou Studio Home, os detalhes ficam em paginas especializadas. /trust vira o indice vivo de seguranca, privacidade, legal, status e contato enterprise.',
    cards: [
      {
        eyebrow: 'Disclosure',
        title: 'Responsible disclosure encontravel',
        tone: 'partial',
        description:
          'Pesquisadores precisam de uma rota direta para reportar vulnerabilidades. O trust center liga security policy e acknowledgments sem esconder o caminho.',
        bullets: [
          'Responsible disclosure entra no fluxo publico de confianca.',
          'Acknowledgments ficam separados de marketing e de vendas.',
          'O proximo nivel e transformar isso em programa formal com safe harbor detalhado.',
        ],
      },
      {
        eyebrow: 'Privacidade',
        title: 'Privacidade e termos no mesmo mapa',
        tone: 'partial',
        description:
          'Privacidade, termos e compliance ficam juntos na jornada de leitura para reduzir friccao de procurement e evitar que o buyer cace links no footer.',
        bullets: [
          'Privacy e Terms sao artefatos primarios de trust, nao rodape esquecido.',
          'A pagina evita claims juridicos absolutos que dependem de contrato e jurisdicao.',
          'A call enterprise continua indicada quando a avaliacao vira requisito formal.',
        ],
      },
      {
        eyebrow: 'AI governance',
        title: 'IA com custo, auditoria e limites visiveis',
        tone: 'partial',
        description:
          'Aethel nao e so um app SaaS: agentes podem navegar, gerar, editar e operar. Por isso trust tambem precisa cobrir memoria, custo, aprovacao e escopo de acao.',
        bullets: [
          'Economics transparency ja mostra custo no chat sem virar dashboard financeiro.',
          'Admin finance mostra risco de margem AI para evitar crescimento inviavel.',
          'Device/runtime routing evita prometer execucao local pesada sem checar capacidade.',
        ],
      },
    ],
  },
]

const resources: TrustResource[] = [
  {
    eyebrow: 'Security',
    title: 'Seguranca publica',
    description:
      'MFA, status, SSO/SAML como roadmap e leitura honesta do que ja esta operacional.',
    href: '/security',
  },
  {
    eyebrow: 'Compliance',
    title: 'Compliance e governanca',
    description:
      'SOC 2 preparation, GDPR target, auditorias canonicas e procurement sem claim inflado.',
    href: '/compliance',
  },
  {
    eyebrow: 'Status',
    title: 'Status operacional',
    description:
      'Checks vivos de runtime, dependencias, parciais e bloqueios publicos.',
    href: '/status',
  },
  {
    eyebrow: 'Reliability',
    title: 'Reliability e incident response',
    description:
      'Sev 1-3, response targets, limites de uptime e handoff enterprise sem SLA inventado.',
    href: '/reliability',
  },
  {
    eyebrow: 'Disclosure',
    title: 'Security policy',
    description:
      'Caminho publico para responsible disclosure e acknowledgments de seguranca.',
    href: '/security-policy',
  },
  {
    eyebrow: 'Acknowledgments',
    title: 'Security acknowledgments',
    description:
      'Reconhecimento publico apenas quando houver pesquisa coordenada e validada.',
    href: '/security-acknowledgments',
  },
  {
    eyebrow: 'Privacy',
    title: 'Privacidade',
    description:
      'Leitura publica de privacidade e tratamento de dados para buyers e usuarios finais.',
    href: '/privacy',
  },
  {
    eyebrow: 'Legal',
    title: 'Termos',
    description:
      'Termos de uso e limites contratuais que complementam a postura tecnica.',
    href: '/terms',
  },
]

const faqs: TrustFaq[] = [
  {
    question: 'Por que criar /trust se ja existem /security e /compliance?',
    answer:
      'Porque buyers e usuarios precisam de uma porta unica. /trust e o mapa compacto; /security, /compliance, /status, /privacy e /terms continuam como paginas profundas.',
  },
  {
    question: 'O Aethel esta declarando certificacoes formais aqui?',
    answer:
      'Nao. Esta pagina fala em SOC 2 preparation e roadmap. Qualquer certificacao futura precisa aparecer com evidencia, escopo e data.',
  },
  {
    question: 'Onde reportar uma vulnerabilidade?',
    answer:
      'Use /security-policy como trilha publica de responsible disclosure. A pagina /security-acknowledgments separa reconhecimentos de seguranca da narrativa comercial.',
  },
  {
    question: 'O que muda para a experiencia inicial do usuario leigo?',
    answer:
      'Nada fica mais pesado. O trust center fica como trilha de prova para quem precisa, enquanto Web Light e Studio Home continuam limpos e mission-first.',
  },
]

const actions: TrustAction[] = [
  { label: 'Ver seguranca', href: '/security', tone: 'primary' },
  { label: 'Ver status', href: '/status' },
  { label: 'Reliability', href: '/reliability' },
  { label: 'Security policy', href: '/security-policy' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Falar com vendas', href: '/contact-sales' },
]

export default function TrustPage() {
  return (
    <TrustCenterPageShell
      badge="Trust Center"
      heroIcon={ShieldCheck}
      title="Confianca publica em uma pagina: seguranca, status, compliance, privacidade e limites sem fantasia."
      description="O Aethel precisa parecer serio sem ficar poluido. Esta pagina consolida os artefatos que buyers, usuarios finais e pesquisadores procuram, mantendo certificacoes e SLO/SLA como provas futuras, nao promessas infladas."
      summaryTitle="Benchmark aplicado"
      summaryBody="O padrao de mercado e simples: uma pagina de trust com links profundos, postura de seguranca, privacidade, disclosure e compliance. A versao do Aethel adiciona um cuidado extra para IA: custo, auditoria, runtime e aprovacao."
      summaryPoints={[
        'Trust vira porta unica, nao mais links soltos no footer.',
        'Security, compliance, status, privacy e terms seguem acessiveis em um mapa limpo.',
        'Responsible disclosure e audit activity ficam explicitamente nomeados.',
        'SOC 2 preparation aparece como preparacao, nao como certificacao falsa.',
      ]}
      metrics={metrics}
      sections={sections}
      resources={resources}
      faqs={faqs}
      actions={actions}
    />
  )
}
