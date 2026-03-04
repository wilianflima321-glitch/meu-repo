'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 sm:px-6">
      <a
        href="#register-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-zinc-100"
      >
        Ir para formulario de cadastro
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid-zinc-700/[0.12]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/85 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Image
              src="/branding/aethel-icon-source.png"
              alt="Aethel"
              width={36}
              height={36}
              className="rounded-lg ring-1 ring-zinc-700/70"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/90">Aethel Studio</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">Criar conta no Aethel</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Entre no Studio Home e alcance o primeiro valor com chat, plano e preview em poucos passos.
          </p>
        </div>

        <form id="register-form" onSubmit={handleRegister} className="space-y-5" noValidate aria-describedby={formError ? 'register-form-error' : undefined}>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-zinc-300">
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Seu nome (opcional)"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-zinc-300">
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-zinc-300">
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm text-zinc-300">
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Repita a senha"
              />
            </div>
          </div>

          {formError && (
            <div id="register-form-error" className="aethel-state aethel-state-error text-xs" role="alert" aria-live="polite">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="aethel-button aethel-button-primary w-full justify-center rounded-lg px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[11px] tracking-wide text-zinc-500">OU</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => setFormError('Cadastro social sera habilitado quando OAuth for configurado.')}
            aria-label="Continuar com GitHub (indisponivel ate configurar OAuth)"
          >
            <Codicon name="github-inverted" />
            Continuar com GitHub
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => setFormError('Cadastro social sera habilitado quando OAuth for configurado.')}
            aria-label="Continuar com Google (indisponivel ate configurar OAuth)"
          >
            <Codicon name="google" />
            Continuar com Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Ja tem conta?{' '}
          <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  )
}
