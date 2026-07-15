/**
 * F.1 — honesty probe for Prisma GameSave cloud marketing.
 * Ready when Prisma GameSave remote path is proven.
 * R2 CAS is optional (large-payload offload) — not required to flip marketing.
 * Letter cz: `probeGameSaveCloudMarketingReady` / `gameSaveCloudMarketingReady`
 * is the explicit marketing honesty flip (fail-closed without proven DB).
 * Re-exports readiness helpers; keeps a compact probe shape for LiveOps honesty.
 */

import {
  probeGameSaveCloudReady as probeReadiness,
  resolveGameSaveCloudSyncEnabled as resolveSyncEnabled,
  type GameSaveCloudReadiness,
  type ProbeGameSaveCloudReadyOptions,
} from '@/lib/liveops/gamesave-cloud-readiness'
import type { PrismaGameSaveStore } from '@/lib/liveops/prisma-gamesave-authority'
import { getGameSaveCasBackendLabel } from '@/lib/liveops/gamesave-r2-cas'

export {
  probeGameSaveCloudMarketingReady,
  shouldEnableCloudSyncMarketing,
  cloudMarketingStamp,
  type GameSaveCloudMarketingProbe,
  type ProbeGameSaveCloudMarketingOptions,
} from '@/lib/liveops/gamesave-cloud-marketing'

export interface GameSaveCloudProbeResult {
  /** Marketing unlock: Prisma GameSave path proven (R2 optional). */
  ready: boolean
  prismaReady: boolean
  /** Remote R2/S3 CAS credentials present (informational). */
  r2Ready: boolean
  casBackend: string
  databaseUrlConfigured: boolean
  reason?: string
  notes: string[]
}

export interface ProbeGameSaveCloudOptions {
  /** Injected store for tests (skips live Prisma). */
  client?: PrismaGameSaveStore
  store?: PrismaGameSaveStore
  /** @deprecated R2 is optional — override ignored for ready flip; kept for tests. */
  r2ReadyOverride?: boolean
  assumePrismaReady?: boolean
  forceDisabled?: boolean
  skipRoundTrip?: boolean
}

export async function probeGameSaveCloudReady(
  options: ProbeGameSaveCloudOptions = {},
): Promise<GameSaveCloudProbeResult> {
  const store = options.store ?? options.client
  const readinessOpts: ProbeGameSaveCloudReadyOptions = {
    store,
    forceDisabled: options.forceDisabled,
    skipRoundTrip: options.skipRoundTrip ?? options.assumePrismaReady,
  }

  const readiness: GameSaveCloudReadiness = await probeReadiness(readinessOpts)

  // Optional override only forces r2Ready flag for test assertions — never gates ready alone.
  const r2Ready =
    typeof options.r2ReadyOverride === 'boolean'
      ? options.r2ReadyOverride
      : readiness.r2CasConfigured

  return {
    ready: readiness.ready,
    prismaReady: readiness.prismaReady,
    r2Ready,
    casBackend: getGameSaveCasBackendLabel(),
    databaseUrlConfigured: Boolean(String(process.env.DATABASE_URL || '').trim()) || Boolean(store),
    reason: readiness.heldReason,
    notes: readiness.notes,
  }
}

/**
 * SaveManager may set cloudSyncEnabled only when this returns true.
 * Default remains false — never market schema-only / empty Prisma as cloud sync.
 */
export function shouldEnableSaveManagerCloudSync(probe: { ready: boolean }): boolean {
  return probe.ready === true
}

export function resolveGameSaveCloudSyncEnabled(probe: { ready: boolean }): boolean {
  return resolveSyncEnabled(probe as GameSaveCloudReadiness)
}

export function cloudSyncMarketingStamp(probe: { ready: boolean }): 'IMPLEMENTED' | 'HELD' {
  return probe.ready ? 'IMPLEMENTED' : 'HELD'
}
