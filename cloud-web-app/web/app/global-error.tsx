'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section className="w-full max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Global runtime error</p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">Algo deu errado</h1>
            <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
              Mantivemos o fallback de mais alto nivel o mais simples possivel enquanto seguimos depurando a raiz do problema.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)]"
              >
                Tentar novamente
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-4 py-2.5 text-sm font-medium text-[var(--aethel-text-primary)]"
              >
                Voltar ao inicio
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
