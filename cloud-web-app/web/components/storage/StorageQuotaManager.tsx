'use client'

/**
 * AETHEL ENGINE - Storage Quota Manager
 *
 * Componente profissional para gerenciar quota de armazenamento.
 */

import React, { useState, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface StorageInfo {
  used: number
  quota: number
  usagePercent: number
  isPersisted: boolean
  warningLevel: 'ok' | 'warning' | 'critical' | 'blocked'
}

interface CacheEntry {
  name: string
  size: number
  type: 'assets' | 'textures' | 'models' | 'audio' | 'cache' | 'other'
  lastAccessed?: Date
}

interface StorageQuotaManagerProps {
  userId?: string
  projectId?: string
  planLimit?: number
  onQuotaExceeded?: () => void
  onCleanupComplete?: (freedBytes: number) => void
  className?: string
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Storage: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Trash: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Shield: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Warning: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Refresh: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Download: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
}

// ============================================================================
// UTILS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getWarningLevel(usagePercent: number): 'ok' | 'warning' | 'critical' | 'blocked' {
  if (usagePercent >= 100) return 'blocked'
  if (usagePercent >= 90) return 'critical'
  if (usagePercent >= 75) return 'warning'
  return 'ok'
}

function getWarningColor(level: string): string {
  switch (level) {
    case 'blocked':
      return 'bg-rose-400'
    case 'critical':
      return 'bg-rose-300'
    case 'warning':
      return 'bg-yellow-300'
    default:
      return 'bg-emerald-300'
  }
}

function getCacheTypeLabel(type: string): string {
  switch (type) {
    case 'textures':
      return 'TEX'
    case 'models':
      return '3D'
    case 'audio':
      return 'AUD'
    case 'assets':
      return 'AST'
    case 'cache':
      return 'CCH'
    default:
      return 'GEN'
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StorageQuotaManager({
  userId,
  projectId,
  planLimit = 2 * 1024 * 1024 * 1024,
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
  })
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [selectedForCleanup, setSelectedForCleanup] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)

  const estimateStorage = useCallback(async (): Promise<StorageInfo> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage ?? 0
        const quota = estimate.quota ?? planLimit
        const usagePercent = (used / Math.min(quota, planLimit)) * 100

        let isPersisted = false
        if ('persisted' in navigator.storage) {
          isPersisted = await navigator.storage.persisted()
        }

        return {
          used,
          quota: Math.min(quota, planLimit),
          usagePercent,
          isPersisted,
          warningLevel: getWarningLevel(usagePercent),
        }
      }
    } catch (error) {
      console.error('Storage estimation failed:', error)
    }

    return {
      used: 0,
      quota: planLimit,
      usagePercent: 0,
      isPersisted: false,
      warningLevel: 'ok',
    }
  }, [planLimit])

  const analyzeCache = useCallback(async (): Promise<CacheEntry[]> => {
    const entries: CacheEntry[] = []

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName)
          const requests = await cache.keys()

          let totalSize = 0
          for (const request of requests) {
            const response = await cache.match(request)
            if (response) {
              const blob = await response.blob()
              totalSize += blob.size
            }
          }

          let type: CacheEntry['type'] = 'cache'
          if (cacheName.includes('texture') || cacheName.includes('image')) type = 'textures'
          else if (cacheName.includes('model') || cacheName.includes('gltf')) type = 'models'
          else if (cacheName.includes('audio') || cacheName.includes('sound')) type = 'audio'
          else if (cacheName.includes('asset')) type = 'assets'

          entries.push({
            name: cacheName,
            size: totalSize,
            type,
          })
        }
      }

      if ('indexedDB' in window) {
        entries.push({
          name: 'IndexedDB (Aethel Engine)',
          size: 0,
          type: 'assets',
        })
      }
    } catch (error) {
      console.error('Cache analysis failed:', error)
    }

    return entries.sort((a, b) => b.size - a.size)
  }, [])

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const result = await navigator.storage.persist()

        if (result) {
          setStorageInfo((prev) => ({ ...prev, isPersisted: true }))
        }

        return result
      }
    } catch (error) {
      console.error('Persistence request failed:', error)
    }
    return false
  }, [])

  const clearSelectedCache = useCallback(async () => {
    if (selectedForCleanup.size === 0) return

    setIsClearing(true)
    let freedBytes = 0

    try {
      for (const cacheName of selectedForCleanup) {
        const entry = cacheEntries.find((cache) => cache.name === cacheName)
        if (entry) {
          freedBytes += entry.size
        }
        await caches.delete(cacheName)
      }

      const [newStorage, newCache] = await Promise.all([estimateStorage(), analyzeCache()])
      setStorageInfo(newStorage)
      setCacheEntries(newCache)
      setSelectedForCleanup(new Set())

      onCleanupComplete?.(freedBytes)
    } catch (error) {
      console.error('Cache cleanup failed:', error)
    } finally {
      setIsClearing(false)
    }
  }, [selectedForCleanup, cacheEntries, estimateStorage, analyzeCache, onCleanupComplete])

  const clearAllCache = useCallback(async () => {
    setIsClearing(true)
    let freedBytes = 0

    try {
      const cacheNames = await caches.keys()

      for (const name of cacheNames) {
        const entry = cacheEntries.find((cache) => cache.name === name)
        if (entry) freedBytes += entry.size
        await caches.delete(name)
      }

      const [newStorage, newCache] = await Promise.all([estimateStorage(), analyzeCache()])
      setStorageInfo(newStorage)
      setCacheEntries(newCache)

      onCleanupComplete?.(freedBytes)
    } catch (error) {
      console.error('Clear all cache failed:', error)
    } finally {
      setIsClearing(false)
    }
  }, [cacheEntries, estimateStorage, analyzeCache, onCleanupComplete])

  useEffect(() => {
    const loadStorageInfo = async () => {
      setIsLoading(true)

      const [storage, cache] = await Promise.all([estimateStorage(), analyzeCache()])

      setStorageInfo(storage)
      setCacheEntries(cache)
      setIsLoading(false)

      if (storage.warningLevel === 'blocked') {
        onQuotaExceeded?.()
      }
    }

    loadStorageInfo()
  }, [estimateStorage, analyzeCache, onQuotaExceeded])

  if (isLoading) {
    return (
      <div className={`aethel-card aethel-p-4 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="animate-spin">
            <Icons.Refresh />
          </div>
          <span>Analisando armazenamento...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`aethel-card ${className}`}>
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sky-300">
              <Icons.Storage />
            </div>
            <h3 className="text-sm font-semibold text-white">Armazenamento</h3>
          </div>

          {storageInfo.isPersisted ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
              <Icons.Shield />
              <span>Persistente</span>
            </div>
          ) : (
            <button
              onClick={requestPersistence}
              className="aethel-button aethel-button-secondary text-xs"
              title="Solicitar armazenamento persistente para evitar limpeza automatica pelo navegador"
            >
              <Icons.Shield />
              <span>Tornar persistente</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {storageInfo.warningLevel !== 'ok' && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg p-3 ${
              storageInfo.warningLevel === 'blocked'
                ? 'bg-rose-500/20 text-rose-200'
                : storageInfo.warningLevel === 'critical'
                  ? 'bg-rose-500/10 text-rose-200'
                  : 'bg-yellow-500/10 text-yellow-200'
            }`}
          >
            <Icons.Warning />
            <div>
              <p className="text-sm font-semibold">
                {storageInfo.warningLevel === 'blocked'
                  ? 'Quota de armazenamento excedida'
                  : storageInfo.warningLevel === 'critical'
                    ? 'Armazenamento quase cheio'
                    : 'Armazenamento alto'}
              </p>
              <p className="text-xs opacity-80">
                {storageInfo.warningLevel === 'blocked'
                  ? 'Voce precisa liberar espaco antes de salvar novos assets.'
                  : 'Considere limpar cache ou fazer upgrade do plano.'}
              </p>
            </div>
          </div>
        )}

        <div className="mb-2">
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>{formatBytes(storageInfo.used)} usado</span>
            <span>{formatBytes(storageInfo.quota)} total</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-500 ${getWarningColor(storageInfo.warningLevel)}`}
              style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-zinc-600">
            <span>{storageInfo.usagePercent.toFixed(1)}% usado</span>
            <span>{formatBytes(storageInfo.quota - storageInfo.used)} livre</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between p-3 text-xs text-zinc-400 hover:bg-white/[0.04]"
        >
          <span>Detalhes do cache</span>
          <svg
            className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="p-4 pt-0">
            {cacheEntries.length > 0 ? (
              <div className="mb-4 space-y-2">
                {cacheEntries.map((entry) => (
                  <div
                    key={entry.name}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${
                      selectedForCleanup.has(entry.name)
                        ? 'border border-sky-500/50 bg-sky-500/10'
                        : 'bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                    onClick={() => {
                      const newSelection = new Set(selectedForCleanup)
                      if (newSelection.has(entry.name)) {
                        newSelection.delete(entry.name)
                      } else {
                        newSelection.add(entry.name)
                      }
                      setSelectedForCleanup(newSelection)
                    }}
                  >
                    <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-zinc-300">
                      {getCacheTypeLabel(entry.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{entry.name}</p>
                      <p className="text-xs text-zinc-500">{entry.type}</p>
                    </div>
                    <span className="text-xs text-zinc-500">{formatBytes(entry.size)}</span>
                    {selectedForCleanup.has(entry.name) && (
                      <div className="text-sky-300">
                        <Icons.Check />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-xs text-zinc-500">Nenhum cache encontrado.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={clearSelectedCache}
                disabled={selectedForCleanup.size === 0 || isClearing}
                className="aethel-button aethel-button-primary flex-1 gap-2 text-xs disabled:opacity-50"
              >
                {isClearing ? (
                  <div className="animate-spin">
                    <Icons.Refresh />
                  </div>
                ) : (
                  <Icons.Trash />
                )}
                <span>Limpar selecionados ({selectedForCleanup.size})</span>
              </button>

              <button
                onClick={clearAllCache}
                disabled={cacheEntries.length === 0 || isClearing}
                className="aethel-button aethel-button-secondary text-xs disabled:opacity-50"
              >
                Limpar tudo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <button className="aethel-button aethel-button-ghost w-full justify-center gap-2 text-xs">
          <Icons.Download />
          <span>Exportar assets locais</span>
        </button>
      </div>
    </div>
  )
}

export function StorageQuotaCompact({ className = '' }: { className?: string }) {
  const [info, setInfo] = useState({ used: 0, quota: 1, percent: 0 })

  useEffect(() => {
    const check = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage = 0, quota = 1 } = await navigator.storage.estimate()
        setInfo({ used: usage, quota, percent: (usage / quota) * 100 })
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  const level = getWarningLevel(info.percent)

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div className={`h-2 w-2 rounded-full ${getWarningColor(level)}`} />
      <span className="text-zinc-500">
        {formatBytes(info.used)} / {formatBytes(info.quota)}
      </span>
    </div>
  )
}

export default StorageQuotaManager
