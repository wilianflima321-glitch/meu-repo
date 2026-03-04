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

const DEFAULT_REDIRECT = '/dashboard'

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 sm:px-6">
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-zinc-100"
      >
        Ir para formulario de login
      </a>
      <div className="pointer-events-none absolute inset-0 bg-grid-zinc-700/[0.12]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/85 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
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
          <h1 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">Entrar no Studio</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Acesse seu workspace e continue o fluxo de criacao com chat e preview.
          </p>
        </div>

        <form id="login-form" onSubmit={handleLogin} className="space-y-5" noValidate aria-describedby={formError ? 'login-form-error' : undefined}>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm text-zinc-300">
                Senha
              </label>
              <Link href="/forgot-password" className="text-xs text-cyan-300 hover:text-cyan-200">
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
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
            className="aethel-button aethel-button-primary w-full justify-center rounded-lg px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
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
            onClick={() => setFormError('Login social sera habilitado quando os providers OAuth forem configurados.')}
            aria-label="Continuar com GitHub (indisponivel ate configurar OAuth)"
          >
            <Codicon name="github-inverted" />
            Continuar com GitHub
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => setFormError('Login social sera habilitado quando os providers OAuth forem configurados.')}
            aria-label="Continuar com Google (indisponivel ate configurar OAuth)"
          >
            <Codicon name="google" />
            Continuar com Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Nao tem conta?{' '}
          <Link href="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
