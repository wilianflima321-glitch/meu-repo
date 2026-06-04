'use client';

// @aethel-heavy-async-boundary
import { logger } from '@/lib/observability/logger';
/**
 * Extension Manager Panel
 *
 * Interface para gerenciar extensions - instalar, desinstalar,
 * activer/desactiver, e explorar marketplace.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from '@/lib/ui/motion';
import {
  Package,
  Search,
  RefreshCw,
  Check,
  Grid,
  List,
} from 'lucide-react';
import {
  extensionHost,
  extensionMarketplace,
  LoadedExtension,
  MarketplaceExtension,
  ExtensionCategory,
} from '@/lib/extensions/extension-system';

import type { DisplayMode, ExtensionPanelProps, SortBy, ViewMode } from './ExtensionManagerPanel.types';
import { InstalledExtensionCard, MarketplaceExtensionCard, UpdateCard } from './ExtensionManagerPanel.cards';

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
      logger.error('Marketplace search error:', error);
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
      logger.error('Install error:', error);
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
      logger.error('Uninstall error:', error);
    }
  }, [onExtensionUninstall]);

  const handleActivate = useCallback(async (id: string) => {
    try {
      await extensionHost.activateExtension(id);
    } catch (error) {
      logger.error('Activation error:', error);
    }
  }, []);

  const handleDeactivate = useCallback(async (id: string) => {
    try {
      await extensionHost.deactivateExtension(id);
    } catch (error) {
      logger.error('Deactivation error:', error);
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
    <div className="h-full flex flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package size={20} />
          Extensions
        </h2>

        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
            className="w-full bg-[var(--aethel-surface-secondary)] rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 ring-[var(--aethel-info)]"
          />
        </div>

        {/* View tabs */}
        <div className="mt-3 flex gap-1">
          {(['installed', 'marketplace', 'updates'] as ViewMode[]).map(mode => (
            <button type="button" aria-label={`Open ${mode} extensions view`}
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                px-3 py-1.5 text-sm rounded-lg transition-colors capitalize
                ${viewMode === mode
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'hover:bg-[var(--aethel-surface-secondary)]'}
              `}
            >
              {mode}
              {mode === 'updates' && updates.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[var(--aethel-error)] text-[var(--aethel-text-primary)] rounded-full text-xs">
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
            className="bg-[var(--aethel-surface-secondary)] rounded px-2 py-1 text-sm outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-[var(--aethel-surface-secondary)] rounded px-2 py-1 text-sm outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="downloads">Sort by Downloads</option>
            <option value="updated">Sort by Updated</option>
          </select>

          <div className="ml-auto flex gap-1">
            <button type="button" aria-label="Show extensions as list"
              onClick={() => setDisplayMode('list')}
              className={`p-1.5 rounded ${displayMode === 'list' ? 'bg-[var(--aethel-surface-secondary)]' : ''}`}
            >
              <List size={16} />
            </button>
            <button type="button" aria-label="Show extensions as grid"
              onClick={() => setDisplayMode('grid')}
              className={`p-1.5 rounded ${displayMode === 'grid' ? 'bg-[var(--aethel-surface-secondary)]' : ''}`}
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
                  <div className="text-center text-[var(--aethel-text-tertiary)] py-8">
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
                  <div className="text-center text-[var(--aethel-text-tertiary)] py-8">
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
                  <div className="text-center text-[var(--aethel-text-tertiary)] py-8">
                    <Check size={32} className="mx-auto mb-2 text-[var(--aethel-success-light)]" />
                    All extensions are up to date
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[var(--aethel-text-tertiary)]">
                        {updates.length} update{updates.length !== 1 ? 's' : ''} available
                      </span>
                      <button type="button" aria-label="Update all extensions"
                        onClick={() => updates.forEach(u => handleInstall(u.id, u.latestVersion))}
                        className="px-3 py-1.5 bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] rounded-lg text-sm font-medium"
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

export default ExtensionManagerPanel;
