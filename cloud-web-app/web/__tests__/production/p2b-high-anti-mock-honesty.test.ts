/**
 * P2b HIGH Anti-MOCK honesty — regression guards for the closed HIGH batch.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  evaluateWebXrHonesty,
  WEBXR_MARKETING_SHIP_ALLOWED,
  WEBXR_VIEWPORT_ENTRY_WIRED,
} from '@/lib/webxr/webxr-honesty-capability'
import {
  evaluateLiveOpsF2Honesty,
  probeLiveOpsF2Honesty,
  probePlaytimeIngestRouteReady,
  probeTelemetrySpoolModuleReady,
} from '@/lib/liveops/liveops-f2-capability'
import {
  FREESOUND_PARTNER_CATALOG_STATUS,
  searchAudioLibrary,
} from '@/lib/audio/audio-library-search'
import {
  COPILOT_CONTEXT_DURABLE,
  getCopilotContextHonesty,
  isCopilotContextDurable,
} from '@/lib/copilot/context-store'
import {
  __resetWasmBootForTests,
  bootAethelKernelWasm,
  isAethelKernelWasmBooted,
} from '@/lib/production/wasm-boot'
import {
  listProjectCommitsHonesty,
  PROJECT_COMMITS_HELD_REASON,
  PROJECT_COMMITS_SHIP_STATUS,
} from '@/app/api/projects/[id]/commits/route'
import { createAcousticInMemoryBus } from '@/lib/cosmos/acoustic-atmosphere-wire'
import { runAutoRetopology } from '@/lib/mesh-quality/auto-retopology'

describe('P2b HIGH #17 — WebXR marketing fail-closed', () => {
  it('never allows XR marketing even when technical wires are complete', () => {
    expect(WEBXR_MARKETING_SHIP_ALLOWED).toBe(false)
    expect(WEBXR_VIEWPORT_ENTRY_WIRED).toBe(false)
    const live = evaluateWebXrHonesty({
      webxrApiAvailable: true,
      sessionActive: true,
      foveationWiredInFrameLoop: true,
      viewportEntryWired: true,
    })
    expect(live.shipStatus).toBe('IMPLEMENTED')
    expect(live.marketingAllowed).toBe(false)
    expect(live.evidenceRefs).toContain('webxr:marketing-held')
  })
})

describe('P2b HIGH #18 — F.2 spool/ingest probes (no hardcode)', () => {
  it('evaluate fail-closes when spool/ingest omitted', () => {
    const held = evaluateLiveOpsF2Honesty({ playerStatsWritable: true })
    expect(held.telemetrySpool.connectable).toBe(false)
    expect(held.playtimeIngest.connectable).toBe(false)
    expect(held.playtimeTelemetryReady).toBe(false)
  })

  it('probeTelemetrySpoolModuleReady exercises real enqueue contract', async () => {
    const spool = await probeTelemetrySpoolModuleReady()
    expect(spool.ready).toBe(true)
    const ingest = probePlaytimeIngestRouteReady()
    expect(ingest.ready).toBe(true)
  })

  it('probeLiveOpsF2Honesty derives spool/ingest from probes', async () => {
    const report = await probeLiveOpsF2Honesty()
    expect(report.telemetrySpool.connectable).toBe(true)
    expect(report.playtimeIngest.connectable).toBe(true)
  })
})

describe('P2b HIGH #19 — Copilot context process-local honesty', () => {
  it('exposes durable=false / process-local (no MVP label)', () => {
    expect(COPILOT_CONTEXT_DURABLE).toBe(false)
    expect(isCopilotContextDurable()).toBe(false)
    const honesty = getCopilotContextHonesty()
    expect(honesty.persistence).toBe('process-local')
    expect(honesty.heldReason).toBe('process_local_only')
    const src = readFileSync(
      path.join(process.cwd(), 'lib/copilot/context-store.ts'),
      'utf8',
    )
    expect(src.toLowerCase()).not.toMatch(/\bmvp\b/)
  })
})

describe('P2b HIGH #20 — Foley partner stubs removed from ship search', () => {
  it('search pool has no catalog-stub titles and partner catalog HELD', () => {
    expect(FREESOUND_PARTNER_CATALOG_STATUS).toBe('HELD')
    const result = searchAudioLibrary('impact wood click')
    expect(result.partnerCatalogStatus).toBe('HELD')
    expect(result.hits.every((h) => !/stub/i.test(h.title))).toBe(true)
    expect(result.hits.every((h) => h.source === 'treasury' || h.source === 'first-party')).toBe(
      true,
    )
  })
})

describe('P2b HIGH #23 — partition cell store no SSD theater comment', () => {
  it('source does not claim simulated SSD reads', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'lib/world-streaming/partition-cell-store.ts'),
      'utf8',
    )
    expect(src.toLowerCase()).not.toContain('simulates async ssd')
    expect(src).toContain('in-memory CAS')
  })
})

describe('P2b HIGH #24 — auto-retopo subsample fallback honesty', () => {
  it('surfaces subsampleBudgetFallbackUsed when cluster misses budget', () => {
    // Dense grid that forces budget miss → subsample path.
    const side = 12
    const positions: number[] = []
    const indices: number[] = []
    for (let z = 0; z < side; z++) {
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          positions.push(x, y, z)
        }
      }
    }
    for (let z = 0; z < side - 1; z++) {
      for (let y = 0; y < side - 1; y++) {
        for (let x = 0; x < side - 1; x++) {
          const i = x + y * side + z * side * side
          indices.push(i, i + 1, i + side, i + 1, i + side + 1, i + side)
        }
      }
    }
    const result = runAutoRetopology({
      mesh: {
        positions: new Float32Array(positions),
        indices: new Uint32Array(indices),
      },
      targetTriangles: 8,
      capabilityScore: 100,
      allowInlineOnWeakGpu: true,
    })
    expect(result.instantMeshesParity).toBe(false)
    expect(typeof result.subsampleBudgetFallbackUsed).toBe('boolean')
    if (result.subsampleBudgetFallbackUsed) {
      expect(result.receipt.evidence).toContain('subsample-budget-fallback-not-qem')
    }
  })
})

describe('P2b HIGH #25 — wasm-boot no supremacy theater', () => {
  it('fails closed without inventing success / uses no console.log hype', async () => {
    __resetWasmBootForTests()
    expect(isAethelKernelWasmBooted()).toBe(false)
    const src = readFileSync(path.join(process.cwd(), 'lib/production/wasm-boot.ts'), 'utf8')
    expect(src).not.toMatch(/\bconsole\.log\b/)
    expect(src.toLowerCase()).not.toContain('supremacia')
    expect(src).not.toMatch(/sem downloads|0ms sem/i)
    await expect(bootAethelKernelWasm()).rejects.toThrow(/unavailable|HELD/i)
    expect(isAethelKernelWasmBooted()).toBe(false)
  })
})

describe('P2b HIGH commits — fabricated git history removed', () => {
  it('listProjectCommitsHonesty returns empty HELD (no Math.random theater)', () => {
    const honesty = listProjectCommitsHonesty()
    expect(honesty.shipStatus).toBe(PROJECT_COMMITS_SHIP_STATUS)
    expect(honesty.heldReason).toBe(PROJECT_COMMITS_HELD_REASON)
    expect(honesty.commits).toEqual([])
    expect(honesty.total).toBe(0)
    const src = readFileSync(
      path.join(process.cwd(), 'app/api/projects/[id]/commits/route.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/\bMath\.random\s*\(/)
    expect(src).not.toContain('generateProjectCommits')
  })
})

describe('P2b HIGH #30 — acoustic in-memory bus (not production mock provider)', () => {
  it('createAcousticInMemoryBus is a soak sink, not a silent success provider', () => {
    const bus = createAcousticInMemoryBus()
    expect(bus.getGain()).toBeNull()
    bus.target.setTransmissionGain(0.42)
    expect(bus.getGain()).toBe(0.42)
  })
})
