export default function Legacy500Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 text-[var(--aethel-text-primary)]">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--aethel-warning)]">Aethel Engine</p>
        <h1 className="mt-3 text-3xl font-semibold">Erro interno temporario</h1>
        <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
          O studio encontrou um erro inesperado. Recarregue a sessao ou tente novamente em instantes.
        </p>
      </div>
    </main>
  )
}
