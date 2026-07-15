'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

function ForgotPasswordContent() {
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
        setError(data.error || 'Failed to send reset email')
        return
      }

      setIsSuccess(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]"
      data-forgot-password-surface="compact"
    >
      <PublicHeader />

      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6 pb-16 pt-12">
        <div className="w-full max-w-md border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-8">
          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]">
                <CheckCircle className="h-8 w-8 text-[var(--aethel-success)]" />
              </div>
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                If an account exists for{' '}
                <span className="text-[var(--aethel-text-primary)]">{email}</span>, you will receive
                a reset link shortly.
              </p>
              <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
                Nothing arrived? Check your spam folder.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] mt-6 px-5 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_74%,transparent)]">
                  <Mail className="h-8 w-8 text-[var(--aethel-primary-light)]" />
                </div>
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                  We will send instructions to reset your password.
                </p>
              </div>

              {error && (
                <div className="border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[var(--aethel-error)]/10 p-3 text-sm text-[var(--aethel-error-light)]">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 w-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:bg-[var(--aethel-primary-dark)] w-full px-4 py-3 text-sm font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] w-full px-4 py-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

export default function ForgotPasswordContentPage() {
  return <ForgotPasswordContent />
}
