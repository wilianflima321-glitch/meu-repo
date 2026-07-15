/**
 * Letter ct — Detour NavMesh deepen (Zero-MVP honesty).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { bakeSdfParamsToHeightfield } from '@/lib/world-forge/sdf-fractal-sculpt'
import {
  DETOUR_NAV_LETTER,
  DETOUR_NAV_WIRED,
  DETOUR_NAV_READY,
  DETOUR_NAV_EDITOR_HELD,
  DETOUR_NAV_EDITOR_READY,
  DETOUR_UNREAL_RECAST_PARITY_READY,
  rebuildDetourNavFromWalkable,
  registerOffMeshLink,
  findDetourAgentPath,
  proveDetourNavSoak,
  probeDetourNavHonesty,
} from '@/lib/world-forge/detour-navmesh'
import {
  rebuildNavMeshGpuOrCpu,
  createMockGpuRecastDevice,
  runGpuRecastComputeSoak,
  NAVMESH_UNREAL_RECAST_PARITY_READY,
} from '@/lib/world-forge/gpu-recast-navmesh'
import { runWorldForgeConveyor } from '@/lib/world-forge/world-forge-conveyor'
import { probeWorldForgeHonesty } from '@/lib/world-forge/world-forge-honesty'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeFusionTransactionsForTests()
})

describe('Detour NavMesh flags (ct)', () => {
  it('wires letter ct and keeps UE Recast parity + editor HELD', () => {
    expect(DETOUR_NAV_LETTER).toBe('ct')
    expect(DETOUR_NAV_WIRED).toBe(true)
    expect(DETOUR_NAV_READY).toBe(false)
    expect(DETOUR_UNREAL_RECAST_PARITY_READY).toBe(false)
    expect(NAVMESH_UNREAL_RECAST_PARITY_READY).toBe(false)
    expect(DETOUR_NAV_EDITOR_READY).toBe(false)
    expect(DETOUR_NAV_EDITOR_HELD).toBe(true)
  })
})

describe('Detour agent query + off-mesh (ct)', () => {
  it('A* finds grid path on contiguous walkable', () => {
    const soak = proveDetourNavSoak({ frames: 2 })
    expect(soak.gridPathFound).toBe(true)

    const rebuilt = rebuildDetourNavFromWalkable({
      navmesh: {
        resolution: 8,
        widthMeters: 32,
        depthMeters: 32,
        cells: Array.from({ length: 64 }, (_, i) => {
          const x = i % 8
          const z = Math.floor(i / 8)
          return { x, z, walkable: x !== 3, height: 1 }
        }),
        walkableCount: 56,
        version: 1,
        backend: 'cpu-grid',
        gpuRecastReady: false,
      },
      offMeshLinks: [
        {
          id: 'jump-gap-x3',
          type: 'jump',
          from: { x: 2, z: 4 },
          to: { x: 4, z: 4 },
        },
      ],
      soakPassed: true,
      soakFramesProven: 2,
    })
    const path = findDetourAgentPath(rebuilt.session, { x: 0, z: 1 }, { x: 2, z: 1 })
    expect(path.found).toBe(true)
    expect(path.usedOffMeshLinks).toHaveLength(0)
    expect(path.cells.length).toBeGreaterThan(1)
  })

  it('off-mesh jump crosses unwalkable gap; without link path fails', () => {
    const cells = Array.from({ length: 64 }, (_, i) => {
      const x = i % 8
      const z = Math.floor(i / 8)
      return { x, z, walkable: x !== 3, height: 1 }
    })
    const navmesh = {
      resolution: 8,
      widthMeters: 32,
      depthMeters: 32,
      cells,
      walkableCount: 56,
      version: 1,
      backend: 'cpu-grid' as const,
      gpuRecastReady: false,
    }

    const noLink = rebuildDetourNavFromWalkable({ navmesh, soakPassed: true, soakFramesProven: 1 })
    const blocked = findDetourAgentPath(noLink.session, { x: 0, z: 4 }, { x: 7, z: 4 })
    expect(blocked.found).toBe(false)

    let session = registerOffMeshLink(noLink.session, {
      id: 'jump-gap',
      type: 'jump',
      from: { x: 2, z: 4 },
      to: { x: 4, z: 4 },
      bidirectional: true,
    })
    session = { ...session, detourNavReady: true }
    const crossed = findDetourAgentPath(session, { x: 0, z: 4 }, { x: 7, z: 4 })
    expect(crossed.found).toBe(true)
    expect(crossed.usedOffMeshLinks).toContain('jump-gap')
  })

  it('supports drop / teleport / ladder link types', () => {
    const cells = Array.from({ length: 64 }, (_, i) => {
      const x = i % 8
      const z = Math.floor(i / 8)
      return { x, z, walkable: true, height: 1 }
    })
    let session = rebuildDetourNavFromWalkable({
      navmesh: {
        resolution: 8,
        widthMeters: 32,
        depthMeters: 32,
        cells,
        walkableCount: 64,
        version: 1,
        backend: 'cpu-grid',
        gpuRecastReady: false,
      },
      soakPassed: true,
      soakFramesProven: 1,
    }).session
    for (const type of ['drop', 'teleport', 'ladder'] as const) {
      session = registerOffMeshLink(session, {
        id: `${type}-link`,
        type,
        from: { x: 0, z: 0 },
        to: { x: 7, z: 7 },
        bidirectional: false,
      })
      expect(session.offMeshLinks.some((l) => l.type === type)).toBe(true)
    }
  })
})

describe('Detour readiness gate (ct)', () => {
  it('HELD without soak even when walkable grid present', () => {
    const rebuild = rebuildDetourNavFromWalkable({
      navmesh: {
        resolution: 4,
        widthMeters: 16,
        depthMeters: 16,
        cells: Array.from({ length: 16 }, (_, i) => ({
          x: i % 4,
          z: Math.floor(i / 4),
          walkable: true,
          height: 1,
        })),
        walkableCount: 16,
        version: 1,
        backend: 'cpu-grid',
        gpuRecastReady: false,
      },
    })
    expect(rebuild.detourNavReady).toBe(false)
    expect(rebuild.receipt.evidence).toContain('detour-nav-held-until-soak')
    expect(rebuild.session.unrealRecastParityReady).toBe(false)
    expect(rebuild.session.editorReady).toBe(false)
  })

  it('flips detourNavReady only after proveDetourNavSoak', () => {
    const soak = proveDetourNavSoak({ frames: 4 })
    expect(soak.passed).toBe(true)
    expect(soak.detourNavReady).toBe(true)
    expect(soak.unrealRecastParityReady).toBe(false)
    expect(soak.editorReady).toBe(false)
    expect(soak.gridPathFound).toBe(true)
    expect(soak.offMeshPathFound).toBe(true)
    expect(soak.queries).toBeGreaterThanOrEqual(6)

    const honesty = probeDetourNavHonesty({ soak })
    expect(honesty.detourNavReady).toBe(true)
    expect(honesty.unrealRecastParityReady).toBe(false)
    expect(honesty.editorHeld).toBe(true)
  })
})

describe('Detour rebuild + conveyor (ct)', () => {
  it('rebuilds Detour session on GPU walkable from ch after soak', () => {
    const baked = bakeSdfParamsToHeightfield({
      prompt: 'rolling hills meadow',
      seed: 21,
      resolution: 33,
    })
    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const gpuSoak = runGpuRecastComputeSoak({
      frames: 4,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 55,
      device,
      heightfield: baked.heightfield,
      resolution: 24,
    })
    expect(gpuSoak.passed).toBe(true)

    const nav = rebuildNavMeshGpuOrCpu({
      heightfield: baked.heightfield,
      resolution: 24,
      capabilityScore: 55,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      soakPassed: true,
      soakFramesProven: gpuSoak.frames,
      device,
    })
    expect(nav.navmesh.backend).toBe('webgpu-compute')

    const detourSoak = proveDetourNavSoak({ frames: 2 })
    const detour = rebuildDetourNavFromWalkable({
      navmesh: nav.navmesh,
      soakPassed: detourSoak.passed,
      soakFramesProven: detourSoak.frames,
    })
    expect(detour.session.backend).toBe('webgpu-compute')
    expect(detour.detourNavReady).toBe(true)
    expect(detour.receipt.stage).toBe('detour-nav-rebuild')
    expect(detour.receipt.evidence).toContain('detour-nav-ready')
  })

  it('conveyor rebuilds Detour after World Forge gen when soak passed', async () => {
    const store = createMemoryFusionScopeStore()
    const result = await runWorldForgeConveyor({
      projectId: 'proj-ct-detour',
      userId: 'user-ct',
      prompt: 'temperate plateau ruins',
      seed: 33,
      capabilityScore: 70,
      fusionStore: store,
      detourNavSoakPassed: true,
      detourNavSoakFrames: 4,
      offMeshLinks: [
        {
          id: 'ladder-ridge',
          type: 'ladder',
          from: { x: 4, z: 4 },
          to: { x: 8, z: 8 },
          bidirectional: true,
        },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.navmesh?.walkableCount).toBeGreaterThan(0)
    expect(result.detourNav).toBeDefined()
    expect(result.detourNavReady).toBe(true)
    expect(result.detourNav?.offMeshLinks).toHaveLength(1)
    expect(result.detourNav?.offMeshLinks[0]?.type).toBe('ladder')
    expect(result.unrealRecastParityReady).toBe(false)
    expect(
      result.stages.some((s) => s.stage === 'detour-nav-rebuild' && s.status === 'closed'),
    ).toBe(true)
  })

  it('conveyor keeps detourNavReady false without soak', async () => {
    const store = createMemoryFusionScopeStore()
    const result = await runWorldForgeConveyor({
      projectId: 'proj-ct-held',
      userId: 'user-ct',
      prompt: 'rolling hills meadow',
      seed: 9,
      capabilityScore: 40,
      fusionStore: store,
    })
    expect(result.success).toBe(true)
    expect(result.detourNavReady).toBe(false)
    expect(result.detourNav?.detourNavReady).toBe(false)
    expect(result.stages.some((s) => s.stage === 'detour-nav-rebuild')).toBe(true)
  })

  it('honesty flips detourNavReady only with soak; UE parity stays false', () => {
    const without = probeWorldForgeHonesty({
      sdfProven: true,
      navmeshProven: true,
      conveyorProven: true,
    })
    expect(without.detourNavReady).toBe(false)
    expect(without.gpuRecastReady).toBe(false)
    expect(without.unrealRecastParityReady).toBe(false)
    expect(without.modules.detourNav).toBe(true)

    const soak = proveDetourNavSoak({ frames: 3 })
    const withSoak = probeWorldForgeHonesty({
      sdfProven: true,
      navmeshProven: true,
      conveyorProven: true,
      detourNavSoak: soak,
    })
    expect(withSoak.detourNavReady).toBe(true)
    expect(withSoak.unrealRecastParityReady).toBe(false)
    expect(withSoak.notes.join(' ')).toContain('Detour')
  })
})
