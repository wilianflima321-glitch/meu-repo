'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-16 text-[var(--aethel-text-primary)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Runtime error</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          A camada principal falhou durante o carregamento. Vamos manter um fallback simples enquanto isolamos a causa raiz.
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
  )
}
