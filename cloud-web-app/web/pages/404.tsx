export default function Legacy404Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 text-[var(--aethel-text-primary)]">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--aethel-info-light)]">Aethel Engine</p>
        <h1 className="mt-3 text-3xl font-semibold">Pagina nao encontrada</h1>
        <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
          O caminho pedido nao existe ou foi movido para outra superficie do studio.
        </p>
      </div>
    </main>
  )
}
