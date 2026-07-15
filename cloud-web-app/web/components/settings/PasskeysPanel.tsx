'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'

type RegisterState = 'idle' | 'loading' | 'success' | 'error'

export default function PasskeysPanel() {
  const [state, setState] = useState<RegisterState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function registerPasskey() {
    setState('loading')
    setMessage(null)

    try {
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!optionsResponse.ok) throw new Error('Could not start passkey setup.')

      const optionsJSON = await optionsResponse.json()
      const registration = await startRegistration({ optionsJSON })

      const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      })
      if (!verifyResponse.ok) throw new Error('Passkey verification failed.')

      setState('success')
      setMessage('Passkey saved. Your device can now be used for passwordless sign-in.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Passkey setup failed.')
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Passkeys</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">
              Passwordless login with device-bound credentials
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--aethel-text-secondary)]">
              Register a platform passkey for faster sign-in. Challenges are short-lived, credentials are scoped to this
              relying party, and the server stores only public-key material.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={registerPasskey}
          disabled={state === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:bg-[var(--aethel-surface-tertiary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Add passkey
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm ${
            state === 'success' ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
