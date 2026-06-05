'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  KeyRound,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react'
import { createComponentLogger } from '@/lib/observability/logger';
import PasskeysPanel from './PasskeysPanel'

type TwoFactorStatus = {
  twoFactorEnabled: boolean
  verifiedAt?: string | null
  backupCodesRemaining?: number | null
}

type TwoFactorSetupPayload = {
  qrCode: string
  secret?: string
  backupCodes: string[]
}

type TwoFactorModal = 'setup' | 'disable' | 'backup-codes' | null

type TwoFactorSecurityPanelProps = {
  title?: string
  description?: string
  variant?: 'settings' | 'profile'
  onStatusChange?: (enabled: boolean) => void
}

const logger = createComponentLogger('TwoFactorSecurityPanel')

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not validated yet'

  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function TwoFactorSecurityPanel({
  title = 'Two-factor authentication',
  description = 'Strengthen the account with an authenticator, recovery codes, and a clear revalidation flow.',
  variant = 'settings',
  onStatusChange,
}: TwoFactorSecurityPanelProps) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState<TwoFactorModal>(null)
  const [setup, setSetup] = useState<TwoFactorSetupPayload | null>(null)
  const [authCode, setAuthCode] = useState('')
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/2fa/status', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not query the security status.')
      }

      const nextStatus: TwoFactorStatus = {
        twoFactorEnabled: Boolean(payload?.twoFactorEnabled),
        verifiedAt: typeof payload?.verifiedAt === 'string' ? payload.verifiedAt : null,
        backupCodesRemaining:
          typeof payload?.backupCodesRemaining === 'number' ? payload.backupCodesRemaining : null,
      }

      setStatus(nextStatus)
      onStatusChange?.(nextStatus.twoFactorEnabled)
    } catch (loadError) {
      logger.warn('Failed to load 2FA status', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load security status.')
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const resetTransientState = useCallback(() => {
    setAuthCode('')
    setPassword('')
    setSetup(null)
    setBackupCodes([])
    setCopied(false)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setError(null)
    resetTransientState()
  }, [resetTransientState])

  const handleEnable = useCallback(async () => {
    try {
      setActionLoading(true)
      setError(null)
      setNotice(null)
      resetTransientState()

      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to start authenticator setup.')
      }

      setSetup({
        qrCode: String(payload?.qrCode || ''),
        secret: typeof payload?.secret === 'string' ? payload.secret : undefined,
        backupCodes: Array.isArray(payload?.backupCodes) ? payload.backupCodes.map(String) : [],
      })
      setModal('setup')
    } catch (setupError) {
      logger.warn('Failed to start 2FA setup', setupError)
      setError(setupError instanceof Error ? setupError.message : 'Failed to start 2FA setup.')
    } finally {
      setActionLoading(false)
    }
  }, [resetTransientState])

  const confirmSetup = useCallback(async () => {
    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to verify the authenticator code.')
      }

      setNotice('2FA enabled successfully. Store recovery codes in a safe place.')
      closeModal()
      await loadStatus()
    } catch (verifyError) {
      logger.warn('Failed to complete 2FA setup', verifyError)
      setError(verifyError instanceof Error ? verifyError.message : 'Failed to verify 2FA.')
    } finally {
      setActionLoading(false)
    }
  }, [authCode, closeModal, loadStatus])

  const confirmDisable = useCallback(async () => {
    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, password }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to disable 2FA.')
      }

      setNotice('2FA disabled. We recommend re-enabling protection after account maintenance is complete.')
      closeModal()
      await loadStatus()
    } catch (disableError) {
      logger.warn('Failed to disable 2FA', disableError)
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable 2FA.')
    } finally {
      setActionLoading(false)
    }
  }, [authCode, closeModal, loadStatus, password])

  const handleRegenerateBackupCodes = useCallback(async () => {
    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to regenerate backup codes.')
      }

      setBackupCodes(Array.isArray(payload?.backupCodes) ? payload.backupCodes.map(String) : [])
      setNotice('New backup codes generated. Replace the old codes immediately.')
      await loadStatus()
    } catch (regenError) {
      logger.warn('Failed to regenerate backup codes', regenError)
      setError(regenError instanceof Error ? regenError.message : 'Failed to regenerate backup codes.')
    } finally {
      setActionLoading(false)
    }
  }, [authCode, loadStatus])

  const copyBackupCodes = useCallback(async () => {
    if (backupCodes.length === 0 && setup?.backupCodes?.length === 0) return
    const codes = backupCodes.length > 0 ? backupCodes : setup?.backupCodes ?? []

    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch (copyError) {
      logger.warn('Failed to copy backup codes', copyError)
    }
  }, [backupCodes, setup?.backupCodes])

  const statusBadge = useMemo(() => {
    if (loading) {
      return {
        label: 'Checking',
        tone: 'border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]',
        icon: Shield,
      }
    }

    if (status?.twoFactorEnabled) {
      return {
        label: 'Protecao active',
        tone: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
        icon: ShieldCheck,
      }
    }

    return {
      label: 'Protecao recomendada',
      tone: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
      icon: ShieldOff,
    }
  }, [loading, status?.twoFactorEnabled])

  const StatusIcon = statusBadge.icon

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusBadge.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusBadge.label}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-[var(--aethel-text-secondary)]">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={loading || actionLoading}
              aria-label="Refresh two-factor authentication status"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh status
            </button>

            {status?.twoFactorEnabled ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setModal('backup-codes')
                    setError(null)
                    setNotice(null)
                    setAuthCode('')
                    setBackupCodes([])
                  }}
                  disabled={actionLoading}
                  aria-label="Regenerate two-factor authentication backup codes"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-info-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  New codes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModal('disable')
                    setError(null)
                    setNotice(null)
                    setAuthCode('')
                    setPassword('')
                  }}
                  disabled={actionLoading}
                  aria-label="Disable two-factor authentication"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-sm text-[var(--aethel-error-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldOff className="h-4 w-4" />
                  Disable
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleEnable()}
                disabled={actionLoading}
                aria-label="Enable two-factor authentication"
                className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-2 text-sm text-[var(--aethel-success-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Smartphone className="h-4 w-4" />
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {(error || notice) && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
            }`}
            role={error ? 'alert' : 'status'}
            aria-live="polite"
          >
            {error || notice}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Current posture</p>
            <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">
              {status?.twoFactorEnabled ? 'Account reinforced with an authenticator' : 'Account protected by password only'}
            </p>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
              {status?.twoFactorEnabled
                ? `Last validation recorded at ${formatDateTime(status.verifiedAt)}.`
                : 'Enable 2FA to reduce takeover risk and satisfy enterprise security requirements.'}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Recovery</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">
              {status?.twoFactorEnabled ? status?.backupCodesRemaining ?? '--' : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
              {status?.twoFactorEnabled
                ? 'Backup codes remaining for emergencies.'
                : 'Backup codes appear during setup and can be regenerated later.'}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next step</p>
            <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">
              {status?.twoFactorEnabled ? 'Review codes and trusted devices' : 'Configure an authenticator in under 2 minutes'}
            </p>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
              {variant === 'settings'
                ? 'Use this panel as the canonical account-hardening path and track status without leaving the workspace.'
                : 'Keep this block as a quick security checkpoint before editing billing, API keys, or team access.'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--aethel-text-tertiary)]">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            QR code and manual setup
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            Regenerable backup codes
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            Passkeys in technical rollout
          </span>
        </div>

        {variant === 'settings' && <PasskeysPanel />}

        {variant === 'settings' && (
          <div className="mt-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3 text-sm text-[var(--aethel-text-secondary)]">
            For complete account management, also review the main profile, sessions, and personal preferences.
            <Link
              href="/profile"
              className="ml-2 font-medium text-[var(--aethel-info-light)] underline decoration-transparent transition hover:decoration-current"
            >
              Open profile
            </Link>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_78%,transparent)] p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
                  <Shield className="h-3.5 w-3.5" />
                  Account security
                </div>
                <h4 className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">
                  {modal === 'setup'
                    ? 'Enable two-factor authentication'
                    : modal === 'disable'
                      ? 'Disable two-factor authentication'
                      : 'Generate new backup codes'}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close security modal"
                className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)]"
              >
                Close
              </button>
            </div>

            {error && (
              <div
                className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error-light)]"
                role="alert"
              >
                {error}
              </div>
            )}

            {modal === 'setup' && (
              <div className="mt-5 space-y-4">
                {setup?.qrCode && (
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] p-4 md:grid-cols-[176px_minmax(0,1fr)] md:items-center">
                    <div className="mx-auto rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-contrast)] p-3">
                      <Image
                        src={setup.qrCode}
                        alt="QR code for enabling two-factor authentication"
                        width={160}
                        height={160}
                        unoptimized
                        className="h-40 w-40"
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--aethel-text-secondary)]">
                        Scan the QR code in your preferred authenticator and confirm with a 6-digit code.
                      </p>
                      {setup.secret && (
                        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Manual setup</p>
                          <code className="mt-2 block break-all text-sm text-[var(--aethel-text-primary)]">{setup.secret}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="two-factor-setup-code" className="text-sm font-medium text-[var(--aethel-text-primary)]">
                    Authenticator code
                  </label>
                  <input
                    id="two-factor-setup-code"
                    type="text"
                    inputMode="numeric"
                    value={authCode}
                    onChange={(event) => setAuthCode(event.target.value)}
                    placeholder="000000"
                    className="mt-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)]"
                  />
                </div>

                {setup?.backupCodes?.length ? (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Recovery codes</p>
                        <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
                          Store them in a secure vault. Each code can be used once.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyBackupCodes()}
                        aria-label="Copy backup codes"
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {setup.backupCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-center text-xs font-medium text-[var(--aethel-text-primary)]"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {modal === 'disable' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
                  Disable only if you are changing authenticators or resolving an access incident.
                </div>

                <div>
                  <label htmlFor="two-factor-disable-code" className="text-sm font-medium text-[var(--aethel-text-primary)]">
                    Current authenticator code
                  </label>
                  <input
                    id="two-factor-disable-code"
                    type="text"
                    inputMode="numeric"
                    value={authCode}
                    onChange={(event) => setAuthCode(event.target.value)}
                    placeholder="000000"
                    className="mt-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)]"
                  />
                </div>

                <div>
                  <label htmlFor="two-factor-disable-password" className="text-sm font-medium text-[var(--aethel-text-primary)]">
                    Account password
                  </label>
                  <input
                    id="two-factor-disable-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)]"
                  />
                </div>
              </div>
            )}

            {modal === 'backup-codes' && (
              <div className="mt-5 space-y-4">
                {backupCodes.length === 0 ? (
                  <>
                    <p className="text-sm text-[var(--aethel-text-secondary)]">
                      Confirm with a current authenticator code to issue a new set of backup codes.
                    </p>
                    <div>
                      <label htmlFor="two-factor-backup-code" className="text-sm font-medium text-[var(--aethel-text-primary)]">
                        Current authenticator code
                      </label>
                      <input
                        id="two-factor-backup-code"
                        type="text"
                        inputMode="numeric"
                        value={authCode}
                        onChange={(event) => setAuthCode(event.target.value)}
                        placeholder="000000"
                        className="mt-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--aethel-text-primary)]">New codes issued</p>
                        <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
                          Old codes stop working as soon as this batch is confirmed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyBackupCodes()}
                        aria-label="Copy new backup codes"
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {backupCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-center text-xs font-medium text-[var(--aethel-text-primary)]"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)]"
              >
                Cancel
              </button>

              {modal === 'setup' && (
                <button
                  type="button"
                  onClick={() => void confirmSetup()}
                  disabled={actionLoading || authCode.trim().length < 6}
                  aria-label="Confirm two-factor authentication setup"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-4 py-2 text-sm text-[var(--aethel-success-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? 'Confirming...' : 'Confirm setup'}
                </button>
              )}

              {modal === 'disable' && (
                <button
                  type="button"
                  onClick={() => void confirmDisable()}
                  disabled={actionLoading || authCode.trim().length < 6 || password.trim().length === 0}
                  aria-label="Confirm two-factor authentication disablement"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-2 text-sm text-[var(--aethel-error-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              )}

              {modal === 'backup-codes' && (
                <button
                  type="button"
                  onClick={() => {
                    if (backupCodes.length > 0) {
                      closeModal()
                      return
                    }
                    void handleRegenerateBackupCodes()
                  }}
                  disabled={actionLoading || (backupCodes.length === 0 && authCode.trim().length < 6)}
                  aria-label={backupCodes.length > 0 ? 'Close new backup codes modal' : 'Confirm new backup code generation'}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-2 text-sm text-[var(--aethel-info-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {backupCodes.length > 0 ? 'Complete' : actionLoading ? 'Generating...' : 'Generate new codes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
