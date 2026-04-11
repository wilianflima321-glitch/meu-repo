'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('[Aethel Error Boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-md rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--aethel-text-secondary)]">
          Ocorreu um erro inesperado nesta superfície. Vamos manter a experiência honesta:
          tente novamente ou volte ao Studio enquanto investigamos a causa real.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
            Referência: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
          >
            <Home className="h-4 w-4" />
            Ir ao Studio
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--aethel-text-tertiary)]">
          Se o problema persistir, confira a documentação ou abra um fluxo de suporte.
        </p>
      </div>
    </div>
  )
}
