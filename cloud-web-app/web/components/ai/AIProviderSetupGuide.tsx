'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAiProviderStatus, type AiProviderStatusResponse } from '@/lib/ai-provider-status-client'

type Props = {
  message?: string
  capability?: string
  capabilityStatus?: string
  compact?: boolean
  source: 'ide' | 'dashboard'
  settingsHref?: string
  onOpenSettings?: () => void
}

type CheckState = 'idle' | 'checking' | 'configured' | 'missing' | 'error'

export default function AIProviderSetupGuide({
  message,
  capability,
  capabilityStatus,
  compact = false,
  source,
  settingsHref = '/settings?tab=api',
  onOpenSettings,
}: Props) {
  const [state, setState] = useState<CheckState>('idle')
  const [status, setStatus] = useState<AiProviderStatusResponse | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  const verifyStatus = useCallback(async () => {
    setState('checking')
    setErrorText(null)
    try {
      const payload = await fetchAiProviderStatus()
      setStatus(payload)
      if (payload.configured) {
        setState('configured')
      } else {
        setState('missing')
      }
    } catch {
      setState('error')
      setErrorText('Falha de rede ao validar provider.')
    }
  }, [])

  useEffect(() => {
    void verifyStatus()
  }, [verifyStatus])

  const statusLabel = useMemo(() => {
    if (state === 'checking') return 'verificando'
    if (state === 'configured') return 'configurado'
    if (state === 'missing') return 'pendente'
    if (state === 'error') return 'erro'
    return 'indefinido'
  }, [state])

  const resolvedSettingsHref = status?.setupUrl || settingsHref

  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-amber-200`}>AI provider nao configurado</p>
          <p className={`${compact ? 'text-xs' : 'text-sm'} mt-1 text-amber-100/90`}>
            {message ?? 'Configure ao menos um provider para liberar chat, complete e inline edit.'}
          </p>
          <p className="mt-1 text-[11px] text-amber-200/80">
            capability: {capability ?? status?.capability ?? 'AI_PROVIDER_CONFIG'}
            {capabilityStatus ? ` | capabilityStatus: ${capabilityStatus}` : ''}
          </p>
        </div>
        <span className="inline-flex w-fit rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
          status: {statusLabel}
        </span>
      </div>

      <ol className="mt-3 list-decimal space-y-1 pl-4 text-[12px] text-amber-100/90">
        <li>Defina a chave do provider no ambiente seguro (server).</li>
        <li>Reinicie o runtime para aplicar as variaveis.</li>
        <li>Valide o status e reteste o chat.</li>
      </ol>

      {status?.configuredProviders && status.configuredProviders.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {status.configuredProviders.map((provider) => (
            <span key={provider} className="rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
              {provider}
            </span>
          ))}
        </div>
      )}

      {status?.missingProviders && status.missingProviders.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {status.missingProviders.map((provider) => (
            <span key={provider} className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
              {provider}
            </span>
          ))}
        </div>
      )}

      {errorText && <p className="mt-2 text-[11px] text-rose-200">{errorText}</p>}
      {status?.demoModeEnabled && (
        <p className="mt-2 rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
          Demo mode ativo: fluxo de IA liberado com respostas simuladas. Configure provider real para qualidade de producao.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (onOpenSettings) {
              onOpenSettings()
              return
            }
            window.location.assign(resolvedSettingsHref)
          }}
          className="rounded border border-amber-300/40 bg-amber-500/20 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30"
        >
          Abrir configuracao
        </button>
        <button
          type="button"
          onClick={() => {
            void verifyStatus()
          }}
          className="rounded border border-zinc-700/80 bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800/80"
        >
          {state === 'checking' ? 'Verificando...' : 'Verificar agora'}
        </button>
        <span className="self-center text-[11px] text-zinc-400">surface: {source}</span>
      </div>
    </div>
  )
}
