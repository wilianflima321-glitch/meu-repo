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
    <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.96),rgba(8,11,19,0.92))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
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
            className="rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-[0_10px_30px_rgba(56,189,248,0.18)]"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">{eyebrow}</p>
            <p className="text-sm font-medium text-white">Aethel Studio</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
          {domainLabel}
        </div>

        <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
          {description}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm"
            >
              <p className="text-xl font-semibold text-white sm:text-2xl">{item.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>

        {visual ? (
          <div className="mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Studio real</p>
                <p className="mt-1 text-sm text-white">A mesma shell que o usuario encontra ao entrar</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Interface ativa
              </div>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
              <Image
                src={visual.src}
                alt={visual.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm leading-6 text-slate-300">{visual.caption}</p>
              {visual.chips?.length ? (
                <div className="flex flex-wrap gap-2">
                  {visual.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-slate-200"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            O que aparece primeiro
          </p>
          <div className="mt-4 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
