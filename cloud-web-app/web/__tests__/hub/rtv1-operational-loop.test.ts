/**
 * RTv1 operational loop — playtime wiring + publish listing compression evidence.
 * Fail-closed when Compression Mandate evidence is absent; pass only with measured bytes.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildDiscoveryFeed,
  DISCOVERY_MAX_DEMO_BUNDLE_BYTES,
} from '@/lib/hub/discovery-feed-engine'
import {
  evaluatePublishListingEvidence,
  readPublishListingEvidence,
  resolveHubDemoListingLabel,
  stampPublishListingEvidence,
} from '@/lib/hub/publish-listing-authority'
import { createMemoryTelemetrySpool } from '@/lib/liveops/telemetry-spool'
import {
  enqueueSessionPlaytime,
  flushPlaytimeSpool,
} from '@/lib/liveops/playtime-client'

describe('RTv1 publish listing compression evidence', () => {
  const prevRoot = process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT
  let tmpRoot: string

  afterEach(async () => {
    if (prevRoot === undefined) delete process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT
    else process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT = prevRoot
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('fail-closes compressionMandatePassed when bundle bytes are missing', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'neon-runner',
      webExportDownloadUrl: 'https://cdn.example/demo/index.html',
      webExportFileSizeBytes: null,
      explicitCompressionMandatePassed: true,
    })
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(evidence.demoPlayUrl).toBe('https://cdn.example/demo/index.html')
    expect(evidence.noWebDemo).toBe(false)
    expect(evidence.reason).toMatch(/compression_evidence_missing/)
  })

  it('passes Compression Mandate with measured ≤150MB demo and stamps demoPlayUrl', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-listing-'))
    process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT = tmpRoot

    const stamped = await stampPublishListingEvidence({
      gameId: 'oss-kit',
      webExportDownloadUrl: 'https://cdn.example/oss/index.html',
      webExportFileSizeBytes: 12 * 1024 * 1024,
      evidenceRef: 'exportJob:exp_1',
    })
    expect(stamped.compressionMandatePassed).toBe(true)
    expect(stamped.demoPlayUrl).toBe('https://cdn.example/oss/index.html')
    expect(stamped.demoBundleBytes).toBe(12 * 1024 * 1024)

    const read = await readPublishListingEvidence('oss-kit')
    expect(read?.compressionMandatePassed).toBe(true)
    expect(read?.demoPlayUrl).toBe('https://cdn.example/oss/index.html')
  })

  it('rejects oversize demo bundles (Compression Mandate)', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'giant-demo',
      webExportDownloadUrl: 'https://cdn.example/giant/index.html',
      webExportFileSizeBytes: DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1,
    })
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(evidence.demoBundleBytes).toBe(DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1)
  })

  it('marks noWebDemo as Desktop Exclusive and discovery-ineligible', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'desktop-only',
      webExportDownloadUrl: 'https://cdn.example/should-ignore.html',
      webExportFileSizeBytes: 8 * 1024 * 1024,
      noWebDemo: true,
    })
    expect(evidence.noWebDemo).toBe(true)
    expect(evidence.demoPlayUrl).toBeNull()
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(resolveHubDemoListingLabel(evidence)).toBe('desktop_exclusive')
  })

  it('discovery feed stays empty without stamped compression evidence', () => {
    const feed = buildDiscoveryFeed(
      [
        {
          gameId: 'no-evidence',
          title: 'No Evidence',
          status: 'playable',
          visibility: 'public',
          publishedAt: new Date().toISOString(),
          plays: 10,
          playUrl: 'https://cdn.example/x',
          compressionMandatePassed: false,
          demoBundleBytes: null,
        },
      ],
      { aiModerationReady: false, impressionLedgerReady: false },
    )
    expect(feed.empty).toBe(true)
    expect(feed.items).toHaveLength(0)
  })

  it('discovery feed includes titles when compression evidence is real', () => {
    const feed = buildDiscoveryFeed(
      [
        {
          gameId: 'eligible',
          title: 'Eligible Demo',
          status: 'playable',
          visibility: 'public',
          publishedAt: new Date().toISOString(),
          plays: 42,
          playUrl: 'https://cdn.example/eligible',
          compressionMandatePassed: true,
          demoBundleBytes: 40 * 1024 * 1024,
        },
      ],
      { aiModerationReady: false, impressionLedgerReady: false },
    )
    expect(feed.empty).toBe(false)
    expect(feed.items.map((i) => i.gameId)).toContain('eligible')
  })
})

describe('RTv1 Arcade playtime client emission path', () => {
  it('enqueues wall-clock deltas and flushes to F.2 ingest endpoint', async () => {
    const spool = createMemoryTelemetrySpool(`arcade_rtv1_${Date.now()}`)
    await spool.clearAll()

    const row = await enqueueSessionPlaytime({
      spool,
      gameId: 'arcade-slug',
      sessionId: 'sess-arcade-1',
      deltaSeconds: 45,
    })
    expect(row.payload.deltaSeconds).toBe(45)

    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        events?: Array<{ gameId?: string; deltaSeconds?: number }>
      }
      expect(body.events?.[0]?.gameId).toBe('arcade-slug')
      expect(body.events?.[0]?.deltaSeconds).toBe(45)
      return new Response(JSON.stringify({ acceptedIds: [row.id], rejected: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await flushPlaytimeSpool({ spool, fetchImpl })
    expect(result.ok).toBe(true)
    expect(result.marked).toBe(1)
    expect(fetchImpl).toHaveBeenCalled()
    expect(await spool.peekUnsynced()).toHaveLength(0)
  })

  it('leaves unsynced playtime on 401 (unauthenticated Arcade session)', async () => {
    const spool = createMemoryTelemetrySpool(`arcade_unauth_${Date.now()}`)
    await enqueueSessionPlaytime({
      spool,
      gameId: 'guest-play',
      sessionId: 'sess-guest',
      deltaSeconds: 30,
    })

    const result = await flushPlaytimeSpool({
      spool,
      fetchImpl: async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    expect(result.ok).toBe(false)
    expect(result.marked).toBe(0)
    expect(await spool.peekUnsynced()).toHaveLength(1)
  })
})
