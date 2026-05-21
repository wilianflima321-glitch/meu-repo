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
  { value: 'evidence', label: 'Evidence first' },
  { value: 'risk', label: 'Lowest risk' },
  { value: 'name', label: 'Name (A-Z)' },
] as const

export type MarketplaceSort = (typeof MARKETPLACE_SORT_OPTIONS)[number]['value']

export const CURATED_EXTENSIONS: Extension[] = [
  {
    id: 'aethel-agent-replay',
    name: 'agent-replay',
    displayName: 'Agent Replay Pack',
    description: 'Replay browser-operator and agent steps with approvals, evidence, and handoff notes.',
    version: '0.4.0',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Internal preview',
    categories: ['ai-tools', 'productivity'],
    tags: ['agents', 'replay', 'evidence'],
    license: 'aethel-creator-license-v1',
    installed: false,
    verified: true,
    riskLevel: 'low',
    permissions: ['Read agent runs', 'Write replay evidence'],
    provenance: 'Aethel reviewed package with signed manifest',
    rollbackPlan: 'Disable replay capture and remove generated evidence refs from the project ledger.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-render-readiness',
    name: 'render-readiness',
    displayName: 'Render Readiness Kit',
    description: 'Validate viewport renders, artifact ownership, performance reports, and final-output blockers.',
    version: '0.3.2',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Internal preview',
    categories: ['ai-tools', 'debuggers'],
    tags: ['render', 'viewport', 'validation'],
    license: 'MIT',
    installed: false,
    verified: true,
    riskLevel: 'medium',
    permissions: ['Read render jobs', 'Write validation report'],
    provenance: 'Source policy checked, MIT license verified',
    rollbackPlan: 'Remove generated readiness reports; render job history remains read-only.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-design-density',
    name: 'design-density',
    displayName: 'Design Density Inspector',
    description: 'Scan surfaces for oversized media, raw links, weak hierarchy, and crowded copy blocks.',
    version: '0.2.1',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Internal preview',
    categories: ['productivity', 'themes'],
    tags: ['ux', 'audit', 'design-system'],
    license: 'MIT',
    installed: false,
    verified: true,
    riskLevel: 'low',
    permissions: ['Read UI files', 'Write audit report'],
    provenance: 'Aethel internal package, checksum tracked',
    rollbackPlan: 'Delete density reports and keep source UI files unchanged.',
    reviewStatus: 'verified',
  },
  {
    id: 'aethel-marketplace-trust',
    name: 'marketplace-trust',
    displayName: 'Marketplace Trust Ledger',
    description: 'Attach provenance, license evidence, and content-origin checks to marketplace assets.',
    version: '0.5.0',
    publisher: 'Aethel Labs',
    evidenceLabel: 'Internal preview',
    categories: ['productivity', 'ai-tools'],
    tags: ['license', 'provenance', 'trust'],
    license: 'Apache-2.0',
    installed: false,
    verified: true,
    riskLevel: 'medium',
    permissions: ['Read marketplace assets', 'Write provenance ledger'],
    provenance: 'Apache-2.0 license and source trail verified',
    rollbackPlan: 'Archive created provenance entries and preserve existing asset metadata.',
    reviewStatus: 'verified',
  },
  {
    id: 'community-prompt-kit',
    name: 'community-prompt-kit',
    displayName: 'Community Prompt Kit',
    description: 'Community-maintained prompt snippets for quick workspace experiments. Review before production use.',
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
    rollbackPlan: 'Remove imported snippets; no workspace files are changed automatically.',
    reviewStatus: 'community-review',
  },
]
