import Image from 'next/image'
import { CheckCircle2, Command, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'

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
  const chips = visual?.chips?.length ? visual.chips.slice(0, 3) : ['Mission', 'Preview', 'Evidence']

  return (
    <aside className="relative hidden min-h-[560px] overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(13,18,31,0.94),rgba(7,10,17,0.96))] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.38)] lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] blur-3xl" />
        <div className="absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] blur-3xl" />
        <div className="absolute inset-x-8 top-24 h-px bg-gradient-to-r from-transparent via-[var(--aethel-border-primary)] to-transparent" />
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
              className="rounded-2xl shadow-[0_0_0_1px_var(--aethel-border-primary),0_14px_32px_rgba(56,189,248,0.16)]"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">{eyebrow}</p>
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Aethel Studio</p>
            </div>
          </div>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
            {domainLabel}
          </span>
        </div>

        <div className="mt-10 max-w-xl">
          <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--aethel-text-primary)]">{title}</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">{description}</p>
        </div>

        <div className="mt-7 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[rgba(5,8,14,0.58)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            <Command className="h-3.5 w-3.5" />
            Mission prompt
          </div>
          <div className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/55 px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
            Continue my workspace, scan risk, and open the next best task.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {highlights.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
              <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-3 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-4 py-4">
            <p className="text-xl font-semibold tracking-[-0.02em] text-[var(--aethel-text-primary)]">{item.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-between rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]">
        <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[var(--aethel-info-light)]" /> Guided, not noisy.</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" /> Evidence first</span>
        <span className="inline-flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-[var(--aethel-primary-light)]" /> Same flow</span>
      </div>
    </aside>
  )
}
