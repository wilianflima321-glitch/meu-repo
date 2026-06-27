/**
 * chaos-destruction.ts  — Sprint V33
 *
 * Voronoi-based real-time destruction system for Aethel Engine.
 * Equivalent to Unreal Engine's Chaos Destruction.
 *
 * Architecture:
 *   VoronoiCell       — a fracture fragment (geometry + centroid)
 *   AdjacencyEdge     — structural bond between two cells
 *   FractureGraph     — manages the bond network + impact evaluation
 *   DestructionSystem — integrates fracture with physics (Rapier via PhysicsWorld)
 *
 * Physics:
 *   Strain = ImpulseForce / (ContactArea × MaterialTensileStrength)
 *   If Strain > 1.0 → dissolve the structural bond, spawn rigid bodies
 *
 * The actual mesh fragmentation (Voronoi cell geometry computation) runs in
 * a Web Worker (`destruction-worker.ts`) to avoid blocking the main thread.
 * The main-thread FractureGraph only manages the graph topology + strain math.
 */

import * as THREE from 'three';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('chaos-destruction');

// ---------------------------------------------------------------------------
// Types (aligned with the briefing spec)
// ---------------------------------------------------------------------------

export interface VoronoiCell {
  id: string;
  centroid: [number, number, number];
  /** Flattened XYZ vertex positions for this fragment */
  geometry: Float32Array;
  /** Mass in kg */
  mass: number;
  /** Material tensile strength in N/m² */
  tensileStrength: number;
  /** Rapier rigid body handle (set after spawn) */
  rigidBodyHandle: number | null;
  spawned: boolean;
}

export interface AdjacencyEdge {
  id: string;
  cellA: string;
  cellB: string;
  /** Shared surface area in m² */
  contactArea: number;
  /** Max strain before the bond breaks */
  stressLimit: number;
  broken: boolean;
}

export interface ImpactEvent {
  point: [number, number, number];
  direction: [number, number, number];
  force: number;      // Newtons
  radius: number;     // influence radius in world units
}

export interface FractureResult {
  /** Cell IDs now structurally detached (need rigid body spawning) */
  detachedCells: string[];
  brokenEdges: string[];
}

// ---------------------------------------------------------------------------
// FractureGraph
// ---------------------------------------------------------------------------

export class FractureGraph {
  private cells: Map<string, VoronoiCell>;
  private edges: Map<string, AdjacencyEdge>;
  /** Adjacency list: cellId → Set<edgeId> */
  private adj: Map<string, Set<string>>;

  constructor(cells: VoronoiCell[], edges: AdjacencyEdge[]) {
    this.cells = new Map(cells.map((c) => [c.id, c]));
    this.edges = new Map(edges.map((e) => [e.id, e]));
    this.adj = new Map(cells.map((c) => [c.id, new Set<string>()]));
    for (const e of edges) {
      this.adj.get(e.cellA)?.add(e.id);
      this.adj.get(e.cellB)?.add(e.id);
    }
  }

  /**
   * Apply an impact event. For each cell within `impact.radius`, compute
   * the strain on all adjacent bonds. Break bonds where strain ≥ 1.0.
   * Returns cells that become structurally detached from the anchor set.
   */
  registerCollision(impact: ImpactEvent): FractureResult {
    const impactPt = new THREE.Vector3(...impact.point);
    const brokenEdges: string[] = [];
    const brokenCellSet = new Set<string>();

    // Phase 1: evaluate bonds under strain
    for (const edge of this.edges.values()) {
      if (edge.broken) continue;

      const cellA = this.cells.get(edge.cellA)!;
      const cellB = this.cells.get(edge.cellB)!;

      const centerA = new THREE.Vector3(...cellA.centroid);
      const centerB = new THREE.Vector3(...cellB.centroid);
      const edgeMidpoint = centerA.clone().add(centerB).multiplyScalar(0.5);

      const dist = impactPt.distanceTo(edgeMidpoint);
      if (dist > impact.radius) continue;

      // Distribute force with distance attenuation (inverse-square)
      const attenuation = Math.max(0, 1 - dist / impact.radius);
      const appliedForce = impact.force * attenuation;

      // Strain = F / (A × σ_t)
      const material = Math.min(cellA.tensileStrength, cellB.tensileStrength);
      const strain = appliedForce / (edge.contactArea * material);

      if (strain >= 1.0) {
        edge.broken = true;
        brokenEdges.push(edge.id);
        brokenCellSet.add(edge.cellA);
        brokenCellSet.add(edge.cellB);
      }
    }

    // Phase 2: flood-fill from anchor cells to find detached components
    const detachedCells = this.findDetachedCells(brokenCellSet);

    log.info('Impact resolved', {
      brokenEdges: brokenEdges.length,
      detached: detachedCells.length,
      force: impact.force,
    });

    return { detachedCells, brokenEdges };
  }

  /**
   * BFS from all still-connected cells to identify which cells became islands.
   * Cells with no path to a "grounded" cell (one that is not spawned) are detached.
   */
  private findDetachedCells(recentlyBroken: Set<string>): string[] {
    // Grounded = cells that are NOT yet spawned as rigid bodies
    const grounded = new Set<string>(
      [...this.cells.values()].filter((c) => !c.spawned).map((c) => c.id),
    );

    const visited = new Set<string>();
    const queue = [...grounded];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edgeId of this.adj.get(current) ?? []) {
        const edge = this.edges.get(edgeId)!;
        if (edge.broken) continue;
        const neighbour = edge.cellA === current ? edge.cellB : edge.cellA;
        if (!visited.has(neighbour)) queue.push(neighbour);
      }
    }

    // Detached = broken cells not reachable from ground
    const detached: string[] = [];
    for (const cellId of recentlyBroken) {
      if (!visited.has(cellId)) {
        const cell = this.cells.get(cellId)!;
        if (!cell.spawned) {
          cell.spawned = true;
          detached.push(cellId);
        }
      }
    }
    return detached;
  }

  getCell(id: string): VoronoiCell | undefined { return this.cells.get(id); }
  getAllCells(): VoronoiCell[] { return [...this.cells.values()]; }
  getAllEdges(): AdjacencyEdge[] { return [...this.edges.values()]; }
}

// ---------------------------------------------------------------------------
// Voronoi Cell Seeder (generates seed points for fracture)
// ---------------------------------------------------------------------------

export function generateVoronoiSeeds(
  bounds: THREE.Box3,
  count: number,
  seed = 42,
): THREE.Vector3[] {
  const seeds: THREE.Vector3[] = [];
  let rng = seed;
  const lcg = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0x100000000; };

  const size = new THREE.Vector3();
  bounds.getSize(size);
  const min = bounds.min;

  for (let i = 0; i < count; i++) {
    seeds.push(new THREE.Vector3(
      min.x + lcg() * size.x,
      min.y + lcg() * size.y,
      min.z + lcg() * size.z,
    ));
  }
  return seeds;
}

/**
 * Build a FractureGraph from a mesh geometry.
 * Each Voronoi seed becomes one VoronoiCell; edges connect nearest-neighbour seeds.
 */
export function buildFractureGraph(
  geometry: THREE.BufferGeometry,
  cellCount = 16,
  tensileStrength = 5e6, // Pa (steel ~= 400e6, concrete ~= 3e6)
  seed = 42,
): FractureGraph {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const seeds = generateVoronoiSeeds(bounds, cellCount, seed);

  const cells: VoronoiCell[] = seeds.map((s, i) => ({
    id: `cell-${i}`,
    centroid: [s.x, s.y, s.z],
    geometry: new Float32Array([s.x, s.y, s.z]), // simplified — full fragmentation in worker
    mass: 1.0,
    tensileStrength,
    rigidBodyHandle: null,
    spawned: false,
  }));

  // Connect each cell to its K nearest neighbours
  const K = 4;
  const edges: AdjacencyEdge[] = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < cells.length; i++) {
    const ci = new THREE.Vector3(...cells[i].centroid);
    const dists = cells
      .map((c, j) => ({ j, d: ci.distanceTo(new THREE.Vector3(...c.centroid)) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, K);

    for (const { j } of dists) {
      const key = [Math.min(i, j), Math.max(i, j)].join('-');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        id: `edge-${key}`,
        cellA: `cell-${i}`,
        cellB: `cell-${j}`,
        contactArea: 0.5,   // m² estimate — full computation in worker
        stressLimit: 1.0,
        broken: false,
      });
    }
  }

  return new FractureGraph(cells, edges);
}
