'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

function ResetPasswordForm() {
  const router = useRouter()
  const search = useBrowserSearch()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setError('Link de redefinicao invalido. Solicite um novo.')
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Falha ao redefinir a senha')
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const frameClass =
    'w-full max-w-md rounded-3xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-8'

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 pb-16 pt-12">
        {!token || !email ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aethel-error)]/10">
                <XCircle className="h-8 w-8 text-[var(--aethel-error)]" />
              </div>
              <h1 className="text-2xl font-bold">Link invalido</h1>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Este link expirou ou nao e valido.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] mt-6 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Solicitar novo link
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]">
                <CheckCircle className="h-8 w-8 text-[var(--aethel-success)]" />
              </div>
              <h1 className="text-2xl font-bold">Senha redefinida</h1>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Sua senha foi redefinida. Redirecionando para o login.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] mt-6 rounded-xl px-5 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Ir para login agora
              </Link>
            </div>
          </div>
        ) : (
          <div className={frameClass}>
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] to-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]">
                <Lock className="h-8 w-8 text-[var(--aethel-primary-light)]" />
              </div>
              <h1 className="text-2xl font-bold">Redefinir senha</h1>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                Defina uma nova senha para sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[var(--aethel-error)]/10 p-3 text-sm text-[var(--aethel-error-light)]">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]"
                >
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????"
                    required
                    minLength={8}
                    className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 pr-12 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]"
                >
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="????????"
                  required
                  minLength={8}
                  className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                />
              </div>

              <div className="space-y-1 text-xs text-[var(--aethel-text-tertiary)]">
                <p className={password.length >= 8 ? 'text-[var(--aethel-success)]' : ''}>
                  ? Pelo menos 8 caracteres
                </p>
                <p
                  className={
                    password === confirmPassword && password.length > 0
                      ? 'text-[var(--aethel-success)]'
                      : ''
                  }
                >
                  ? Senhas coincidem
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] w-full rounded-xl px-4 py-3 text-sm font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}

export default function ResetPasswordContentPage() {
  return (
    <CoreUiProviders>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--aethel-surface-primary)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--aethel-primary-light)]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </CoreUiProviders>
  )
}
