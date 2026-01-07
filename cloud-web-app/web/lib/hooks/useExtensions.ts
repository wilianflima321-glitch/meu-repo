/**
 * Aethel Engine - useExtensions Hook
 * 
 * Hook para gerenciar extensões do marketplace.
 * Conecta com a API /api/marketplace real.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

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
  | 'other';

export interface Extension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  publisherDisplayName: string;
  version: string;
  description: string;
  icon?: string;
  category: ExtensionCategory;
  tags: string[];
  rating: number;
  ratingCount: number;
  downloadCount: number;
  isInstalled: boolean;
  isEnabled: boolean;
  isBuiltIn?: boolean;
  lastUpdated: Date;
  dependencies?: string[];
  readme?: string;
  changelog?: string;
  repository?: string;
  license?: string;
}

export interface UseExtensionsOptions {
  autoLoad?: boolean;
  category?: ExtensionCategory;
  pageSize?: number;
}

export interface UseExtensionsReturn {
  extensions: Extension[];
  installedExtensions: Extension[];
  availableExtensions: Extension[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  refresh: () => Promise<void>;
  install: (extensionId: string) => Promise<boolean>;
  uninstall: (extensionId: string) => Promise<boolean>;
  enable: (extensionId: string) => void;
  disable: (extensionId: string) => void;
  getExtensionDetails: (extensionId: string) => Promise<Extension | null>;
  checkUpdates: () => Promise<Extension[]>;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchFromApi(endpoint: string, options?: RequestInit): Promise<any> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

function mapApiExtension(ext: any): Extension {
  return {
    id: ext.id || ext.identifier?.id || '',
    name: ext.name || '',
    displayName: ext.displayName || ext.name || '',
    publisher: ext.publisher || ext.publisherName || '',
    publisherDisplayName: ext.publisherDisplayName || ext.publisher || '',
    version: ext.version || '1.0.0',
    description: ext.description || '',
    icon: ext.icon || ext.iconUrl || undefined,
    category: mapCategory(ext.category || ext.categories?.[0]),
    tags: ext.tags || ext.categories || [],
    rating: ext.rating || ext.averageRating || 0,
    ratingCount: ext.ratingCount || 0,
    downloadCount: ext.downloadCount || ext.installCount || 0,
    isInstalled: ext.isInstalled || false,
    isEnabled: ext.isEnabled ?? true,
    isBuiltIn: ext.isBuiltIn || false,
    lastUpdated: new Date(ext.lastUpdated || ext.publishedDate || Date.now()),
    dependencies: ext.dependencies || [],
    readme: ext.readme,
    changelog: ext.changelog,
    repository: ext.repository,
    license: ext.license,
  };
}

function mapCategory(category: string | undefined): ExtensionCategory {
  if (!category) return 'other';
  
  const categoryMap: Record<string, ExtensionCategory> = {
    'programming languages': 'language',
    'languages': 'language',
    'language': 'language',
    'themes': 'theme',
    'theme': 'theme',
    'snippets': 'snippet',
    'snippet': 'snippet',
    'debuggers': 'debugger',
    'debugger': 'debugger',
    'formatters': 'formatter',
    'formatter': 'formatter',
    'linters': 'linter',
    'linter': 'linter',
    'ai': 'ai',
    'machine learning': 'ai',
    'scm providers': 'git',
    'git': 'git',
    'game development': 'engine',
    'engine': 'engine',
    'other': 'other',
  };

  return categoryMap[category.toLowerCase()] || 'tool';
}

// ============================================================================
// Hook
// ============================================================================

export function useExtensions(options: UseExtensionsOptions = {}): UseExtensionsReturn {
  const { autoLoad = true, category, pageSize = 50 } = options;

  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch extensions from API
  const fetchExtensions = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: 'search',
        query: query || '',
        pageSize: pageSize.toString(),
      });

      if (category) {
        params.set('category', category);
      }

      const data = await fetchFromApi(`/api/marketplace?${params}`);
      
      const mappedExtensions = (data.extensions || data.results || []).map(mapApiExtension);
      setExtensions(mappedExtensions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch extensions';
      setError(message);
      console.error('useExtensions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category, pageSize]);

  // Search extensions
  const search = useCallback(async (query: string) => {
    await fetchExtensions(query);
  }, [fetchExtensions]);

  // Refresh list
  const refresh = useCallback(async () => {
    await fetchExtensions();
  }, [fetchExtensions]);

  // Install extension
  const install = useCallback(async (extensionId: string): Promise<boolean> => {
    try {
      await fetchFromApi('/api/marketplace/install', {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
      });

      // Update local state
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === extensionId 
            ? { ...ext, isInstalled: true, isEnabled: true }
            : ext
        )
      );

      return true;
    } catch (err) {
      console.error('Failed to install extension:', err);
      return false;
    }
  }, []);

  // Uninstall extension
  const uninstall = useCallback(async (extensionId: string): Promise<boolean> => {
    try {
      await fetchFromApi('/api/marketplace/uninstall', {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
      });

      // Update local state
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === extensionId 
            ? { ...ext, isInstalled: false, isEnabled: false }
            : ext
        )
      );

      return true;
    } catch (err) {
      console.error('Failed to uninstall extension:', err);
      return false;
    }
  }, []);

  // Enable extension (local state only)
  const enable = useCallback((extensionId: string) => {
    setExtensions(prev => 
      prev.map(ext => 
        ext.id === extensionId ? { ...ext, isEnabled: true } : ext
      )
    );
  }, []);

  // Disable extension (local state only)
  const disable = useCallback((extensionId: string) => {
    setExtensions(prev => 
      prev.map(ext => 
        ext.id === extensionId ? { ...ext, isEnabled: false } : ext
      )
    );
  }, []);

  // Get extension details
  const getExtensionDetails = useCallback(async (extensionId: string): Promise<Extension | null> => {
    try {
      const params = new URLSearchParams({
        action: 'details',
        id: extensionId,
      });

      const data = await fetchFromApi(`/api/marketplace?${params}`);
      return mapApiExtension(data);
    } catch (err) {
      console.error('Failed to get extension details:', err);
      return null;
    }
  }, []);

  // Check for updates
  const checkUpdates = useCallback(async (): Promise<Extension[]> => {
    try {
      const params = new URLSearchParams({ action: 'updates' });
      const data = await fetchFromApi(`/api/marketplace?${params}`);
      return (data.extensions || []).map(mapApiExtension);
    } catch (err) {
      console.error('Failed to check updates:', err);
      return [];
    }
  }, []);

  // Computed values
  const installedExtensions = useMemo(
    () => extensions.filter(ext => ext.isInstalled),
    [extensions]
  );

  const availableExtensions = useMemo(
    () => extensions.filter(ext => !ext.isInstalled),
    [extensions]
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      fetchExtensions();
    }
  }, [autoLoad, fetchExtensions]);

  return {
    extensions,
    installedExtensions,
    availableExtensions,
    isLoading,
    error,
    search,
    refresh,
    install,
    uninstall,
    enable,
    disable,
    getExtensionDetails,
    checkUpdates,
  };
}

export default useExtensions;
