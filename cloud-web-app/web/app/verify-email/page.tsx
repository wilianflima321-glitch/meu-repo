'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, CheckCircle, Loader2, XCircle, RefreshCw } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const doVerify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Verification failed')
          return
        }

        setIsVerified(true)
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } catch (err) {
        setError('Network error. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (token && email) {
      doVerify()
    } else {
      setIsLoading(false)
    }
  }, [token, email, router])

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'GET',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to resend verification email')
        return
      }

      setError('')
      alert('Verification email sent! Check your inbox.')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying your email...</h1>
            <p className="text-slate-400">Please wait a moment.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Email Verified!</h1>
            <p className="text-slate-400 mb-6">
              Your email has been verified successfully. Redirecting to dashboard...
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No token - show instructions
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Verify Your Email</h1>
            <p className="text-slate-400 mb-6">
              Please check your email inbox and click the verification link we sent you.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Resend verification email
                  </>
                )}
              </button>
              <Link
                href="/dashboard"
                className="block w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl transition-all text-center"
              >
                Continue to Dashboard
              </Link>
            </div>
            {error && (
              <p className="mt-4 text-red-400 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Verification Failed</h1>
          <p className="text-slate-400 mb-6">
            {error || 'The verification link is invalid or has expired.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Request new verification
                </>
              )}
            </button>
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl transition-all text-center"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
