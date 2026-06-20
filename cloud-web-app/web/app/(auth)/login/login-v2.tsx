'use client'

import { useMemo, useState } from 'react'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { ArrowLeft, KeyRound, Mail, ChevronRight, Lock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import AuthExperiencePanel from '@/components/auth/AuthExperiencePanel'
import TurnstileField, { isTurnstileClientConfigured } from '@/components/auth/TurnstileField'
import { analytics } from '@/lib/analytics'
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type AuthResponse = {
  access_token?: string
  error?: string
  message?: string
}

type OAuthProvider = 'github' | 'google' | 'gitlab' | 'discord'

const DEFAULT_REDIRECT = '/dashboard'
const LOGIN_HIGHLIGHTS = [
  'Dashboard, IDE, preview, and activity stay connected.',
  'Agents wait for authenticated context before acting.',
]

const LOGIN_STATS = [
  { value: '1', label: 'studio flow' },
  { value: '20+', label: 'agents' },
  { value: 'Live', label: 'activity' },
]

const OAUTH_PROVIDERS: Array<{ id: OAuthProvider; label: string; mark: string }> = [
  { id: 'github', label: 'GitHub', mark: 'GH' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'gitlab', label: 'GitLab', mark: 'GL' },
  { id: 'discord', label: 'Discord', mark: 'DC' },
]

function AuthProviderMark({ mark }: { mark: string }) {
  return (
    <span className="grid h-6 w-6 place-items-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[10px] font-bold tracking-[-0.02em] text-[var(--aethel-text-primary)] rounded">
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
    const requested = searchParams.get('next')?.trim() || searchParams.get('from')?.trim()
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

  const submitPasswordLogin = async () => {
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
      const { startAuthentication } = await import('@simplewebauthn/browser')
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

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1120px] items-center">
          <div className="grid w-full gap-5 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-stretch">
            <section className="mx-auto w-full max-w-[430px] rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-8 py-8 shadow-[var(--aethel-shadow-xl)] backdrop-blur-md lg:mx-0">
              <div className="mb-8 flex items-center justify-between gap-3">
                <Link href="/" className="inline-flex items-center gap-2 px-1 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)] border border-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)]">Studio</span>
              </div>

              <div className="mb-8">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--aethel-surface-tertiary)] to-[var(--aethel-surface-primary)] shadow-[0_0_0_1px_var(--aethel-border-primary)]">
                    <Image src="/branding/aethel-mark.svg" alt="Aethel" width={24} height={24} priority />
                  </div>
                </div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--aethel-text-primary)]">Welcome back</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Resume your workspace with context intact.</p>
                <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-tertiary)]">Passkey or magic link first.</p>
              </div>

              <div className="mb-6">
                <TurnstileField action="login" onTokenChange={setTurnstileToken} />
              </div>

              {formError && (
                <div id="login-form-error" className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error-light)]" role="alert" aria-live="polite">
                  {formError}
                </div>
              )}
              {authNotice && (
                <div id="login-form-notice" className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-success-light)]" role="status" aria-live="polite">
                  {authNotice}
                </div>
              )}

              <form
                id="login-form"
                onSubmit={(event) => event.preventDefault()}
                className="space-y-5"
                noValidate
                aria-describedby={formError ? 'login-form-error' : undefined}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  autoComplete="email webauthn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="you@company.com"
                  icon={<Mail className="h-4 w-4" />}
                />

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handlePasskeyLogin}
                    loading={isPasskeySubmitting}
                    disabled={isSubmitting || isMagicLinkSubmitting || isHumanVerificationPending}
                    icon={<KeyRound className="h-4 w-4" />}
                  >
                    Continue with passkey
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    size="lg"
                    onClick={handleMagicLink}
                    loading={isMagicLinkSubmitting}
                    disabled={isSubmitting || isPasskeySubmitting || isHumanVerificationPending}
                  >
                    Send magic link
                  </Button>
                </div>

                <details className="border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] px-4 py-3">
                  <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)]">
                    Use password fallback
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Password</label>
                        <Link href="/forgot-password" className="text-xs font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-info)] transition-colors">Forgot password?</Link>
                      </div>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        icon={<Lock className="h-4 w-4" />}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      size="lg"
                      onClick={() => void submitPasswordLogin()}
                      loading={isSubmitting}
                      disabled={isHumanVerificationPending}
                    >
                      Use password fallback
                    </Button>
                  </div>
                </details>
              </form>

              <div className="mt-8 pt-6 border-t border-[var(--aethel-border-subtle)]">
                <details className="group">
                  <summary className="mb-4 cursor-pointer list-none text-center text-xs font-medium uppercase tracking-wider text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)]">
                    More sign-in options
                  </summary>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {OAUTH_PROVIDERS.map((provider) => (
                      <Button
                        key={provider.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startOAuth(provider.id)}
                        className="justify-start px-4"
                        icon={<AuthProviderMark mark={provider.mark} />}
                      >
                        {provider.label}
                      </Button>
                    ))}
                  </div>
                </details>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <Link
                  href="/contact-sales?intent=sso"
                  className="group flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-info-light)] transition hover:text-[var(--aethel-info)]"
                >
                  Team SSO / SAML for enterprise <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="text-sm text-[var(--aethel-text-secondary)]">
                  No account yet? <Link href="/register" className="font-semibold text-[var(--aethel-text-primary)] hover:underline">Create one</Link>
                </p>
              </div>
            </section>

            <AuthExperiencePanel eyebrow="Operational access" domainLabel="Apps + Research" title="Enter once. Keep moving." description="Sign in, reopen the workspace, and continue from the latest activity." highlights={LOGIN_HIGHLIGHTS} stats={LOGIN_STATS} />
          </div>
        </div>
    </main>
  )
}
