import { describe, expect, it } from 'vitest'

import {
  AETHEL_TOOLCHAIN_LANES,
  buildAethelToolchainDependencyMatrix,
  validateAethelToolchainDependencyMap,
} from '@aethel/runtime/runtime-toolchain-dependency-map'

describe('runtime toolchain dependency map', () => {
  it('keeps every modeled production lane governed by dependencies and evidence', () => {
    expect(validateAethelToolchainDependencyMap()).toEqual([])
    expect(AETHEL_TOOLCHAIN_LANES.map((lane) => lane.id)).toEqual(
      expect.arrayContaining([
        'apps-production',
        'research-intelligence',
        'game-prototype',
        'game-vertical-slice',
        'complete-game-plan',
        'film-cinematic',
        'asset-finalization',
        'cloud-stream',
        'studio-local-release',
        'marketplace-provenance',
      ]),
    )
  })

  it('blocks vertical-slice claims when native asset tools, services, or human review are missing', () => {
    const matrix = buildAethelToolchainDependencyMatrix({ laneIds: ['game-vertical-slice'] })
    const lane = matrix.lanes[0]

    expect(lane.status).toBe('blocked')
    expect(lane.missingDependencies).toEqual(
      expect.arrayContaining([
        'ai-provider',
        'object-storage',
        'gltf-transform',
        'meshoptimizer',
        'ktx-software-basisu',
        'blender-headless',
        'recast-detour',
        'rapier-physics',
        'ffmpeg',
        'human-art-direction-approval',
      ]),
    )
    expect(lane.blockers.join(' ')).toContain('Do not claim final game quality')
    expect(lane.maxHonestClaim).toContain('governed vertical slice')
  })

  it('keeps asset finalization beyond AI draft quality locked to LOD/PBR/performance evidence and human approval', () => {
    const lane = AETHEL_TOOLCHAIN_LANES.find((candidate) => candidate.id === 'asset-finalization')
    expect(lane?.userOutcome).toContain('beyond 10k-poly AI draft')
    expect(lane?.requiredEvidence).toEqual(
      expect.arrayContaining([
        'license/provenance receipt',
        'LOD0/LOD1/LOD2/LOD3 manifest',
        'PBR texture compression report',
        'collision/navmesh proxy report',
        'viewport performance trace',
        'signed Studio Local daemon dispatch',
        'human art-direction approval',
      ]),
    )
    expect(lane?.maxHonestClaim).toContain('never final without human approval')
  })

  it('allows a selected lane to become ready only when dependencies and evidence are explicitly present', () => {
    const matrix = buildAethelToolchainDependencyMatrix({
      laneIds: ['asset-finalization'],
      installedNativeToolIds: [
        'gltf-transform',
        'meshoptimizer',
        'ktx-software-basisu',
        'blender-headless',
        'recast-detour',
        'rapier-physics',
      ],
      approvedHumanProcessIds: [
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
      ],
    })

    expect(matrix.lanes[0]).toMatchObject({
      laneId: 'asset-finalization',
      status: 'ready',
      missingDependencies: [],
      missingEvidence: [],
      blockers: [],
    })
    expect(matrix.nextAction).toContain('execution evidence')
  })

  it('documents complete-game-plan as a plan, not a shipped game claim', () => {
    const lane = AETHEL_TOOLCHAIN_LANES.find((candidate) => candidate.id === 'complete-game-plan')
    expect(lane?.maxHonestClaim).toContain('not a complete playable shipped game')
    expect(lane?.requiredEvidence).toEqual(expect.arrayContaining(['deep production bible', 'notFullGameClaim: true', 'release hold']))
  })
})
