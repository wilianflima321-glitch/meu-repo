export type ExtensionRiskLevel = 'low' | 'medium' | 'high'

export interface Extension {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  publisher: string
  icon?: string
  evidenceLabel: string
  categories: string[]
  tags: string[]
  repository?: string
  license?: string
  installed: boolean
  verified?: boolean
  riskLevel?: ExtensionRiskLevel
  permissions?: string[]
  provenance?: string
  rollbackPlan?: string
  reviewStatus?: 'verified' | 'community-review' | 'blocked'
  /** Price in cents for DB-backed paid listings; 0 / undefined = free install path */
  priceCents?: number
  /** True when listing requires Stripe Checkout before install */
  requiresPurchase?: boolean
}

export const MARKETPLACE_CATEGORIES = [
  'all',
  'languages',
  'themes',
  'debuggers',
  'formatters',
  'linters',
  'snippets',
  'keymaps',
  'ai-tools',
  'productivity',
] as const

export const MARKETPLACE_CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  languages: 'Languages',
  themes: 'Themes',
  debuggers: 'Debuggers',
  formatters: 'Formatters',
  linters: 'Linters',
  snippets: 'Snippets',
  keymaps: 'Keymaps',
  'ai-tools': 'AI tools',
  productivity: 'Productivity',
}

export const MARKETPLACE_SORT_OPTIONS = [
  { value: 'evidence', label: 'Reviewed first' },
  { value: 'risk', label: 'Lowest risk' },
  { value: 'name', label: 'Name (A-Z)' },
] as const

export type MarketplaceSort = (typeof MARKETPLACE_SORT_OPTIONS)[number]['value']

export const CURATED_EXTENSIONS: Extension[] = [
  {
    id: 'aethel-agent-replay',
    name: 'agent-replay',
    displayName: 'Agent Replay Pack',
    description:
      'Replay approved agent steps with receipts and review notes.',
    version: '0.4.0',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Aethel-reviewed',
    categories: ['ai-tools', 'productivity'],
    tags: ['agents', 'replay', 'receipts'],
    license: 'aethel-creator-license-v1',
    installed: false,
    verified: true,
    riskLevel: 'low',
    permissions: ['Read agent runs', 'Write review notes'],
    provenance: 'Aethel reviewed package with signed manifest',
    rollbackPlan:
      'Disable replay capture and remove generated review references.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-render-quality',
    name: 'render-quality',
    displayName: 'Render Quality Kit',
    description: 'Check quality, ownership, performance, and blockers.',
    version: '0.3.2',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Aethel-reviewed',
    categories: ['ai-tools', 'debuggers'],
    tags: ['render', 'viewport', 'validation'],
    license: 'MIT',
    installed: false,
    verified: true,
    riskLevel: 'medium',
    permissions: ['Read render jobs', 'Write validation report'],
    provenance: 'Source policy checked, MIT license verified',
    rollbackPlan:
      'Remove generated quality reports; render job history remains read-only.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-design-density',
    name: 'design-density',
    displayName: 'Design Density Inspector',
    description: 'Find crowded UI, weak hierarchy, and heavy media.',
    version: '0.2.1',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Aethel-reviewed',
    categories: ['productivity', 'themes'],
    tags: ['ux', 'audit', 'design-system'],
    license: 'MIT',
    installed: false,
    verified: true,
    riskLevel: 'low',
    permissions: ['Read UI files', 'Write audit report'],
    provenance: 'Aethel-reviewed package with tracked checksum',
    rollbackPlan: 'Delete density reports and keep source UI files unchanged.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-marketplace-trust',
    name: 'marketplace-trust',
    displayName: 'Marketplace Trust Ledger',
    description: 'Track source, license, and origin checks.',
    version: '0.5.0',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Aethel-reviewed',
    categories: ['productivity', 'ai-tools'],
    tags: ['license', 'provenance', 'trust'],
    license: 'Apache-2.0',
    installed: false,
    verified: true,
    riskLevel: 'medium',
    permissions: ['Read marketplace assets', 'Write provenance records'],
    provenance: 'Apache-2.0 license and source trail verified',
    rollbackPlan:
      'Archive created provenance entries and preserve existing asset metadata.',
    reviewStatus: 'verified',
  },
  {
    id: 'community-prompt-kit',
    name: 'community-prompt-kit',
    displayName: 'Community Prompt Kit',
    description: 'Community prompt snippets. Review before use.',
    version: '0.1.0',
    publisher: 'Community',
    evidenceLabel: 'Community preview',
    categories: ['snippets', 'productivity'],
    tags: ['prompts', 'snippets', 'community'],
    license: 'CC-BY-4.0',
    installed: false,
    verified: false,
    riskLevel: 'medium',
    permissions: ['Read prompts', 'Suggest snippets'],
    provenance: 'Community package awaiting full provenance review',
    rollbackPlan:
      'Remove imported snippets; no workspace files are changed automatically.',
    reviewStatus: 'community-review',
  },
]
