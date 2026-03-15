'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

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

  const frameClass = 'w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8'

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-600/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 pb-16 pt-12">
        {!token || !email ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold">Link invalido</h1>
              <p className="mt-3 text-sm text-slate-400">Este link expirou ou nao e valido.</p>
              <Link
                href="/forgot-password"
                className="aethel-button aethel-button-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Solicitar novo link
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className={frameClass}>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold">Senha redefinida</h1>
              <p className="mt-3 text-sm text-slate-400">Sua senha foi redefinida. Redirecionando para o login.</p>
              <Link
                href="/login"
                className="aethel-button aethel-button-ghost mt-6 inline-flex rounded-xl px-5 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Ir para login agora
              </Link>
            </div>
          </div>
        ) : (
          <div className={frameClass}>
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                <Lock className="h-8 w-8 text-blue-300" />
              </div>
              <h1 className="text-2xl font-bold">Redefinir senha</h1>
              <p className="mt-2 text-sm text-slate-400">Defina uma nova senha para sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
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
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-300">
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
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                />
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <p className={password.length >= 8 ? 'text-emerald-400' : ''}>? Pelo menos 8 caracteres</p>
                <p className={password === confirmPassword && password.length > 0 ? 'text-emerald-400' : ''}>
                  ? Senhas coincidem
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="aethel-button aethel-button-primary w-full rounded-xl px-4 py-3 text-sm font-semibold"
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
              className="aethel-button aethel-button-ghost mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold"
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
