import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

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
  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(9,14,24,0.96),rgba(8,11,19,0.92))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] blur-3xl" />
        <div className="absolute bottom-[-18%] right-[-8%] h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/branding/aethel-icon-source.png"
            alt="Aethel"
            width={40}
            height={40}
            sizes="40px"
            className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1.5 shadow-[0_10px_30px_rgba(56,189,248,0.18)]"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--aethel-info-light)_80%,transparent)]">{eyebrow}</p>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Aethel Studio</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
          {domainLabel}
        </div>

        <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)] sm:text-base">
          {description}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-4 backdrop-blur-sm"
            >
              <p className="text-xl font-semibold text-[var(--aethel-text-primary)] sm:text-2xl">{item.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</p>
            </div>
          ))}
        </div>

        {visual ? (
          <div className="mt-8 overflow-hidden rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Studio real</p>
                <p className="mt-1 text-sm text-[var(--aethel-text-primary)]">A mesma shell que o usuario encontra ao entrar</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--aethel-success-light)]">
                <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]" />
                Interface ativa
              </div>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)]">
              <Image
                src={visual.src}
                alt={visual.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] via-transparent to-transparent" />
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{visual.caption}</p>
              {visual.chips?.length ? (
                <div className="flex flex-wrap gap-2">
                  {visual.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-secondary)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
            O que aparece primeiro
          </p>
          <div className="mt-4 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
