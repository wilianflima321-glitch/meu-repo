import Link from 'next/link'
import { helpIcons } from './help-icons'
import type { HelpQuickLink } from './help-types'

const toneClasses: Record<HelpQuickLink['tone'], string> = {
  primary: 'text-sky-200 hover:border-sky-300/35',
  success: 'text-emerald-200 hover:border-emerald-300/35',
  warning: 'text-amber-200 hover:border-amber-300/35',
  info: 'text-cyan-200 hover:border-cyan-300/35',
}

export function HelpQuickLinks({ links }: { links: HelpQuickLink[] }) {
  return (
    <section className="mx-auto mt-12 max-w-6xl px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => {
          const Icon = helpIcons[link.icon]
          return (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              className={`group min-h-32 rounded-[18px] border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:bg-slate-900/70 ${toneClasses[link.tone]}`}
            >
              <Icon className="mb-3 h-5 w-5" />
              <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)] group-hover:text-current">{link.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{link.description}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
