'use client'

import { useEffect } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const logger = createComponentLogger('app-error-boundary')

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('App router error boundary captured runtime failure', {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    })
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-16 text-[var(--aethel-text-primary)]">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_84%,transparent)] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Runtime error</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          A superfície encontrou um erro inesperado. Estamos mantendo a leitura honesta: a falha ainda está aberta e o
          melhor próximo passo é tentar novamente ou voltar para uma área estável do produto.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-[var(--aethel-text-tertiary)]">
            Referência: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-all hover:brightness-110"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
          >
            Ir ao Studio
          </a>
          <a
            href="/status"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
          >
            Ver status
          </a>
        </div>
      </section>
    </main>
  )
}
