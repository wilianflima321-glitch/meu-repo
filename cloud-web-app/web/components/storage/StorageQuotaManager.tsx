'use client';

/**
 * AETHEL ENGINE - Storage Quota Manager
 * 
 * Componente profissional para gerenciar quota de armazenamento.
 * Implementa navigator.storage.persist() para armazenamento persistente
 * e mostra avisos visuais baseados no uso.
 * 
 * Features:
 * - Quota visual com barra de progresso
 * - Persistent storage request
 * - Sugestões de limpeza inteligentes
 * - Exportação de assets
 * 
 * @module components/storage/StorageQuotaManager
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface StorageInfo {
  used: number;
  quota: number;
  usagePercent: number;
  isPersisted: boolean;
  warningLevel: 'ok' | 'warning' | 'critical' | 'blocked';
}

interface CacheEntry {
  name: string;
  size: number;
  type: 'assets' | 'textures' | 'models' | 'audio' | 'cache' | 'other';
  lastAccessed?: Date;
}

interface StorageQuotaManagerProps {
  userId?: string;
  projectId?: string;
  planLimit?: number; // em bytes
  onQuotaExceeded?: () => void;
  onCleanupComplete?: (freedBytes: number) => void;
  className?: string;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Storage: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getWarningLevel(usagePercent: number): 'ok' | 'warning' | 'critical' | 'blocked' {
  if (usagePercent >= 100) return 'blocked';
  if (usagePercent >= 90) return 'critical';
  if (usagePercent >= 75) return 'warning';
  return 'ok';
}

function getWarningColor(level: string): string {
  switch (level) {
    case 'blocked': return 'bg-red-500';
    case 'critical': return 'bg-red-400';
    case 'warning': return 'bg-yellow-400';
    default: return 'bg-green-400';
  }
}

function getCacheTypeIcon(type: string): string {
  switch (type) {
    case 'textures': return '🖼️';
    case 'models': return '🎮';
    case 'audio': return '🔊';
    case 'assets': return '📦';
    case 'cache': return '💾';
    default: return '📄';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StorageQuotaManager({
  userId,
  projectId,
  planLimit = 2 * 1024 * 1024 * 1024, // 2GB default
  onQuotaExceeded,
  onCleanupComplete,
  className = '',
}: StorageQuotaManagerProps) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    used: 0,
    quota: planLimit,
    usagePercent: 0,
    isPersisted: false,
    warningLevel: 'ok',
  });
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedForCleanup, setSelectedForCleanup] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  // ============================================================================
  // STORAGE ESTIMATION
  // ============================================================================

  const estimateStorage = useCallback(async (): Promise<StorageInfo> => {
    try {
      // Check if Storage API is available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage ?? 0;
        const quota = estimate.quota ?? planLimit;
        const usagePercent = (used / Math.min(quota, planLimit)) * 100;
        
        // Check persistence
        let isPersisted = false;
        if ('persisted' in navigator.storage) {
          isPersisted = await navigator.storage.persisted();
        }

        return {
          used,
          quota: Math.min(quota, planLimit),
          usagePercent,
          isPersisted,
          warningLevel: getWarningLevel(usagePercent),
        };
      }
    } catch (error) {
      console.error('Storage estimation failed:', error);
    }

    return {
      used: 0,
      quota: planLimit,
      usagePercent: 0,
      isPersisted: false,
      warningLevel: 'ok',
    };
  }, [planLimit]);

  // ============================================================================
  // CACHE ANALYSIS
  // ============================================================================

  const analyzeCache = useCallback(async (): Promise<CacheEntry[]> => {
    const entries: CacheEntry[] = [];

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          let totalSize = 0;
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }

          // Categorize cache
          let type: CacheEntry['type'] = 'cache';
          if (cacheName.includes('texture') || cacheName.includes('image')) type = 'textures';
          else if (cacheName.includes('model') || cacheName.includes('gltf')) type = 'models';
          else if (cacheName.includes('audio') || cacheName.includes('sound')) type = 'audio';
          else if (cacheName.includes('asset')) type = 'assets';

          entries.push({
            name: cacheName,
            size: totalSize,
            type,
          });
        }
      }

      // Check IndexedDB (estimate)
      if ('indexedDB' in window) {
        // IndexedDB size estimation is complex, we add a placeholder
        entries.push({
          name: 'IndexedDB (Aethel Engine)',
          size: 0, // Would need more complex estimation
          type: 'assets',
        });
      }

    } catch (error) {
      console.error('Cache analysis failed:', error);
    }

    return entries.sort((a, b) => b.size - a.size);
  }, []);

  // ============================================================================
  // REQUEST PERSISTENT STORAGE
  // ============================================================================

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const result = await navigator.storage.persist();
        
        if (result) {
          setStorageInfo(prev => ({ ...prev, isPersisted: true }));
        }
        
        return result;
      }
    } catch (error) {
      console.error('Persistence request failed:', error);
    }
    return false;
  }, []);

  // ============================================================================
  // CLEAR CACHE
  // ============================================================================

  const clearSelectedCache = useCallback(async () => {
    if (selectedForCleanup.size === 0) return;

    setIsClearing(true);
    let freedBytes = 0;

    try {
      for (const cacheName of selectedForCleanup) {
        const entry = cacheEntries.find(e => e.name === cacheName);
        if (entry) {
          freedBytes += entry.size;
        }
        await caches.delete(cacheName);
      }

      // Refresh data
      const [newStorage, newCache] = await Promise.all([
        estimateStorage(),
        analyzeCache(),
      ]);

      setStorageInfo(newStorage);
      setCacheEntries(newCache);
      setSelectedForCleanup(new Set());

      onCleanupComplete?.(freedBytes);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    } finally {
      setIsClearing(false);
    }
  }, [selectedForCleanup, cacheEntries, estimateStorage, analyzeCache, onCleanupComplete]);

  // ============================================================================
  // CLEAR ALL CACHE
  // ============================================================================

  const clearAllCache = useCallback(async () => {
    setIsClearing(true);
    let freedBytes = 0;

    try {
      const cacheNames = await caches.keys();
      
      for (const name of cacheNames) {
        const entry = cacheEntries.find(e => e.name === name);
        if (entry) freedBytes += entry.size;
        await caches.delete(name);
      }

      // Refresh
      const [newStorage, newCache] = await Promise.all([
        estimateStorage(),
        analyzeCache(),
      ]);

      setStorageInfo(newStorage);
      setCacheEntries(newCache);

      onCleanupComplete?.(freedBytes);
    } catch (error) {
      console.error('Clear all cache failed:', error);
    } finally {
      setIsClearing(false);
    }
  }, [cacheEntries, estimateStorage, analyzeCache, onCleanupComplete]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const loadStorageInfo = async () => {
      setIsLoading(true);
      
      const [storage, cache] = await Promise.all([
        estimateStorage(),
        analyzeCache(),
      ]);

      setStorageInfo(storage);
      setCacheEntries(cache);
      setIsLoading(false);

      // Check if quota exceeded
      if (storage.warningLevel === 'blocked') {
        onQuotaExceeded?.();
      }
    };

    loadStorageInfo();
  }, [estimateStorage, analyzeCache, onQuotaExceeded]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className={`bg-[#1e1e1e] rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <div className="animate-spin">
            <Icons.Refresh />
          </div>
          <span>Analisando armazenamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1e1e1e] rounded-lg border border-[#3c3c3c] ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[#3c3c3c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-blue-400">
              <Icons.Storage />
            </div>
            <h3 className="text-white font-semibold">Armazenamento</h3>
          </div>
          
          {/* Persistence Badge */}
          {storageInfo.isPersisted ? (
            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
              <Icons.Shield />
              <span>Persistente</span>
            </div>
          ) : (
            <button
              onClick={requestPersistence}
              className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded hover:bg-yellow-500/20 transition-colors"
              title="Solicitar armazenamento persistente para evitar limpeza automática pelo navegador"
            >
              <Icons.Shield />
              <span>Tornar Persistente</span>
            </button>
          )}
        </div>
      </div>

      {/* Usage Bar */}
      <div className="p-4">
        {/* Warning Banner */}
        {storageInfo.warningLevel !== 'ok' && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            storageInfo.warningLevel === 'blocked' 
              ? 'bg-red-500/20 text-red-300'
              : storageInfo.warningLevel === 'critical'
              ? 'bg-red-500/10 text-red-300'
              : 'bg-yellow-500/10 text-yellow-300'
          }`}>
            <Icons.Warning />
            <div>
              <p className="font-medium">
                {storageInfo.warningLevel === 'blocked' 
                  ? 'Quota de armazenamento excedida!'
                  : storageInfo.warningLevel === 'critical'
                  ? 'Armazenamento quase cheio!'
                  : 'Armazenamento alto'}
              </p>
              <p className="text-sm opacity-80">
                {storageInfo.warningLevel === 'blocked'
                  ? 'Você precisa liberar espaço antes de salvar novos assets.'
                  : 'Considere limpar cache ou fazer upgrade do plano.'}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>{formatBytes(storageInfo.used)} usado</span>
            <span>{formatBytes(storageInfo.quota)} total</span>
          </div>
          <div className="h-3 bg-[#2d2d2d] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getWarningColor(storageInfo.warningLevel)}`}
              style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{storageInfo.usagePercent.toFixed(1)}% usado</span>
            <span>{formatBytes(storageInfo.quota - storageInfo.used)} livre</span>
          </div>
        </div>
      </div>

      {/* Cache Details Toggle */}
      <div className="border-t border-[#3c3c3c]">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-3 flex items-center justify-between text-gray-400 hover:bg-[#2d2d2d] transition-colors"
        >
          <span className="text-sm">Detalhes do Cache</span>
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="p-4 pt-0">
            {/* Cache List */}
            {cacheEntries.length > 0 ? (
              <div className="space-y-2 mb-4">
                {cacheEntries.map((entry) => (
                  <div
                    key={entry.name}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedForCleanup.has(entry.name)
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : 'bg-[#2d2d2d] hover:bg-[#3c3c3c]'
                    }`}
                    onClick={() => {
                      const newSelection = new Set(selectedForCleanup);
                      if (newSelection.has(entry.name)) {
                        newSelection.delete(entry.name);
                      } else {
                        newSelection.add(entry.name);
                      }
                      setSelectedForCleanup(newSelection);
                    }}
                  >
                    <span className="text-lg">{getCacheTypeIcon(entry.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{entry.name}</p>
                      <p className="text-xs text-gray-500">{entry.type}</p>
                    </div>
                    <span className="text-sm text-gray-400">{formatBytes(entry.size)}</span>
                    {selectedForCleanup.has(entry.name) && (
                      <div className="text-blue-400">
                        <Icons.Check />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">Nenhum cache encontrado.</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={clearSelectedCache}
                disabled={selectedForCleanup.size === 0 || isClearing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <div className="animate-spin">
                    <Icons.Refresh />
                  </div>
                ) : (
                  <Icons.Trash />
                )}
                <span>Limpar Selecionados ({selectedForCleanup.size})</span>
              </button>
              
              <button
                onClick={clearAllCache}
                disabled={cacheEntries.length === 0 || isClearing}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export/Backup Option */}
      <div className="border-t border-[#3c3c3c] p-4">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2d2d2d] rounded-lg transition-colors">
          <Icons.Download />
          <span>Exportar Assets Locais</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VERSION (para StatusBar)
// ============================================================================

export function StorageQuotaCompact({ className = '' }: { className?: string }) {
  const [info, setInfo] = useState({ used: 0, quota: 1, percent: 0 });

  useEffect(() => {
    const check = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage = 0, quota = 1 } = await navigator.storage.estimate();
        setInfo({ used: usage, quota, percent: (usage / quota) * 100 });
      }
    };
    check();
    const interval = setInterval(check, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const level = getWarningLevel(info.percent);

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getWarningColor(level)}`} />
      <span className="text-gray-400">
        {formatBytes(info.used)} / {formatBytes(info.quota)}
      </span>
    </div>
  );
}

export default StorageQuotaManager;
