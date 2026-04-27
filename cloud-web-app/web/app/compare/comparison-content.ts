export type ComparisonLink = {
  label: string
  href: string
  external?: boolean
}

export type ComparisonCard = {
  category: string
  tool: string
  marketFocus: string
  benchmarkStrength: string
  chooseAethelWhen: string
  honestGap: string
  bestFor: string[]
  sources: ComparisonLink[]
}

export type ComparisonDecisionCard = {
  title: string
  description: string
  bullets: string[]
}

export const HERO_NOTES = [
  'Ultima revisao publica: 27 abr 2026.',
  'Baseado em docs oficiais dos competidores e nas superficies publicas live do Aethel.',
  'Nao marca o Aethel como vencedor automatico; deixa claro onde o mercado ainda esta na frente.',
]

export const COMPARISON_METRICS = [
  {
    label: 'Onde o Aethel ja ganha',
    value: 'Studio unificado',
    detail: 'Pesquisa, cockpit, trust e buyer path conversando dentro do mesmo sistema.',
  },
  {
    label: 'Onde o mercado ainda lidera',
    value: 'Loop AI + runtime',
    detail: 'Cursor/Windsurf ainda sao mais inevitaveis no editor; Replit/Vercel seguem mais provados em review/deploy.',
  },
  {
    label: 'Leitura certa hoje',
    value: 'Apps + Pesquisa',
    detail: 'Esse continua sendo o fit mais forte e mais honesto do produto neste momento.',
  },
]

export const COMPARISON_CARDS: ComparisonCard[] = [
  {
    category: 'AI code editor',
    tool: 'Cursor',
    marketFocus: 'Editor AI-first para times que querem codebase chat, inline edit e agent loops dentro de um ambiente familiar.',
    benchmarkStrength:
      'Cursor ja transforma inline edit, codebase understanding e background tasks em padrao esperado para quem vive no editor o dia inteiro.',
    chooseAethelWhen:
      'Escolha o Aethel quando voce precisa que editor, status, buyer path, preview trust e readiness convivam no mesmo studio em vez de virarem ferramentas separadas.',
    honestGap:
      'Ainda faltam mais inevitabilidade no inline AI, memoria persistente mais profunda e mais automacao canonicamente central no loop AI -> artefato.',
    bestFor: [
      'Times que querem comparar editor puro vs studio operacional.',
      'Champions tecnicos que precisam provar contexto, nao so velocidade de autocomplete.',
    ],
    sources: [
      { label: 'Cursor docs', href: 'https://docs.cursor.com/', external: true },
      { label: 'Cursor concepts', href: 'https://docs.cursor.com/get-started/concepts', external: true },
      { label: 'AI ops no Aethel', href: '/docs/ide' },
    ],
  },
  {
    category: 'AI code editor',
    tool: 'Windsurf',
    marketFocus: 'Editor com Cascade, Tab e fluxo parecido com VS Code/Cursor para quem quer produtividade imediata sem trocar muito de habito.',
    benchmarkStrength:
      'Windsurf se destaca em inline suggestions, Tab workflows e onboarding de quem vem do ecossistema VS Code.',
    chooseAethelWhen:
      'Escolha o Aethel quando o seu problema nao e so escrever codigo mais rapido, mas validar pesquisa, readiness, status e rollout sem sair do mesmo produto.',
    honestGap:
      'Ainda estamos atras na sensacao de polimento do loop inline, na familiaridade do ecossistema e na naturalidade de migracao para o editor no dia a dia.',
    bestFor: [
      'Squads que querem comparar editor com assistente vs studio com operacao visivel.',
      'Times que valorizam contexto e governanca mais do que apenas throughput de escrita.',
    ],
    sources: [
      { label: 'Windsurf docs', href: 'https://docs.windsurf.com/command/codeium-overview', external: true },
      { label: 'Windsurf Tab', href: 'https://docs.windsurf.com/tab/overview', external: true },
      { label: 'Roadmap do Aethel', href: '/roadmap' },
    ],
  },
  {
    category: 'Browser workspace',
    tool: 'Replit',
    marketFocus: 'Workspace browser-first para gerar, editar, colaborar e publicar apps do mesmo lugar.',
    benchmarkStrength:
      'Replit continua forte quando o buyer quer multiplayer, preview, shell, history e deploy convivendo nativamente em uma experiencia 100% browser.',
    chooseAethelWhen:
      'Escolha o Aethel quando a equipe quer um studio mais explicito sobre readiness, trust, buyers, docs e governanca publica junto do fluxo de construcao.',
    honestGap:
      'Ainda falta provar melhor colaboracao canonicamente live e deixar preview/review/deploy tao inevitaveis quanto os workspaces browser-native mais maduros.',
    bestFor: [
      'Teams que precisam comparar browser-native build loop vs studio com buyer path mais forte.',
      'Avaliadores que ligam para status, compliance e procurement alem da edicao.',
    ],
    sources: [
      { label: 'Replit workspace', href: 'https://docs.replit.com/core-concepts/workspace', external: true },
      { label: 'Replit deployments', href: 'https://docs.replit.com/cloud-services/deployments', external: true },
      { label: 'Status do Aethel', href: '/status' },
    ],
  },
  {
    category: 'Deploy + ops',
    tool: 'Vercel',
    marketFocus: 'Preview deployments, observability, rollback e operacao de frontend em escala.',
    benchmarkStrength:
      'Vercel e referencia de preview deploy, observability, rollback e surface operacional para times que ja tem engenharia e precisam reduzir friccao de release.',
    chooseAethelWhen:
      'Escolha o Aethel quando voce quer aproximar construcao, pesquisa, cockpit AI e trust publico em uma so narrativa em vez de acoplar varias ferramentas separadas.',
    honestGap:
      'Ainda precisamos fechar parity total de runtime/review, fortalecer o loop de preview e manter build confidence tao estavel quanto uma plataforma de deploy especialista.',
    bestFor: [
      'Founders e squads que querem um produto mais all-in-one do que um provedor puro de deploy.',
      'Times que topam trocar maturidade de infra por um studio mais integrado.',
    ],
    sources: [
      { label: 'Vercel observability', href: 'https://vercel.com/docs/observability', external: true },
      { label: 'Aethel security', href: '/security' },
      { label: 'Aethel pricing', href: '/pricing' },
    ],
  },
  {
    category: 'Ops + planning',
    tool: 'Linear',
    marketFocus: 'Issue tracking, triagem, roadmap e execucao de produto com UX extremamente refinada.',
    benchmarkStrength:
      'Linear segue forte em rapidez, densidade, atalhos e disciplina de triagem para equipes que vivem em backlog, roadmaps e project operations.',
    chooseAethelWhen:
      'Escolha o Aethel quando a operacao precisa estar colada ao ambiente de construcao e validacao, nao apenas a um sistema de tickets e roadmaps.',
    honestGap:
      'Ainda estamos atras em workflow maturity, filtros, triagem densa, views operacionais e sensacao de ferramenta inevitavel para planejamento puro.',
    bestFor: [
      'Squads que querem comparar sistema de execucao puro vs studio de execucao + entrega.',
      'Leads que precisam ver produto, roadmap e readiness na mesma conversa.',
    ],
    sources: [
      { label: 'Linear features', href: 'https://linear.app/features', external: true },
      { label: 'Linear docs', href: 'https://linear.app/docs', external: true },
      { label: 'Aethel roadmap', href: '/roadmap' },
    ],
  },
  {
    category: 'Docs + knowledge',
    tool: 'Notion',
    marketFocus: 'Wiki, docs, collaboration e knowledge management para organizar times e conhecimento.',
    benchmarkStrength:
      'Notion segue referencia de compartilhamento, authoring, base de conhecimento e estrutura de docs para times grandes e multiplos perfis.',
    chooseAethelWhen:
      'Escolha o Aethel quando o conhecimento precisa ficar mais perto do runtime, do cockpit e da prova operacional do proprio produto em vez de viver num wiki separado.',
    honestGap:
      'Ainda faltam busca melhor, authoring mais profundo e uma malha de docs tao fluida quanto os produtos especialistas em conhecimento.',
    bestFor: [
      'Buyers que querem decidir se o conhecimento deve morar no mesmo studio ou fora dele.',
      'Times que precisam unir doc, status, trust e produto em uma narrativa unica.',
    ],
    sources: [
      { label: 'Notion help', href: 'https://www.notion.com/help', external: true },
      { label: 'Docs do Aethel', href: '/docs' },
      { label: 'Customer proof', href: '/customers' },
    ],
  },
]

export const DECISION_CARDS: ComparisonDecisionCard[] = [
  {
    title: 'Escolha o Aethel agora se...',
    description: 'Seu time quer reduzir handoff entre pesquisa, cockpit AI, status, buyers e readiness.',
    bullets: [
      'Voce quer um studio unico para Apps + Pesquisa.',
      'Status, trust e procurement precisam ser parte da experiencia, nao um anexo.',
      'A conversa de deploy/compliance precisa aparecer cedo, mesmo sem overclaim enterprise.',
    ],
  },
  {
    title: 'Ainda prefira um benchmark especialista se...',
    description: 'Seu maior problema hoje e profundidade maxima em uma camada especifica.',
    bullets: [
      'Editor AI puro continua sendo a prioridade numero um do time.',
      'Seu principal criterio de compra e maturidade de preview/deploy em escala hoje.',
      'Voce quer wiki/issue tracking de categoria lider, mesmo que o build loop fique espalhado.',
    ],
  },
  {
    title: 'Leitura mais honesta para buyers',
    description: 'Nao use esta pagina para achar um vencedor universal. Use para entender qual sistema resolve o seu gargalo principal agora.',
    bullets: [
      'Aethel nao precisa vencer em tudo para ser a melhor escolha para certos fluxos.',
      'Quando o gap existe, ele aparece aqui em texto claro.',
      'Quando a vantagem existe, ela aponta para superficies publicas que ja podem ser auditadas.',
    ],
  },
]

export const EVIDENCE_LINKS: ComparisonLink[] = [
  { label: 'Status publico', href: '/status' },
  { label: 'Seguranca', href: '/security' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Clientes beta', href: '/customers' },
  { label: 'Roadmap publico', href: '/roadmap' },
  { label: 'Docs e procurement', href: '/docs/procurement-starter-pack' },
]
