'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AI_PROVIDER_ENV_LABELS } from '@/lib/ai-provider-config'
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
      setErrorText('Network failure while validating provider.')
    }
  }, [])

  useEffect(() => {
    void verifyStatus()
  }, [verifyStatus])

  const statusLabel = useMemo(() => {
    if (state === 'checking') return 'verificando'
    if (state === 'configured') return 'configurado'
    if (state === 'missing') return 'pendente'
    if (state === 'error') return 'error'
    return 'indefinido'
  }, [state])

  const resolvedSettingsHref = status?.setupUrl || settingsHref

  return (
    <div className={`rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[var(--aethel-warning)]/10 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-[var(--aethel-warning-light)]`}>AI provider nao configurado</p>
          <p className={`${compact ? 'text-xs' : 'text-sm'} mt-1 text-[var(--aethel-warning-light)]/90`}>
            {message ?? 'Configure at least one provider to unlock chat, completion, and inline editing.'}
          </p>
          <p className="mt-1 text-[11px] text-[var(--aethel-warning-light)]/80">
            capability: {capability ?? status?.capability ?? 'AI_PROVIDER_CONFIG'}
            {capabilityStatus ? ` | capabilityStatus: ${capabilityStatus}` : ''}
          </p>
        </div>
        <span className="inline-flex w-fit rounded border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-warning-light)]">
          status: {statusLabel}
        </span>
      </div>

      <ol className="mt-3 list-decimal space-y-1 pl-4 text-[12px] text-[var(--aethel-warning-light)]/90">
        <li>Defina a chave do provider no ambiente seguro (server).</li>
        <li>Reinicie o runtime para aplicar as variaveis.</li>
        <li>Valide o status e reteste o chat.</li>
      </ol>

      <div className="mt-3 rounded border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
        <p className="font-medium text-[var(--aethel-text-primary)]">Provedores suportados</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(status?.missingProviders || ['openrouter', 'openai', 'anthropic', 'google', 'groq']).map((provider) => (
            <span
              key={provider}
              className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[11px] text-[var(--aethel-text-secondary)]"
            >
              {AI_PROVIDER_ENV_LABELS[provider] || provider}
            </span>
          ))}
        </div>
      </div>

      {status?.configuredProviders && status.configuredProviders.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {status.configuredProviders.map((provider) => (
            <span key={provider} className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-success)]">
              {provider}
            </span>
          ))}
        </div>
      )}

      {status?.missingProviders && status.missingProviders.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {status.missingProviders.map((provider) => (
            <span key={provider} className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-warning-light)]">
              {provider}
            </span>
          ))}
        </div>
      )}

      {errorText && <p className="mt-2 text-[11px] text-[var(--aethel-error)]">{errorText}</p>}
      {status?.demoModeEnabled && (
        <p className="mt-2 rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-success)]">
          Modo demo active: fluxo de IA liberado com respostas simuladas.
          {typeof status?.demoDailyLimit === 'number' ? ` Limite diario: ${status.demoDailyLimit} interacoes por usuario.` : ''}{' '}
          Configure a real provider for production quality.
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
          className="rounded border border-[color-mix(in_srgb,var(--aethel-warning-light)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-warning-light)] hover:bg-[var(--aethel-warning)]/30"
        >
          Abrir configuracao
        </button>
        <button
          type="button"
          onClick={() => {
            void verifyStatus()
          }}
          className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)]"
        >
          {state === 'checking' ? 'Checking...' : 'Check now'}
        </button>
        <span className="self-center text-[11px] text-[var(--aethel-text-quaternary)]">surface: {source}</span>
      </div>
    </div>
  )
}
