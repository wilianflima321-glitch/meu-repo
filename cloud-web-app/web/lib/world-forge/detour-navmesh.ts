/**
 * Letter ct — Detour NavMesh deepen (Zero-MVP).
 *
 * Agent A* query on GPU/CPU walkable grid from letter ch + off-mesh link types
 * + rebuild hook after World Forge gen. `detourNavReady` flips only with soak
 * evidence. Unreal Recast/Detour full parity + NavMesh editor stay HELD.
 */

import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'
import type { NavMeshGrid } from '@/lib/world-forge/navmesh-rebuild'
import { NAVMESH_UNREAL_RECAST_PARITY_READY } from '@/lib/world-forge/gpu-recast-navmesh'

export const DETOUR_NAV_LETTER = 'ct' as const
export const DETOUR_NAV_WIRED = true as const

/**
 * Module default without session soak — use `proveDetourNavSoak` /
 * `probeDetourNavHonesty` to flip `detourNavReady`.
 */
export const DETOUR_NAV_READY = false as const

/** Full Unreal Recast/Detour parity remains HELD (ch/ct). */
export const DETOUR_UNREAL_RECAST_PARITY_READY = NAVMESH_UNREAL_RECAST_PARITY_READY

/** NavMesh editor polish — HELD (Zero-MVP ships query + links + rebuild only). */
export const DETOUR_NAV_EDITOR_HELD = true as const
export const DETOUR_NAV_EDITOR_READY = false as const

export type OffMeshLinkType = 'jump' | 'drop' | 'teleport' | 'ladder' | 'custom'

export interface OffMeshCellRef {
  x: number
  z: number
}

export interface OffMeshLink {
  id: string
  type: OffMeshLinkType
  from: OffMeshCellRef
  to: OffMeshCellRef
  /** Default true. */
  bidirectional?: boolean
  /** Extra traversal cost (default 1 for jump/drop/ladder, 0.25 teleport). */
  cost?: number
}

export interface DetourNavPathNode {
  x: number
  z: number
  viaOffMeshLinkId?: string
}

export interface DetourAgentPathResult {
  found: boolean
  cells: DetourNavPathNode[]
  cost: number
  usedOffMeshLinks: string[]
  notes: string[]
}

export interface DetourNavSession {
  letter: typeof DETOUR_NAV_LETTER
  navmesh: NavMeshGrid
  offMeshLinks: OffMeshLink[]
  version: number
  /** True only after soak proven for this session / probe. */
  detourNavReady: boolean
  /** Always false — UE Recast/Detour parity HELD. */
  unrealRecastParityReady: false
  /** Always false — editor polish HELD. */
  editorReady: false
  backend: NavMeshGrid['backend']
}

export interface DetourNavRebuildResult {
  session: DetourNavSession
  detourNavReady: boolean
  receipt: WorldForgeStageReceipt
}

export interface DetourNavSoakResult {
  letter: typeof DETOUR_NAV_LETTER
  passed: boolean
  frames: number
  queries: number
  detourNavReady: boolean
  unrealRecastParityReady: false
  editorReady: false
  gridPathFound: boolean
  offMeshPathFound: boolean
  notes: string[]
}

function cellKey(x: number, z: number): string {
  return `${x},${z}`
}

function defaultLinkCost(type: OffMeshLinkType): number {
  switch (type) {
    case 'teleport':
      return 0.25
    case 'jump':
    case 'drop':
      return 1.5
    case 'ladder':
      return 2
    default:
      return 1
  }
}

function isWalkable(navmesh: NavMeshGrid, x: number, z: number): boolean {
  const res = navmesh.resolution
  if (x < 0 || z < 0 || x >= res || z >= res) return false
  return Boolean(navmesh.cells[z * res + x]?.walkable)
}

function neighbors4(x: number, z: number): OffMeshCellRef[] {
  return [
    { x: x + 1, z },
    { x: x - 1, z },
    { x, z: z + 1 },
    { x, z: z - 1 },
  ]
}

/**
 * Build / refresh Detour session from walkable grid (CPU or GPU backend from ch).
 * Off-mesh links optional; empty links still allow grid A*.
 */
export function rebuildDetourNavFromWalkable(input: {
  navmesh: NavMeshGrid
  offMeshLinks?: OffMeshLink[]
  version?: number
  /** Soak proven before flipping detourNavReady. */
  soakPassed?: boolean
  soakFramesProven?: number
}): DetourNavRebuildResult {
  const links = (input.offMeshLinks ?? []).map((l) => ({
    ...l,
    bidirectional: l.bidirectional !== false,
    cost: l.cost ?? defaultLinkCost(l.type),
  }))
  const soakOk =
    input.soakPassed === true && Math.max(0, Math.floor(input.soakFramesProven ?? 0)) >= 1
  const walkableOk = input.navmesh.walkableCount > 0
  const detourNavReady = soakOk && walkableOk && DETOUR_NAV_WIRED

  const session: DetourNavSession = {
    letter: DETOUR_NAV_LETTER,
    navmesh: input.navmesh,
    offMeshLinks: links,
    version: input.version ?? input.navmesh.version,
    detourNavReady,
    unrealRecastParityReady: false,
    editorReady: false,
    backend: input.navmesh.backend,
  }

  return {
    session,
    detourNavReady,
    receipt: {
      stage: 'detour-nav-rebuild',
      status: walkableOk ? 'closed' : 'rejected',
      evidence: [
        'detour-agent-query',
        `backend=${input.navmesh.backend}`,
        `walkable=${input.navmesh.walkableCount}`,
        `offMesh=${links.length}`,
        detourNavReady ? 'detour-nav-ready' : 'detour-nav-held-until-soak',
        'unreal-recast-parity-held',
        'navmesh-editor-held',
      ],
      heldReason: detourNavReady
        ? 'Detour Zero-MVP CLOSED — UE Recast parity + NavMesh editor HELD'
        : 'Detour agent/off-mesh wired; detourNavReady requires soak evidence; UE Recast parity HELD',
      metrics: {
        walkableCount: input.navmesh.walkableCount,
        offMeshCount: links.length,
        version: session.version,
        detourNavReady: detourNavReady ? 1 : 0,
      },
    },
  }
}

/**
 * Register or replace an off-mesh link on a session (immutable copy).
 */
export function registerOffMeshLink(
  session: DetourNavSession,
  link: OffMeshLink,
): DetourNavSession {
  const next = {
    ...link,
    bidirectional: link.bidirectional !== false,
    cost: link.cost ?? defaultLinkCost(link.type),
  }
  const others = session.offMeshLinks.filter((l) => l.id !== next.id)
  return {
    ...session,
    offMeshLinks: [...others, next],
    version: session.version + 1,
  }
}

/**
 * Detour-style agent query: A* on walkable 4-neighbors + off-mesh edges.
 */
export function findDetourAgentPath(
  session: DetourNavSession,
  from: OffMeshCellRef,
  to: OffMeshCellRef,
): DetourAgentPathResult {
  const notes: string[] = []
  const navmesh = session.navmesh
  if (!isWalkable(navmesh, from.x, from.z) || !isWalkable(navmesh, to.x, to.z)) {
    notes.push('start-or-goal-unwalkable')
    return { found: false, cells: [], cost: Infinity, usedOffMeshLinks: [], notes }
  }
  if (from.x === to.x && from.z === to.z) {
    return {
      found: true,
      cells: [{ x: from.x, z: from.z }],
      cost: 0,
      usedOffMeshLinks: [],
      notes: ['trivial'],
    }
  }

  const start = cellKey(from.x, from.z)
  const goal = cellKey(to.x, to.z)
  const open = new Map<string, number>()
  const gScore = new Map<string, number>()
  const cameFrom = new Map<string, { prev: string; via?: string }>()
  const fHeuristic = (x: number, z: number) => Math.abs(x - to.x) + Math.abs(z - to.z)

  open.set(start, fHeuristic(from.x, from.z))
  gScore.set(start, 0)

  const linkEdges = new Map<string, Array<{ to: OffMeshCellRef; cost: number; id: string }>>()
  for (const link of session.offMeshLinks) {
    const cost = link.cost ?? defaultLinkCost(link.type)
    const push = (a: OffMeshCellRef, b: OffMeshCellRef) => {
      const k = cellKey(a.x, a.z)
      const list = linkEdges.get(k) ?? []
      list.push({ to: b, cost, id: link.id })
      linkEdges.set(k, list)
    }
    push(link.from, link.to)
    if (link.bidirectional !== false) push(link.to, link.from)
  }

  while (open.size > 0) {
    let bestKey: string | null = null
    let bestF = Infinity
    for (const [k, f] of open) {
      if (f < bestF) {
        bestF = f
        bestKey = k
      }
    }
    if (!bestKey) break
    open.delete(bestKey)
    if (bestKey === goal) break

    const [cx, cz] = bestKey.split(',').map(Number) as [number, number]
    const gCur = gScore.get(bestKey) ?? Infinity

    const edges: Array<{ nx: number; nz: number; stepCost: number; via?: string }> = []
    for (const n of neighbors4(cx, cz)) {
      if (!isWalkable(navmesh, n.x, n.z)) continue
      edges.push({ nx: n.x, nz: n.z, stepCost: 1 })
    }
    for (const e of linkEdges.get(bestKey) ?? []) {
      if (!isWalkable(navmesh, e.to.x, e.to.z)) continue
      edges.push({ nx: e.to.x, nz: e.to.z, stepCost: e.cost, via: e.id })
    }

    for (const e of edges) {
      const nk = cellKey(e.nx, e.nz)
      const tentative = gCur + e.stepCost
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue
      cameFrom.set(nk, { prev: bestKey, via: e.via })
      gScore.set(nk, tentative)
      open.set(nk, tentative + fHeuristic(e.nx, e.nz))
    }
  }

  if (!gScore.has(goal)) {
    notes.push('no-path')
    return { found: false, cells: [], cost: Infinity, usedOffMeshLinks: [], notes }
  }

  const cells: DetourNavPathNode[] = []
  const usedOffMeshLinks: string[] = []
  let cur: string | undefined = goal
  while (cur) {
    const [x, z] = cur.split(',').map(Number) as [number, number]
    const meta = cameFrom.get(cur)
    cells.push({
      x,
      z,
      viaOffMeshLinkId: meta?.via,
    })
    if (meta?.via) usedOffMeshLinks.push(meta.via)
    if (!meta) break
    cur = meta.prev
  }
  cells.reverse()

  notes.push(`backend=${session.backend}`, `offMeshUsed=${usedOffMeshLinks.length}`)
  return {
    found: true,
    cells,
    cost: gScore.get(goal) ?? Infinity,
    usedOffMeshLinks: [...new Set(usedOffMeshLinks)],
    notes,
  }
}

/**
 * Scripted soak: grid A* on contiguous walkable + off-mesh jump across a gap.
 * `detourNavReady` flips only when both queries succeed.
 */
export function proveDetourNavSoak(input?: {
  frames?: number
  navmesh?: NavMeshGrid
  offMeshLinks?: OffMeshLink[]
}): DetourNavSoakResult {
  const frames = Math.max(1, Math.floor(input?.frames ?? 4))
  const notes: string[] = []
  const resolution = 8

  const synthetic: NavMeshGrid =
    input?.navmesh ??
    (() => {
      const cells = []
      let walkableCount = 0
      for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
          // Gap column x=3 unwalkable — forces off-mesh for island crossing
          const walkable = x !== 3
          if (walkable) walkableCount++
          cells.push({ x, z, walkable, height: 1 })
        }
      }
      return {
        resolution,
        widthMeters: 32,
        depthMeters: 32,
        cells,
        walkableCount,
        version: 1,
        backend: 'cpu-grid' as const,
        gpuRecastReady: false,
      }
    })()

  const links: OffMeshLink[] = input?.offMeshLinks ?? [
    {
      id: 'jump-gap-x3',
      type: 'jump',
      from: { x: 2, z: 4 },
      to: { x: 4, z: 4 },
      bidirectional: true,
    },
  ]

  let session = rebuildDetourNavFromWalkable({
    navmesh: synthetic,
    offMeshLinks: links,
    soakPassed: false,
  }).session

  // Contiguous grid path (same island, left of gap)
  const gridPath = findDetourAgentPath(session, { x: 0, z: 4 }, { x: 2, z: 4 })
  notes.push(gridPath.found ? 'grid-path-ok' : 'grid-path-fail')

  // Cross gap via off-mesh
  const offMeshPath = findDetourAgentPath(session, { x: 0, z: 4 }, { x: 7, z: 4 })
  notes.push(offMeshPath.found ? 'off-mesh-path-ok' : 'off-mesh-path-fail')
  if (offMeshPath.found && offMeshPath.usedOffMeshLinks.length === 0) {
    notes.push('off-mesh-expected-but-unused')
  }

  let queries = 2
  // Multi-frame stability: re-query same endpoints
  for (let f = 0; f < frames; f++) {
    const again = findDetourAgentPath(session, { x: 0, z: 4 }, { x: 7, z: 4 })
    queries++
    if (!again.found || again.usedOffMeshLinks.length === 0) {
      notes.push(`frame-${f}-off-mesh-regress`)
    }
  }

  const passed =
    gridPath.found &&
    offMeshPath.found &&
    offMeshPath.usedOffMeshLinks.length > 0 &&
    !notes.some((n) => n.includes('regress') || n.includes('fail') || n.includes('unused'))

  session = rebuildDetourNavFromWalkable({
    navmesh: synthetic,
    offMeshLinks: links,
    soakPassed: passed,
    soakFramesProven: frames,
  }).session

  if (passed) notes.push('detour-nav-soak-passed')
  else notes.push('detour-nav-soak-held')

  return {
    letter: DETOUR_NAV_LETTER,
    passed,
    frames,
    queries,
    detourNavReady: session.detourNavReady,
    unrealRecastParityReady: false,
    editorReady: false,
    gridPathFound: gridPath.found,
    offMeshPathFound: offMeshPath.found && offMeshPath.usedOffMeshLinks.length > 0,
    notes,
  }
}

export function probeDetourNavHonesty(input?: {
  soak?: DetourNavSoakResult
  navmeshProven?: boolean
}): {
  letter: typeof DETOUR_NAV_LETTER
  wired: typeof DETOUR_NAV_WIRED
  detourNavReady: boolean
  unrealRecastParityReady: false
  editorReady: false
  editorHeld: true
  notes: string[]
} {
  const soakReady = Boolean(input?.soak?.passed && input.soak.detourNavReady)
  const navOk = input?.navmeshProven !== false
  const detourNavReady = soakReady && navOk
  return {
    letter: DETOUR_NAV_LETTER,
    wired: DETOUR_NAV_WIRED,
    detourNavReady,
    unrealRecastParityReady: false,
    editorReady: false,
    editorHeld: true,
    notes: [
      'ct: Detour agent A* + off-mesh + rebuild after World Forge gen',
      detourNavReady
        ? 'detourNavReady CLOSED (soak proven); unrealRecastParityReady HELD; editor HELD'
        : 'detourNavReady HELD until soak; UE Recast/Detour parity HELD; NavMesh editor HELD',
      ...(input?.soak?.notes.slice(0, 3) ?? []),
    ],
  }
}
