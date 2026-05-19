type RouteLoadingProps = {
  title: string;
  detail?: string;
};

export function RouteLoading({ title, detail = "Preparing the workspace..." }: RouteLoadingProps) {
  return (
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-primary)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--aethel-info)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Loading</p>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">{detail}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl bg-[var(--aethel-surface-tertiary)]/70" />
          <div className="h-24 animate-pulse rounded-xl bg-[var(--aethel-surface-tertiary)]/55" />
          <div className="h-24 animate-pulse rounded-xl bg-[var(--aethel-surface-tertiary)]/40" />
        </div>
      </div>
    </main>
  );
}
