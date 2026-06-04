import dynamic from 'next/dynamic'

function IDELoadingShell() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="flex h-11 items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-sm bg-[var(--aethel-text-secondary)]" />
          <div className="h-3 w-28 rounded bg-[var(--aethel-surface-tertiary)]" />
          <div className="h-5 w-24 rounded-full bg-[var(--aethel-surface-secondary)]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-[var(--aethel-surface-secondary)]" />
          <div className="h-7 w-24 rounded-md bg-[var(--aethel-surface-tertiary)]" />
        </div>
      </div>

      <div className="grid h-[calc(100vh-44px)] grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-3">
          <div className="mb-4 h-8 rounded-lg bg-[var(--aethel-surface-tertiary)]" />
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                <div className="h-3 w-3 rounded bg-[var(--aethel-surface-quaternary)]" />
                <div className="h-3 flex-1 rounded bg-[var(--aethel-surface-tertiary)]" />
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          <div className="flex h-10 items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-3">
            <div className="h-6 w-28 rounded-t-md bg-[var(--aethel-surface-secondary)]" />
            <div className="h-6 w-24 rounded-t-md bg-[var(--aethel-surface-tertiary)]" />
          </div>
          <div className="flex-1 p-6">
            <div className="mx-auto max-w-3xl space-y-3">
              {Array.from({ length: 13 }).map((_, index) => (
                <div
                  key={index}
                  className="h-3 rounded bg-[var(--aethel-surface-secondary)]"
                  style={{ width: `${92 - (index % 5) * 9}%` }}
                />
              ))}
            </div>
          </div>
          <div className="h-32 border-t border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-3">
            <div className="mb-3 flex gap-2">
              <div className="h-5 w-20 rounded-full bg-[var(--aethel-surface-tertiary)]" />
              <div className="h-5 w-24 rounded-full bg-[var(--aethel-surface-tertiary)]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-2/3 rounded bg-[var(--aethel-surface-tertiary)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--aethel-surface-tertiary)]" />
            </div>
          </div>
        </main>

        <aside className="flex min-w-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]">
          <div className="border-b border-[var(--aethel-border-subtle)] p-4">
            <div className="mb-3 h-4 w-40 rounded bg-[var(--aethel-surface-tertiary)]" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-[var(--aethel-surface-tertiary)]" />
              <div className="h-5 w-24 rounded-full bg-[var(--aethel-surface-tertiary)]" />
            </div>
          </div>
          <div className="flex-1 space-y-3 p-4">
            <div className="h-16 rounded-xl bg-[var(--aethel-surface-tertiary)]" />
            <div className="ml-10 h-20 rounded-xl bg-[var(--aethel-surface-primary)]" />
            <div className="h-14 rounded-xl bg-[var(--aethel-surface-tertiary)]" />
          </div>
          <div className="border-t border-[var(--aethel-border-subtle)] p-4">
            <div className="h-16 rounded-xl bg-[var(--aethel-surface-primary)]" />
          </div>
        </aside>
      </div>
    </div>
  )
}

// Load workbench shell dynamically to reduce initial bundle cost.
const FullscreenIDE = dynamic(() => import('@/components/ide/FullscreenIDE'), {
  ssr: false,
  loading: () => <IDELoadingShell />,
});

export default function IDEPage() {
  return <FullscreenIDE />;
}
