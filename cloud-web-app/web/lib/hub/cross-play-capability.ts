/**
 * Hub I.8 / I.7 — Cross-play / cross-save honesty capability probe.
 * Marketing Cross-play stays fail-closed until G.2 unlock + dedicated Agones (Block 2B).
 * I.7: durable `crossSavePolicy` default-on opt-out can be CLOSED while cloud sync marketing
 * stays HELD until F.1 `gameSaveCloudReady` — durable disk ≠ Desktop↔Web cross-save.
 */

import fs from 'node:fs'
import path from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateMultiplayerHonesty } from '@/lib/production/multiplayer-honesty-capability'
import { probeCrossSavePolicyStoreWritable } from '@/lib/hub/cross-save-policy-authority'
import type { CrossSavePolicy } from '@/lib/hub/cross-save-policy-authority'

const log = createComponentLogger('cross-play-capability')

export type CrossPlayCapabilityStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'NOT_IMPLEMENTED'
  | 'HELD'

export interface CrossPlaySurfaceReport {
  surface: string
  status: CrossPlayCapabilityStatus
  connectable: boolean
  notes: string[]
  heldReason?: string
}

/** Spec policy intent — mirrors durable crossSavePolicy field. */
export type CrossSavePolicyIntent = CrossSavePolicy

export interface CrossPlayHonestyReport {
  generatedAt: string
  wave: 'I.8'
  crossPlay: CrossPlaySurfaceReport
  crossSave: CrossPlaySurfaceReport
  /** G.2 unlock marker present under docs/gates/ */
  g2MarketingUnlockPresent: boolean
  /** Dedicated Agones marketing allowed (Block 2B) */
  dedicatedAgonesMarketingAllowed: boolean
  /** True only when G.2 unlock + dedicated Agones live — Hub marketing gate */
  crossPlayReady: boolean
  marketingCrossPlayAllowed: boolean
  /** Durable disk GameSave present — not enough for cross-platform sync marketing */
  gameSaveDurableReady: boolean
  /** Prisma + remote R2 CAS proven */
  gameSaveCloudReady: boolean
  /** Publish-manifest / durable crossSavePolicy store writable (I.7 CORE) */
  crossSavePolicyFieldReady: boolean
  /** Cross-save Desktop↔Web marketing — only when cloud ready + policy field */
  marketingCrossSaveAllowed: boolean
  /**
   * Spec default-on opt-out policy field HELD until durable store ships.
   * False once I.7 policy authority is writable — independent of cloud marketing.
   */
  crossSaveDefaultOnOptOutHeld: boolean
  crossSavePolicyIntent: CrossSavePolicyIntent
  /** Always true until Agones fleet ships */
  dedicatedSessionHeld: true
  claim: string
  productCopy: string
}

export interface CrossPlayHonestyInput {
  /** Override G.2 unlock file presence (tests). */
  g2MarketingUnlockPresent?: boolean
  /** Override dedicated Agones marketing (tests). */
  dedicatedAgonesMarketingAllowed?: boolean
  /** Force Agones env configured for evaluateMultiplayerHonesty. */
  agonesAllocatorConfigured?: boolean
  lastAllocationSimulated?: boolean
  gameSaveDurableReady?: boolean
  gameSaveCloudReady?: boolean
  /**
   * When true, treat publish-manifest `crossSavePolicy` as shippable.
   * Production probe sets this from durable policy store writability.
   */
  crossSavePolicyFieldReady?: boolean
}

export function resolveG2CrossPlayUnlockPath(cwd: string = process.cwd()): string {
  return path.join(cwd, 'docs', 'gates', 'G2_CROSSPLAY_MARKETING_UNLOCK')
}

export function probeG2CrossPlayMarketingUnlock(cwd: string = process.cwd()): boolean {
  try {
    return fs.existsSync(resolveG2CrossPlayUnlockPath(cwd))
  } catch {
    return false
  }
}

/**
 * Evaluate I.8 / I.7 honesty. Defaults fail-closed for cross-play + cloud cross-save marketing.
 */
export function evaluateCrossPlayHonesty(
  input: CrossPlayHonestyInput = {},
): CrossPlayHonestyReport {
  const g2Unlock =
    typeof input.g2MarketingUnlockPresent === 'boolean'
      ? input.g2MarketingUnlockPresent
      : probeG2CrossPlayMarketingUnlock()

  const mp =
    typeof input.dedicatedAgonesMarketingAllowed === 'boolean'
      ? null
      : evaluateMultiplayerHonesty({
          agonesAllocatorConfigured: input.agonesAllocatorConfigured,
          lastAllocationSimulated: input.lastAllocationSimulated,
          crossPlayMarketingUnlocked: g2Unlock,
        })

  const dedicatedAllowed =
    typeof input.dedicatedAgonesMarketingAllowed === 'boolean'
      ? input.dedicatedAgonesMarketingAllowed
      : Boolean(mp?.marketingDedicatedAllowed)

  const durableReady = input.gameSaveDurableReady === true
  const cloudReady = input.gameSaveCloudReady === true
  const policyFieldReady = input.crossSavePolicyFieldReady === true

  // Hub marketing aligns with Block 2B: G.2 unlock AND dedicated Agones live.
  const crossPlayReady = g2Unlock && dedicatedAllowed
  const marketingCrossPlayAllowed = crossPlayReady

  let crossPlay: CrossPlaySurfaceReport
  if (crossPlayReady) {
    crossPlay = {
      surface: 'I.8 Cross-play',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: [
        'G.2 unlock marker present',
        'Dedicated Agones marketing allowed — cross-play claims unlocked',
      ],
    }
  } else if (g2Unlock && !dedicatedAllowed) {
    crossPlay = {
      surface: 'I.8 Cross-play',
      status: 'PARTIAL',
      connectable: false,
      notes: [
        'G.2 unlock marker present — dedicated Agones fleet still [HELD]',
        'Showcase stays Same-platform only — no false cross-play marketing',
      ],
      heldReason: 'agones_fleet_held',
    }
  } else {
    crossPlay = {
      surface: 'I.8 Cross-play',
      status: 'HELD',
      connectable: false,
      notes: [
        'G.2 netcode production unlock absent — MK-G2 fail-closed',
        'Showcase shows Same-platform only — no false cross-play marketing',
        'Dedicated Agones fleet [HELD]',
      ],
      heldReason: 'g2_cross_play_held',
    }
  }

  // I.7: policy field can be CLOSED while cloud marketing stays HELD.
  const marketingCrossSaveAllowed = cloudReady && policyFieldReady
  const crossSaveDefaultOnOptOutHeld = !policyFieldReady

  let crossSave: CrossPlaySurfaceReport
  if (marketingCrossSaveAllowed) {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: [
        'F.1 Prisma/R2 GameSave cloud ready',
        'Publish-manifest crossSavePolicy live — default-on opt-out',
      ],
    }
  } else if (policyFieldReady && durableReady && !cloudReady) {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'PARTIAL',
      connectable: false,
      notes: [
        'I.7 crossSavePolicy durable live — default-on, user opt-out',
        'F.1 durable disk GameSave live — same-device slots',
        'Desktop↔Web cloud sync marketing [HELD] until Prisma/R2 credentials',
      ],
      heldReason: 'cross_save_cloud_held',
    }
  } else if (cloudReady && !policyFieldReady) {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'PARTIAL',
      connectable: false,
      notes: [
        'F.1 cloud GameSave ready — publish-manifest crossSavePolicy field [HELD]',
        'Default-on opt-out UX not marketed until policy field ships',
      ],
      heldReason: 'cross_save_policy_held',
    }
  } else if (policyFieldReady && !durableReady) {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'PARTIAL',
      connectable: false,
      notes: [
        'I.7 crossSavePolicy durable live — default-on opt-out',
        'F.1 durable GameSave not ready — cloud sync [HELD]',
      ],
      heldReason: 'cross_save_durable_held',
    }
  } else if (durableReady) {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'HELD',
      connectable: false,
      notes: [
        'F.1 durable disk GameSave live — same-device slots only',
        'Desktop↔Web cross-save [HELD] until Prisma/R2 cloud + policy field',
      ],
      heldReason: 'cross_save_cloud_held',
    }
  } else {
    crossSave = {
      surface: 'I.7 Cross-save',
      status: 'HELD',
      connectable: false,
      notes: [
        'Cross-save fail-closed until F.1 durable + cloud GameSave',
        'No fake sync badges',
      ],
      heldReason: 'cross_save_held',
    }
  }

  const report: CrossPlayHonestyReport = {
    generatedAt: new Date().toISOString(),
    wave: 'I.8',
    crossPlay,
    crossSave,
    g2MarketingUnlockPresent: g2Unlock,
    dedicatedAgonesMarketingAllowed: dedicatedAllowed,
    crossPlayReady,
    marketingCrossPlayAllowed,
    gameSaveDurableReady: durableReady,
    gameSaveCloudReady: cloudReady,
    crossSavePolicyFieldReady: policyFieldReady,
    marketingCrossSaveAllowed,
    crossSaveDefaultOnOptOutHeld,
    crossSavePolicyIntent: 'optional',
    dedicatedSessionHeld: true,
    claim: crossPlayReady
      ? 'I.8 Cross-play marketing unlocked — Agones dedicated live'
      : 'I.8 Cross-play honesty live — marketing [HELD] until G.2 + Agones',
    productCopy: crossPlayReady
      ? 'Cross-play Desktop ↔ Web marketing unlocked after G.2 + dedicated Agones.'
      : policyFieldReady && durableReady && !cloudReady
        ? 'Same-platform play. Cross-play [HELD] until G.2. Cross-save policy live (default-on opt-out) — Desktop↔Web cloud sync [HELD] until F.1 cloud GameSave.'
        : durableReady
          ? 'Same-platform play. Cross-play [HELD] until G.2. Durable local GameSave live — Desktop↔Web cross-save [HELD] until cloud + policy.'
          : 'Same-platform play. Cross-play [HELD] until G.2. Cross-save [HELD] until F.1 cloud GameSave.',
  }

  log.info('cross_play_honesty_evaluated', {
    g2Unlock: report.g2MarketingUnlockPresent,
    dedicatedAllowed: report.dedicatedAgonesMarketingAllowed,
    crossPlayReady: report.crossPlayReady,
    marketingCrossPlayAllowed: report.marketingCrossPlayAllowed,
    marketingCrossSaveAllowed: report.marketingCrossSaveAllowed,
    crossSavePolicyFieldReady: report.crossSavePolicyFieldReady,
    crossSaveDefaultOnOptOutHeld: report.crossSaveDefaultOnOptOutHeld,
    crossSaveStatus: report.crossSave.status,
  })

  return report
}

/**
 * Gate: Hub cross-play marketing. Fail-closed without G.2 + Agones.
 */
export function evaluateHubCrossPlayGate(input: {
  crossPlayReady?: boolean
  g2MarketingUnlockPresent?: boolean
  dedicatedAgonesMarketingAllowed?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.crossPlayReady === true) {
    return { allowed: true, reason: 'cross_play_ready' }
  }
  if (input.g2MarketingUnlockPresent !== true) {
    return {
      allowed: false,
      code: 'G2_CROSS_PLAY_HELD',
      reason: 'Cross-play marketing [HELD] until G.2 unlock marker',
    }
  }
  if (input.dedicatedAgonesMarketingAllowed !== true) {
    return {
      allowed: false,
      code: 'AGONES_FLEET_HELD',
      reason: 'G.2 unlock present — dedicated Agones fleet [HELD]',
    }
  }
  return { allowed: true, reason: 'g2_and_agones_ready' }
}

/**
 * Gate: Desktop↔Web cross-save marketing. Fail-closed without cloud + policy.
 */
export function evaluateHubCrossSaveGate(input: {
  marketingCrossSaveAllowed?: boolean
  gameSaveCloudReady?: boolean
  crossSavePolicyFieldReady?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.marketingCrossSaveAllowed === true) {
    return { allowed: true, reason: 'cross_save_ready' }
  }
  if (input.crossSavePolicyFieldReady !== true) {
    return {
      allowed: false,
      code: 'CROSS_SAVE_POLICY_HELD',
      reason: 'Cross-save marketing [HELD] until durable crossSavePolicy field',
    }
  }
  if (input.gameSaveCloudReady !== true) {
    return {
      allowed: false,
      code: 'CROSS_SAVE_CLOUD_HELD',
      reason: 'Policy live — Desktop↔Web cloud sync marketing [HELD] until F.1 cloud GameSave',
    }
  }
  return { allowed: true, reason: 'cloud_and_policy_ready' }
}

/**
 * Server probe — production honesty for Hub I.8 / I.7 surfaces.
 */
export async function probeCrossPlayHonesty(input: {
  gameSaveDurableReady?: boolean
  gameSaveCloudReady?: boolean
  crossSavePolicyFieldReady?: boolean
  cwd?: string
} = {}): Promise<CrossPlayHonestyReport> {
  const g2MarketingUnlockPresent = probeG2CrossPlayMarketingUnlock(input.cwd)
  const policyProbe =
    typeof input.crossSavePolicyFieldReady === 'boolean'
      ? { writable: input.crossSavePolicyFieldReady }
      : await probeCrossSavePolicyStoreWritable()
  return evaluateCrossPlayHonesty({
    g2MarketingUnlockPresent,
    gameSaveDurableReady: input.gameSaveDurableReady,
    gameSaveCloudReady: input.gameSaveCloudReady,
    crossSavePolicyFieldReady: policyProbe.writable,
  })
}
