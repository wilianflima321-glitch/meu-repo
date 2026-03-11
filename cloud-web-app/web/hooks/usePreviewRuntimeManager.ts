'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { analytics } from '@/lib/analytics'
import {
  checkPreviewRuntimeHealth,
  DEFAULT_PREVIEW_RUNTIME_URL,
  discoverPreviewRuntimeDetails,
  getPreviewRuntimeReadiness,
  getStoredPreviewSandboxId,
  getStoredPreviewRuntimeUrl,
  normalizeRuntimeUrl,
  persistPreviewSandboxId,
  persistPreviewRuntimeUrl,
  PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY,
  PREVIEW_RUNTIME_URL_STORAGE_KEY,
  provisionPreviewRuntime,
  syncPreviewRuntime,
  type PreviewRuntimeHealthState,
  type PreviewRuntimeReadinessResponse,
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
  const [previewSandboxId, setPreviewSandboxId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return getStoredPreviewSandboxId(PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY)
  })
  const [previewRuntimeInput, setPreviewRuntimeInput] = useState('')
  const [showRuntimeSettings, setShowRuntimeSettings] = useState(false)
  const [runtimeHealth, setRuntimeHealth] = useState<PreviewRuntimeHealthState>({ status: 'idle' })
  const [runtimeReadiness, setRuntimeReadiness] = useState<PreviewRuntimeReadinessResponse | null>(null)
  const [runtimeHealthCheckedAt, setRuntimeHealthCheckedAt] = useState<Date | null>(null)
  const [isDiscoveringRuntime, setIsDiscoveringRuntime] = useState(false)
  const [isProvisioningRuntime, setIsProvisioningRuntime] = useState(false)
  const [runtimeDiscoveryMessage, setRuntimeDiscoveryMessage] = useState<string | null>(null)
  const [runtimeDiscoveryTone, setRuntimeDiscoveryTone] = useState<RuntimeMessageTone>('info')
  const [isSyncingRuntime, setIsSyncingRuntime] = useState(false)
  const runtimeAutoDiscoveryTriggeredRef = useRef(false)
  const runtimeAutoProvisionTriggeredRef = useRef(false)

  const refreshRuntimeReadiness = useCallback(async () => {
    try {
      const readiness = await getPreviewRuntimeReadiness()
      setRuntimeReadiness(readiness)
      return readiness
    } catch {
      setRuntimeReadiness(null)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadReadiness = async () => {
      const readiness = await refreshRuntimeReadiness()
      if (cancelled) return
      if (!readiness) setRuntimeReadiness(null)
    }

    void loadReadiness()
    return () => {
      cancelled = true
    }
  }, [refreshRuntimeReadiness])

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
    setPreviewSandboxId(null)
    persistPreviewSandboxId(null, PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY)
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
      const discovery = await discoverPreviewRuntimeDetails()
      const preferredRuntimeUrl = normalizeRuntimeUrl(discovery.preferredRuntimeUrl ?? null)
      if (!preferredRuntimeUrl) {
        const suggestedCommand = discovery.guidance?.recommendedCommands?.[0] || null
        const suggestedInstruction = discovery.guidance?.instructions?.[0] || null
        if (mode === 'manual') {
          setRuntimeDiscoveryTone('warning')
          setRuntimeDiscoveryMessage(
            suggestedCommand
              ? `Nenhum runtime local encontrado. Proximo passo: ${suggestedCommand}`
              : suggestedInstruction || 'Nenhum runtime local encontrado. Inicie npm run dev e tente novamente.'
          )
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
      setPreviewSandboxId(null)
      persistPreviewSandboxId(null, PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY)

      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-discovery',
          mode,
          status: 'found',
          runtimeUrl: preferredRuntimeUrl,
        },
      })
      void refreshRuntimeReadiness()
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
  }, [isDiscoveringRuntime, refreshRuntimeReadiness])

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
      const filesCount = provisionResult.metadata?.filesCount
      const startMode = provisionResult.metadata?.startMode
      const sandboxId = provisionResult.metadata?.sandboxId ?? null
      const suffix = [startMode ? `modo=${startMode}` : null, Number.isFinite(filesCount) ? `arquivos=${filesCount}` : null]
        .filter(Boolean)
        .join(', ')
      setRuntimeDiscoveryMessage(
        suffix ? `Runtime provisionado (${suffix}): ${runtimeUrl}` : `Runtime provisionado: ${runtimeUrl}`
      )
      persistPreviewRuntimeUrl(runtimeUrl, PREVIEW_RUNTIME_URL_STORAGE_KEY)
      setPreviewSandboxId(sandboxId)
      persistPreviewSandboxId(sandboxId, PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY)

      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-provision',
          status: 'provisioned',
          runtimeUrl,
          mode: provisionResult.metadataMode || mode || 'unknown',
          sandboxId: provisionResult.metadata?.sandboxId,
          filesCount: provisionResult.metadata?.filesCount,
          startMode: provisionResult.metadata?.startMode,
        },
      })
      void refreshRuntimeReadiness()
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
  }, [isProvisioningRuntime, projectId, refreshRuntimeReadiness])

  const syncRuntime = useCallback(async (): Promise<boolean> => {
    if (isSyncingRuntime) return false
    if (!previewSandboxId) {
      setRuntimeDiscoveryTone('warning')
      setRuntimeDiscoveryMessage('Sync indisponivel: sandboxId nao encontrado.')
      return false
    }
    setIsSyncingRuntime(true)
    setRuntimeDiscoveryTone('info')
    setRuntimeDiscoveryMessage('Sincronizando workspace com runtime...')
    try {
      const result = await syncPreviewRuntime(projectId, previewSandboxId)
      const filesCount = result.metadata?.filesCount
      const suffix = Number.isFinite(filesCount) ? `arquivos=${filesCount}` : null
      setRuntimeDiscoveryTone('success')
      setRuntimeDiscoveryMessage(
        suffix ? `Runtime sincronizado (${suffix}).` : 'Runtime sincronizado.'
      )
      return true
    } catch (error) {
      setRuntimeDiscoveryTone('warning')
      setRuntimeDiscoveryMessage(
        error instanceof Error ? `Falha ao sincronizar runtime: ${error.message}` : 'Falha ao sincronizar runtime.'
      )
      return false
    } finally {
      setIsSyncingRuntime(false)
    }
  }, [isSyncingRuntime, previewSandboxId, projectId])

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
    const recommendedAction = runtimeReadiness?.recommendedAction

    if (
      hasToken &&
      recommendedAction === 'provision' &&
      !runtimeAutoProvisionTriggeredRef.current
    ) {
      runtimeAutoProvisionTriggeredRef.current = true
      void provisionRuntime('auto').then((provisioned) => {
        if (provisioned || runtimeAutoDiscoveryTriggeredRef.current) return
        if (recommendedAction === 'discover') {
          runtimeAutoDiscoveryTriggeredRef.current = true
          void discoverRuntime('auto')
        }
      })
      return
    }

    if (
      (recommendedAction === 'discover' || (!recommendedAction && !hasToken)) &&
      !runtimeAutoDiscoveryTriggeredRef.current
    ) {
      runtimeAutoDiscoveryTriggeredRef.current = true
      void discoverRuntime('auto')
    }
  }, [discoverRuntime, hasToken, previewEnabled, previewRuntimeUrl, provisionRuntime, runtimeReadiness?.recommendedAction])

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

  const runtimeStrategyLabel =
    runtimeReadiness?.strategy === 'managed'
      ? 'managed'
      : runtimeReadiness?.strategy === 'local'
        ? 'local'
        : 'inline'

  const runtimeStrategyHint =
    runtimeReadiness?.strategy === 'managed'
      ? runtimeReadiness.readyForManagedProvision
        ? 'Managed preview configurado; provisionamento pode ser usado como caminho principal.'
        : 'Managed preview foi detectado, mas ainda ha bloqueios de runtime.'
      : runtimeReadiness?.strategy === 'local'
        ? 'Nenhum sandbox gerenciado padrao foi detectado; fallback atual depende de dev-server local.'
        : 'Sem sandbox gerenciado ou runtime local detectado; preview fica em modo inline.'

  const runtimePrimaryAction =
    runtimeReadiness?.recommendedAction === 'provision'
      ? 'provision'
      : runtimeReadiness?.recommendedAction === 'discover'
        ? 'discover'
        : 'inline'

  const runtimePrimaryActionLabel =
    runtimePrimaryAction === 'provision'
      ? 'Provisionar recomendado'
      : runtimePrimaryAction === 'discover'
        ? 'Detectar recomendado'
        : 'Usar inline'

  const handleUseInlineFallback = useCallback(() => {
    setPreviewRuntimeInput('')
    setPreviewRuntimeUrl(null)
    setRuntimeHealth({ status: 'idle' })
    setRuntimeHealthCheckedAt(null)
    setRuntimeDiscoveryTone('info')
    setRuntimeDiscoveryMessage('Modo inline fallback ativo.')
    persistPreviewRuntimeUrl(null, PREVIEW_RUNTIME_URL_STORAGE_KEY)
    setPreviewSandboxId(null)
    persistPreviewSandboxId(null, PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY)
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
    isSyncingRuntime,
    runtimeDiscoveryMessage,
    runtimeDiscoveryTone,
    runtimeHealthHint,
    runtimeReadiness,
    refreshRuntimeReadiness,
    runtimeStrategyLabel,
    runtimeStrategyHint,
    runtimePrimaryAction,
    runtimePrimaryActionLabel,
    forceInlinePreviewFallback,
    applyRuntimeUrl,
    discoverRuntime,
    provisionRuntime,
    syncRuntime,
    checkRuntimeHealth: checkRuntime,
    handleUseInlineFallback,
    previewSandboxId,
  }
}
