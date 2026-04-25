export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-16 text-[var(--aethel-text-primary)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Pagina nao encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          Esta rota nao esta disponivel. Voltamos para uma superficie estavel enquanto mantemos a leitura honesta do sistema.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-all hover:brightness-110"
          >
            Voltar ao inicio
          </a>
          <a
            href="/docs"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
          >
            Documentacao
          </a>
        </div>
      </section>
    </main>
  )
}
