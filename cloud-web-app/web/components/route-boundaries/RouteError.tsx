"use client";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  detail?: string;
};

export function RouteError({
  error,
  reset,
  title = "This surface hit a recoverable error",
  detail = "The route boundary caught the failure so the whole app stays usable.",
}: RouteErrorProps) {
  return (
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-primary)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,var(--aethel-surface-secondary))] p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-error-light)]">Route boundary</p>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">{detail}</p>
        </div>
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)] bg-[var(--aethel-surface-primary)]/50 p-4 text-sm text-[var(--aethel-text-secondary)]">
          <p className="font-medium text-[var(--aethel-text-primary)]">{error.message || "Unknown route error"}</p>
          {error.digest ? <p className="mt-2 font-mono text-xs text-[var(--aethel-text-tertiary)]">Digest: {error.digest}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--aethel-primary-light)]"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-[var(--aethel-border-secondary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
