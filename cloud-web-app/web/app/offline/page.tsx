export const metadata = {
  title: 'Offline - Aethel Engine',
  description: 'Offline recovery surface for Aethel Studio.',
}

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-6 py-16 text-[hsl(var(--foreground))]">
      <section className="mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          Aethel offline mode
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Studio connection paused.</h1>
          <p className="text-base leading-7 text-[hsl(var(--muted-foreground))]">
            Your local shell is still available. Reconnect when the network returns, then resume the last mission,
            review evidence, or cancel heavy jobs safely.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-[hsl(var(--muted-foreground))] md:grid-cols-3">
          <div className="rounded-2xl border border-[hsl(var(--border))] p-4">Mission ledger stays recoverable.</div>
          <div className="rounded-2xl border border-[hsl(var(--border))] p-4">Local runtime jobs keep explicit status.</div>
          <div className="rounded-2xl border border-[hsl(var(--border))] p-4">No agent claims success without sync.</div>
        </div>
        <a
          href="/studio"
          className="inline-flex w-fit rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
        >
          Try reconnecting
        </a>
      </section>
    </main>
  )
}