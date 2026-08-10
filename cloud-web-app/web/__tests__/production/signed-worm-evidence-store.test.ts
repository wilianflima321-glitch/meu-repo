/**
 * SF2 — Signed WORM evidence store tests.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, afterEach } from 'vitest'

import {
  WORM_DOMAIN,
  appendWormEvidence,
  appendWormEvidenceWithConsentGate,
  createSignedWormStore,
  createWormSigningMaterial,
  loadAndVerifyDurableWorm,
  probeSignedWormReadiness,
  verifyWormChain,
} from '@/lib/production/signed-worm-evidence-store'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
})

describe('signed WORM evidence store (SF2)', () => {
  it('maintains HMAC-signed hash chain', () => {
    const signing = createWormSigningMaterial('test-sf2')
    const created = createSignedWormStore({ projectId: 'p-worm', signing })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    let store = created.value
    expect(store.domain).toBe(WORM_DOMAIN)

    const a1 = appendWormEvidence(store, signing, {
      payload: {
        kind: 'audit-chain',
        title: 'First',
        summary: 'link',
        refs: [],
        actor: 'test',
      },
    })
    expect(a1.ok).toBe(true)
    if (!a1.ok) return
    store = a1.value

    const check = verifyWormChain(store, signing)
    expect(check.valid).toBe(true)
    expect(check.fingerprint.length).toBeGreaterThan(0)
  })

  it('rejects tampered signatures fail-closed', () => {
    const signing = createWormSigningMaterial('tamper')
    const created = createSignedWormStore({ projectId: 'p-tamper', signing })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const appended = appendWormEvidence(created.value, signing, {
      payload: {
        kind: 'trade-lifecycle',
        title: 'Trade',
        summary: 'paper',
        refs: ['n3'],
        actor: 'test',
      },
    })
    expect(appended.ok).toBe(true)
    if (!appended.ok) return

    const tampered = {
      ...appended.value,
      entries: appended.value.entries.map((e, i) =>
        i === 0 ? { ...e, signature: 'deadbeef'.repeat(8) } : e,
      ),
    }
    const check = verifyWormChain(tampered, signing)
    expect(check.valid).toBe(false)
    expect(check.reason).toMatch(/signature/)
  })

  it('durable JSONL round-trip verifies', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aethel-worm-'))
    tempDirs.push(dir)
    const path = join(dir, 'worm.jsonl')
    const signing = createWormSigningMaterial('durable')

    const created = createSignedWormStore({
      projectId: 'p-durable',
      signing,
      durablePath: path,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const appended = appendWormEvidence(created.value, signing, {
      payload: {
        kind: 'agent-fusion-receipt',
        title: 'Receipt',
        summary: 'fusion',
        refs: ['fusion'],
        actor: 'test',
      },
    })
    expect(appended.ok).toBe(true)

    const loaded = loadAndVerifyDurableWorm(path, signing)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.valid).toBe(true)
    expect(loaded.value.store.entries).toHaveLength(1)
  })

  it('probe reports PARTIAL and investmentGrade false', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aethel-worm-probe-'))
    tempDirs.push(dir)
    const p = probeSignedWormReadiness(join(dir, 'probe.jsonl'))
    expect(p.ready).toBe(true)
    expect(p.status).toBe('PARTIAL')
    expect(p.investmentGrade).toBe(false)
    expect(p.hubCoinsIsolated).toBe(true)
    expect(p.durableRoundTrip).toBe(true)
    expect(p.entryCount).toBeGreaterThanOrEqual(2)
  })

  it('blocks cloud mirror without consent; allows local append', () => {
    const signing = createWormSigningMaterial('consent')
    const created = createSignedWormStore({ projectId: 'p-consent', signing })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const blocked = appendWormEvidenceWithConsentGate(created.value, signing, {
      payload: {
        kind: 'audit-chain',
        title: 'Cloud',
        summary: 'mirror',
        refs: [],
        actor: 'test',
      },
      cloudMirror: true,
      cloudConsent: false,
      accountId: 'acct',
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('cloud_consent_required')

    const local = appendWormEvidenceWithConsentGate(created.value, signing, {
      payload: {
        kind: 'audit-chain',
        title: 'Local',
        summary: 'ok',
        refs: [],
        actor: 'test',
      },
    })
    expect(local.ok).toBe(true)
  })
})
