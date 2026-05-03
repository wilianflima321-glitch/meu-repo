'use client'

import { ptBR } from '@/lib/locales/pt-BR'

/**
 * Gerenciador de extensões - Marketplace e gestão
 * Inspirado no painel de extensões do VS Code
 *
 * Features:
 * - Explorar marketplace
 * - Buscar extensões
 * - Instalar/Desinstalar
 * - Ativar/Desativar
 * - Detalhes da extensão
 * - Recomendações
 * - Categorias e filtros
 */

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  Search,
  Package,
  Download,
  Trash2,
  Check,
  X,
  Star,
  Eye,
  Settings,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  User,
  Code,
  Palette,
  Bug,
  Terminal,
  GitBranch,
  Cpu,
  Layers,
  Gamepad2,
  Wand2,
  FileCode,
  Brain,
  Zap,
  Globe,
  Shield,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react'
import { useExtensions, type Extension as HookExtension } from '@/lib/hooks/useExtensions'
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs'

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

type ExtensionCategory =
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

interface ExtensionManagerProps {
  extensions?: Extension[]
  onInstall?: (id: string) => Promise<void>
  onUninstall?: (id: string) => Promise<void>
  onAtivar?: (id: string) => void
  onDesativar?: (id: string) => void
  onOpenSettings?: (id: string) => void
}

// ============= Categoria Data =============

const CATEGORY_ICONS: Record<ExtensionCategory, React.ReactNode> = {
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

const CATEGORY_LABELS: Record<ExtensionCategory, string> = {
  language: 'Linguagens',
  theme: 'Temas',
  snippet: 'Trechos',
  debugger: 'Depuradores',
  formatter: 'Formatadores',
  linter: 'Linters',
  ai: 'IA & Copiloto',
  git: 'Controle de versão',
  engine: 'Engine de jogo',
  tool: 'Ferramentas',
  other: 'Outros',
}

// ============= Format Helpers =============


function formatDownloads(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000) return 'hoje'
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} dias atrás`
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)} semanas atrás`
  return `${Math.floor(diff / 2592000000)} meses atrás`
}

// ============= Main Component =============

export default function ExtensionManager({
  extensions: propExtensions,
  onInstall: propOnInstall,
  onUninstall: propOnUninstall,
  onAtivar: propOnEnable,
  onDesativar: propOnDisable,
  onOpenSettings,
}: ExtensionManagerProps) {
  const t = ptBR.extensions.manager;
  const tc = ptBR.common;

  // Use the hook to fetch real extensions from API
  const {
    extensions: apiExtensions,
    isLoading: apiLoading,
    error: apiError,
    search: apiSearch,
    refresh: apiRefresh,
    install: apiInstall,
    uninstall: apiUninstall,
    enable: apiEnable,
    disable: apiDisable,
  } = useExtensions({ autoLoad: !propExtensions })

  // Use prop extensions if provided, otherwise use API extensions
  const extensions = useMemo(() => {
    if (propExtensions && propExtensions.length > 0) return propExtensions
    return apiExtensions as Extension[]
  }, [propExtensions, apiExtensions])

  const [activeView, setActiveView] = useState<'installed' | 'marketplace' | 'recommended'>('installed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExtensionCategory | 'all'>('all')
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showDisabled, setShowDisabled] = useState(true)

  // Filter extensions
  const filteredExtensions = useMemo(() => {
    let filtered = extensions

    // Filter by view
    if (activeView === 'installed') {
      filtered = filtered.filter((ext) => ext.isInstalled)
      if (!showDisabled) {
        filtered = filtered.filter((ext) => ext.isEnabled)
      }
    } else if (activeView === 'marketplace') {
      filtered = filtered.filter((ext) => !ext.isInstalled)
    } else if (activeView === 'recommended') {
      filtered = filtered.filter((ext) => !ext.isInstalled && ext.rating >= 4.5)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((ext) => ext.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ext) =>
          ext.displayName.toLowerCase().includes(query) ||
          ext.description.toLowerCase().includes(query) ||
          ext.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [extensions, activeView, selectedCategory, searchQuery, showDisabled])

  // Group by category for installed view
  const groupedExtensions = useMemo(() => {
    if (activeView !== 'installed') return null

    const groups: Record<string, Extension[]> = {}
    filteredExtensions.forEach((ext) => {
      const key = ext.isEnabled ? 'enabled' : 'disabled'
      if (!groups[key]) groups[key] = []
      groups[key].push(ext)
    })
    return groups
  }, [filteredExtensions, activeView])

  // Handle install
  const handleInstall = useCallback(async (ext: Extension) => {
    setIsLoading(ext.id)
    try {
      // Use prop callback if provided, otherwise use API
      if (propOnInstall) {
        await propOnInstall(ext.id)
      } else {
        await apiInstall(ext.id)
      }
    } finally {
      setIsLoading(null)
    }
  }, [propOnInstall, apiInstall])

  // Handle uninstall
  const handleUninstall = useCallback(async (ext: Extension) => {
    const shouldDesinstalar = await openConfirmDialog({
      title: t.uninstallConfirm,
      message: t.uninstallMessage(ext.displayName),
      confirmText: tc.actions.delete,
      cancelText: tc.actions.cancel,
    })
    if (!shouldDesinstalar) return
    setIsLoading(ext.id)
    try {
      // Use prop callback if provided, otherwise use API
      if (propOnUninstall) {
        await propOnUninstall(ext.id)
      } else {
        await apiUninstall(ext.id)
      }
    } finally {
      setIsLoading(null)
    }
  }, [propOnUninstall, apiUninstall, t, tc])

  // Handle toggle
  const handleToggle = useCallback((ext: Extension) => {
    if (ext.isEnabled) {
      // Use prop callback if provided, otherwise use API
      if (propOnDisable) {
        propOnDisable(ext.id)
      } else {
        apiDisable(ext.id)
      }
    } else {
      // Use prop callback if provided, otherwise use API
      if (propOnEnable) {
        propOnEnable(ext.id)
      } else {
        apiEnable(ext.id)
      }
    }
  }, [propOnEnable, propOnDisable, apiEnable, apiDisable])

  // Handle search with API
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Debounced API search for marketplace
    if (activeView === 'marketplace' && query.length >= 2) {
      apiSearch(query)
    }
  }, [activeView, apiSearch])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    apiRefresh()
  }, [apiRefresh])

  // Count by status
  const counts = useMemo(() => ({
    installed: extensions.filter((e) => e.isInstalled).length,
    enabled: extensions.filter((e) => e.isInstalled && e.isEnabled).length,
    disabled: extensions.filter((e) => e.isInstalled && !e.isEnabled).length,
    available: extensions.filter((e) => !e.isInstalled).length,
  }), [extensions])

  return (
    <div className="h-full flex bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Sidebar */}
      <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]"
            />
          </div>
        </div>

        {/* Views */}
        <div className="p-2">
          <button type="button" aria-label="Open installed extensions view"
            onClick={() => setActiveView('installed')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'installed' ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="flex-1 text-sm">{t.installed}</span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{counts.installed}</span>
          </button>
          <button type="button" aria-label="Open marketplace extensions view"
            onClick={() => setActiveView('marketplace')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'marketplace' ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1 text-sm">{t.marketplace}</span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{counts.available}</span>
          </button>
          <button type="button" aria-label="Open recommended extensions view"
            onClick={() => setActiveView('recommended')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'recommended' ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
            }`}
          >
            <Star className="w-4 h-4" />
            <span className="flex-1 text-sm">{t.recommended}</span>
          </button>
        </div>

        {/* Categorias */}
        <div className="flex-1 overflow-y-auto p-2 border-t border-[var(--aethel-border-primary)]">
          <div className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2 px-3">Categorias</div>
          <button type="button" aria-label="Show all extension categories"
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-left ${
              selectedCategory === 'all' ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm">Todas</span>
          </button>
          {(Object.keys(CATEGORY_LABELS) as ExtensionCategory[]).map((cat) => (
            <button type="button" aria-label={`Filter extensions by ${CATEGORY_LABELS[cat]}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-left ${
                selectedCategory === cat ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {CATEGORY_ICONS[cat]}
              <span className="text-sm">{CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
          <h2 className="text-lg font-semibold">
            {activeView === 'installed' && `Extensões ${t.installed.toLowerCase()}`}
            {activeView === 'marketplace' && `${t.marketplace} de extensões`}
            {activeView === 'recommended' && `Extensões ${t.recommended.toLowerCase()}`}
          </h2>

          <div className="flex items-center gap-2">
            {activeView === 'installed' && (
              <button type="button" aria-label={showDisabled ? 'Hide disabled extensions' : 'Show disabled extensions'}
                onClick={() => setShowDisabled(!showDisabled)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  showDisabled ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]' : 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                }`}
              >
                {showDisabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                {showDisabled ? t.showDisabled : t.hideDisabled}
              </button>
            )}
            <button type="button" aria-label="Refresh extension list"
              onClick={handleRefresh}
              disabled={apiLoading}
              className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded disabled:opacity-50"
              title="Atualizar extensões"
            >
              <RefreshCw className={`w-4 h-4 ${apiLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" aria-label="Open extension filters" className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Extension List */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {apiLoading && extensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              <Loader2 className="w-16 h-16 mb-4 animate-spin text-[var(--aethel-info)]" />
              <p className="text-lg">Loading extensions...</p>
              <p className="text-sm">Buscando no marketplace</p>
            </div>
          ) : /* Error State */ apiError ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              <AlertTriangle className="w-16 h-16 mb-4 text-[var(--aethel-error)]" />
              <p className="text-lg text-[var(--aethel-error)]">Failed to load extensions</p>
              <p className="text-sm mb-4">{apiError}</p>
              <button type="button" aria-label="Retry loading extensions"
                onClick={handleRefresh}
                className="px-4 py-2 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] rounded transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : /* Empty State for Instaladas */ activeView === 'installed' && filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Nenhuma extensão instalada</p>
              <p className="text-sm mb-4">Explore o marketplace para encontrar extensões</p>
              <button type="button" aria-label="Open marketplace extensions"
                onClick={() => setActiveView('marketplace')}
                className="px-4 py-2 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] rounded transition-colors"
              >
                Explorar marketplace
              </button>
            </div>
          ) : /* Empty State for Search/Filter */ filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Nenhuma extensão encontrada</p>
              <p className="text-sm">Ajuste a busca ou revise os filtros</p>
            </div>
          ) : activeView === 'installed' && groupedExtensions ? (
            <>
              {/* Ativadas */}
              {groupedExtensions.enabled && groupedExtensions.enabled.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
                    Ativadas ({groupedExtensions.enabled.length})
                  </div>
                  {groupedExtensions.enabled.map((ext) => (
                    <ExtensionCard
                      key={ext.id}
                      extension={ext}
                      isLoading={isLoading === ext.id}
                      isSelected={selectedExtension?.id === ext.id}
                      onSelect={() => setSelectedExtension(ext)}
                      onInstall={() => handleInstall(ext)}
                      onUninstall={() => handleUninstall(ext)}
                      onToggle={() => handleToggle(ext)}
                      onOpenSettings={() => onOpenSettings?.(ext.id)}
                    />
                  ))}
                </div>
              )}

              {/* Desativadas */}
              {showDisabled && groupedExtensions.disabled && groupedExtensions.disabled.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
                    Desativadas ({groupedExtensions.disabled.length})
                  </div>
                  {groupedExtensions.disabled.map((ext) => (
                    <ExtensionCard
                      key={ext.id}
                      extension={ext}
                      isLoading={isLoading === ext.id}
                      isSelected={selectedExtension?.id === ext.id}
                      onSelect={() => setSelectedExtension(ext)}
                      onInstall={() => handleInstall(ext)}
                      onUninstall={() => handleUninstall(ext)}
                      onToggle={() => handleToggle(ext)}
                      onOpenSettings={() => onOpenSettings?.(ext.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            filteredExtensions.map((ext) => (
              <ExtensionCard
                key={ext.id}
                extension={ext}
                isLoading={isLoading === ext.id}
                isSelected={selectedExtension?.id === ext.id}
                onSelect={() => setSelectedExtension(ext)}
                onInstall={() => handleInstall(ext)}
                onUninstall={() => handleUninstall(ext)}
                onToggle={() => handleToggle(ext)}
                onOpenSettings={() => onOpenSettings?.(ext.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Painel de detalhes */}
      {selectedExtension && (
        <ExtensionDetalhes
          extension={selectedExtension}
          isLoading={isLoading === selectedExtension.id}
          onClose={() => setSelectedExtension(null)}
          onInstall={() => handleInstall(selectedExtension)}
          onUninstall={() => handleUninstall(selectedExtension)}
          onToggle={() => handleToggle(selectedExtension)}
          onOpenSettings={() => onOpenSettings?.(selectedExtension.id)}
        />
      )}
    </div>
  )
}

// ============= Extension Card =============

interface ExtensionCardProps {
  extension: Extension
  isLoading: boolean
  isSelected: boolean
  onSelect: () => void
  onInstall: () => void
  onUninstall: () => void
  onToggle: () => void
  onOpenSettings: () => void
}

function ExtensionCard({
  extension,
  isLoading,
  isSelected,
  onSelect,
  onInstall,
  onUninstall,
  onToggle,
  onOpenSettings,
}: ExtensionCardProps) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--aethel-border-primary)] cursor-pointer transition-colors ${
        isSelected ? 'bg-[var(--aethel-surface-secondary)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
      } ${!extension.isEnabled && extension.isInstalled ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-[var(--aethel-surface-quaternary)] flex items-center justify-center flex-shrink-0">
        {extension.icon ? (
          <Image
            src={extension.icon}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="w-8 h-8 rounded"
          />
        ) : (
          CATEGORY_ICONS[extension.category]
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--aethel-text-primary)] truncate">{extension.displayName}</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">v{extension.version}</span>
          {extension.isBuiltIn && (
            <span className="px-1.5 py-0.5 bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] text-[10px] rounded">
              Integrada
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--aethel-text-tertiary)] truncate mt-0.5">{extension.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--aethel-text-tertiary)]">
          <span>{extension.publisherDisplayName}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[var(--aethel-warning-light)]" />
            {extension.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatDownloads(extension.downloadCount)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--aethel-text-tertiary)]" />
        ) : extension.isInstalled ? (
          <>
            <button type="button" aria-label={extension.isEnabled ? `Disable extension ${extension.name}` : `Enable extension ${extension.name}`}
              onClick={onToggle}
              className={`p-1.5 rounded transition-colors ${
                extension.isEnabled
                  ? 'text-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)]'
              }`}
              title={extension.isEnabled ? 'Desativar' : 'Ativar'}
            >
              {extension.isEnabled ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <button type="button" aria-label={`Open settings for extension ${extension.name}`}
              onClick={onOpenSettings}
              className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
            {!extension.isBuiltIn && (
              <button type="button" aria-label={`Uninstall extension ${extension.name}`}
                onClick={onUninstall}
                className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
                title="Desinstalar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button type="button" aria-label={`Install extension ${extension.name}`}
            onClick={onInstall}
            className="px-3 py-1.5 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] text-sm rounded transition-colors"
          >Instalar</button>
        )}
      </div>
    </div>
  )
}

// ============= Extension Detalhes =============

interface ExtensionDetalhesProps {
  extension: Extension
  isLoading: boolean
  onClose: () => void
  onInstall: () => void
  onUninstall: () => void
  onToggle: () => void
  onOpenSettings: () => void
}

function ExtensionDetalhes({
  extension,
  isLoading,
  onClose,
  onInstall,
  onUninstall,
  onToggle,
  onOpenSettings,
}: ExtensionDetalhesProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details')

  return (
    <div className="w-96 border-l border-[var(--aethel-border-primary)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-[var(--aethel-surface-quaternary)] flex items-center justify-center">
            {extension.icon ? (
              <Image
                src={extension.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded"
              />
            ) : (
              <div className="text-[var(--aethel-text-tertiary)]">{CATEGORY_ICONS[extension.category]}</div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{extension.displayName}</h3>
            <p className="text-sm text-[var(--aethel-text-tertiary)]">{extension.publisherDisplayName}</p>
          </div>
          <button type="button" aria-label="Close extension details" onClick={onClose} className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="flex items-center gap-1 text-[var(--aethel-warning-light)]">
            <Star className="w-4 h-4" />
            {extension.rating.toFixed(1)} ({extension.ratingCount.toLocaleString()})
          </span>
          <span className="flex items-center gap-1 text-[var(--aethel-text-tertiary)]">
            <Download className="w-4 h-4" />
            {formatDownloads(extension.downloadCount)}
          </span>
          <span className="flex items-center gap-1 text-[var(--aethel-text-tertiary)]">
            <Clock className="w-4 h-4" />
            {formatDate(extension.lastUpdated)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {isLoading ? (
            <button type="button" aria-label="Loading extension action" disabled className="flex-1 px-4 py-2 bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] rounded">
              <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
              Loading...
            </button>
          ) : extension.isInstalled ? (
            <>
              <button type="button" aria-label={extension.isEnabled ? `Disable extension ${extension.name}` : `Enable extension ${extension.name}`}
                onClick={onToggle}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  extension.isEnabled
                    ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
                    : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                }`}
              >
                {extension.isEnabled ? 'Desativar' : 'Ativar'}
              </button>
              {!extension.isBuiltIn && (
                <button type="button" aria-label={`Uninstall extension ${extension.name}`}
                  onClick={onUninstall}
                  className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded"
                >
                  Desinstalar
                </button>
              )}
            </>
          ) : (
            <button type="button" aria-label={`Install extension ${extension.name}`}
              onClick={onInstall}
              className="flex-1 px-4 py-2 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] rounded"
            >
              <Download className="w-4 h-4 inline mr-2" />Instalar</button>
          )}
          <button type="button" aria-label={`Open settings for extension ${extension.name}`}
            onClick={onOpenSettings}
            className="p-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        <button type="button" aria-label="Open extension details tab"
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'details' ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'
          }`}
        >
          Detalhes
        </button>
        <button type="button" aria-label="Open extension changelog tab"
          onClick={() => setActiveTab('changelog')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'changelog' ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--aethel-text-secondary)]">{extension.description}</p>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Versão</h4>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{extension.version}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Categoria</h4>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{CATEGORY_LABELS[extension.category]}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {extension.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)] text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {extension.repository && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Repositório</h4>
                <a
                  href={extension.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--aethel-info-light)] hover:text-[var(--aethel-info)]"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver no GitHub
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'changelog' && (
          <div className="text-sm text-[var(--aethel-text-tertiary)]">
            {extension.changelog || 'Nenhum changelog disponível.'}
          </div>
        )}
      </div>
    </div>
  )
}

