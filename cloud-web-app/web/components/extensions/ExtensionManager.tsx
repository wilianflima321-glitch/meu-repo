'use client'

/**
 * Extension Manager - Marketplace & Extension Management
 * Like VS Code Extensions Panel
 * 
 * Features:
 * - Browse marketplace
 * - Search extensions
 * - Install/Uninstall
 * - Enable/Disable
 * - Extension details
 * - Recommendations
 * - Categories & Filters
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
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
  onEnable?: (id: string) => void
  onDisable?: (id: string) => void
  onOpenSettings?: (id: string) => void
}

// ============= Category Data =============

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
  language: 'Programming Languages',
  theme: 'Themes',
  snippet: 'Snippets',
  debugger: 'Debuggers',
  formatter: 'Formatters',
  linter: 'Linters',
  ai: 'AI & Copilot',
  git: 'Source Control',
  engine: 'Game Engine',
  tool: 'Tools',
  other: 'Other',
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
  
  if (diff < 86400000) return 'today'
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)} weeks ago`
  return `${Math.floor(diff / 2592000000)} months ago`
}

// ============= Main Component =============

export default function ExtensionManager({
  extensions: propExtensions,
  onInstall: propOnInstall,
  onUninstall: propOnUninstall,
  onEnable: propOnEnable,
  onDisable: propOnDisable,
  onOpenSettings,
}: ExtensionManagerProps) {
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
    // TODO: Replace with ConfirmModal for better UX
    if (!window.confirm(`Uninstall "${ext.displayName}"?`)) return
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
  }, [propOnUninstall, apiUninstall])
  
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
    <div className="h-full flex bg-slate-900 text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-700 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search extensions..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Views */}
        <div className="p-2">
          <button
            onClick={() => setActiveView('installed')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'installed' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="flex-1 text-sm">Installed</span>
            <span className="text-xs text-slate-500">{counts.installed}</span>
          </button>
          <button
            onClick={() => setActiveView('marketplace')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'marketplace' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1 text-sm">Marketplace</span>
            <span className="text-xs text-slate-500">{counts.available}</span>
          </button>
          <button
            onClick={() => setActiveView('recommended')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              activeView === 'recommended' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Star className="w-4 h-4" />
            <span className="flex-1 text-sm">Recommended</span>
          </button>
        </div>
        
        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-2 border-t border-slate-700">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-3">Categories</div>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-left ${
              selectedCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm">All</span>
          </button>
          {(Object.keys(CATEGORY_LABELS) as ExtensionCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded text-left ${
                selectedCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold">
            {activeView === 'installed' && 'Installed Extensions'}
            {activeView === 'marketplace' && 'Extension Marketplace'}
            {activeView === 'recommended' && 'Recommended Extensions'}
          </h2>
          
          <div className="flex items-center gap-2">
            {activeView === 'installed' && (
              <button
                onClick={() => setShowDisabled(!showDisabled)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  showDisabled ? 'bg-slate-800 text-slate-300' : 'bg-indigo-600 text-white'
                }`}
              >
                {showDisabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                {showDisabled ? 'Show Disabled' : 'Hide Disabled'}
              </button>
            )}
            <button 
              onClick={handleRefresh}
              disabled={apiLoading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-50"
              title="Refresh extensions"
            >
              <RefreshCw className={`w-4 h-4 ${apiLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Extension List */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {apiLoading && extensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Loader2 className="w-16 h-16 mb-4 animate-spin text-indigo-500" />
              <p className="text-lg">Loading extensions...</p>
              <p className="text-sm">Fetching from marketplace</p>
            </div>
          ) : /* Error State */ apiError ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <AlertTriangle className="w-16 h-16 mb-4 text-red-400" />
              <p className="text-lg text-red-400">Failed to load extensions</p>
              <p className="text-sm mb-4">{apiError}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : /* Empty State for Installed */ activeView === 'installed' && filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No extensions installed</p>
              <p className="text-sm mb-4">Browse the marketplace to find extensions</p>
              <button
                onClick={() => setActiveView('marketplace')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : /* Empty State for Search/Filter */ filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No extensions found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : activeView === 'installed' && groupedExtensions ? (
            <>
              {/* Enabled */}
              {groupedExtensions.enabled && groupedExtensions.enabled.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-800/50">
                    Enabled ({groupedExtensions.enabled.length})
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
              
              {/* Disabled */}
              {showDisabled && groupedExtensions.disabled && groupedExtensions.disabled.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-800/50">
                    Disabled ({groupedExtensions.disabled.length})
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
      
      {/* Details Panel */}
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
      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800 cursor-pointer transition-colors ${
        isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
      } ${!extension.isEnabled && extension.isInstalled ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
        {extension.icon ? (
          <img src={extension.icon} alt="" className="w-8 h-8 rounded" />
        ) : (
          CATEGORY_ICONS[extension.category]
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{extension.displayName}</span>
          <span className="text-xs text-slate-500">v{extension.version}</span>
          {extension.isBuiltIn && (
            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded">
              Built-in
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 truncate mt-0.5">{extension.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span>{extension.publisherDisplayName}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400" />
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
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
        ) : extension.isInstalled ? (
          <>
            <button
              onClick={onToggle}
              className={`p-1.5 rounded transition-colors ${
                extension.isEnabled
                  ? 'text-green-400 hover:bg-green-400/10'
                  : 'text-slate-500 hover:bg-slate-700'
              }`}
              title={extension.isEnabled ? 'Disable' : 'Enable'}
            >
              {extension.isEnabled ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {!extension.isBuiltIn && (
              <button
                onClick={onUninstall}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                title="Uninstall"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onInstall}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          >
            Install
          </button>
        )}
      </div>
    </div>
  )
}

// ============= Extension Details =============

interface ExtensionDetailsProps {
  extension: Extension
  isLoading: boolean
  onClose: () => void
  onInstall: () => void
  onUninstall: () => void
  onToggle: () => void
  onOpenSettings: () => void
}

function ExtensionDetails({
  extension,
  isLoading,
  onClose,
  onInstall,
  onUninstall,
  onToggle,
  onOpenSettings,
}: ExtensionDetailsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details')
  
  return (
    <div className="w-96 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
            {extension.icon ? (
              <img src={extension.icon} alt="" className="w-12 h-12 rounded" />
            ) : (
              <div className="text-slate-400">{CATEGORY_ICONS[extension.category]}</div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{extension.displayName}</h3>
            <p className="text-sm text-slate-400">{extension.publisherDisplayName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="flex items-center gap-1 text-amber-400">
            <Star className="w-4 h-4" />
            {extension.rating.toFixed(1)} ({extension.ratingCount.toLocaleString()})
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Download className="w-4 h-4" />
            {formatDownloads(extension.downloadCount)}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-4 h-4" />
            {formatDate(extension.lastUpdated)}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {isLoading ? (
            <button disabled className="flex-1 px-4 py-2 bg-slate-700 text-slate-400 rounded">
              <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
              Loading...
            </button>
          ) : extension.isInstalled ? (
            <>
              <button
                onClick={onToggle}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  extension.isEnabled
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {extension.isEnabled ? 'Disable' : 'Enable'}
              </button>
              {!extension.isBuiltIn && (
                <button
                  onClick={onUninstall}
                  className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded"
                >
                  Uninstall
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onInstall}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Install
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'details' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('changelog')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'changelog' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400'
          }`}
        >
          Changelog
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{extension.description}</p>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Version</h4>
              <p className="text-sm text-slate-300">{extension.version}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Category</h4>
              <p className="text-sm text-slate-300">{CATEGORY_LABELS[extension.category]}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {extension.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {extension.repository && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Repository</h4>
                <a
                  href={extension.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'changelog' && (
          <div className="text-sm text-slate-400">
            {extension.changelog || 'No changelog available.'}
          </div>
        )}
      </div>
    </div>
  )
}
