import Link from 'next/link';

export function DashboardUnrealTab() {
  return (
    <section className="mx-6 my-6 rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Moved to Studio</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Game work starts in Studio.</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
        World, character, FX, film, and logic tools live behind the Studio shell so Dashboard stays calm.
      </p>
      <Link
        href="/studio"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)]"
      >
        Open Studio
      </Link>
    </section>
  );
}
