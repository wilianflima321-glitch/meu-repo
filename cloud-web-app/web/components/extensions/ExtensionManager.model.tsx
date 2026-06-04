import type { ReactNode } from 'react'
import {
  Package,
  Settings,
  Code,
  Palette,
  Bug,
  Terminal,
  GitBranch,
  Gamepad2,
  Wand2,
  FileCode,
  Brain,
  Shield,
} from 'lucide-react'

export const EXTENSION_MANAGER_COPY = {
  searchPlaceholder: 'Search extensions',
  installed: 'Installed',
  marketplace: 'Marketplace',
  recommended: 'Recommended',
  showDisabled: 'Show disabled',
  hideDisabled: 'Hide disabled',
  uninstallConfirm: 'Uninstall extension?',
  uninstallMessage: (name: string) => `Uninstall ${name}? This keeps workspace files intact.`,
  actions: {
    cancel: 'Cancel',
    delete: 'Delete',
  },
} as const

// ============= Types =============

export interface Extension {
  id: string
  name: string
  displayName: string
  publisher: string
  publisherDisplayName: string
  version: string
  description: string
  icon?: string
  category: ExtensionCategory
  tags: string[]
  rating: number
  ratingCount: number
  downloadCount: number
  isInstalled: boolean
  isEnabled: boolean
  isBuiltIn?: boolean
  lastUpdated: Date
  dependencies?: string[]
  readme?: string
  changelog?: string
  repository?: string
  license?: string
}

export type ExtensionCategory =
  | 'language'
  | 'theme'
  | 'snippet'
  | 'debugger'
  | 'formatter'
  | 'linter'
  | 'ai'
  | 'git'
  | 'engine'
  | 'tool'
  | 'other'

export interface ExtensionManagerProps {
  extensions?: Extension[]
  onInstall?: (id: string) => Promise<void>
  onUninstall?: (id: string) => Promise<void>
  onEnable?: (id: string) => void
  onDisable?: (id: string) => void
  onOpenSettings?: (id: string) => void
}

// ============= Category Data =============

export const CATEGORY_ICONS: Record<ExtensionCategory, ReactNode> = {
  language: <FileCode className="w-4 h-4" />,
  theme: <Palette className="w-4 h-4" />,
  snippet: <Code className="w-4 h-4" />,
  debugger: <Bug className="w-4 h-4" />,
  formatter: <Wand2 className="w-4 h-4" />,
  linter: <Shield className="w-4 h-4" />,
  ai: <Brain className="w-4 h-4" />,
  git: <GitBranch className="w-4 h-4" />,
  engine: <Gamepad2 className="w-4 h-4" />,
  tool: <Settings className="w-4 h-4" />,
  other: <Package className="w-4 h-4" />,
}

export const CATEGORY_LABELS: Record<ExtensionCategory, string> = {
  language: 'Languages',
  theme: 'Themes',
  snippet: 'Snippets',
  debugger: 'Debuggers',
  formatter: 'Formatters',
  linter: 'Linters',
  ai: 'AI & Copilot',
  git: 'Version control',
  engine: 'Game engine',
  tool: 'Tools',
  other: 'Other',
}

// ============= Format Helpers =============


export function formatDownloads(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000) return 'today'
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)} weeks ago`
  return `${Math.floor(diff / 2592000000)} months ago`
}
