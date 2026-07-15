import { describe, expect, it } from 'vitest'

import {
  buildAethelToolchainReadinessSnapshot,
  coerceAethelToolchainLaneIds,
  detectAethelToolchainEnvironment,
} from '@aethel/runtime/runtime-toolchain-readiness-snapshot'

const FINAL_ASSET_EVIDENCE = [
  'human-art-direction-approval',
  'license/provenance receipt',
  'creator/source URL',
  'usage rights',
  'source sha256',
  'LOD0/LOD1/LOD2/LOD3 manifest',
  'mesh density report',
  'UV/material validation',
  'PBR texture compression report',
  'collision/navmesh proxy report',
  'viewport performance trace',
  'runtime execution evidence',
  'human art-direction approval',
  'signed Studio Local daemon dispatch',
  'rollback plan',
]

describe('runtime toolchain readiness snapshot', () => {
  it('detects configured services without exposing secret values', () => {
    const readiness = detectAethelToolchainEnvironment({
      OPENAI_API_KEY: 'sk-secret',
      AWS_ACCESS_KEY_ID: 'access',
      AWS_SECRET_ACCESS_KEY: 'secret',
      S3_BUCKET: 'assets',
      NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL: 'wss://stream.example.test',
      STRIPE_SECRET_KEY: 'sk_test',
      SENTRY_DSN: 'https://dsn.example.test',
    })

    expect(readiness.configuredServiceIds).toEqual(
      expect.arrayContaining(['ai-provider', 'object-storage', 'pixel-stream-url', 'stripe', '@sentry/nextjs']),
    )
    expect(JSON.stringify(readiness)).not.toContain('sk-secret')
    expect(JSON.stringify(readiness)).not.toContain('access')
  })

  it('coerces lane query strings and ignores unknown lanes', () => {
    expect(coerceAethelToolchainLaneIds('game-vertical-slice,unknown,asset-finalization')).toEqual([
      'game-vertical-slice',
      'asset-finalization',
    ])
  })

  it('returns held readiness when selected lanes are missing toolchain dependencies', () => {
    const snapshot = buildAethelToolchainReadinessSnapshot({
      laneIds: ['game-vertical-slice', 'complete-game-plan'],
      env: {},
      generatedAt: '2026-05-25T16:00:00.000Z',
    })

    expect(snapshot.capability).toBe('AETHEL_RUNTIME_TOOLCHAIN_READINESS')
    expect(snapshot.capabilityStatus).toBe('held')
    expect(snapshot.laneCount).toBe(2)
    expect(snapshot.blockedLaneCount).toBeGreaterThan(0)
    expect(snapshot.matrix.lanes[0].blockers.join(' ')).toContain('Do not claim final game quality')
    expect(snapshot.environment.missingServiceIds).toEqual(expect.arrayContaining(['ai-provider', 'object-storage', 'pixel-stream-url']))
  })

  it('marks asset finalization ready only when tools and evidence are explicit', () => {
    const snapshot = buildAethelToolchainReadinessSnapshot({
      laneIds: ['asset-finalization'],
      env: {},
      installedNativeToolIds: [
        'gltf-transform',
        'meshoptimizer',
        'ktx-software-basisu',
        'blender-headless',
        'recast-detour',
        'rapier-physics',
      ],
      approvedHumanProcessIds: FINAL_ASSET_EVIDENCE,
    })

    expect(snapshot.capabilityStatus).toBe('available')
    expect(snapshot.readyLaneCount).toBe(1)
    expect(snapshot.matrix.lanes[0]).toMatchObject({
      laneId: 'asset-finalization',
      status: 'ready',
      missingDependencies: [],
      missingEvidence: [],
      blockers: [],
    })
  })
})
