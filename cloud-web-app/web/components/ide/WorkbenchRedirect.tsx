import Link from 'next/link'

export default function WorkbenchRedirect({
  title = 'Workbench',
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.16),transparent_42%),linear-gradient(180deg,var(--aethel-surface-primary),color-mix(in_srgb,var(--aethel-surface-primary)_94%,black))] px-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-xl rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <div className="mb-3 text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Workbench unificado</div>
        <h1 className="mb-3 text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-[var(--aethel-text-tertiary)]">
          {description || 'Esta capacidade fica disponivel dentro do shell do Workbench, com preview, copiloto e contexto sincronizados.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/ide"
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] shadow-[0_16px_36px_rgba(56,189,248,0.24)] transition hover:brightness-110"
          >
            Abrir Workbench
          </Link>
        </div>
      </div>
    </div>
  )
}
