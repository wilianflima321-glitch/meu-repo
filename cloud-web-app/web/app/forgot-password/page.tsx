'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Falha ao enviar email de redefinicao')
        return
      }

      setIsSuccess(true)
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 pb-16 pt-12">
        <div className="w-full max-w-md rounded-3xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-8">
          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]">
                <CheckCircle className="h-8 w-8 text-[var(--aethel-success)]" />
              </div>
              <h1 className="text-2xl font-bold">Verifique seu email</h1>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Se existir uma conta com <span className="text-[var(--aethel-text-primary)]">{email}</span>, voce recebera um link de redefinicao em instantes.
              </p>
              <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Nao encontrou? Verifique sua caixa de spam.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] mt-6 inline-flex rounded-xl px-5 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_20%,transparent),color-mix(in_srgb,var(--aethel-info)_20%,transparent))]">
                  <Mail className="h-8 w-8 text-[var(--aethel-primary-light)]" />
                </div>
                <h1 className="text-2xl font-bold">Esqueceu a senha?</h1>
                <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Vamos enviar as instrucoes para redefinir sua senha.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[var(--aethel-error)]/10 p-3 text-sm text-[var(--aethel-error-light)]">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:brightness-110 w-full rounded-xl px-4 py-3 text-sm font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de redefinicao'
                )}
              </button>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] w-full rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
