'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import AuthExperiencePanel from '@/components/auth/AuthExperiencePanel'
import { analytics } from '@/lib/analytics'

type AuthResponse = {
  access_token?: string
  error?: string
  message?: string
  user?: {
    id: string
    email: string
    name?: string | null
    plan?: string | null
  }
}

const DEFAULT_REDIRECT = '/dashboard'
const LOGIN_HIGHLIGHTS = [
  'Studio Home com projetos, onboarding e billing na mesma superficie.',
  'IDE com chat, preview e contexto do projeto conectados.',
  'Readiness explicita para mostrar o que esta pronto ou parcial.',
]

const LOGIN_STATS = [
  { value: 'Apps', label: 'foco atual' },
  { value: 'IDE', label: 'workbench continuo' },
  { value: 'L4', label: 'readiness visivel' },
]

export default function LoginPageV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const nextTarget = useMemo(() => {
    const requested = searchParams.get('next')?.trim()
    if (!requested || !requested.startsWith('/')) return DEFAULT_REDIRECT
    if (requested.startsWith('/api/')) return DEFAULT_REDIRECT
    return requested
  }, [searchParams])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setFormError('Informe email e senha para continuar.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok) {
        setFormError(payload.error || payload.message || 'Falha ao autenticar usuario.')
        analytics?.track?.('error', 'error_api', {
          metadata: { source: 'login-form', status: response.status },
        })
        return
      }

      analytics?.track?.('user', 'login', {
        metadata: {
          source: 'auth-login',
          nextTarget,
        },
      })

      analytics?.track?.('engine', 'editor_open', {
        metadata: {
          source: 'login-success',
          target: nextTarget,
        },
      })

      router.push(nextTarget)
    } catch {
      setFormError('Falha de rede ao autenticar. Tente novamente.')
      analytics?.track?.('error', 'error_api', {
        metadata: { source: 'login-form', reason: 'network' },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--aethel-surface-primary)] px-4 py-10 sm:px-6">
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--aethel-text-primary)]"
      >
        Ir para formulario de login
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid-aethel" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-stretch">
          <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
                <Codicon name="arrow-left" />
                Voltar ao site
              </Link>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Workspace
              </span>
            </div>

            <div className="mb-6 text-left">
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/branding/aethel-icon-source.png"
                  alt="Aethel"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="rounded-lg ring-1 ring-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]"
                  priority
                />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]/90">Aethel Studio</span>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Entrar no Studio</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Retome seu projeto e siga no mesmo fluxo entre dashboard, IDE e preview.
              </p>
            </div>

            <form id="login-form" onSubmit={handleLogin} className="space-y-5" noValidate aria-describedby={formError ? 'login-form-error' : undefined}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-[var(--aethel-text-secondary)]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={Boolean(formError)}
                  className="w-full rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                  placeholder="voce@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm text-[var(--aethel-text-secondary)]">
                    Senha
                  </label>
                  <Link href="/forgot-password" className="text-xs text-[var(--aethel-info-light)] hover:text-[var(--aethel-info-light)]">
                    Esqueci a senha
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  aria-invalid={Boolean(formError)}
                  className="w-full rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                  placeholder="Digite sua senha"
                />
              </div>

              {formError && (
                <div id="login-form-error" className="aethel-state aethel-state-error text-xs" role="alert" aria-live="polite">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="aethel-button aethel-button-primary w-full justify-center rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar no workspace'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--aethel-surface-tertiary)]" />
              <span className="text-[11px] tracking-wide text-[var(--aethel-text-tertiary)]">OAuth</span>
              <div className="h-px flex-1 bg-[var(--aethel-surface-tertiary)]" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)] opacity-70"
                aria-label="Continuar com GitHub (indisponivel ate configurar OAuth)"
              >
                <Codicon name="github-inverted" />
                Continuar com GitHub
                <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                  em breve
                </span>
              </button>
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)] opacity-70"
                aria-label="Continuar com Google (indisponivel ate configurar OAuth)"
              >
                <Codicon name="google" />
                Continuar com Google
                <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                  em breve
                </span>
              </button>
            </div>

            <p className="mt-3 text-xs leading-6 text-[var(--aethel-text-tertiary)]">OAuth entra assim que Google e GitHub forem ligados. Por enquanto, o acesso oficial continua por email e senha.</p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Proximo passo
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Depois do login, voce segue para <span className="font-medium text-[var(--aethel-text-primary)]">{nextTarget}</span>.
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-[var(--aethel-text-secondary)]">
              Nao tem conta?{' '}
              <Link href="/register" className="font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-info-light)]">
                Criar conta
              </Link>
            </p>
          </section>

          <AuthExperiencePanel
            eyebrow="Acesso operacional"
            domainLabel="Apps + Pesquisa"
            title="Entre para continuar no mesmo fluxo de produto."
            description="O login devolve voce ao fluxo real do studio em vez de abrir uma area isolada."
            highlights={LOGIN_HIGHLIGHTS}
            stats={LOGIN_STATS}
            visual={{
              src: '/screenshots/dashboard.png',
              alt: 'Dashboard do Aethel Studio',
              caption: 'A superficie principal ja entrega contexto, sinais de readiness e entrada para o workbench.',
              chips: ['Dashboard shell', 'Billing readiness', 'Onboarding guiado'],
            }}
          />
        </div>
      </div>
    </main>
  )
}

