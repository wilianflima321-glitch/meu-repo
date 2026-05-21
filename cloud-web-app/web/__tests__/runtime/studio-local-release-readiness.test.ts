import { describe, expect, it } from 'vitest'

import {
  STUDIO_LOCAL_RELEASE_MANIFEST,
  getStudioLocalReleaseReadinessSummary,
} from '@/lib/studio-local/release-manifest'

describe('Studio Local release readiness', () => {
  it('keeps public desktop downloads held until signing evidence exists', () => {
    const summary = getStudioLocalReleaseReadinessSummary()

    expect(STUDIO_LOCAL_RELEASE_MANIFEST.signedInstallers).toBe('held')
    expect(summary.publicDownloadReady).toBe(false)
    expect(summary.releaseBlocked).toBe(true)
    expect(summary.nextAction).toContain('Request desktop beta')
  })

  it('tracks all public release blockers separately', () => {
    const ids = STUDIO_LOCAL_RELEASE_MANIFEST.releaseReadiness.map((item) => item.id)

    expect(ids).toEqual(expect.arrayContaining([
      'windows-installer',
      'macos-notarized-dmg',
      'linux-appimage-deb',
      'signed-installers',
      'auto-updater',
      'sidecar-health',
      'capability-probe',
      'cloud-stream-handoff',
    ]))
    expect(STUDIO_LOCAL_RELEASE_MANIFEST.releaseReadiness.every((item) => item.owner && item.evidence && item.nextAction)).toBe(true)
  })

  it('does not treat beta sidecars as release-ready public artifacts', () => {
    const summary = getStudioLocalReleaseReadinessSummary()

    expect(summary.counts.beta).toBeGreaterThan(0)
    expect(summary.counts.held).toBeGreaterThan(0)
    expect(summary.blockers.join(' ')).toContain('signed')
  })
})
