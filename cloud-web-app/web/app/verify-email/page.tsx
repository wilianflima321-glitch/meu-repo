'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, Mail, RefreshCw, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

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

        const payload = await res.json()
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
      const payload = await res.json()
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

  const frameClass =
    'w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/70 p-8 backdrop-blur'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] px-4">
        <div className={frameClass}>
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Verificando email</h1>
            <p className="text-sm text-slate-400">Validando seu link de acesso.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] px-4">
        <div className={frameClass}>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Email verificado</h1>
            <p className="text-sm text-slate-400 mb-5">Sua conta foi validada. Redirecionando para o painel.</p>
            <Link
              href="/dashboard"
              className="w-full text-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 transition-colors"
            >
              Ir para dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] px-4">
        <div className={frameClass}>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Confirme seu email</h1>
            <p className="text-sm text-slate-400 mb-5">Abra o link enviado para concluir a ativacao da conta.</p>
            <div className="w-full space-y-3">
              <button
                onClick={resendVerification}
                disabled={isResending}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isResending ? 'Enviando...' : 'Reenviar verificacao'}
              </button>
              <Link
                href="/dashboard"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-white font-medium py-2.5 text-center transition-colors"
              >
                Continuar para dashboard
              </Link>
            </div>
            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] px-4">
      <div className={frameClass}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Falha na verificacao</h1>
          <p className="text-sm text-slate-400 mb-5">{error || 'Link invalido ou expirado.'}</p>
          <div className="w-full space-y-3">
            <button
              onClick={resendVerification}
              disabled={isResending}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isResending ? 'Enviando...' : 'Solicitar novo link'}
            </button>
            <Link
              href="/login"
              className="block w-full rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-white font-medium py-2.5 text-center transition-colors"
            >
              Voltar para login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0d12]">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
