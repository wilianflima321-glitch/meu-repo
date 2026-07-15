import Link from 'next/link'

export default function WorkbenchRedirect({
  title = 'Workbench',
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-neon-indigo)_16%,transparent),transparent_42%),linear-gradient(180deg,var(--aethel-surface-primary),color-mix(in_srgb,var(--aethel-surface-primary)_94%,black))] px-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-xl rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-8 text-center shadow-[0_24px_80px_color-mix(in_srgb,black_42%,transparent)] backdrop-blur-xl">
        <div className="mb-3 text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Unified Workbench</div>
        <h1 className="mb-3 text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-[var(--aethel-text-tertiary)]">
          {description || 'This capability is available inside the Workbench shell, with preview, copilot, and context synchronized.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/ide"
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-neon-indigo)_95%,transparent),color-mix(in_srgb,var(--aethel-info-dark)_90%,transparent))] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] shadow-[0_16px_36px_color-mix(in_srgb,var(--aethel-info)_24%,transparent)] transition hover:brightness-110"
          >
            Open Workbench
          </Link>
        </div>
      </div>
    </div>
  )
}
