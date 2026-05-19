import Link from 'next/link'
import MaturityBadge from '@/components/ui/MaturityBadge'
import {
  ROUTE_MATURITY_REGISTRY,
  type MaturityLevel,
  type RouteEntry,
} from '@/lib/routes/route-maturity-registry'

const maturityOrder: MaturityLevel[] = ['GA', 'BETA', 'ALPHA', 'PROTOTYPE', 'ASPIRATIONAL']

function countRoutesByMaturity(routes: RouteEntry[]): Record<MaturityLevel, number> {
  return routes.reduce<Record<MaturityLevel, number>>(
    (acc, route) => {
      acc[route.maturity] += 1
      return acc
    },
    { GA: 0, BETA: 0, ALPHA: 0, PROTOTYPE: 0, ASPIRATIONAL: 0 },
  )
}

export const metadata = {
  title: 'Aethel Honest Status',
  description: 'A public maturity map for Aethel surfaces, from GA to R&D labs.',
}

export default function HonestStatusPage() {
  const routes = [...ROUTE_MATURITY_REGISTRY].sort(
    (a, b) => maturityOrder.indexOf(a.maturity) - maturityOrder.indexOf(b.maturity) || a.path.localeCompare(b.path),
  )
  const counts = countRoutesByMaturity(routes)

  return (
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-primary)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--aethel-text-tertiary)]">
                Public product maturity
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Honest Status
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Aethel separates production-ready surfaces from beta and alpha creative systems. Apps,
                research, billing, collaboration, and the IDE are treated differently from game and film
                R&D surfaces so users can trust what is ready today.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)]"
            >
              View roadmap
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {maturityOrder.map((maturity) => (
              <div key={maturity} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-4">
                <MaturityBadge maturity={maturity} />
                <p className="mt-3 text-2xl font-semibold">{counts[maturity]}</p>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">routes</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
          <div className="border-b border-[var(--aethel-border-primary)] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              Route maturity matrix
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] text-xs uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Surface</th>
                  <th className="px-5 py-3 font-semibold">Path</th>
                  <th className="px-5 py-3 font-semibold">Maturity</th>
                  <th className="px-5 py-3 font-semibold">Reality note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--aethel-border-primary)]">
                {routes.map((route) => (
                  <tr key={route.path} className="hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)]">
                    <td className="px-5 py-3 font-medium text-[var(--aethel-text-primary)]">{route.label}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--aethel-text-tertiary)]">{route.path}</td>
                    <td className="px-5 py-3"><MaturityBadge maturity={route.maturity} /></td>
                    <td className="px-5 py-3 text-[var(--aethel-text-secondary)]">{route.notes ?? 'No special limitation disclosed.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
