'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section className="w-full max-w-lg rounded-3xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Global runtime error</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Algo deu errado</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              O fallback de mais alto nivel entrou em acao para manter a superficie responsiva enquanto seguimos depurando a raiz do problema.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-all hover:brightness-110"
              >
                Tentar novamente
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
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
