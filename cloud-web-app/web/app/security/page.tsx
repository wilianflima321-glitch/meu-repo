import type { Metadata } from 'next'
import { LockKeyhole } from 'lucide-react'

import {
  TrustCenterPageShell,
  type TrustAction,
  type TrustFaq,
  type TrustMetric,
  type TrustResource,
  type TrustSection,
} from './trust-center-shared'

export const metadata: Metadata = {
  title: 'Seguranca | Aethel Studio',
  description:
    'Trust center publico minimo do Aethel Studio com copy honesta sobre MFA, readiness, status e roadmap enterprise.',
}

const metrics: TrustMetric[] = [
  {
    label: 'MFA de conta',
    value: 'Ativo',
    detail: 'Fluxo de TOTP com QR code, setup manual e backup codes ja existe no produto.',
    tone: 'live',
  },
  {
    label: 'Status publico',
    value: '/status',
    detail: 'Os checks publicos ja medem runtime, readiness e dependencias sem inventar uptime.',
    tone: 'live',
  },
  {
    label: 'SSO / SAML',
    value: 'Roadmap',
    detail: 'Existe readiness/plumbing no repositorio, mas nao tratamos isso como rollout enterprise GA hoje.',
    tone: 'partial',
  },
]

const sections: TrustSection[] = [
  {
    eyebrow: 'Entregue hoje',
    title: 'O que ja conseguimos provar no codigo e no produto.',
    description:
      'Esta pagina nao vende wishful thinking. Ela separa o que ja esta operacional do que ainda precisa de rollout, docs e evidencia mais forte.',
    cards: [
      {
        eyebrow: 'Conta',
        title: 'MFA com autenticador e backup codes',
        tone: 'live',
        description:
          'O hardening da conta ja inclui setup de TOTP, validacao, desativacao controlada e regeneracao de backup codes.',
        bullets: [
          'QR code e setup manual convivem no mesmo fluxo de seguranca.',
          'Backup codes sao regeneraveis depois da ativacao.',
          'A propria UX da conta ja trata 2FA como caminho canonico de endurecimento.',
        ],
      },
      {
        eyebrow: 'Operacao',
        title: 'Status e readiness publicos',
        tone: 'live',
        description:
          'A pagina publica de status mede o que os endpoints conseguem provar agora, incluindo runtime, readiness, banco, cache, storage, AI e billing.',
        bullets: [
          'Sem uptime rolling inventado para parecer mais maduro do que esta.',
          'Superficies parciais continuam aparecendo como parciais.',
          'Bloqueios obrigatorios ficam visiveis quando a verificacao publica falha.',
        ],
      },
      {
        eyebrow: 'Governanca',
        title: 'Controles operacionais internos ja existem',
        tone: 'partial',
        description:
          'Ha superficies internas para logs de auditoria, enforce 2FA e bloqueio de IP suspeito, o que ajuda governanca antes mesmo do trust portal ficar completo.',
        bullets: [
          'Bom sinal para operacao e revisao administrativa.',
          'Ainda nao e um pacote self-serve completo para procurement.',
          'A camada publica ainda precisa ficar tao clara quanto a camada admin.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Em rollout',
    title: 'O que esta a caminho, sem ser vendido antes da hora.',
    description:
      'Algumas pecas importantes ja possuem readiness ou scaffolding no repositorio, mas ainda nao merecem o selo de GA enterprise na narrativa publica.',
    cards: [
      {
        eyebrow: 'Identidade corporativa',
        title: 'SSO / SAML ainda nao e promessa de GA',
        tone: 'partial',
        description:
          'O repositorio ja tem readiness para provedores OIDC e SAML, mas isso ainda nao deve ser lido como fluxo canonico, autoatendido e suportado em producao enterprise.',
        bullets: [
          'A leitura atual e de readiness de configuracao, nao de rollout concluido.',
          'Faltam docs, posicionamento publico e fechamento operacional do fluxo.',
          'A venda certa hoje e conversa assistida, nao checkbox inflado.',
        ],
      },
      {
        eyebrow: 'Credenciais modernas',
        title: 'Passkeys em rollout tecnico governado',
        tone: 'partial',
        description:
          'O produto agora tem API, storage e painel de registro de passkeys. Ainda tratamos como rollout tecnico ate recovery, docs e suporte enterprise ficarem completos.',
        bullets: [
          'Tokens WebAuthn usam challenge curto, one-time e credential public-key server-side.',
          'O painel de Settings ja permite registrar passkey quando o navegador/dispositivo suporta.',
          'Ainda falta pacote completo de recovery e docs de suporte antes de chamar GA enterprise.',
        ],
      },
      {
        eyebrow: 'Programas formais',
        title: 'Sem overclaim de certificacoes',
        tone: 'planned',
        description:
          'Hoje nao publicamos SOC 2, ISO 27001 ou selo equivalente como se estivessem concluidos. O proprio footer publico trata isso como planejamento ou alvo.',
        bullets: [
          'SOC 2 aparece como planejado, nao como atestado emitido.',
          'GDPR aparece como alvo, nao como slogan juridico absoluto.',
          'A conversa enterprise ainda depende de alinhamento humano e evidencia incremental.',
        ],
      },
    ],
  },
]

const faqs: TrustFaq[] = [
  {
    question: 'O Aethel ja tem MFA de verdade?',
    answer:
      'Sim. O produto ja tem fluxo de TOTP com autenticador, QR code, setup manual, backup codes e manutencao da seguranca da conta.',
  },
  {
    question: 'Passkeys ja existem no produto?',
    answer:
      'Sim, em rollout tecnico: ha rotas WebAuthn, storage versionado, painel de registro e gate de QA. Ainda nao chamamos isso de GA enterprise ate fechar recovery e documentacao operacional.',
  },
  {
    question: 'SSO / SAML ja esta pronto para compra self-serve?',
    answer:
      'Ainda nao. Existe readiness/plumbing no repositorio, mas nao estamos tratando isso como rollout enterprise GA na experiencia publica atual.',
  },
  {
    question: 'Onde acompanho a saude operacional hoje?',
    answer:
      'A pagina /status e o melhor ponto publico para acompanhar readiness e bloqueios reais do runtime sem maquiagem de marketing.',
  },
  {
    question: 'Como um buyer deveria iniciar procurement ou due diligence?',
    answer:
      'Comece pelo pack publico em /docs/procurement-starter-pack, confira /status para saude operacional e use /contact-sales quando a conversa envolver SSO, rollout ou revisao de requisitos.',
  },
]

const resources: TrustResource[] = [
  {
    eyebrow: 'Procurement',
    title: 'Starter pack para buyers',
    description:
      'Checklist publico com ordem de leitura, perguntas de due diligence e o que enviar para acelerar a avaliacao enterprise.',
    href: '/docs/procurement-starter-pack',
  },
  {
    eyebrow: 'Operacao',
    title: 'Status operacional',
    description:
      'Valide runtime, readiness e dependencias publicas antes de transformar a conversa de seguranca em pura narrativa.',
    href: '/status',
  },
  {
    eyebrow: 'Proof',
    title: 'Clientes beta e fit atual',
    description:
      'Veja quais tipos de time ja encontram valor hoje sem inventar logo wall, contagem de clientes ou rollout inflado.',
    href: '/customers',
  },
  {
    eyebrow: 'Policy',
    title: 'Security policy e acknowledgments',
    description:
      'Buyer, champion tecnico e pesquisador agora encontram a politica publica de disclosure e o destino dos acknowledgments sem cair em link quebrado.',
    href: '/security-policy',
  },
]

const actions: TrustAction[] = [
  { label: 'Ver status publico', href: '/status', tone: 'primary' },
  { label: 'Pack de procurement', href: '/docs/procurement-starter-pack' },
  { label: 'Security policy', href: '/security-policy' },
  { label: 'Ler compliance', href: '/compliance' },
  { label: 'Falar com vendas', href: '/contact-sales' },
]

export default function SecurityPage() {
  return (
    <TrustCenterPageShell
      badge="Trust Center"
      heroIcon={LockKeyhole}
      title="Seguranca publica com copy honesta, pronta para conversa enterprise sem fantasia."
      description="O Aethel ja entrega MFA de conta, passkeys em rollout tecnico, status publico baseado em checks reais e sinais internos de governanca. Ainda nao tratamos SSO/SAML ou certificacoes formais como se ja fossem rollout concluido."
      summaryTitle="O que esta valendo hoje"
      summaryBody="Use esta pagina para entender a postura atual do produto: capacidade de hardening ja entregue, sinais operacionais publicos e os limites que ainda preferimos declarar em voz alta."
      summaryPoints={[
        'MFA/TOTP com backup codes ja esta no produto.',
        'Passkeys agora tem API, migration e painel de registro em Settings.',
        'Status publico mede endpoints reais, nao um uptime decorativo.',
        'SSO/SAML segue como readiness + roadmap, nao como promessa GA.',
        'Buyers agora podem comecar por um pack publico de procurement antes da conversa assistida.',
      ]}
      metrics={metrics}
      sections={sections}
      resources={resources}
      faqs={faqs}
      actions={actions}
    />
  )
}
