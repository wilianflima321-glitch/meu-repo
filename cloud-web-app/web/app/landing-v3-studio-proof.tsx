const STUDIO_PANELS = [
  { label: 'Mission', value: 'brief locked', tone: 'info' },
  { label: 'Preview', value: 'live build', tone: 'success' },
  { label: 'Evidence', value: '3 checks', tone: 'warning' },
] as const

const ACTIVITY = [
  'Read scope and receipts',
  'Edit dashboard shell',
  'Validate preview route',
] as const

function statusTone(tone: (typeof STUDIO_PANELS)[number]['tone']) {
  if (tone === 'success') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
  }

  if (tone === 'warning') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  }

  return 'border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
}

export default function LandingStudioProof() {
  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[var(--aethel-landing-proof-bg)] shadow-[inset_0_1px_0_var(--aethel-video-white-05)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-error)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-warning)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-success)]" />
        </div>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          Studio receipts
        </span>
      </div>

      <div className="grid md:grid-cols-[116px_minmax(0,1fr)]">
        <div className="border-b border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-overlay-ink-rgb),0.24)] p-3 md:border-b-0 md:border-r">
          <div className="space-y-2">
            {['Plan', 'Code', 'Preview', 'Ship'].map((item, index) => (
              <div
                key={item}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
                  index === 2
                    ? 'bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] text-[var(--aethel-info-light)]'
                    : 'text-[var(--aethel-text-tertiary)]'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {STUDIO_PANELS.map((panel) => (
              <div key={panel.label} className={`rounded-2xl border px-3 py-3 ${statusTone(panel.tone)}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{panel.label}</p>
                <p className="mt-1 text-xs font-semibold">{panel.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-panel-ink-rgb),0.46)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">Agent action timeline</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">Readable work, not decorative noise.</p>
              </div>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-success-light)]">
                Safe
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {ACTIVITY.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-[rgba(var(--aethel-slate-900-rgb),0.52)] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--aethel-info)]" />
                  <span className="text-[11px] text-[var(--aethel-text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
