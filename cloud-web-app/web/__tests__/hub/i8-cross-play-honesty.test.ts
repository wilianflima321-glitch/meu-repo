/**
 * Hub I.8 cross-play honesty CORE — capability probe + fail-closed marketing.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  evaluateCrossPlayHonesty,
  evaluateHubCrossPlayGate,
  probeCrossPlayHonesty,
  resolveG2CrossPlayUnlockPath,
} from '@/lib/hub/cross-play-capability'
import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('I.8 cross-play honesty capability', () => {
  it('holds cross-play marketing by default (no G.2 unlock, no Agones)', () => {
    const report = evaluateCrossPlayHonesty({
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
    })
    expect(report.crossPlay.status).toBe('HELD')
    expect(report.crossPlay.connectable).toBe(false)
    expect(report.crossPlayReady).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.dedicatedSessionHeld).toBe(true)
    expect(report.crossSave.status).toBe('HELD')
    expect(report.marketingCrossSaveAllowed).toBe(false)
    expect(report.crossSaveDefaultOnOptOutHeld).toBe(true)
    expect(report.productCopy).toMatch(/\[HELD\]/)
    expect(report.productCopy).toMatch(/Same-platform|Cross-play/i)
  })

  it('stays PARTIAL when G.2 unlock exists but Agones fleet is held', () => {
    const report = evaluateCrossPlayHonesty({
      g2MarketingUnlockPresent: true,
      dedicatedAgonesMarketingAllowed: false,
    })
    expect(report.crossPlay.status).toBe('PARTIAL')
    expect(report.crossPlay.heldReason).toBe('agones_fleet_held')
    expect(report.crossPlayReady).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
  })

  it('flips marketing only when G.2 unlock + dedicated Agones are both live', () => {
    const report = evaluateCrossPlayHonesty({
      g2MarketingUnlockPresent: true,
      dedicatedAgonesMarketingAllowed: true,
    })
    expect(report.crossPlay.status).toBe('IMPLEMENTED')
    expect(report.crossPlayReady).toBe(true)
    expect(report.marketingCrossPlayAllowed).toBe(true)
  })

  it('keeps cross-save HELD with durable disk when policy field absent; opt-out held', () => {
    const durableOnly = evaluateCrossPlayHonesty({
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      crossSavePolicyFieldReady: false,
    })
    expect(durableOnly.crossSave.heldReason).toBe('cross_save_cloud_held')
    expect(durableOnly.crossSaveDefaultOnOptOutHeld).toBe(true)
    expect(durableOnly.crossSavePolicyIntent).toBe('optional')

    const cloudNoPolicy = evaluateCrossPlayHonesty({
      gameSaveDurableReady: true,
      gameSaveCloudReady: true,
      crossSavePolicyFieldReady: false,
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
    })
    expect(cloudNoPolicy.crossSave.status).toBe('PARTIAL')
    expect(cloudNoPolicy.marketingCrossSaveAllowed).toBe(false)
    expect(cloudNoPolicy.crossSaveDefaultOnOptOutHeld).toBe(true)

    const full = evaluateCrossPlayHonesty({
      gameSaveDurableReady: true,
      gameSaveCloudReady: true,
      crossSavePolicyFieldReady: true,
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
    })
    expect(full.marketingCrossSaveAllowed).toBe(true)
    expect(full.crossSaveDefaultOnOptOutHeld).toBe(false)
  })

  it('closes opt-out HELD when policy ready even if cloud still held (I.7)', () => {
    const report = evaluateCrossPlayHonesty({
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      crossSavePolicyFieldReady: true,
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
    })
    expect(report.crossSaveDefaultOnOptOutHeld).toBe(false)
    expect(report.marketingCrossSaveAllowed).toBe(false)
    expect(report.crossSave.status).toBe('PARTIAL')
    expect(report.marketingCrossPlayAllowed).toBe(false)
  })

  it('fail-closes evaluateHubCrossPlayGate without G.2 + Agones', () => {
    expect(evaluateHubCrossPlayGate().allowed).toBe(false)
    expect(evaluateHubCrossPlayGate().code).toBe('G2_CROSS_PLAY_HELD')
    expect(
      evaluateHubCrossPlayGate({ g2MarketingUnlockPresent: true }).code,
    ).toBe('AGONES_FLEET_HELD')
    expect(
      evaluateHubCrossPlayGate({
        g2MarketingUnlockPresent: true,
        dedicatedAgonesMarketingAllowed: true,
      }).allowed,
    ).toBe(true)
    expect(evaluateHubCrossPlayGate({ crossPlayReady: true }).allowed).toBe(true)
  })
})

describe('I.8 probe respects G.2 unlock file', () => {
  let tmp: string
  const prevAgones = process.env.AGONES_ALLOCATOR_URL

  afterEach(async () => {
    if (prevAgones === undefined) delete process.env.AGONES_ALLOCATOR_URL
    else process.env.AGONES_ALLOCATOR_URL = prevAgones
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('reports unlock absent under empty docs/gates', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i8-g2-'))
    await fs.mkdir(path.join(tmp, 'docs', 'gates'), { recursive: true })
    delete process.env.AGONES_ALLOCATOR_URL

    const report = await probeCrossPlayHonesty({
      cwd: tmp,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
    })
    expect(report.g2MarketingUnlockPresent).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.crossPlay.status).toBe('HELD')
  })

  it('does not unlock marketing with G.2 file alone (Agones still held)', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i8-g2-'))
    const unlock = resolveG2CrossPlayUnlockPath(tmp)
    await fs.mkdir(path.dirname(unlock), { recursive: true })
    await fs.writeFile(unlock, 'G.2 evidence placeholder\n', 'utf8')
    delete process.env.AGONES_ALLOCATOR_URL

    const report = await probeCrossPlayHonesty({ cwd: tmp })
    expect(report.g2MarketingUnlockPresent).toBe(true)
    expect(report.dedicatedAgonesMarketingAllowed).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.crossPlay.status).toBe('PARTIAL')
  })
})

describe('I.8 hub-honesty wiring', () => {
  it('keeps evaluateHubHonesty marketingCrossPlayAllowed false by default', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
    })
    expect(report.crossPlay.status).toBe('HELD')
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.crossPlay.notes.some((n) => /Same-platform|G\.2|honesty/i.test(n))).toBe(
      true,
    )
  })

  it('unlocks hub marketingCrossPlayAllowed only via crossPlayReady', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      crossPlayReady: true,
    })
    expect(report.crossPlay.status).toBe('IMPLEMENTED')
    expect(report.marketingCrossPlayAllowed).toBe(true)
  })
})

describe('I.8 arcade maturity', () => {
  it('mentions I.8 honesty and cross-play hold on /arcade', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.maturity).toBe('BETA')
    expect(arcade?.notes).toMatch(/I\.8/i)
    expect(arcade?.notes).toMatch(/cross-play/i)
    expect(arcade?.notes).toMatch(/\[HELD\]/)
    expect(arcade?.notes).toMatch(/Same-platform|Agones/i)
  })
})
