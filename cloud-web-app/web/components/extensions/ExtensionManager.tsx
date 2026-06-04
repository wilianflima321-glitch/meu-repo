'use client'

/**
 * Extension manager - Marketplace and governance
 * Inspired by the VS Code extensions panel.
 *
 * Features:
 * - Explore marketplace
 * - Search extensions
 * - Install/uninstall
 * - Enable/disable
 * - Extension details
 * - Recommendations
 * - Categories and filters
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Search,
  Package,
  Star,
  Filter,
  RefreshCw,
  AlertTriangle,
  Layers,
  Globe,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react'
import { useExtensions } from '@/lib/hooks/useExtensions'
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  EXTENSION_MANAGER_COPY,
  type Extension,
  type ExtensionCategory,
  type ExtensionManagerProps,
} from './ExtensionManager.model'
import { ExtensionCard, ExtensionDetails } from './ExtensionManager.parts'
export type { Extension, ExtensionCategory } from './ExtensionManager.model'

// ============= Main Component =============

export default function ExtensionManager({
  extensions: propExtensions,
  onInstall: propOnInstall,
  onUninstall: propOnUninstall,
  onEnable: propOnEnable,
  onDisable: propOnDisable,
  onOpenSettings,
}: ExtensionManagerProps) {
  const t = EXTENSION_MANAGER_COPY
  const tc = EXTENSION_MANAGER_COPY

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
    const shouldUninstall = await openConfirmDialog({
      title: t.uninstallConfirm,
      message: t.uninstallMessage(ext.displayName),
      confirmText: tc.actions.delete,
      cancelText: tc.actions.cancel,
    })
    if (!shouldUninstall) return
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

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-2 border-t border-[var(--aethel-border-primary)]">
          <div className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2 px-3">Categories</div>
          <button type="button" aria-label="Show all extension categories"
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-left ${
              selectedCategory === 'all' ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm">All</span>
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
            {activeView === 'installed' && `Extensions ${t.installed.toLowerCase()}`}
            {activeView === 'marketplace' && `Extension ${t.marketplace.toLowerCase()}`}
            {activeView === 'recommended' && `Extensions ${t.recommended.toLowerCase()}`}
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
              title="Refresh extensions"
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
              <p className="text-sm">Searching marketplace</p>
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
          ) : /* Empty State for installed extensions */ activeView === 'installed' && filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No extension installed</p>
              <p className="text-sm mb-4">Explore the marketplace to find extensions</p>
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
              <p className="text-lg">No extension found</p>
              <p className="text-sm">Adjust the search or review filters</p>
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

              {/* Desactivedas */}
              {showDisabled && groupedExtensions.disabled && groupedExtensions.disabled.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
                    Desactivedas ({groupedExtensions.disabled.length})
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

      {/* Details panel */}
      {selectedExtension && (
        <ExtensionDetails
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
