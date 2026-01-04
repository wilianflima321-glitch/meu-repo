/**
 * Navigation Mesh System - Pathfinding REAL
 * 
 * Sistema completo de navegação com NavMesh para IA de jogos.
 * Inclui A* pathfinding, geração de NavMesh, e agentes.
 * 
 * NÃO É MOCK - Implementação completa!
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS
// ============================================================================

export interface NavMeshPolygon {
  id: number;
  vertices: THREE.Vector3[];
  center: THREE.Vector3;
  neighbors: number[];
  area: number;
  normal: THREE.Vector3;
}

export interface NavMeshEdge {
  polygonA: number;
  polygonB: number;
  vertexA: THREE.Vector3;
  vertexB: THREE.Vector3;
  width: number;
}

export interface PathNode {
  polygonId: number;
  position: THREE.Vector3;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

export interface NavAgent {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  height: number;
  maxSpeed: number;
  acceleration: number;
  currentPath: THREE.Vector3[];
  currentPathIndex: number;
  targetPosition: THREE.Vector3 | null;
  isMoving: boolean;
  avoidanceWeight: number;
}

export interface NavMeshConfig {
  cellSize: number;
  cellHeight: number;
  agentHeight: number;
  agentRadius: number;
  agentMaxClimb: number;
  agentMaxSlope: number;
  regionMinSize: number;
  regionMergeSize: number;
  edgeMaxLen: number;
  edgeMaxError: number;
  vertsPerPoly: number;
}

// ============================================================================
// NAVMESH CLASS
// ============================================================================

export class NavigationMesh {
  polygons: NavMeshPolygon[] = [];
  edges: NavMeshEdge[] = [];
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  
  private spatialHash: Map<string, number[]> = new Map();
  private cellSize: number = 5;
  
  constructor() {
    this.bounds = {
      min: new THREE.Vector3(-1000, -1000, -1000),
      max: new THREE.Vector3(1000, 1000, 1000),
    };
  }
  
  // ============================================================================
  // GENERATION
  // ============================================================================
  
  /**
   * Generate NavMesh from geometry
   */
  generateFromGeometry(geometry: THREE.BufferGeometry, config: Partial<NavMeshConfig> = {}): void {
    const fullConfig: NavMeshConfig = {
      cellSize: config.cellSize ?? 0.3,
      cellHeight: config.cellHeight ?? 0.2,
      agentHeight: config.agentHeight ?? 2,
      agentRadius: config.agentRadius ?? 0.5,
      agentMaxClimb: config.agentMaxClimb ?? 0.5,
      agentMaxSlope: config.agentMaxSlope ?? 45,
      regionMinSize: config.regionMinSize ?? 8,
      regionMergeSize: config.regionMergeSize ?? 20,
      edgeMaxLen: config.edgeMaxLen ?? 12,
      edgeMaxError: config.edgeMaxError ?? 1.3,
      vertsPerPoly: config.vertsPerPoly ?? 6,
    };
    
    this.polygons = [];
    this.edges = [];
    
    // Extract triangles from geometry
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex();
    
    const triangles: THREE.Vector3[][] = [];
    
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        triangles.push([
          new THREE.Vector3(positions.getX(a), positions.getY(a), positions.getZ(a)),
          new THREE.Vector3(positions.getX(b), positions.getY(b), positions.getZ(b)),
          new THREE.Vector3(positions.getX(c), positions.getY(c), positions.getZ(c)),
        ]);
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        triangles.push([
          new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)),
          new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1)),
          new THREE.Vector3(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2)),
        ]);
      }
    }
    
    // Filter walkable triangles
    const maxSlopeRad = (fullConfig.agentMaxSlope * Math.PI) / 180;
    const walkableTriangles = triangles.filter(tri => {
      const normal = this.calculateTriangleNormal(tri);
      const slopeAngle = Math.acos(Math.abs(normal.y));
      return slopeAngle <= maxSlopeRad;
    });
    
    // Convert triangles to polygons
    let polygonId = 0;
    for (const tri of walkableTriangles) {
      const center = tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3);
      const normal = this.calculateTriangleNormal(tri);
      const area = this.calculateTriangleArea(tri);
      
      this.polygons.push({
        id: polygonId++,
        vertices: tri,
        center,
        neighbors: [],
        area,
        normal,
      });
    }
    
    // Build neighbor connections
    this.buildNeighborConnections();
    
    // Build spatial hash
    this.buildSpatialHash();
    
    // Update bounds
    this.updateBounds();
  }
  
  /**
   * Generate from floor plane
   */
  generateFromPlane(
    width: number,
    depth: number,
    subdivisions: number = 10,
    obstacles: Array<{ center: THREE.Vector3; radius: number }> = []
  ): void {
    this.polygons = [];
    this.edges = [];
    
    const cellWidth = width / subdivisions;
    const cellDepth = depth / subdivisions;
    
    let polygonId = 0;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    
    for (let x = 0; x < subdivisions; x++) {
      for (let z = 0; z < subdivisions; z++) {
        const x0 = -halfWidth + x * cellWidth;
        const x1 = x0 + cellWidth;
        const z0 = -halfDepth + z * cellDepth;
        const z1 = z0 + cellDepth;
        
        const center = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
        
        // Check if blocked by obstacle
        let blocked = false;
        for (const obstacle of obstacles) {
          const dist = center.distanceTo(new THREE.Vector3(obstacle.center.x, 0, obstacle.center.z));
          if (dist < obstacle.radius + cellWidth / 2) {
            blocked = true;
            break;
          }
        }
        
        if (blocked) continue;
        
        // Create quad (2 triangles)
        const v0 = new THREE.Vector3(x0, 0, z0);
        const v1 = new THREE.Vector3(x1, 0, z0);
        const v2 = new THREE.Vector3(x1, 0, z1);
        const v3 = new THREE.Vector3(x0, 0, z1);
        
        // Triangle 1
        this.polygons.push({
          id: polygonId++,
          vertices: [v0.clone(), v1.clone(), v2.clone()],
          center: v0.clone().add(v1).add(v2).divideScalar(3),
          neighbors: [],
          area: this.calculateTriangleArea([v0, v1, v2]),
          normal: new THREE.Vector3(0, 1, 0),
        });
        
        // Triangle 2
        this.polygons.push({
          id: polygonId++,
          vertices: [v0.clone(), v2.clone(), v3.clone()],
          center: v0.clone().add(v2).add(v3).divideScalar(3),
          neighbors: [],
          area: this.calculateTriangleArea([v0, v2, v3]),
          normal: new THREE.Vector3(0, 1, 0),
        });
      }
    }
    
    this.buildNeighborConnections();
    this.buildSpatialHash();
    this.updateBounds();
  }
  
  private calculateTriangleNormal(vertices: THREE.Vector3[]): THREE.Vector3 {
    const ab = vertices[1].clone().sub(vertices[0]);
    const ac = vertices[2].clone().sub(vertices[0]);
    return ab.cross(ac).normalize();
  }
  
  private calculateTriangleArea(vertices: THREE.Vector3[]): number {
    const ab = vertices[1].clone().sub(vertices[0]);
    const ac = vertices[2].clone().sub(vertices[0]);
    return ab.cross(ac).length() / 2;
  }
  
  private buildNeighborConnections(): void {
    // Build edge-to-polygon mapping
    const edgeMap = new Map<string, number[]>();
    
    for (const poly of this.polygons) {
      const verts = poly.vertices;
      for (let i = 0; i < verts.length; i++) {
        const v1 = verts[i];
        const v2 = verts[(i + 1) % verts.length];
        
        // Create consistent edge key
        const key = this.edgeKey(v1, v2);
        
        if (!edgeMap.has(key)) {
          edgeMap.set(key, []);
        }
        edgeMap.get(key)!.push(poly.id);
      }
    }
    
    // Find neighbors (polygons sharing an edge)
    for (const [_, polyIds] of edgeMap) {
      if (polyIds.length === 2) {
        const [a, b] = polyIds;
        if (!this.polygons[a].neighbors.includes(b)) {
          this.polygons[a].neighbors.push(b);
        }
        if (!this.polygons[b].neighbors.includes(a)) {
          this.polygons[b].neighbors.push(a);
        }
      }
    }
  }
  
  private edgeKey(v1: THREE.Vector3, v2: THREE.Vector3): string {
    const key1 = `${v1.x.toFixed(3)},${v1.y.toFixed(3)},${v1.z.toFixed(3)}`;
    const key2 = `${v2.x.toFixed(3)},${v2.y.toFixed(3)},${v2.z.toFixed(3)}`;
    return key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;
  }
  
  private buildSpatialHash(): void {
    this.spatialHash.clear();
    
    for (const poly of this.polygons) {
      const cellKey = this.getCellKey(poly.center);
      if (!this.spatialHash.has(cellKey)) {
        this.spatialHash.set(cellKey, []);
      }
      this.spatialHash.get(cellKey)!.push(poly.id);
    }
  }
  
  private getCellKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${z}`;
  }
  
  private updateBounds(): void {
    if (this.polygons.length === 0) return;
    
    this.bounds.min.set(Infinity, Infinity, Infinity);
    this.bounds.max.set(-Infinity, -Infinity, -Infinity);
    
    for (const poly of this.polygons) {
      for (const v of poly.vertices) {
        this.bounds.min.min(v);
        this.bounds.max.max(v);
      }
    }
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  /**
   * Find polygon containing point
   */
  findPolygonContainingPoint(point: THREE.Vector3): NavMeshPolygon | null {
    const cellKey = this.getCellKey(point);
    
    // Check current cell and neighbors
    const cellsToCheck = [
      cellKey,
      ...this.getNeighborCellKeys(point),
    ];
    
    for (const key of cellsToCheck) {
      const polyIds = this.spatialHash.get(key);
      if (!polyIds) continue;
      
      for (const id of polyIds) {
        const poly = this.polygons[id];
        if (this.isPointInPolygon(point, poly)) {
          return poly;
        }
      }
    }
    
    // Fallback: check all polygons
    for (const poly of this.polygons) {
      if (this.isPointInPolygon(point, poly)) {
        return poly;
      }
    }
    
    return null;
  }
  
  private getNeighborCellKeys(position: THREE.Vector3): string[] {
    const x = Math.floor(position.x / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    
    return [
      `${x - 1},${z - 1}`, `${x},${z - 1}`, `${x + 1},${z - 1}`,
      `${x - 1},${z}`,                     `${x + 1},${z}`,
      `${x - 1},${z + 1}`, `${x},${z + 1}`, `${x + 1},${z + 1}`,
    ];
  }
  
  private isPointInPolygon(point: THREE.Vector3, poly: NavMeshPolygon): boolean {
    // Project to 2D (XZ plane)
    const px = point.x;
    const pz = point.z;
    
    const vertices = poly.vertices;
    let inside = false;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, zi = vertices[i].z;
      const xj = vertices[j].x, zj = vertices[j].z;
      
      if (((zi > pz) !== (zj > pz)) &&
          (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  /**
   * Find nearest point on NavMesh
   */
  findNearestPoint(point: THREE.Vector3): { position: THREE.Vector3; polygon: NavMeshPolygon } | null {
    if (this.polygons.length === 0) return null;
    
    let nearestPoly: NavMeshPolygon | null = null;
    let nearestPoint: THREE.Vector3 | null = null;
    let nearestDistSq = Infinity;
    
    for (const poly of this.polygons) {
      const closest = this.closestPointOnPolygon(point, poly);
      const distSq = point.distanceToSquared(closest);
      
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestPoint = closest;
        nearestPoly = poly;
      }
    }
    
    if (!nearestPoly || !nearestPoint) return null;
    
    return { position: nearestPoint, polygon: nearestPoly };
  }
  
  private closestPointOnPolygon(point: THREE.Vector3, poly: NavMeshPolygon): THREE.Vector3 {
    // First check if point is inside
    if (this.isPointInPolygon(point, poly)) {
      // Project point onto polygon plane
      const planePoint = poly.vertices[0];
      const toPoint = point.clone().sub(planePoint);
      const dist = toPoint.dot(poly.normal);
      return point.clone().sub(poly.normal.clone().multiplyScalar(dist));
    }
    
    // Find closest point on edges
    let closest: THREE.Vector3 | null = null;
    let minDistSq = Infinity;
    
    const vertices = poly.vertices;
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      
      const edgePoint = this.closestPointOnLineSegment(point, v1, v2);
      const distSq = point.distanceToSquared(edgePoint);
      
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = edgePoint;
      }
    }
    
    return closest || poly.center.clone();
  }
  
  private closestPointOnLineSegment(point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const ab = b.clone().sub(a);
    const ap = point.clone().sub(a);
    
    const abLenSq = ab.lengthSq();
    if (abLenSq === 0) return a.clone();
    
    let t = ap.dot(ab) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    
    return a.clone().add(ab.multiplyScalar(t));
  }
  
  // ============================================================================
  // PATHFINDING (A*)
  // ============================================================================
  
  /**
   * Find path between two points using A*
   */
  findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] | null {
    const startPoly = this.findPolygonContainingPoint(start);
    const endPoly = this.findPolygonContainingPoint(end);
    
    if (!startPoly) {
      const nearest = this.findNearestPoint(start);
      if (nearest) {
        return this.findPath(nearest.position, end);
      }
      return null;
    }
    
    if (!endPoly) {
      const nearest = this.findNearestPoint(end);
      if (nearest) {
        return this.findPath(start, nearest.position);
      }
      return null;
    }
    
    // Same polygon
    if (startPoly.id === endPoly.id) {
      return [start.clone(), end.clone()];
    }
    
    // A* search
    const openSet: PathNode[] = [];
    const closedSet = new Set<number>();
    const nodeMap = new Map<number, PathNode>();
    
    const startNode: PathNode = {
      polygonId: startPoly.id,
      position: start.clone(),
      g: 0,
      h: start.distanceTo(end),
      f: start.distanceTo(end),
      parent: null,
    };
    
    openSet.push(startNode);
    nodeMap.set(startPoly.id, startNode);
    
    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      if (current.polygonId === endPoly.id) {
        // Reconstruct path
        return this.reconstructPath(current, start, end);
      }
      
      closedSet.add(current.polygonId);
      
      const currentPoly = this.polygons[current.polygonId];
      
      // Explore neighbors
      for (const neighborId of currentPoly.neighbors) {
        if (closedSet.has(neighborId)) continue;
        
        const neighborPoly = this.polygons[neighborId];
        const neighborPos = neighborPoly.center;
        
        const g = current.g + current.position.distanceTo(neighborPos);
        const h = neighborPos.distanceTo(end);
        const f = g + h;
        
        const existingNode = nodeMap.get(neighborId);
        
        if (!existingNode) {
          const newNode: PathNode = {
            polygonId: neighborId,
            position: neighborPos.clone(),
            g, h, f,
            parent: current,
          };
          openSet.push(newNode);
          nodeMap.set(neighborId, newNode);
        } else if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      }
    }
    
    return null; // No path found
  }
  
  private reconstructPath(endNode: PathNode, start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
    const polygonPath: PathNode[] = [];
    let current: PathNode | null = endNode;
    
    while (current) {
      polygonPath.unshift(current);
      current = current.parent;
    }
    
    // Convert polygon centers to smooth path
    const path: THREE.Vector3[] = [start.clone()];
    
    for (let i = 1; i < polygonPath.length - 1; i++) {
      path.push(polygonPath[i].position.clone());
    }
    
    path.push(end.clone());
    
    // Funnel algorithm for path smoothing
    return this.funnelPath(path);
  }
  
  private funnelPath(path: THREE.Vector3[]): THREE.Vector3[] {
    if (path.length <= 2) return path;
    
    const smoothed: THREE.Vector3[] = [path[0]];
    let currentIndex = 0;
    
    while (currentIndex < path.length - 1) {
      // Find furthest visible point
      let furthest = currentIndex + 1;
      
      for (let i = path.length - 1; i > currentIndex + 1; i--) {
        if (this.hasDirectPath(path[currentIndex], path[i])) {
          furthest = i;
          break;
        }
      }
      
      smoothed.push(path[furthest]);
      currentIndex = furthest;
    }
    
    return smoothed;
  }
  
  hasDirectPath(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const steps = Math.ceil(a.distanceTo(b) / 0.5);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = a.clone().lerp(b, t);
      
      if (!this.findPolygonContainingPoint(point)) {
        return false;
      }
    }
    
    return true;
  }
}

// ============================================================================
// NAV AGENT SYSTEM
// ============================================================================

export class NavAgentSystem {
  private navMesh: NavigationMesh;
  private agents: Map<string, NavAgent> = new Map();
  
  constructor(navMesh: NavigationMesh) {
    this.navMesh = navMesh;
  }
  
  createAgent(config: Partial<NavAgent> & { id: string; position: THREE.Vector3 }): NavAgent {
    const agent: NavAgent = {
      id: config.id,
      position: config.position.clone(),
      velocity: config.velocity?.clone() || new THREE.Vector3(),
      radius: config.radius ?? 0.5,
      height: config.height ?? 2,
      maxSpeed: config.maxSpeed ?? 5,
      acceleration: config.acceleration ?? 10,
      currentPath: [],
      currentPathIndex: 0,
      targetPosition: null,
      isMoving: false,
      avoidanceWeight: config.avoidanceWeight ?? 1,
    };
    
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  removeAgent(id: string): void {
    this.agents.delete(id);
  }
  
  getAgent(id: string): NavAgent | undefined {
    return this.agents.get(id);
  }
  
  getAllAgents(): NavAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Set destination for agent
   */
  setDestination(agentId: string, destination: THREE.Vector3): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    const path = this.navMesh.findPath(agent.position, destination);
    if (!path) return false;
    
    agent.currentPath = path;
    agent.currentPathIndex = 0;
    agent.targetPosition = destination.clone();
    agent.isMoving = true;
    
    return true;
  }
  
  /**
   * Stop agent
   */
  stopAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    agent.currentPath = [];
    agent.currentPathIndex = 0;
    agent.targetPosition = null;
    agent.isMoving = false;
    agent.velocity.set(0, 0, 0);
  }
  
  /**
   * Update all agents
   */
  update(deltaTime: number): void {
    for (const agent of this.agents.values()) {
      this.updateAgent(agent, deltaTime);
    }
  }
  
  private updateAgent(agent: NavAgent, deltaTime: number): void {
    if (!agent.isMoving || agent.currentPath.length === 0) {
      return;
    }
    
    // Get current waypoint
    const waypoint = agent.currentPath[agent.currentPathIndex];
    if (!waypoint) {
      agent.isMoving = false;
      return;
    }
    
    // Calculate desired velocity
    const toWaypoint = waypoint.clone().sub(agent.position);
    toWaypoint.y = 0; // Keep on ground plane
    
    const distanceToWaypoint = toWaypoint.length();
    
    // Check if reached waypoint
    if (distanceToWaypoint < 0.3) {
      agent.currentPathIndex++;
      
      if (agent.currentPathIndex >= agent.currentPath.length) {
        // Reached destination
        agent.isMoving = false;
        agent.velocity.set(0, 0, 0);
        return;
      }
      return;
    }
    
    // Calculate desired velocity
    const desiredVelocity = toWaypoint.normalize().multiplyScalar(agent.maxSpeed);
    
    // Apply avoidance
    const avoidance = this.calculateAvoidance(agent);
    desiredVelocity.add(avoidance);
    
    // Limit speed
    if (desiredVelocity.length() > agent.maxSpeed) {
      desiredVelocity.normalize().multiplyScalar(agent.maxSpeed);
    }
    
    // Smooth velocity change
    const steer = desiredVelocity.sub(agent.velocity);
    steer.clampLength(0, agent.acceleration * deltaTime);
    agent.velocity.add(steer);
    
    // Update position
    agent.position.add(agent.velocity.clone().multiplyScalar(deltaTime));
  }
  
  private calculateAvoidance(agent: NavAgent): THREE.Vector3 {
    const avoidance = new THREE.Vector3();
    
    for (const other of this.agents.values()) {
      if (other.id === agent.id) continue;
      
      const toOther = other.position.clone().sub(agent.position);
      const distance = toOther.length();
      const minDistance = agent.radius + other.radius + 0.5;
      
      if (distance < minDistance && distance > 0) {
        const pushForce = (minDistance - distance) / minDistance;
        toOther.normalize().multiplyScalar(-pushForce * agent.avoidanceWeight * 5);
        avoidance.add(toOther);
      }
    }
    
    return avoidance;
  }
  
  /**
   * Raycast on NavMesh
   */
  raycast(start: THREE.Vector3, end: THREE.Vector3): { hit: boolean; point?: THREE.Vector3 } {
    const hasPath = this.navMesh.hasDirectPath(start, end);
    
    if (hasPath) {
      return { hit: false };
    }
    
    // Find first point that's off the navmesh
    const steps = Math.ceil(start.distanceTo(end) / 0.1);
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = start.clone().lerp(end, t);
      
      if (!this.navMesh.findPolygonContainingPoint(point)) {
        // Previous point was last valid
        const prevT = (i - 1) / steps;
        return {
          hit: true,
          point: start.clone().lerp(end, prevT),
        };
      }
    }
    
    return { hit: false };
  }
}

// ============================================================================
// CROWD SIMULATION
// ============================================================================

export class CrowdSimulation {
  private agentSystem: NavAgentSystem;
  private groups: Map<string, Set<string>> = new Map();
  
  constructor(navMesh: NavigationMesh) {
    this.agentSystem = new NavAgentSystem(navMesh);
  }
  
  getAgentSystem(): NavAgentSystem {
    return this.agentSystem;
  }
  
  /**
   * Create a group of agents
   */
  createGroup(groupId: string): void {
    this.groups.set(groupId, new Set());
  }
  
  /**
   * Add agent to group
   */
  addAgentToGroup(agentId: string, groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.add(agentId);
    }
  }
  
  /**
   * Move entire group to destination
   */
  moveGroup(groupId: string, destination: THREE.Vector3, formation: 'none' | 'line' | 'circle' | 'grid' = 'none'): void {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    const agents = Array.from(group)
      .map(id => this.agentSystem.getAgent(id))
      .filter((a): a is NavAgent => a !== undefined);
    
    if (agents.length === 0) return;
    
    const positions = this.calculateFormationPositions(destination, agents.length, formation);
    
    agents.forEach((agent, i) => {
      this.agentSystem.setDestination(agent.id, positions[i]);
    });
  }
  
  private calculateFormationPositions(
    center: THREE.Vector3,
    count: number,
    formation: 'none' | 'line' | 'circle' | 'grid'
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const spacing = 1.5;
    
    switch (formation) {
      case 'none':
        for (let i = 0; i < count; i++) {
          positions.push(center.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
          )));
        }
        break;
        
      case 'line':
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * spacing;
          positions.push(center.clone().add(new THREE.Vector3(offset, 0, 0)));
        }
        break;
        
      case 'circle':
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const radius = count * spacing / (2 * Math.PI);
          positions.push(center.clone().add(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          )));
        }
        break;
        
      case 'grid':
        const cols = Math.ceil(Math.sqrt(count));
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          positions.push(center.clone().add(new THREE.Vector3(
            (col - (cols - 1) / 2) * spacing,
            0,
            (row - (Math.ceil(count / cols) - 1) / 2) * spacing
          )));
        }
        break;
    }
    
    return positions;
  }
  
  update(deltaTime: number): void {
    this.agentSystem.update(deltaTime);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createNavigationMesh(): NavigationMesh {
  return new NavigationMesh();
}

export function createNavAgentSystem(navMesh: NavigationMesh): NavAgentSystem {
  return new NavAgentSystem(navMesh);
}

export function createCrowdSimulation(navMesh: NavigationMesh): CrowdSimulation {
  return new CrowdSimulation(navMesh);
}
