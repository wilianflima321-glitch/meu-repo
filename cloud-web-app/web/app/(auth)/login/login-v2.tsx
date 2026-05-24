'use client'

import { useMemo, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { ArrowLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import AuthExperiencePanel from '@/components/auth/AuthExperiencePanel'
import TurnstileField, { isTurnstileClientConfigured } from '@/components/auth/TurnstileField'
import { analytics } from '@/lib/analytics'
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

type AuthResponse = {
  access_token?: string
  error?: string
  message?: string
}

type OAuthProvider = 'github' | 'google' | 'gitlab' | 'discord'

const DEFAULT_REDIRECT = '/dashboard'
const LOGIN_HIGHLIGHTS = [
  'Return to the same dashboard, IDE, and preview flow after authentication.',
  'Keep project context visible before agents or runtime tools make changes.',
  'Use readiness and evidence signals instead of a noisy marketing wall.',
]

const LOGIN_STATS = [
  { value: '1', label: 'studio flow' },
  { value: '20+', label: 'guided agents' },
  { value: 'Ready', label: 'evidence flow' },
]

const OAUTH_PROVIDERS: Array<{ id: OAuthProvider; label: string; mark: string }> = [
  { id: 'github', label: 'GitHub', mark: 'GH' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'gitlab', label: 'GitLab', mark: 'GL' },
  { id: 'discord', label: 'Discord', mark: 'DC' },
]

function AuthProviderMark({ mark }: { mark: string }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[10px] font-bold tracking-[-0.02em] text-[var(--aethel-text-primary)]">
      {mark}
    </span>
  )
}

export default function LoginPageV2() {
  const search = useBrowserSearch()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false)
  const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const nextTarget = useMemo(() => {
    const requested = searchParams.get('next')?.trim()
    if (!requested || !requested.startsWith('/') || requested.startsWith('/api/')) return DEFAULT_REDIRECT
    return requested
  }, [searchParams])

  const isHumanVerificationPending = isTurnstileClientConfigured() && !turnstileToken

  const requireHumanVerification = () => {
    if (!isHumanVerificationPending) {
      return true
    }

    setFormError('Complete human verification to continue.')
    setAuthNotice(null)
    return false
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setFormError('Enter your email and password to continue.')
      return
    }
    if (!requireHumanVerification()) {
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    setAuthNotice(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, turnstileToken }),
      })
      const payload = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok) {
        setFormError(payload.error || payload.message || 'Failed to authenticate user.')
        analytics?.track?.('error', 'error_api', { metadata: { source: 'login-form', status: response.status } })
        return
      }
      analytics?.track?.('user', 'login', { metadata: { source: 'auth-login', nextTarget } })
      window.location.assign(nextTarget)
    } catch {
      setFormError('Network failure while authenticating. Try again.')
      analytics?.track?.('error', 'error_api', { metadata: { source: 'login-form', reason: 'network' } })
    } finally {
      setIsSubmitting(false)
    }
  }

  const startOAuth = (provider: OAuthProvider) => {
    analytics?.track?.('user', 'oauth_start', { label: provider, metadata: { source: 'login-form', nextTarget } })
    window.location.href = `/api/auth/oauth/${provider}`
  }

  const handlePasskeyLogin = async () => {
    if (!requireHumanVerification()) {
      return
    }

    setIsPasskeySubmitting(true)
    setFormError(null)
    setAuthNotice(null)

    try {
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined, turnstileToken }),
      })
      if (!optionsResponse.ok) {
        const payload = (await optionsResponse.json().catch(() => ({}))) as AuthResponse
        setFormError(payload.error || payload.message || 'Passkey challenge could not start.')
        return
      }

      const optionsJSON = (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON
      const credential = await startAuthentication({ optionsJSON })
      const verifyResponse = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      })
      const payload = (await verifyResponse.json().catch(() => ({}))) as AuthResponse
      if (!verifyResponse.ok) {
        setFormError(payload.error || payload.message || 'Passkey authentication failed.')
        return
      }

      analytics?.track?.('user', 'login', { metadata: { source: 'auth-passkey', nextTarget } })
      window.location.assign(nextTarget)
    } catch (error) {
      const cancelled = error instanceof Error && /abort|cancel|notallowed/i.test(error.message)
      setFormError(cancelled ? 'Passkey sign-in was cancelled.' : 'Passkey sign-in is unavailable on this device.')
    } finally {
      setIsPasskeySubmitting(false)
    }
  }

  const handleMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setFormError('Enter your email before requesting a magic link.')
      return
    }
    if (!requireHumanVerification()) {
      return
    }

    setIsMagicLinkSubmitting(true)
    setFormError(null)
    setAuthNotice(null)

    try {
      const response = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, turnstileToken }),
      })
      const payload = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok) {
        setFormError(payload.error || payload.message || 'Magic link could not be sent.')
        return
      }

      setAuthNotice(payload.message || 'If an account exists for this email, a one-time sign-in link has been sent.')
      analytics?.track?.('user', 'auth_intent', { label: 'magic-link', metadata: { source: 'auth-login', nextTarget } })
    } catch {
      setFormError('Network failure while requesting the magic link. Try again.')
    } finally {
      setIsMagicLinkSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--aethel-surface-primary)] px-4 py-8 text-[var(--aethel-text-primary)] sm:px-6 lg:py-10">
        <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-sm">
          Skip to the login form
        </a>
        <div className="pointer-events-none absolute inset-0 bg-grid-aethel opacity-45" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,color-mix(in_srgb,var(--aethel-info)_18%,transparent),transparent_34%),radial-gradient(circle_at_82%_8%,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),transparent_30%)]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1120px] items-center">
          <div className="grid w-full gap-5 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-stretch">
            <section className="mx-auto w-full max-w-[430px] rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-7 lg:mx-0">
              <div className="mb-7 flex items-center justify-between gap-3">
                <Link href="/" className="inline-flex items-center gap-2 rounded-full px-1 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">Studio</span>
              </div>

              <div className="mb-7">
                <div className="mb-4 flex items-center gap-3">
                  <Image src="/branding/aethel-mark.svg" alt="Aethel" width={36} height={36} sizes="36px" className="rounded-xl shadow-[0_0_0_1px_var(--aethel-border-primary)]" priority />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">Aethel Studio</span>
                </div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--aethel-text-primary)]">Sign in</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Resume the exact project flow you left: dashboard, IDE, preview, and readiness.</p>
              </div>

              <div className="mb-5">
                <TurnstileField action="login" onTokenChange={setTurnstileToken} />
              </div>

              <div className="mb-5 space-y-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/42 p-3" aria-label="Fast sign-in options">
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isPasskeySubmitting || isSubmitting || isHumanVerificationPending}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--aethel-info)] text-sm font-semibold text-slate-950 transition hover:bg-[var(--aethel-info-light)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" /> {isPasskeySubmitting ? 'Waiting for passkey...' : 'Continue with passkey'}
                </button>
                <p className="text-center text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
                  Passwordless first. Magic link and password stay available for teams that need fallback access.
                </p>
              </div>

              <form id="login-form" onSubmit={handleLogin} className="space-y-4" noValidate aria-describedby={formError ? 'login-form-error' : undefined}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email webauthn" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(formError)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none transition placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="you@company.com" />
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={isMagicLinkSubmitting || isSubmitting || isHumanVerificationPending}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isMagicLinkSubmitting ? 'Sending magic link...' : 'Send magic link'}
                  </button>
                </div>
                {formError ? <div id="login-form-error" className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error-light)]" role="alert" aria-live="polite">{formError}</div> : null}
                {authNotice ? <div id="login-form-notice" className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-success-light)]" role="status" aria-live="polite">{authNotice}</div> : null}
                <details className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/35 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-secondary)]">
                    Use password fallback
                  </summary>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="password" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Password</label>
                      <Link href="/forgot-password" className="text-xs font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-text-primary)]">Forgot password?</Link>
                    </div>
                    <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(formError)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none transition placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="Enter your password" />
                  </div>
                  <button type="submit" disabled={isSubmitting || isHumanVerificationPending} className="mt-3 h-12 w-full rounded-2xl bg-[var(--aethel-info)] text-sm font-semibold text-slate-950 transition hover:bg-[var(--aethel-info-light)] disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? 'Signing in...' : 'Continue with password'}
                  </button>
                </details>
              </form>

              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-[var(--aethel-border-primary)]" /><span className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">or</span><div className="h-px flex-1 bg-[var(--aethel-border-primary)]" /></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {OAUTH_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => startOAuth(provider.id)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/55 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    <AuthProviderMark mark={provider.mark} />
                    {provider.label}
                  </button>
                ))}
              </div>
              <Link
                href="/contact-sales?intent=sso"
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_42%,transparent)]"
              >
                Team SSO / SAML for enterprise
              </Link>

              <div className="mt-6 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next step</p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Continue to <span className="font-medium text-[var(--aethel-text-primary)]">{nextTarget}</span> with the same product context.</p>
              </div>

              <p className="mt-6 text-center text-sm text-[var(--aethel-text-secondary)]">No account yet? <Link href="/register" className="font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-text-primary)]">Create one</Link></p>
            </section>

            <AuthExperiencePanel eyebrow="Operational access" domainLabel="Apps + Research" title="A quieter entry into serious work." description="The auth surface now behaves like a product door, not a billboard: one decision, one form, one visible next step." highlights={LOGIN_HIGHLIGHTS} stats={LOGIN_STATS} />
          </div>
        </div>
    </main>
  )
}
