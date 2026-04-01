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

const DEFAULT_MISSION = 'Criar primeiro projeto web com chat e live preview'
const REGISTER_HIGHLIGHTS = [
  'Wizard de onboarding para escolher missao e template sem navegar por telas soltas.',
  'Studio Home com projetos, readiness e billing em uma unica shell.',
  'Entrada pensada para levar voce ao primeiro valor, nao a um dashboard vazio.',
]

const REGISTER_STATS = [
  { value: '90s', label: 'alvo de first value' },
  { value: 'Apps', label: 'dominio principal' },
  { value: 'Multi', label: 'workflow guiado' },
]

const SOCIAL_AUTH_MESSAGE =
  'OAuth social entra quando GitHub e Google estiverem configurados no runtime real. Ate la, o acesso principal continua sendo email e senha.'

export default function RegisterPageV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const requestedPlan = useMemo(() => searchParams.get('plan')?.trim() || 'starter', [searchParams])

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setFormError('Informe email e senha para criar a conta.')
      return
    }
    if (password.length < 8) {
      setFormError('Use pelo menos 8 caracteres para a senha.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('As senhas nao conferem.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok) {
        setFormError(payload.error || payload.message || 'Falha ao criar conta.')
        analytics?.track?.('error', 'error_api', {
          metadata: { source: 'register-form', status: response.status },
        })
        return
      }

      analytics?.track?.('user', 'register', {
        metadata: {
          source: 'auth-register',
          planIntent: requestedPlan,
        },
      })

      analytics?.track?.('performance', 'page_load', {
        label: 'register_completed',
        metadata: { planIntent: requestedPlan },
      })

      const mission = encodeURIComponent(DEFAULT_MISSION)
      router.push(`/dashboard?onboarding=1&source=register&mission=${mission}`)
    } catch {
      setFormError('Falha de rede ao criar conta. Tente novamente.')
      analytics?.track?.('error', 'error_api', {
        metadata: { source: 'register-form', reason: 'network' },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--aethel-surface-primary)] px-4 py-10 sm:px-6">
      <a
        href="#register-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--aethel-text-primary)]"
      >
        Ir para formulario de cadastro
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid-aethel" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-primary)_22%,transparent),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-stretch">
          <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-[0_24px_70px_rgba(2,8,23,0.35)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
                <Codicon name="arrow-left" />
                Voltar ao site
              </Link>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">
                Plano {requestedPlan}
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
              <h1 className="text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Criar conta no Aethel</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Entre no Studio Home e siga para onboarding, projeto e preview no mesmo fluxo.
              </p>
            </div>

            <form id="register-form" onSubmit={handleRegister} className="space-y-5" noValidate aria-describedby={formError ? 'register-form-error' : undefined}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm text-[var(--aethel-text-secondary)]">
                  Nome
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                  placeholder="Seu nome (opcional)"
                />
              </div>

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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm text-[var(--aethel-text-secondary)]">
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    aria-invalid={Boolean(formError)}
                    className="w-full rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                    placeholder="Minimo 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm text-[var(--aethel-text-secondary)]">
                    Confirmar senha
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    aria-invalid={Boolean(formError)}
                    className="w-full rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              {formError && (
                <div id="register-form-error" className="aethel-state aethel-state-error text-xs" role="alert" aria-live="polite">
                  {formError}
                </div>
              )}

              <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  Primeiro passo
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Voce segue para o dashboard com onboarding ativo e missao inicial preparada.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="aethel-button aethel-button-primary w-full justify-center rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Criando conta...' : 'Criar conta e abrir studio'}
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
                <span className="ml-auto rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
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
                <span className="ml-auto rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                  em breve
                </span>
              </button>
            </div>

            <p className="mt-3 text-xs leading-6 text-[var(--aethel-text-tertiary)]">
              {SOCIAL_AUTH_MESSAGE}
            </p>

            <p className="mt-6 text-center text-sm text-[var(--aethel-text-secondary)]">
              Ja tem conta?{' '}
              <Link href="/login" className="font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-info-light)]">
                Fazer login
              </Link>
            </p>
          </section>

          <AuthExperiencePanel
            eyebrow="Primeiro acesso"
            domainLabel={`Onboarding ${requestedPlan}`}
            title="Crie a conta ja com o contexto certo para entrar no produto."
            description="O cadastro precisa preparar o usuario para usar o studio, nao apenas empilhar campos."
            highlights={REGISTER_HIGHLIGHTS}
            stats={REGISTER_STATS}
            visual={{
              src: '/screenshots/editor.png',
              alt: 'Workbench do Aethel Studio',
              caption: 'O primeiro acesso precisa apontar para chat, editor e preview no mesmo workbench.',
              chips: ['Mission-first', 'Onboarding guiado', 'IDE + preview'],
            }}
          />
        </div>
      </div>
    </main>
  )
}

