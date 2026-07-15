import Image from 'next/image'
import { Command } from 'lucide-react'

type AuthExperiencePanelProps = {
  eyebrow: string
  title: string
  description: string
  domainLabel: string
  highlights: string[]
  stats: Array<{ label: string; value: string }>
  visual?: {
    src: string
    alt: string
    caption: string
    chips?: string[]
  }
}

export default function AuthExperiencePanel({
  eyebrow,
  title,
  description,
  domainLabel,
  highlights,
  stats,
  visual,
}: AuthExperiencePanelProps) {
  const chips = visual?.chips?.length ? visual.chips.slice(0, 3) : ['Project', 'Preview', 'Activity']

  return (
    <aside data-auth-experience="compact" className="relative hidden min-h-[560px] overflow-hidden border-y border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] px-6 py-8 lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-x-8 top-24 h-px bg-[var(--aethel-border-primary)]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/branding/aethel-mark.svg"
              alt="Aethel"
              width={38}
              height={38}
              sizes="38px"
              className="shadow-[0_0_0_1px_var(--aethel-border-primary),0_14px_32px_rgba(56,189,248,0.16)]"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">{eyebrow}</p>
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Aethel Studio</p>
            </div>
          </div>
          <span className="border-l border-[color-mix(in_srgb,var(--aethel-success)_38%,transparent)] pl-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
            {domainLabel}
          </span>
        </div>

        <div className="mt-10 max-w-lg">
          <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--aethel-text-primary)]">{title}</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">{description}</p>
        </div>

        <div className="mt-7 border-y border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/42 py-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            <Command className="h-3.5 w-3.5" />
            Workspace prompt
          </div>
          <div className="mt-3 border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/42 px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
            Continue my workspace and open the next task.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="border-l border-[var(--aethel-border-subtle)] pl-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                {chip}
              </span>
            ))}
          </div>
        </div>

        <details className="mt-5 border-t border-[var(--aethel-border-primary)] pt-4">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Workspace context
          </summary>
          <ul className="mt-3 space-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                <span className="mt-3 h-px w-3 shrink-0 bg-[var(--aethel-success-light)]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <details className="relative z-10 mt-8 border-t border-[var(--aethel-border-primary)] pt-5">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
          Session signals
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((item) => (
            <div key={item.label}>
              <p className="text-xl font-semibold tracking-[-0.02em] text-[var(--aethel-text-primary)]">{item.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</p>
            </div>
          ))}
        </div>
      </details>
    </aside>
  )
}
