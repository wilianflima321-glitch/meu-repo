import Link from 'next/link'

export default function Custom404Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-16 text-[var(--aethel-text-primary)]">
      <section className="w-full max-w-2xl rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-10 text-center shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Pagina nao encontrada</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
          A rota que voce procurou nao esta disponivel. Para seguir sem atrito, volte para uma superficie estavel ou
          consulte a documentacao.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-all hover:brightness-110"
          >
            Voltar ao inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-6 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
          >
            Ir ao Studio
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-6 py-3 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
          >
            Documentacao
          </Link>
        </div>
      </section>
    </main>
  )
}
