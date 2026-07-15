/**
 * Hub I.7 cross-save policy CORE — durable default-on opt-out + honesty gates.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  evaluateCrossPlayHonesty,
  evaluateHubCrossPlayGate,
  evaluateHubCrossSaveGate,
  probeCrossPlayHonesty,
} from '@/lib/hub/cross-play-capability'
import {
  DEFAULT_CROSS_SAVE_POLICY,
  getCrossSavePolicy,
  isCrossSaveUserOptedOut,
  probeCrossSavePolicyStoreWritable,
  resolveCrossSaveCloudEligibility,
  setCrossSavePolicy,
  setCrossSaveUserOptOut,
} from '@/lib/hub/cross-save-policy-authority'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('I.7 cross-save policy authority', () => {
  const prevPolicy = process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT
  const prevOptOut = process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT
  let tmpPolicy: string
  let tmpOptOut: string

  afterEach(async () => {
    if (prevPolicy === undefined) delete process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT
    else process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = prevPolicy
    if (prevOptOut === undefined) delete process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT
    else process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = prevOptOut
    if (tmpPolicy) {
      await fs.rm(tmpPolicy, { recursive: true, force: true }).catch(() => undefined)
    }
    if (tmpOptOut) {
      await fs.rm(tmpOptOut, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('defaults to optional (default-on) and stores creator policy', async () => {
    tmpPolicy = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-policy-'))
    tmpOptOut = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-optout-'))
    process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = tmpPolicy
    process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = tmpOptOut

    const missing = await getCrossSavePolicy('neon-runner')
    expect(missing.policy).toBe(DEFAULT_CROSS_SAVE_POLICY)
    expect(missing.policy).toBe('optional')

    const set = await setCrossSavePolicy({
      gameId: 'neon-runner',
      userId: 'creator-1',
      policy: 'required',
    })
    expect(set.policy).toBe('required')
    expect((await getCrossSavePolicy('neon-runner')).policy).toBe('required')

    const probe = await probeCrossSavePolicyStoreWritable()
    expect(probe.writable).toBe(true)
    expect(probe.root).toBe(tmpPolicy)
  })

  it('allows player opt-out when optional; forbids when required', async () => {
    tmpPolicy = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-policy-'))
    tmpOptOut = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-optout-'))
    process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = tmpPolicy
    process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = tmpOptOut

    await setCrossSavePolicy({
      gameId: 'arcade-demo',
      userId: 'creator-1',
      policy: 'optional',
    })

    expect(await isCrossSaveUserOptedOut('player-1', 'arcade-demo')).toBe(false)
    await setCrossSaveUserOptOut({
      userId: 'player-1',
      gameId: 'arcade-demo',
      optedOut: true,
    })
    expect(await isCrossSaveUserOptedOut('player-1', 'arcade-demo')).toBe(true)

    await setCrossSavePolicy({
      gameId: 'must-sync',
      userId: 'creator-1',
      policy: 'required',
    })
    await expect(
      setCrossSaveUserOptOut({
        userId: 'player-1',
        gameId: 'must-sync',
        optedOut: true,
      }),
    ).rejects.toMatchObject({ code: 'CROSS_SAVE_OPT_OUT_FORBIDDEN' })
  })

  it('gates cloud eligibility on policy, opt-out, and cloud readiness', async () => {
    tmpPolicy = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-policy-'))
    tmpOptOut = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-optout-'))
    process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = tmpPolicy
    process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = tmpOptOut

    await setCrossSavePolicy({
      gameId: 'cloud-title',
      userId: 'creator-1',
      policy: 'optional',
    })

    const held = await resolveCrossSaveCloudEligibility({
      userId: 'player-1',
      gameId: 'cloud-title',
      gameSaveCloudReady: false,
    })
    expect(held.allowed).toBe(false)
    expect(held.code).toBe('CROSS_SAVE_CLOUD_HELD')

    const ready = await resolveCrossSaveCloudEligibility({
      userId: 'player-1',
      gameId: 'cloud-title',
      gameSaveCloudReady: true,
    })
    expect(ready.allowed).toBe(true)

    await setCrossSaveUserOptOut({
      userId: 'player-1',
      gameId: 'cloud-title',
      optedOut: true,
    })
    const opted = await resolveCrossSaveCloudEligibility({
      userId: 'player-1',
      gameId: 'cloud-title',
      gameSaveCloudReady: true,
    })
    expect(opted.allowed).toBe(false)
    expect(opted.code).toBe('CROSS_SAVE_USER_OPTED_OUT')

    await setCrossSavePolicy({
      gameId: 'off-title',
      userId: 'creator-1',
      policy: 'disabled',
    })
    const disabled = await resolveCrossSaveCloudEligibility({
      userId: 'player-1',
      gameId: 'off-title',
      gameSaveCloudReady: true,
    })
    expect(disabled.allowed).toBe(false)
    expect(disabled.code).toBe('CROSS_SAVE_DISABLED_BY_TITLE')
  })
})

describe('I.7 honesty split — policy CLOSED vs cloud HELD', () => {
  it('closes default-on opt-out when policy field ready; keeps cloud marketing HELD', () => {
    const policyOnly = evaluateCrossPlayHonesty({
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      crossSavePolicyFieldReady: true,
    })
    expect(policyOnly.crossSavePolicyFieldReady).toBe(true)
    expect(policyOnly.crossSaveDefaultOnOptOutHeld).toBe(false)
    expect(policyOnly.marketingCrossSaveAllowed).toBe(false)
    expect(policyOnly.crossSave.status).toBe('PARTIAL')
    expect(policyOnly.crossSave.heldReason).toBe('cross_save_cloud_held')
    expect(policyOnly.productCopy).toMatch(/cloud sync \[HELD\]/i)
    expect(policyOnly.productCopy).toMatch(/default-on|policy/i)

    // Cross-play remains fail-closed (I.8)
    expect(policyOnly.marketingCrossPlayAllowed).toBe(false)
  })

  it('flips cloud marketing only when cloud + policy are both ready', () => {
    const full = evaluateCrossPlayHonesty({
      gameSaveDurableReady: true,
      gameSaveCloudReady: true,
      crossSavePolicyFieldReady: true,
      g2MarketingUnlockPresent: false,
      dedicatedAgonesMarketingAllowed: false,
    })
    expect(full.marketingCrossSaveAllowed).toBe(true)
    expect(full.crossSaveDefaultOnOptOutHeld).toBe(false)
    expect(full.crossSave.status).toBe('IMPLEMENTED')
    // Still no invent Agones/cross-play
    expect(full.marketingCrossPlayAllowed).toBe(false)
  })

  it('fail-closes evaluateHubCrossSaveGate without cloud + policy', () => {
    expect(evaluateHubCrossSaveGate().allowed).toBe(false)
    expect(evaluateHubCrossSaveGate().code).toBe('CROSS_SAVE_POLICY_HELD')
    expect(
      evaluateHubCrossSaveGate({ crossSavePolicyFieldReady: true }).code,
    ).toBe('CROSS_SAVE_CLOUD_HELD')
    expect(
      evaluateHubCrossSaveGate({
        crossSavePolicyFieldReady: true,
        gameSaveCloudReady: true,
      }).allowed,
    ).toBe(true)
    expect(evaluateHubCrossSaveGate({ marketingCrossSaveAllowed: true }).allowed).toBe(true)
  })

  it('keeps evaluateHubCrossPlayGate fail-closed (I.8)', () => {
    expect(evaluateHubCrossPlayGate().allowed).toBe(false)
    expect(evaluateHubCrossPlayGate().code).toBe('G2_CROSS_PLAY_HELD')
  })
})

describe('I.7 probe wires durable policy store', () => {
  const prevPolicy = process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT
  const prevOptOut = process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT
  let tmp: string

  afterEach(async () => {
    if (prevPolicy === undefined) delete process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT
    else process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = prevPolicy
    if (prevOptOut === undefined) delete process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT
    else process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = prevOptOut
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('reports crossSavePolicyFieldReady when store writable', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i7-probe-'))
    process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT = path.join(tmp, 'policy')
    process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT = path.join(tmp, 'optout')

    const report = await probeCrossPlayHonesty({
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      cwd: tmp,
    })
    expect(report.crossSavePolicyFieldReady).toBe(true)
    expect(report.crossSaveDefaultOnOptOutHeld).toBe(false)
    expect(report.marketingCrossSaveAllowed).toBe(false)
    expect(report.crossSave.status).toBe('PARTIAL')
    expect(report.marketingCrossPlayAllowed).toBe(false)
  })
})

describe('I.7 arcade maturity', () => {
  it('mentions I.7 crossSavePolicy and keeps cloud marketing held', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.maturity).toBe('BETA')
    expect(arcade?.notes).toMatch(/I\.7/i)
    expect(arcade?.notes).toMatch(/crossSavePolicy|opt-out/i)
    expect(arcade?.notes).toMatch(/cloud GameSave marketing/i)
    expect(arcade?.notes).toMatch(/\[HELD\]/)
    expect(arcade?.notes).toMatch(/I\.8|cross-play/i)
  })
})
