export type CustomerProofCard = {
  eyebrow: string
  title: string
  description: string
  bullets: string[]
}

export type CustomerProofLink = {
  label: string
  href: string
  note: string
}

export const TEAM_PROFILES: CustomerProofCard[] = [
  {
    eyebrow: 'Founders + duplas de produto',
    title: 'Times pequenos que precisam sair do briefing para um app validavel rapido.',
    description:
      'Esses times usam o studio para concentrar contexto, iterar no editor com apoio de IA e revisar preview sem abrir uma pilha de ferramentas desconectadas.',
    bullets: ['MVPs internos e externos', 'Primeiros loops de billing/onboarding', 'Review rapido com preview e readiness'],
  },
  {
    eyebrow: 'Squads de product engineering',
    title: 'Squads que querem reduzir troca de contexto entre pesquisa, implementacao e validacao.',
    description:
      'O valor aparece quando a squad precisa manter trabalho tecnico, trilha operacional e estado do preview no mesmo cockpit em vez de espalhar tudo entre varios SaaS.',
    bullets: ['Refinos de backlog com contexto unico', 'Entrega assistida por AI Console', 'Preview/deploy em trilha unica'],
  },
  {
    eyebrow: 'Times de studio / 3D / visual',
    title: 'Times experimentando fluxos visuais, viewport e preview como superficie principal.',
    description:
      'Ainda e uma frente em maturacao, mas ja faz sentido para design partners que querem testar loops de cena, UI visual e validacao operacional sem perder governanca.',
    bullets: ['Navigable mockups with preview', 'Iteration over runtime and viewport', 'Honest validation of what is already ready'],
  },
]

export const USE_CASES: CustomerProofCard[] = [
  {
    eyebrow: 'Cenario 01',
    title: 'Criar um produto novo com menos handoff entre ideia, codigo e revisao.',
    description:
      'Quando o problema principal e manter o mesmo contexto vivo do discovery ate o preview, o Aethel funciona melhor do que um fluxo de prompt solto + deploy separado.',
    bullets: ['Landing + app shell', 'Fluxo gratuito com onboarding', 'Revisao por readiness antes de prometer'],
  },
  {
    eyebrow: 'Cenario 02',
    title: 'Operar pesquisa e implementacao no mesmo sistema de trabalho.',
    description:
      'Para times que precisam alternar entre analise, backlog tecnico e edicao assistida, o ganho vem da reducao de troca de ferramenta e da trilha operacional visivel.',
    bullets: ['Pesquisa guiada por artefato', 'Editor com symbol truth e inline AI', 'Historico de decisoes mais claro'],
  },
  {
    eyebrow: 'Cenario 03',
    title: 'Preparar rollout enterprise sem fingir maturidade que ainda nao existe.',
    description:
      'Alguns design partners usam o produto para entender o caminho ate governanca, billing, SSO e readiness, inclusive onde ainda ha gaps abertos no proprio produto.',
    bullets: ['Pricing e billing readiness publicos', 'Status honesto sobre o que falta', 'Conversas de rollout guiadas por evidencia'],
  },
]

export const PUBLIC_EVIDENCE: CustomerProofLink[] = [
  {
    label: 'Status publico',
    href: '/status',
    note: 'Mostra checks, limites conhecidos e o que ainda nao publicamos em uptime e incident history.',
  },
  {
    label: 'Pricing real',
    href: '/pricing',
    note: 'Explica planos, readiness de billing e a linha entre self-serve e rollout enterprise.',
  },
  {
    label: 'Documentacao oficial',
    href: '/docs',
    note: 'Centraliza as superficies publicas e os caminhos principais do studio sem inventar abrangencia falsa.',
  },
]

export const COMPOSITE_EVALUATIONS: CustomerProofCard[] = [
  {
    eyebrow: 'Snapshot composto 01',
    title: 'Founders saindo do discovery para um app validavel sem trocar de cockpit.',
    description:
      'Este e o caminho de equipes pequenas que entram pelo produto, usam preview e readiness para validar o fluxo principal e so depois puxam a conversa comercial.',
    bullets: ['Comecam por dashboard, pricing e docs', 'Usam preview para reduzir handoff entre ideia e revisao', 'Escalam para vendas quando seguranca ou rollout entram em cena'],
  },
  {
    eyebrow: 'Snapshot composto 02',
    title: 'Squads de produto consolidando pesquisa, implementacao e check de readiness.',
    description:
      'Aqui o ganho aparece menos como automacao magica e mais como reducao de troca de contexto entre analise, execucao e verificacao publica.',
    bullets: ['Pesquisa e implementacao ficam no mesmo loop', 'Status e docs ajudam a qualificar maturidade real', 'A prova comercial vem do produto em uso, nao de branding'],
  },
  {
    eyebrow: 'Snapshot composto 03',
    title: 'Buyers ensaiando procurement sem promessas de GA que ainda nao fechou.',
    description:
      'Quando SSO, governanca e requisitos de rollout entram na conversa, a jornada certa cruza security, compliance e um pack publico antes da call assistida.',
    bullets: ['Security e compliance separam live, partial e planned', 'O starter pack reduz idas e vindas na primeira avaliacao', 'A conversa enterprise acontece com escopo mais claro e menos fantasia'],
  },
]

export const HONEST_NOTES = [
  'Hoje falamos em beta design partners e tipos de times, nao em uma logo wall publica ou contagem inflada de clientes.',
  'Nao estamos publicando claims de SOC 2, compliance formal ou customer stories com marca nomeada nesta pagina.',
  'O foco comercial continua em Apps + Pesquisa; outras superficies do produto ainda seguem em maturacao relativa.',
  'Preferimos mostrar evidence surfaces publicas e estado de readiness em vez de prometer um nivel de rollout que ainda nao fechou ponta a ponta.',
]

export const BUYER_READINESS_LINKS: CustomerProofLink[] = [
  {
    label: 'Pack de procurement',
    href: '/docs/procurement-starter-pack',
    note: 'Organiza a ordem de leitura publica para due diligence, procurement e alinhamento inicial com champions tecnicos.',
  },
  {
    label: 'Trust center de seguranca',
    href: '/security',
    note: 'Mostra o que esta live agora, o que segue assistido e onde preferimos nao inflar a narrativa enterprise.',
  },
  {
    label: 'Postura de compliance',
    href: '/compliance',
    note: 'Explica a base atual de governanca e deixa visivel o que ainda e alvo, planejamento ou rollout em aberto.',
  },
]

export const NEXT_STEPS: CustomerProofLink[] = [
  {
    label: 'Explorar o studio',
    href: '/dashboard?onboarding=1&source=customers-proof',
    note: 'Melhor para founders, builders e squads que querem testar o fluxo principal no produto real.',
  },
  {
    label: 'Comparar planos',
    href: '/pricing',
    note: 'Melhor para equipes avaliando quota, colaboracao, billing e readiness de rollout.',
  },
  {
    label: 'Falar com vendas',
    href: '/contact-sales?source=customers-proof',
    note: 'Melhor para times com requisitos de governanca, procurement ou rollout assistido.',
  },
  {
    label: 'Abrir procurement pack',
    href: '/docs/procurement-starter-pack',
    note: 'Melhor para buyers que precisam montar a primeira leitura publica antes de envolver times juridicos ou de seguranca.',
  },
]
