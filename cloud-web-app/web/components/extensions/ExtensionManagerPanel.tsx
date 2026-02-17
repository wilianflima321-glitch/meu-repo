'use client';

/**
 * Extension Manager Panel
 * 
 * Interface para gerenciar extensões - instalar, desinstalar,
 * ativar/desativar, e explorar marketplace.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  ExternalLink,
  Settings,
  Play,
  Square,
  AlertTriangle,
  Filter,
  SortAsc,
  Grid,
  List,
  Verified,
  Eye,
} from 'lucide-react';
import {
  extensionHost,
  extensionMarketplace,
  LoadedExtension,
  MarketplaceExtension,
  ExtensionCategory,
} from '@/lib/extensions/extension-system';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'installed' | 'marketplace' | 'updates';
type SortBy = 'name' | 'rating' | 'downloads' | 'updated';
type DisplayMode = 'grid' | 'list';

interface ExtensionPanelProps {
  onExtensionSelect?: (extensionId: string) => void;
  onExtensionInstall?: (extensionId: string) => void;
  onExtensionUninstall?: (extensionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExtensionManagerPanel({
  onExtensionSelect,
  onExtensionInstall,
  onExtensionUninstall,
}: ExtensionPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('installed');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  
  const [installedExtensions, setInstalledExtensions] = useState<LoadedExtension[]>([]);
  const [marketplaceExtensions, setMarketplaceExtensions] = useState<MarketplaceExtension[]>([]);
  const [updates, setUpdates] = useState<{ id: string; currentVersion: string; latestVersion: string }[]>([]);
  
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  
  // Categories
  const categories: ExtensionCategory[] = [
    'Programming Languages',
    'Themes',
    'Snippets',
    'Linters',
    'Formatters',
    'Debuggers',
    'AI',
    'Testing',
    'Data Science',
    'Other',
  ];
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  useEffect(() => {
    // Load installed extensions
    setInstalledExtensions(extensionHost.getAllExtensions());
    
    // Subscribe to changes
    const handleLoaded = () => setInstalledExtensions(extensionHost.getAllExtensions());
    const handleUnloaded = () => setInstalledExtensions(extensionHost.getAllExtensions());
    
    extensionHost.on('extensionLoaded', handleLoaded);
    extensionHost.on('extensionUnloaded', handleUnloaded);
    
    return () => {
      extensionHost.off('extensionLoaded', handleLoaded);
      extensionHost.off('extensionUnloaded', handleUnloaded);
    };
  }, []);
  
  const searchMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const result = await extensionMarketplace.search(searchQuery, {
        category: selectedCategory || undefined,
        sortBy: sortBy === 'name' ? 'relevance' : sortBy,
      });
      setMarketplaceExtensions(result.extensions);
    } catch (error) {
      console.error('Marketplace search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy]);
  
  const checkUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const outdated = await extensionMarketplace.getOutdated();
      setUpdates(outdated);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'marketplace') {
      searchMarketplace();
    } else if (viewMode === 'updates') {
      checkUpdates();
    }
  }, [checkUpdates, searchMarketplace, viewMode, searchQuery, selectedCategory]);
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const handleInstall = useCallback(async (id: string, version?: string) => {
    setInstalling(prev => new Set(prev).add(id));
    try {
      await extensionMarketplace.installExtension(id, version);
      onExtensionInstall?.(id);
      
      // Refresh installed list
      setInstalledExtensions(extensionHost.getAllExtensions());
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setInstalling(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [onExtensionInstall]);
  
  const handleUninstall = useCallback(async (id: string) => {
    try {
      await extensionHost.unloadExtension(id);
      onExtensionUninstall?.(id);
    } catch (error) {
      console.error('Uninstall error:', error);
    }
  }, [onExtensionUninstall]);
  
  const handleActivate = useCallback(async (id: string) => {
    try {
      await extensionHost.activateExtension(id);
    } catch (error) {
      console.error('Activation error:', error);
    }
  }, []);
  
  const handleDeactivate = useCallback(async (id: string) => {
    try {
      await extensionHost.deactivateExtension(id);
    } catch (error) {
      console.error('Deactivation error:', error);
    }
  }, []);
  
  // ============================================================================
  // FILTERING
  // ============================================================================
  
  const filteredInstalled = useMemo(() => {
    let result = installedExtensions;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ext => 
        ext.manifest.name.toLowerCase().includes(query) ||
        ext.manifest.displayName.toLowerCase().includes(query) ||
        ext.manifest.description.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      result = result.filter(ext =>
        ext.manifest.categories?.includes(selectedCategory as ExtensionCategory)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.manifest.displayName.localeCompare(b.manifest.displayName);
        default:
          return 0;
      }
    });
    
    return result;
  }, [installedExtensions, searchQuery, selectedCategory, sortBy]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="h-full flex flex-col bg-[#1e1e2e] text-[#cdd6f4]">
      {/* Header */}
      <div className="p-4 border-b border-[#313244]">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package size={20} />
          Extensions
        </h2>
        
        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7086]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
            className="w-full bg-[#313244] rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 ring-[#89b4fa]"
          />
        </div>
        
        {/* View tabs */}
        <div className="mt-3 flex gap-1">
          {(['installed', 'marketplace', 'updates'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                px-3 py-1.5 text-sm rounded-lg transition-colors capitalize
                ${viewMode === mode 
                  ? 'bg-[#89b4fa] text-[#1e1e2e]' 
                  : 'hover:bg-[#313244]'}
              `}
            >
              {mode}
              {mode === 'updates' && updates.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#f38ba8] text-[#1e1e2e] rounded-full text-xs">
                  {updates.length}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Filters */}
        <div className="mt-3 flex items-center gap-2">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="bg-[#313244] rounded px-2 py-1 text-sm outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-[#313244] rounded px-2 py-1 text-sm outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="downloads">Sort by Downloads</option>
            <option value="updated">Sort by Updated</option>
          </select>
          
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setDisplayMode('list')}
              className={`p-1.5 rounded ${displayMode === 'list' ? 'bg-[#313244]' : ''}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setDisplayMode('grid')}
              className={`p-1.5 rounded ${displayMode === 'grid' ? 'bg-[#313244]' : ''}`}
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="animate-spin" size={24} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Installed */}
            {viewMode === 'installed' && (
              <motion.div
                key="installed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={displayMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}
              >
                {filteredInstalled.length === 0 ? (
                  <div className="text-center text-[#6c7086] py-8">
                    {searchQuery ? 'No extensions found' : 'No extensions installed'}
                  </div>
                ) : (
                  filteredInstalled.map(ext => (
                    <InstalledExtensionCard
                      key={ext.manifest.name}
                      extension={ext}
                      displayMode={displayMode}
                      selected={selectedExtension === `${ext.manifest.publisher}.${ext.manifest.name}`}
                      onSelect={() => {
                        const id = `${ext.manifest.publisher}.${ext.manifest.name}`;
                        setSelectedExtension(id);
                        onExtensionSelect?.(id);
                      }}
                      onActivate={() => handleActivate(`${ext.manifest.publisher}.${ext.manifest.name}`)}
                      onDeactivate={() => handleDeactivate(`${ext.manifest.publisher}.${ext.manifest.name}`)}
                      onUninstall={() => handleUninstall(`${ext.manifest.publisher}.${ext.manifest.name}`)}
                    />
                  ))
                )}
              </motion.div>
            )}
            
            {/* Marketplace */}
            {viewMode === 'marketplace' && (
              <motion.div
                key="marketplace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={displayMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}
              >
                {marketplaceExtensions.length === 0 ? (
                  <div className="text-center text-[#6c7086] py-8">
                    {searchQuery ? 'No extensions found' : 'Search for extensions in the marketplace'}
                  </div>
                ) : (
                  marketplaceExtensions.map(ext => (
                    <MarketplaceExtensionCard
                      key={ext.id}
                      extension={ext}
                      displayMode={displayMode}
                      installing={installing.has(ext.id)}
                      onInstall={() => handleInstall(ext.id)}
                    />
                  ))
                )}
              </motion.div>
            )}
            
            {/* Updates */}
            {viewMode === 'updates' && (
              <motion.div
                key="updates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {updates.length === 0 ? (
                  <div className="text-center text-[#6c7086] py-8">
                    <Check size={32} className="mx-auto mb-2 text-[#a6e3a1]" />
                    All extensions are up to date
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[#6c7086]">
                        {updates.length} update{updates.length !== 1 ? 's' : ''} available
                      </span>
                      <button
                        onClick={() => updates.forEach(u => handleInstall(u.id, u.latestVersion))}
                        className="px-3 py-1.5 bg-[#89b4fa] text-[#1e1e2e] rounded-lg text-sm font-medium"
                      >
                        Update All
                      </button>
                    </div>
                    {updates.map(update => (
                      <UpdateCard
                        key={update.id}
                        update={update}
                        installing={installing.has(update.id)}
                        onUpdate={() => handleInstall(update.id, update.latestVersion)}
                      />
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function InstalledExtensionCard({
  extension,
  displayMode,
  selected,
  onSelect,
  onActivate,
  onDeactivate,
  onUninstall,
}: {
  extension: LoadedExtension;
  displayMode: DisplayMode;
  selected: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onUninstall: () => void;
}) {
  const isActive = extension.status === 'active';
  const hasError = extension.status === 'error';
  
  if (displayMode === 'grid') {
    return (
      <div
        onClick={onSelect}
        className={`
          p-4 rounded-lg border cursor-pointer transition-colors
          ${selected ? 'border-[#89b4fa] bg-[#313244]' : 'border-[#313244] hover:border-[#45475a]'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-[#45475a] rounded-lg flex items-center justify-center text-2xl">
            {extension.manifest.icon ? (
              <Image
                src={extension.manifest.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-full h-full rounded-lg"
              />
            ) : (
              '📦'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{extension.manifest.displayName}</h3>
            <p className="text-xs text-[#6c7086]">{extension.manifest.publisher}</p>
          </div>
          {hasError && <AlertTriangle size={16} className="text-[#f38ba8]" />}
        </div>
        <p className="mt-2 text-xs text-[#a6adc8] line-clamp-2">
          {extension.manifest.description}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`
            px-2 py-0.5 rounded text-xs
            ${isActive ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' : 'bg-[#6c7086]/20 text-[#6c7086]'}
          `}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs text-[#6c7086]">v{extension.manifest.version}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${selected ? 'bg-[#313244]' : 'hover:bg-[#313244]/50'}
      `}
    >
      <div className="w-10 h-10 bg-[#45475a] rounded-lg flex items-center justify-center">
        {extension.manifest.icon ? (
          <Image
            src={extension.manifest.icon}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="w-full h-full rounded-lg"
          />
        ) : (
          '📦'
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{extension.manifest.displayName}</h3>
          {hasError && <AlertTriangle size={14} className="text-[#f38ba8]" />}
        </div>
        <p className="text-xs text-[#6c7086] truncate">
          {extension.manifest.publisher} • v{extension.manifest.version}
        </p>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            isActive ? onDeactivate() : onActivate();
          }}
          className="p-1.5 hover:bg-[#45475a] rounded"
          title={isActive ? 'Disable' : 'Enable'}
        >
          {isActive ? <Square size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUninstall();
          }}
          className="p-1.5 hover:bg-[#45475a] rounded text-[#f38ba8]"
          title="Uninstall"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function MarketplaceExtensionCard({
  extension,
  displayMode,
  installing,
  onInstall,
}: {
  extension: MarketplaceExtension;
  displayMode: DisplayMode;
  installing: boolean;
  onInstall: () => void;
}) {
  if (displayMode === 'grid') {
    return (
      <div className="p-4 rounded-lg border border-[#313244] hover:border-[#45475a] transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-[#45475a] rounded-lg flex items-center justify-center">
            {extension.icon ? (
              <Image
                src={extension.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-full h-full rounded-lg"
              />
            ) : (
              '📦'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-medium truncate">{extension.displayName}</h3>
              {extension.verified && (
                <Verified size={14} className="text-[#89b4fa]" />
              )}
            </div>
            <p className="text-xs text-[#6c7086]">{extension.publisherDisplayName}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#a6adc8] line-clamp-2">
          {extension.description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#6c7086]">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-[#f9e2af]" />
              {extension.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download size={12} />
              {formatNumber(extension.downloads)}
            </span>
          </div>
          <button
            onClick={onInstall}
            disabled={installing}
            className="px-3 py-1 bg-[#89b4fa] text-[#1e1e2e] rounded text-xs font-medium disabled:opacity-50"
          >
            {installing ? <RefreshCw size={12} className="animate-spin" /> : 'Install'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#313244]/50 transition-colors">
      <div className="w-10 h-10 bg-[#45475a] rounded-lg flex items-center justify-center">
        {extension.icon ? (
          <Image
            src={extension.icon}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="w-full h-full rounded-lg"
          />
        ) : (
          '📦'
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-medium truncate">{extension.displayName}</h3>
          {extension.verified && <Verified size={14} className="text-[#89b4fa]" />}
        </div>
        <p className="text-xs text-[#6c7086] truncate">
          {extension.publisherDisplayName} • 
          <span className="ml-1 inline-flex items-center gap-1">
            <Star size={10} className="text-[#f9e2af]" />
            {extension.rating.toFixed(1)}
          </span>
          <span className="ml-2 inline-flex items-center gap-1">
            <Download size={10} />
            {formatNumber(extension.downloads)}
          </span>
        </p>
      </div>
      
      <button
        onClick={onInstall}
        disabled={installing}
        className="px-3 py-1.5 bg-[#89b4fa] text-[#1e1e2e] rounded text-sm font-medium disabled:opacity-50"
      >
        {installing ? <RefreshCw size={14} className="animate-spin" /> : 'Install'}
      </button>
    </div>
  );
}

function UpdateCard({
  update,
  installing,
  onUpdate,
}: {
  update: { id: string; currentVersion: string; latestVersion: string };
  installing: boolean;
  onUpdate: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#313244]">
      <div className="w-10 h-10 bg-[#45475a] rounded-lg flex items-center justify-center">
        📦
      </div>
      
      <div className="flex-1">
        <h3 className="font-medium">{update.id}</h3>
        <p className="text-xs text-[#6c7086]">
          {update.currentVersion} → {update.latestVersion}
        </p>
      </div>
      
      <button
        onClick={onUpdate}
        disabled={installing}
        className="px-3 py-1.5 bg-[#a6e3a1] text-[#1e1e2e] rounded text-sm font-medium disabled:opacity-50"
      >
        {installing ? <RefreshCw size={14} className="animate-spin" /> : 'Update'}
      </button>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default ExtensionManagerPanel;
