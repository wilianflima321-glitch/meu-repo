/**
 * Law II / Onda F — TelemetrySpool + GameSave evidence.
 */

import { describe, expect, it } from 'vitest'

import {
  CLOUD_IMMORTAL_ACTORS_MARKETING_ALLOWED,
  GAMESAVE_CLOUD_MARKETING_ALLOWED,
  TELEMETRY_CLOUD_AGGREGATION_AAA_READY,
  claimCloudImmortalActors,
  claimGameSaveCloudMarketing,
  probeTelemetryGameSaveEvidenceReadiness,
  runTelemetryGameSaveEvidenceSoak,
} from '@/lib/liveops/telemetry-gamesave-evidence'

describe('TelemetrySpool + GameSave evidence', () => {
  it('seals spool sync + durable GameSave checksum path', async () => {
    const soak = await runTelemetryGameSaveEvidenceSoak({ playtimeDeltaSeconds: 33 })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.spoolMarkedSynced).toBe(1)
    expect(soak.value.playtimeDeltaSeconds).toBe(33)
    expect(soak.value.gameSaveChecksum).toMatch(/^[a-f0-9]{64}$/)
    expect(soak.value.gameSaveRevision).toBeGreaterThanOrEqual(1)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.gamesaveCloudMarketingAllowed).toBe(false)
    expect(soak.value.cloudImmortalActorsMarketingAllowed).toBe(false)
  })

  it('refuses zero delta and cloud marketing claims', async () => {
    expect((await runTelemetryGameSaveEvidenceSoak({ playtimeDeltaSeconds: 0 })).ok).toBe(false)
    expect(claimGameSaveCloudMarketing().ok).toBe(false)
    expect(claimCloudImmortalActors().ok).toBe(false)
    expect(GAMESAVE_CLOUD_MARKETING_ALLOWED).toBe(false)
    expect(CLOUD_IMMORTAL_ACTORS_MARKETING_ALLOWED).toBe(false)
    expect(TELEMETRY_CLOUD_AGGREGATION_AAA_READY).toBe(false)
  })

  it('probe stays PARTIAL', async () => {
    const probe = await probeTelemetryGameSaveEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.gamesaveCloudMarketingAllowed).toBe(false)
  })
})
