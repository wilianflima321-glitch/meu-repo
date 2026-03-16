'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, Mail, RefreshCw, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

function VerifyEmailContent() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })

        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(payload?.error || 'Falha na verificacao do email')
          return
        }

        setIsVerified(true)
        setTimeout(() => router.push('/dashboard'), 2500)
      } catch {
        setError('Erro de rede durante a verificacao')
      } finally {
        setIsLoading(false)
      }
    }

    if (token && email) {
      verify()
    } else {
      setIsLoading(false)
    }
  }, [token, email, router])

  const resendVerification = async () => {
    setIsResending(true)
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'GET' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error || 'Falha ao reenviar email')
        return
      }
      setError('')
      toast.success('Email reenviado com sucesso.')
    } catch {
      setError('Erro de rede ao reenviar email')
    } finally {
      setIsResending(false)
    }
  }

  const frameClass = 'w-full max-w-md rounded-3xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-8'

  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 pb-16 pt-12">
        {isLoading ? (
          <div className={frameClass}>
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-400" />
              <h1 className="text-xl font-semibold">Verificando email</h1>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Validando seu link de acesso.</p>
            </div>
          </div>
        ) : isVerified ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold">Email verificado</h1>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Conta validada. Redirecionando para o painel.</p>
              <Link
                href="/dashboard"
                className="aethel-button aethel-button-primary mt-6 inline-flex rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Ir para dashboard
              </Link>
            </div>
          </div>
        ) : !token || !email ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aethel-primary)]/10">
                <Mail className="h-7 w-7 text-blue-400" />
              </div>
              <h1 className="text-xl font-semibold">Confirme seu email</h1>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Abra o link enviado para ativar sua conta.</p>
              <div className="mt-5 space-y-3">
                <button
                  onClick={resendVerification}
                  disabled={isResending}
                  className="aethel-button aethel-button-primary w-full rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isResending ? 'Enviando...' : 'Reenviar verificacao'}
                </button>
                <Link
                  href="/dashboard"
                  className="aethel-button aethel-button-secondary w-full rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Continuar para dashboard
                </Link>
              </div>
              {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
            </div>
          </div>
        ) : (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aethel-error)]/10">
                <XCircle className="h-7 w-7 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold">Falha na verificacao</h1>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">{error || 'Link invalido ou expirado.'}</p>
              <div className="mt-5 space-y-3">
                <button
                  onClick={resendVerification}
                  disabled={isResending}
                  className="aethel-button aethel-button-primary w-full rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isResending ? 'Enviando...' : 'Solicitar novo link'}
                </button>
                <Link
                  href="/login"
                  className="aethel-button aethel-button-secondary w-full rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Voltar para login
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
