'use client'

import { Suspense, useEffect, useState } from 'react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import type { StudioLocalPlatformId } from '@/lib/studio-local/release-manifest'
import {
  DesktopTargetPanel,
  DownloadHero,
  DownloadStatusCallout,
  RuntimeRoutingDetails,
} from './download-page.parts'

export default function DownloadPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<StudioLocalPlatformId>('windows')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/Mac OS X|Macintosh/i.test(ua)) setSelectedPlatform('mac')
    else if (/Linux/i.test(ua) && !/Android/i.test(ua)) setSelectedPlatform('linux')
    else setSelectedPlatform('windows')
  }, [])

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content" className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-start">
          <DownloadHero />
          <DesktopTargetPanel
            selectedPlatform={selectedPlatform}
            onSelectPlatform={setSelectedPlatform}
          />
        </section>

        <RuntimeRoutingDetails />
        <details className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--aethel-text-secondary)]">
            Release status
          </summary>
          <Suspense fallback={<div className="mt-3 h-16 animate-pulse rounded-xl bg-[var(--aethel-surface-secondary)]" />}>
            <DownloadStatusCallout />
          </Suspense>
        </details>
      </main>

      <PublicFooter />
    </div>
  )
}
