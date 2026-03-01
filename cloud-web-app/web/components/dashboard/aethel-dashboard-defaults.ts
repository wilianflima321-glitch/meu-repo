import type { Edge, Node } from '@xyflow/react'

import type { Project, UseCase, WorkflowTemplate } from './aethel-dashboard-model'

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'Assistente de pesquisa com IA',
    description: 'Fluxo multiagente para coletar, resumir e reportar descobertas',
    category: 'Pesquisa',
    difficulty: 'intermediate',
    steps: [
      'Definir escopo e fontes confiáveis',
      'Coletar e consolidar evidências',
      'Revisar inconsistências e riscos',
      'Publicar sumário executivo',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '2',
    name: 'Pipeline de dados',
    description: 'Processamento e visualizacao de dados ponta a ponta',
    category: 'Ciencia de Dados',
    difficulty: 'advanced',
    steps: [
      'Ingestão e validação de dados',
      'Transformação e enriquecimento',
      'Geração de métricas e dashboards',
      'Automação de alertas de qualidade',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '3',
    name: 'Suite de criacao de conteudo',
    description: 'Geracao e edicao de conteudo em multiplas etapas',
    category: 'Criativo',
    difficulty: 'beginner',
    steps: [
      'Definir objetivo editorial',
      'Gerar variações com IA',
      'Refinar tom e consistência',
      'Exportar para publicação',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '4',
    name: 'Pesquisa e analise',
    description: 'Fluxo completo de pesquisa e analise',
    category: 'Pesquisa',
    difficulty: 'intermediate',
    steps: [
      'Mapear hipótese e critérios',
      'Executar coleta e triagem',
      'Consolidar benchmark',
      'Definir próximos passos',
    ],
    nodes: [],
    edges: [],
  },
]

export const DEFAULT_USE_CASES: UseCase[] = [
  {
    id: '1',
    name: 'Criar um dashboard em React',
    description: 'Fluxo completo para criar um dashboard moderno em React com assistencia de IA',
    category: 'Desenvolvimento',
    difficulty: 'beginner',
    features: ['Planejamento guiado', 'Código validado', 'Preview integrado', 'Checklist de QA'],
    sharedBy: 'Comunidade',
    views: 1250,
    likes: 89,
    tags: ['React', 'Painel', 'Front-end'],
    preview: 'https://example.com/preview1.png',
    title: 'Criar um dashboard em React',
  },
  {
    id: '2',
    name: 'Suite de visualizacao de dados',
    description: 'Pipeline de analise e visualizacao de dados ponta a ponta',
    category: 'Ciencia de Dados',
    difficulty: 'intermediate',
    features: ['Ingestão de dados', 'Modelagem', 'Visualização', 'Exportação'],
    sharedBy: 'EspecialistaDados',
    views: 890,
    likes: 67,
    tags: ['Python', 'Visualizacao', 'Analises'],
    preview: 'https://example.com/preview2.png',
    title: 'Suite de visualizacao de dados',
  },
  {
    id: '3',
    name: 'Estrategia de marketing de conteudo',
    description: 'Criacao de conteudo com IA e desenvolvimento de estrategia de marketing',
    category: 'Marketing',
    difficulty: 'advanced',
    features: ['Pesquisa de mercado', 'Calendário editorial', 'Produção em lote', 'Métricas de conversão'],
    sharedBy: 'MarketingPro',
    views: 2100,
    likes: 145,
    tags: ['Marketing', 'Conteudo', 'Estrategia'],
    preview: 'https://example.com/preview3.png',
    title: 'Estrategia de marketing de conteudo',
  },
]

export const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: 'Estudio de Conteudo IA', type: 'code', status: 'active' },
  { id: 2, name: 'Hub do Metaverso', type: 'unreal', status: 'active' },
  { id: 3, name: 'Funil de automacao', type: 'web', status: 'planning' },
]

export const INITIAL_NODES: Node[] = [
  {
    id: '1',
    position: { x: 80, y: 40 },
    data: { label: 'Sinal de entrada' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 320, y: 140 },
    data: { label: 'Orquestrador IA' },
  },
  {
    id: '3',
    position: { x: 560, y: 40 },
    data: { label: 'Saida' },
    type: 'output',
  },
]

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

export const HEALTH_KEY = 'health::status'
export const CONNECTIVITY_KEY = 'connectivity::status'
export const BILLING_PLANS_KEY = 'billing::plans'
export const WALLET_KEY = 'wallet::summary'
export const CURRENT_PLAN_KEY = 'billing::current-plan'
export const CREDITS_KEY = 'billing::credits'

const CHAT_THREAD_KEY_BASE = 'chat::activeThreadId'
const COPILOT_WORKFLOW_KEY_BASE = 'copilot::activeWorkflowId'

const STATUS_LABELS: Record<string, string> = {
  pending: 'pendente',
  processing: 'processando',
  paid: 'pago',
  succeeded: 'confirmado',
  success: 'confirmado',
  completed: 'concluido',
  failed: 'falhou',
  canceled: 'cancelado',
  cancelled: 'cancelado',
  awaiting_settlement: 'aguardando liquidacao',
  refunded: 'reembolsado',
  requires_action: 'requer acao',
  requires_payment_method: 'requer metodo de pagamento',
  requires_confirmation: 'requer confirmacao',
  requires_capture: 'requer captura',
}

const CONNECTIVITY_STATUS_LABELS: Record<string, string> = {
  healthy: 'saudavel',
  degraded: 'degradado',
  down: 'indisponivel',
  unavailable: 'indisponivel',
  unknown: 'desconhecido',
}

export function formatStatusLabel(rawStatus: unknown) {
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    return 'confirmado'
  }
  const normalized = rawStatus.toLowerCase()
  return STATUS_LABELS[normalized] ?? rawStatus
}

export function formatConnectivityStatus(rawStatus?: string | null) {
  if (!rawStatus) {
    return CONNECTIVITY_STATUS_LABELS.unknown
  }
  const normalized = rawStatus.toLowerCase()
  return CONNECTIVITY_STATUS_LABELS[normalized] ?? rawStatus
}

export function formatCurrencyLabel(currency?: string | null) {
  if (!currency) {
    return 'creditos'
  }
  if (currency.toLowerCase() === 'credits') {
    return 'creditos'
  }
  return currency
}

export function getScopedKeys(projectId: string | null) {
  const suffix = projectId ? `::${projectId}` : ''
  return {
    chatThreadKey: `${CHAT_THREAD_KEY_BASE}${suffix}`,
    workflowKey: `${COPILOT_WORKFLOW_KEY_BASE}${suffix}`,
    legacyChatThreadKey: CHAT_THREAD_KEY_BASE,
    legacyWorkflowKey: COPILOT_WORKFLOW_KEY_BASE,
  }
}
