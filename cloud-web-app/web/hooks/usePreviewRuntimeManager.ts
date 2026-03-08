'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { analytics } from '@/lib/analytics'
import {
  checkPreviewRuntimeHealth,
  DEFAULT_PREVIEW_RUNTIME_URL,
  discoverPreviewRuntime,
  getStoredPreviewRuntimeUrl,
  normalizeRuntimeUrl,
  persistPreviewRuntimeUrl,
  PREVIEW_RUNTIME_URL_STORAGE_KEY,
  provisionPreviewRuntime,
  type PreviewRuntimeHealthState,
} from '@/lib/preview/runtime-manager'

type RuntimeMessageTone = 'info' | 'success' | 'warning'

type UsePreviewRuntimeManagerOptions = {
  projectId: string | null
  previewEnabled: boolean
  hasToken: boolean
  previewUrlParam?: string | null
}

export function usePreviewRuntimeManager({
  projectId,
  previewEnabled,
  hasToken,
  previewUrlParam,
}: UsePreviewRuntimeManagerOptions) {
  const [previewRuntimeUrl, setPreviewRuntimeUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const fromStorage = getStoredPreviewRuntimeUrl(PREVIEW_RUNTIME_URL_STORAGE_KEY)
    if (fromStorage) return fromStorage
    return normalizeRuntimeUrl(DEFAULT_PREVIEW_RUNTIME_URL)
  })
  const [previewRuntimeInput, setPreviewRuntimeInput] = useState('')
  const [showRuntimeSettings, setShowRuntimeSettings] = useState(false)
  const [runtimeHealth, setRuntimeHealth] = useState<PreviewRuntimeHealthState>({ status: 'idle' })
  const [runtimeHealthCheckedAt, setRuntimeHealthCheckedAt] = useState<Date | null>(null)
  const [isDiscoveringRuntime, setIsDiscoveringRuntime] = useState(false)
  const [isProvisioningRuntime, setIsProvisioningRuntime] = useState(false)
  const [runtimeDiscoveryMessage, setRuntimeDiscoveryMessage] = useState<string | null>(null)
  const [runtimeDiscoveryTone, setRuntimeDiscoveryTone] = useState<RuntimeMessageTone>('info')
  const runtimeAutoDiscoveryTriggeredRef = useRef(false)
  const runtimeAutoProvisionTriggeredRef = useRef(false)

  useEffect(() => {
    const normalized = normalizeRuntimeUrl(previewUrlParam ?? null)
    if (!normalized) return
    setPreviewRuntimeUrl(normalized)
    persistPreviewRuntimeUrl(normalized, PREVIEW_RUNTIME_URL_STORAGE_KEY)
  }, [previewUrlParam])

  useEffect(() => {
    setPreviewRuntimeInput(previewRuntimeUrl ?? '')
  }, [previewRuntimeUrl])

  const applyRuntimeUrl = useCallback(() => {
    const normalized = normalizeRuntimeUrl(previewRuntimeInput)
    setPreviewRuntimeUrl(normalized)
    setRuntimeHealth({ status: normalized ? 'checking' : 'idle' })
    setRuntimeDiscoveryMessage(null)
    persistPreviewRuntimeUrl(normalized, PREVIEW_RUNTIME_URL_STORAGE_KEY)
    analytics?.track?.('user', 'settings_change', {
      metadata: {
        source: 'ide-preview-runtime',
        configured: Boolean(normalized),
        runtimeUrl: normalized ?? null,
      },
    })
  }, [previewRuntimeInput])

  const discoverRuntime = useCallback(async (mode: 'auto' | 'manual' = 'manual'): Promise<boolean> => {
    if (isDiscoveringRuntime) return false
    setIsDiscoveringRuntime(true)
    if (mode === 'manual') {
      setRuntimeDiscoveryTone('info')
      setRuntimeDiscoveryMessage('Buscando runtime local nas portas padrao...')
    }

    try {
      const preferredRuntimeUrl = await discoverPreviewRuntime()
      if (!preferredRuntimeUrl) {
        if (mode === 'manual') {
          setRuntimeDiscoveryTone('warning')
          setRuntimeDiscoveryMessage('Nenhum runtime local encontrado. Inicie npm run dev e tente novamente.')
        } else {
          setRuntimeDiscoveryMessage(null)
        }
        analytics?.track?.('engine', 'render_time', {
          metadata: {
            surface: 'ide-preview-runtime-discovery',
            mode,
            status: 'not-found',
          },
        })
        return false
      }

      setPreviewRuntimeUrl(preferredRuntimeUrl)
      setPreviewRuntimeInput(preferredRuntimeUrl)
      setRuntimeHealth({ status: 'checking' })
      setRuntimeHealthCheckedAt(new Date())
      setRuntimeDiscoveryTone('success')
      setRuntimeDiscoveryMessage(`Runtime detectado: ${preferredRuntimeUrl}`)
      persistPreviewRuntimeUrl(preferredRuntimeUrl, PREVIEW_RUNTIME_URL_STORAGE_KEY)

      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-discovery',
          mode,
          status: 'found',
          runtimeUrl: preferredRuntimeUrl,
        },
      })
      return true
    } catch (error) {
      if (mode === 'manual') {
        setRuntimeDiscoveryTone('warning')
        setRuntimeDiscoveryMessage(
          error instanceof Error ? `Falha ao detectar runtime: ${error.message}` : 'Falha ao detectar runtime.'
        )
      }
      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-discovery',
          mode,
          status: 'error',
          reason: error instanceof Error ? error.message : 'unknown',
        },
      })
      return false
    } finally {
      setIsDiscoveringRuntime(false)
    }
  }, [isDiscoveringRuntime])

  const provisionRuntime = useCallback(async (mode: 'auto' | 'manual' = 'manual'): Promise<boolean> => {
    if (isProvisioningRuntime) return false
    setIsProvisioningRuntime(true)
    if (mode === 'manual') {
      setRuntimeDiscoveryTone('info')
      setRuntimeDiscoveryMessage('Provisionando runtime gerenciado...')
    }

    try {
      const provisionResult = await provisionPreviewRuntime(projectId)
      const runtimeUrl = provisionResult.runtimeUrl
      if (!runtimeUrl) {
        throw new Error('Runtime provision endpoint returned empty runtime URL.')
      }

      setPreviewRuntimeUrl(runtimeUrl)
      setPreviewRuntimeInput(runtimeUrl)
      setRuntimeHealth({ status: 'checking' })
      setRuntimeHealthCheckedAt(new Date())
      setRuntimeDiscoveryTone('success')
      setRuntimeDiscoveryMessage(`Runtime provisionado: ${runtimeUrl}`)
      persistPreviewRuntimeUrl(runtimeUrl, PREVIEW_RUNTIME_URL_STORAGE_KEY)

      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-provision',
          status: 'provisioned',
          runtimeUrl,
          mode: provisionResult.metadataMode || mode || 'unknown',
        },
      })
      return true
    } catch (error) {
      if (mode === 'manual') {
        setRuntimeDiscoveryTone('warning')
        setRuntimeDiscoveryMessage(
          error instanceof Error ? `Falha ao provisionar runtime: ${error.message}` : 'Falha ao provisionar runtime.'
        )
      }
      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-provision',
          status: 'error',
          mode,
          reason: error instanceof Error ? error.message : 'unknown',
        },
      })
      return false
    } finally {
      setIsProvisioningRuntime(false)
    }
  }, [isProvisioningRuntime, projectId])

  const checkRuntime = useCallback(async (runtimeUrl: string | null) => {
    if (!runtimeUrl) {
      setRuntimeHealth({ status: 'idle' })
      setRuntimeHealthCheckedAt(null)
      return
    }

    setRuntimeHealth({ status: 'checking' })
    setRuntimeHealthCheckedAt(new Date())
    try {
      const nextHealth = await checkPreviewRuntimeHealth(runtimeUrl)
      setRuntimeHealth(nextHealth)
    } catch {
      setRuntimeHealth({ status: 'unreachable', reason: 'network' })
    }
  }, [])

  useEffect(() => {
    void checkRuntime(previewRuntimeUrl)
  }, [previewRuntimeUrl, checkRuntime])

  useEffect(() => {
    if (!previewEnabled) return
    if (previewRuntimeUrl) return
    if (hasToken && !runtimeAutoProvisionTriggeredRef.current) {
      runtimeAutoProvisionTriggeredRef.current = true
      void provisionRuntime('auto').then((provisioned) => {
        if (provisioned || runtimeAutoDiscoveryTriggeredRef.current) return
        runtimeAutoDiscoveryTriggeredRef.current = true
        void discoverRuntime('auto')
      })
      return
    }
    if (runtimeAutoDiscoveryTriggeredRef.current) return
    runtimeAutoDiscoveryTriggeredRef.current = true
    void discoverRuntime('auto')
  }, [discoverRuntime, hasToken, previewEnabled, previewRuntimeUrl, provisionRuntime])

  useEffect(() => {
    if (!previewEnabled || !previewRuntimeUrl) return
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void checkRuntime(previewRuntimeUrl)
    }, 30000)
    return () => window.clearInterval(interval)
  }, [previewEnabled, previewRuntimeUrl, checkRuntime])

  useEffect(() => {
    if (!previewRuntimeUrl) return
    if (runtimeHealth.status === 'checking' || runtimeHealth.status === 'idle') return
    analytics?.track?.('engine', 'render_time', {
      metadata: {
        surface: 'ide-preview-runtime-health',
        runtimeUrl: previewRuntimeUrl,
        status: runtimeHealth.status,
        latencyMs: runtimeHealth.latencyMs ?? null,
        httpStatus: runtimeHealth.httpStatus ?? null,
        reason: runtimeHealth.reason ?? null,
      },
    })
  }, [previewRuntimeUrl, runtimeHealth.httpStatus, runtimeHealth.latencyMs, runtimeHealth.reason, runtimeHealth.status])

  const runtimeHealthHint =
    runtimeHealth.status === 'reachable'
      ? `Runtime ativo${typeof runtimeHealth.latencyMs === 'number' ? ` (${runtimeHealth.latencyMs}ms)` : ''}.`
      : runtimeHealth.status === 'checking'
        ? 'Validando runtime externo...'
        : runtimeHealth.status === 'unhealthy'
          ? 'Runtime respondeu com erro. Preview usara fallback inline.'
          : runtimeHealth.status === 'unreachable'
            ? 'Runtime inacessivel. Preview usara fallback inline.'
            : runtimeHealth.status === 'invalid'
              ? 'Runtime URL invalida/bloqueada. Corrija para usar dev-server.'
              : 'Sem runtime externo configurado (modo inline).'

  const handleUseInlineFallback = useCallback(() => {
    setPreviewRuntimeInput('')
    setPreviewRuntimeUrl(null)
    setRuntimeHealth({ status: 'idle' })
    setRuntimeHealthCheckedAt(null)
    setRuntimeDiscoveryTone('info')
    setRuntimeDiscoveryMessage('Modo inline fallback ativo.')
    persistPreviewRuntimeUrl(null, PREVIEW_RUNTIME_URL_STORAGE_KEY)
  }, [])

  const forceInlinePreviewFallback =
    Boolean(previewRuntimeUrl) &&
    (runtimeHealth.status === 'unreachable' ||
      runtimeHealth.status === 'unhealthy' ||
      runtimeHealth.status === 'invalid')

  return {
    previewRuntimeUrl,
    previewRuntimeInput,
    setPreviewRuntimeInput,
    showRuntimeSettings,
    setShowRuntimeSettings,
    runtimeHealth,
    runtimeHealthCheckedAt,
    isDiscoveringRuntime,
    isProvisioningRuntime,
    runtimeDiscoveryMessage,
    runtimeDiscoveryTone,
    runtimeHealthHint,
    forceInlinePreviewFallback,
    applyRuntimeUrl,
    discoverRuntime,
    provisionRuntime,
    checkRuntimeHealth: checkRuntime,
    handleUseInlineFallback,
  }
}
