import type { Project, UseCase, WorkflowTemplate } from './aethel-dashboard-model'

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'AI research assistant',
    description: 'Multi-agent flow to collect, summarize, and report findings',
    category: 'Research',
    difficulty: 'intermediate',
    steps: [
      'Define scope and trusted sources',
      'Collect and consolidate evidence',
      'Review inconsistencies and risks',
      'Publish executive summary',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '2',
    name: 'Data pipeline',
    description: 'End-to-end data processing and visualization',
    category: 'Data science',
    difficulty: 'advanced',
    steps: [
      'Data ingestion and validation',
      'Transformation and enrichment',
      'Metric and dashboard generation',
      'Quality alert automation',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '3',
    name: 'Content creation suite',
    description: 'Multi-step content generation and editing',
    category: 'Creative',
    difficulty: 'beginner',
    steps: [
      'Define editorial goal',
      'Generate AI variations',
      'Refine tone and consistency',
      'Export for publication',
    ],
    nodes: [],
    edges: [],
  },
  {
    id: '4',
    name: 'Research e analysis',
    description: 'Complete research and analysis flow',
    category: 'Research',
    difficulty: 'intermediate',
    steps: [
      'Map hypothesis and criteria',
      'Run collection and triage',
      'Consolidate benchmark',
      'Define next steps',
    ],
    nodes: [],
    edges: [],
  },
]

export const DEFAULT_USE_CASES: UseCase[] = [
  {
    id: '1',
    name: 'Create a React dashboard',
    description: 'Complete flow to create a modern React dashboard with AI assistance',
    category: 'Development',
    difficulty: 'beginner',
    features: ['Guided planning', 'Validated code', 'Integrated preview', 'QA checklist'],
    sharedBy: 'Community',
    views: 1250,
    likes: 89,
    tags: ['React', 'Dashboard', 'Front-end'],
    preview: 'https://example.com/preview1.png',
    title: 'Create a React dashboard',
  },
  {
    id: '2',
    name: 'Data visualization suite',
    description: 'End-to-end analysis and data visualization pipeline',
    category: 'Data science',
    difficulty: 'intermediate',
    features: ['Data ingestion', 'Modeling', 'Visualization', 'Export'],
    sharedBy: 'EspecialistaDados',
    views: 890,
    likes: 67,
    tags: ['Python', 'Visualization', 'Analytics'],
    preview: 'https://example.com/preview2.png',
    title: 'Data visualization suite',
  },
  {
    id: '3',
    name: 'Content marketing strategy',
    description: 'AI content creation and marketing strategy development',
    category: 'Marketing',
    difficulty: 'advanced',
    features: ['Market research', 'Editorial calendar', 'Batch production', 'Conversion metrics'],
    sharedBy: 'MarketingPro',
    views: 2100,
    likes: 145,
    tags: ['Marketing', 'Content', 'Strategy'],
    preview: 'https://example.com/preview3.png',
    title: 'Content marketing strategy',
  },
]

export const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: 'Estudio de Content IA', type: 'code', status: 'active' },
  { id: 2, name: 'Metaverse Hub', type: 'unreal', status: 'active' },
  { id: 3, name: 'Automation funnel', type: 'web', status: 'planning' },
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
  pending: 'pending',
  processing: 'processing',
  paid: 'paid',
  succeeded: 'confirmed',
  success: 'confirmed',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
  cancelled: 'canceled',
  awaiting_settlement: 'awaiting settlement',
  refunded: 'refunded',
  requires_action: 'requires action',
  requires_payment_method: 'requires payment method',
  requires_confirmation: 'requires confirmation',
  requires_capture: 'requires capture',
}

const CONNECTIVITY_STATUS_LABELS: Record<string, string> = {
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'unavailable',
  unavailable: 'unavailable',
  unknown: 'unknown',
}

export function formatStatusLabel(rawStatus: unknown) {
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    return 'confirmed'
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
    return 'credits'
  }
  if (currency.toLowerCase() === 'credits') {
    return 'credits'
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



