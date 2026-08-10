/**
 * Law XV — hardened baked-lighting publish gate.
 */

import { describe, expect, it } from 'vitest'

import {
  evaluateBakedLightingPublishGate,
  isTheaterBakeReceipt,
  probeBakedLightingPublishGateReadiness,
  refusePackWithoutBakeEvidence,
} from '@/lib/production/baked-lighting-publish-gate'
import { evaluateBakedLightingPublishGate as orchestratorGate } from '@/lib/production/publish-pipeline-orchestrator'

describe('Law XV baked-lighting publish gate harden', () => {
  it('passes only with non-theater receipt + positive lightmap bytes', () => {
    const ok = evaluateBakedLightingPublishGate({
      target: 'web-static',
      bakeReceiptRef: 'bake:project-1:v1',
      lightmapBytes: 4096,
    })
    expect(ok.allowed).toBe(true)
    expect(ok.shipStatus).toBe('IMPLEMENTED')
    expect(ok.evidenceFingerprint).toBeTruthy()
  })

  it('refuses theater receipts even with lightmap bytes', () => {
    expect(isTheaterBakeReceipt('mock')).toBe(true)
    expect(isTheaterBakeReceipt('pending')).toBe(true)
    expect(isTheaterBakeReceipt('bake:mock:v1')).toBe(true)
    expect(isTheaterBakeReceipt('bake:project-1:v1')).toBe(false)

    const blocked = evaluateBakedLightingPublishGate({
      target: 'web-static',
      bakeReceiptRef: 'mock',
      lightmapBytes: 4096,
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.rejectCode).toBe('theater_receipt')
  })

  it('refusePackWithoutBakeEvidence blocks pack on theater and empty bytes', () => {
    const refuse = refusePackWithoutBakeEvidence({
      target: 'web-static',
      bakeReceiptRef: 'todo',
      lightmapBytes: 8192,
      packByteLength: 50_000,
    })
    expect(refuse.ok).toBe(false)

    const emptyPack = refusePackWithoutBakeEvidence({
      target: 'web-static',
      bakeReceiptRef: 'bake:project-1:v1',
      lightmapBytes: 4096,
      packByteLength: 0,
    })
    expect(emptyPack.ok).toBe(false)

    const ok = refusePackWithoutBakeEvidence({
      target: 'web-static',
      bakeReceiptRef: 'bake:project-1:v1',
      lightmapBytes: 4096,
      packByteLength: 2048,
    })
    expect(ok.ok).toBe(true)
  })

  it('orchestrator re-exports hardened gate', () => {
    expect(
      orchestratorGate({
        target: 'web-static',
        bakeReceiptRef: 'fake',
        lightmapBytes: 100,
      }).allowed,
    ).toBe(false)
    const probe = probeBakedLightingPublishGateReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
  })
})
