'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Codicon from '@/components/ide/Codicon'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import AuthExperiencePanel from '@/components/auth/AuthExperiencePanel'
import TurnstileField, { isTurnstileClientConfigured } from '@/components/auth/TurnstileField'
import { analytics } from '@/lib/analytics'
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

type AuthResponse = {
  access_token?: string
  error?: string
  message?: string
}

const DEFAULT_MISSION = 'Create a first web project with chat and live preview'
const REGISTER_HIGHLIGHTS = [
  'Start with a mission and template instead of an empty dashboard.',
  'Keep billing, onboarding, and project readiness on one surface.',
  'Make first value obvious before advanced studio surfaces appear.',
]
const REGISTER_STATS = [
  { value: '90s', label: 'first value' },
  { value: '1', label: 'guided path' },
  { value: 'L4', label: 'readiness' },
]

export default function RegisterPageV2() {
  const search = useBrowserSearch()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const requestedPlan = useMemo(() => searchParams.get('plan')?.trim() || 'starter', [searchParams])
  const isHumanVerificationPending = isTurnstileClientConfigured() && !turnstileToken

  const requireHumanVerification = () => {
    if (!isHumanVerificationPending) {
      return true
    }

    setFormError('Complete human verification to continue.')
    return false
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) return setFormError('Enter your email and password to create the account.')
    if (password.length < 8) return setFormError('Use at least 8 characters for the password.')
    if (password !== confirmPassword) return setFormError('Passwords do not match.')
    if (!requireHumanVerification()) return

    setIsSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim(), password, turnstileToken }),
      })
      const payload = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok) {
        setFormError(payload.error || payload.message || 'Failed to create account.')
        analytics?.track?.('error', 'error_api', { metadata: { source: 'register-form', status: response.status } })
        return
      }
      analytics?.track?.('user', 'register', { metadata: { source: 'auth-register', planIntent: requestedPlan } })
      window.location.assign(`/dashboard?onboarding=1&source=register&mission=${encodeURIComponent(DEFAULT_MISSION)}`)
    } catch {
      setFormError('Network failure while creating account. Try again.')
      analytics?.track?.('error', 'error_api', { metadata: { source: 'register-form', reason: 'network' } })
    } finally {
      setIsSubmitting(false)
    }
  }

  const startOAuth = (provider: 'github' | 'google') => {
    analytics?.track?.('user', 'oauth_start', { label: provider, metadata: { source: 'register-form', planIntent: requestedPlan } })
    window.location.href = `/api/auth/oauth/authorize?provider=${provider}`
  }

  return (
    <CoreUiProviders>
      <main className="relative min-h-screen overflow-hidden bg-[var(--aethel-surface-primary)] px-4 py-8 text-[var(--aethel-text-primary)] sm:px-6 lg:py-10">
        <a href="#register-form" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-sm">Skip to the registration form</a>
        <div className="pointer-events-none absolute inset-0 bg-grid-aethel opacity-45" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,color-mix(in_srgb,var(--aethel-primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_82%_8%,color-mix(in_srgb,var(--aethel-info)_12%,transparent),transparent_30%)]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1120px] items-center">
          <div className="grid w-full gap-5 lg:grid-cols-[460px_minmax(0,1fr)] lg:items-stretch">
            <section className="mx-auto w-full max-w-[460px] rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-7 lg:mx-0">
              <div className="mb-7 flex items-center justify-between gap-3">
                <Link href="/" className="inline-flex items-center gap-2 rounded-full px-1 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"><Codicon name="arrow-left" /> Back</Link>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">{requestedPlan}</span>
              </div>

              <div className="mb-7">
                <div className="mb-4 flex items-center gap-3"><Image src="/branding/aethel-icon-source.png" alt="Aethel" width={36} height={36} sizes="36px" className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-1" priority /><span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">Aethel Studio</span></div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--aethel-text-primary)]">Create account</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Open Studio with onboarding, project context, and a first mission ready.</p>
              </div>

              <form id="register-form" onSubmit={handleRegister} className="space-y-4" noValidate aria-describedby={formError ? 'register-form-error' : undefined}>
                <div className="space-y-2"><label htmlFor="name" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Name</label><input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="Your name" /></div>
                <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Email</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(formError)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="you@company.com" /></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="password" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Password</label><input id="password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={Boolean(formError)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="8+ characters" /></div><div className="space-y-2"><label htmlFor="confirm-password" className="text-sm font-medium text-[var(--aethel-text-secondary)]">Confirm</label><input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required aria-invalid={Boolean(formError)} className="h-12 w-full rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/70 px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_58%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" placeholder="Repeat password" /></div></div>
                <TurnstileField action="register" onTokenChange={setTurnstileToken} />
                {formError ? <div id="register-form-error" className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error-light)]" role="alert" aria-live="polite">{formError}</div> : null}
                <button type="submit" disabled={isSubmitting || isHumanVerificationPending} className="h-12 w-full rounded-2xl bg-[var(--aethel-primary)] text-sm font-semibold text-white transition hover:bg-[var(--aethel-primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Creating account...' : 'Create account and open Studio'}</button>
              </form>

              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-[var(--aethel-border-primary)]" /><span className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">or</span><div className="h-px flex-1 bg-[var(--aethel-border-primary)]" /></div>
              <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => startOAuth('github')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/55 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"><Codicon name="github" /> GitHub</button><button type="button" onClick={() => startOAuth('google')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/55 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"><Codicon name="google" /> Google</button></div>
              <p className="mt-6 text-center text-sm text-[var(--aethel-text-secondary)]">Already have an account? <Link href="/login" className="font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-text-primary)]">Sign in</Link></p>
            </section>

            <AuthExperiencePanel eyebrow="First access" domainLabel="Mission first" title="Start with context, not clutter." description="Registration should prepare the first useful action and keep the user inside a calm, inspectable workflow." highlights={REGISTER_HIGHLIGHTS} stats={REGISTER_STATS} />
          </div>
        </div>
      </main>
    </CoreUiProviders>
  )
}
