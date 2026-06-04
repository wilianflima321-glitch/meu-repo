'use client'

import { useEffect, useMemo, useState } from 'react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import {
  STATUS_REFRESH_INTERVAL_MS,
  SURFACE_CHECKS,
} from '../status.content'
import {
  fetchSurface,
  getCoverageSummary,
  getNextActions,
  getOverallDescription,
  getOverallTitle,
  getStateCounts,
  getStatusTimeline,
  summarizeOverallState,
} from '../status.logic'
import type { SurfaceResult } from '../status.types'
import {
  StatusCountsStrip,
  StatusHero,
  StatusNotesDetails,
  StatusOverviewCard,
  StatusPostureDetails,
  StatusPublicChecks,
} from './StatusPageSections'

export default function StatusPage() {
  const [surfaces, setSurfaces] = useState<SurfaceResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const results = await Promise.all(SURFACE_CHECKS.map(fetchSurface))
      if (cancelled) return
      setSurfaces(results)
      setLastUpdated(new Date().toISOString())
      setIsLoading(false)
    }

    void load()
    const interval = window.setInterval(load, STATUS_REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const overall = useMemo(
    () => summarizeOverallState(surfaces, SURFACE_CHECKS),
    [surfaces],
  )
  const counts = useMemo(() => getStateCounts(surfaces), [surfaces])
  const blockingSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.state === 'unhealthy'),
    [surfaces],
  )
  const partialSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.state === 'partial'),
    [surfaces],
  )
  const overallTitle = useMemo(() => getOverallTitle(overall), [overall])
  const overallDescription = useMemo(
    () => getOverallDescription(overall),
    [overall],
  )
  const coverageSummary = useMemo(
    () =>
      getCoverageSummary(
        surfaces,
        SURFACE_CHECKS,
        blockingSurfaces,
        partialSurfaces,
      ),
    [blockingSurfaces, partialSurfaces, surfaces],
  )
  const statusTimeline = useMemo(
    () =>
      getStatusTimeline(
        overall,
        blockingSurfaces,
        partialSurfaces,
        lastUpdated,
      ),
    [blockingSurfaces, lastUpdated, overall, partialSurfaces],
  )
  const nextActions = useMemo(
    () => getNextActions(blockingSurfaces, partialSurfaces),
    [blockingSurfaces, partialSurfaces],
  )

  return (
    <div
      className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]"
      data-status-surface="compact"
    >
      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px] space-y-10">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:items-end">
            <StatusHero />
            <StatusOverviewCard
              coverageSummary={coverageSummary}
              isLoading={isLoading}
              lastUpdated={lastUpdated}
              overall={overall}
              overallDescription={overallDescription}
              overallTitle={overallTitle}
            />
          </section>

          <StatusCountsStrip counts={counts} />
          <StatusPostureDetails
            coverageSummary={coverageSummary}
            statusTimeline={statusTimeline}
          />
          <StatusPublicChecks surfaces={surfaces} />
          <StatusNotesDetails
            blockingSurfaces={blockingSurfaces}
            nextActions={nextActions}
            partialSurfaces={partialSurfaces}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
