/**
 * Aethel Engine - Navigation AI System
 * 
 * Pathfinding and AI navigation system with A*, NavMesh support,
 * steering behaviors, and crowd simulation.
 */

import { EventEmitter } from 'events';
import type {
  AgentConfig,
  NavMeshData,
  NavMeshPolygon,
  NavigationConfig,
  NavigationPath,
  ObstacleConfig,
  PathNode,
  SteeringBehavior,
  Vector3,
} from './navigation-ai-types';
import { NavigationGrid, type GridConfig, PriorityQueue, Vec3 } from './navigation-ai-primitives';
export type {
  AgentConfig,
  NavMeshData,
  NavMeshPolygon,
  NavigationConfig,
  NavigationPath,
  ObstacleConfig,
  PathNode,
  SteeringBehavior,
  Vector3,
} from './navigation-ai-types';
export { NavigationGrid, type GridConfig } from './navigation-ai-primitives';

// NavMesh Pathfinding

export class NavMesh {
  private data: NavMeshData | null = null;
  private polygonSpatialHash = new Map<string, number[]>();
  private cellSize = 5;

  loadFromData(data: NavMeshData): void {
    this.data = data;
    this.buildSpatialHash();
  }

  private buildSpatialHash(): void {
    if (!this.data) return;

    this.polygonSpatialHash.clear();

    for (let i = 0; i < this.data.polygons.length; i++) {
      const polygon = this.data.polygons[i];
      
      // Get polygon bounds
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      for (const vertex of polygon.vertices) {
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        minZ = Math.min(minZ, vertex.z);
        maxZ = Math.max(maxZ, vertex.z);
      }

      // Add to all overlapping cells
      const startX = Math.floor(minX / this.cellSize);
      const endX = Math.floor(maxX / this.cellSize);
      const startZ = Math.floor(minZ / this.cellSize);
      const endZ = Math.floor(maxZ / this.cellSize);

      for (let cx = startX; cx <= endX; cx++) {
        for (let cz = startZ; cz <= endZ; cz++) {
          const key = `${cx},${cz}`;
          if (!this.polygonSpatialHash.has(key)) {
            this.polygonSpatialHash.set(key, []);
          }
          this.polygonSpatialHash.get(key)!.push(i);
        }
      }
    }
  }

  findPolygon(position: Vector3): NavMeshPolygon | null {
    if (!this.data) return null;

    const cellX = Math.floor(position.x / this.cellSize);
    const cellZ = Math.floor(position.z / this.cellSize);
    const key = `${cellX},${cellZ}`;

    const candidates = this.polygonSpatialHash.get(key);
    if (!candidates) return null;

    for (const polyIndex of candidates) {
      const polygon = this.data.polygons[polyIndex];
      if (this.isPointInPolygon(position, polygon)) {
        return polygon;
      }
    }

    return null;
  }

  private isPointInPolygon(point: Vector3, polygon: NavMeshPolygon): boolean {
    const vertices = polygon.vertices;
    const n = vertices.length;
    let inside = false;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const vi = vertices[i];
      const vj = vertices[j];

      if ((vi.z > point.z) !== (vj.z > point.z) &&
          point.x < (vj.x - vi.x) * (point.z - vi.z) / (vj.z - vi.z) + vi.x) {
        inside = !inside;
      }
    }

    return inside;
  }

  findPath(start: Vector3, end: Vector3): NavigationPath {
    if (!this.data) {
      return { points: [], totalCost: Infinity, isComplete: false };
    }

    const startPoly = this.findPolygon(start);
    const endPoly = this.findPolygon(end);

    if (!startPoly || !endPoly) {
      return { points: [], totalCost: Infinity, isComplete: false };
    }

    if (startPoly.id === endPoly.id) {
      return { points: [start, end], totalCost: Vec3.distance(start, end), isComplete: true };
    }

    // A* on NavMesh polygons
    const openSet = new PriorityQueue<number>();
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const entryPoints = new Map<number, Vector3>();

    gScore.set(startPoly.id, 0);
    entryPoints.set(startPoly.id, start);
    openSet.push(startPoly.id, Vec3.distance(startPoly.center, endPoly.center));

    while (!openSet.isEmpty()) {
      const currentId = openSet.pop()!;
      const currentPoly = this.data.polygons.find(p => p.id === currentId)!;
      const currentEntry = entryPoints.get(currentId)!;

      if (currentId === endPoly.id) {
        // Reconstruct path
        const polyPath: number[] = [currentId];
        let curr: number | undefined = currentId;
        
        while (cameFrom.has(curr)) {
          curr = cameFrom.get(curr)!;
          polyPath.unshift(curr);
        }

        // Convert polygon path to waypoints
        return this.smoothPath(polyPath, start, end, entryPoints);
      }

      for (const neighborId of currentPoly.neighbors) {
        const neighborPoly = this.data.polygons.find(p => p.id === neighborId);
        if (!neighborPoly) continue;

        // Find portal (shared edge) between polygons
        const portal = this.findPortal(currentPoly, neighborPoly);
        if (!portal) continue;

        // Use portal midpoint as entry point
        const portalMid = Vec3.lerp(portal.left, portal.right, 0.5);
        const edgeCost = Vec3.distance(currentEntry, portalMid);
        const tentativeG = (gScore.get(currentId) ?? Infinity) + edgeCost;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          entryPoints.set(neighborId, portalMid);
          const f = tentativeG + Vec3.distance(neighborPoly.center, endPoly.center);
          openSet.push(neighborId, f);
        }
      }
    }

    return { points: [], totalCost: Infinity, isComplete: false };
  }

  private findPortal(polyA: NavMeshPolygon, polyB: NavMeshPolygon): { left: Vector3; right: Vector3 } | null {
    // Find shared edge between two polygons
    const verticesA = polyA.vertices;
    const verticesB = polyB.vertices;

    for (let i = 0; i < verticesA.length; i++) {
      const a1 = verticesA[i];
      const a2 = verticesA[(i + 1) % verticesA.length];

      for (let j = 0; j < verticesB.length; j++) {
        const b1 = verticesB[j];
        const b2 = verticesB[(j + 1) % verticesB.length];

        // Check if edges match (in opposite directions)
        if (this.verticesEqual(a1, b2) && this.verticesEqual(a2, b1)) {
          return { left: a1, right: a2 };
        }
        if (this.verticesEqual(a1, b1) && this.verticesEqual(a2, b2)) {
          return { left: a1, right: a2 };
        }
      }
    }

    return null;
  }

  private verticesEqual(a: Vector3, b: Vector3, epsilon = 0.001): boolean {
    return Math.abs(a.x - b.x) < epsilon &&
           Math.abs(a.y - b.y) < epsilon &&
           Math.abs(a.z - b.z) < epsilon;
  }

  private smoothPath(
    polyPath: number[],
    start: Vector3,
    end: Vector3,
    entryPoints: Map<number, Vector3>
  ): NavigationPath {
    if (polyPath.length === 0) {
      return { points: [], totalCost: Infinity, isComplete: false };
    }

    const points: Vector3[] = [start];
    let totalCost = 0;

    // Simple funnel algorithm approximation
    for (let i = 1; i < polyPath.length; i++) {
      const entry = entryPoints.get(polyPath[i]);
      if (entry) {
        totalCost += Vec3.distance(points[points.length - 1], entry);
        points.push(entry);
      }
    }

    totalCost += Vec3.distance(points[points.length - 1], end);
    points.push(end);

    return { points, totalCost, isComplete: true };
  }

  getPolygons(): NavMeshPolygon[] {
    return this.data?.polygons ?? [];
  }
}

// Navigation Agent

export class NavigationAgent extends EventEmitter {
  public id: string;
  
  // Transform
  public position: Vector3;
  public velocity: Vector3 = Vec3.zero();
  public forward: Vector3 = { x: 0, y: 0, z: 1 };
  
  // Config
  public radius: number;
  public height: number;
  public maxSpeed: number;
  public maxAcceleration: number;
  
  // Steering weights
  public separationWeight: number;
  public cohesionWeight: number;
  public alignmentWeight: number;
  public obstacleAvoidanceWeight: number;
  
  // Path following
  private currentPath: NavigationPath | null = null;
  private currentWaypoint = 0;
  private waypointRadius = 0.5;
  
  // State
  private targetPosition: Vector3 | null = null;
  private isMoving = false;
  
  // Behaviors
  private activeBehaviors = new Set<SteeringBehavior>();

  constructor(config: AgentConfig) {
    super();
    
    this.id = crypto.randomUUID();
    this.position = config.position;
    this.radius = config.radius;
    this.height = config.height;
    this.maxSpeed = config.maxSpeed;
    this.maxAcceleration = config.maxAcceleration;
    this.separationWeight = config.separationWeight;
    this.cohesionWeight = config.cohesionWeight;
    this.alignmentWeight = config.alignmentWeight;
    this.obstacleAvoidanceWeight = config.obstacleAvoidanceWeight;
  }

  setPath(path: NavigationPath): void {
    this.currentPath = path;
    this.currentWaypoint = 0;
    this.isMoving = path.points.length > 0;
    
    if (this.isMoving) {
      this.emit('pathStart', path);
    }
  }

  setTarget(target: Vector3): void {
    this.targetPosition = target;
  }

  enableBehavior(behavior: SteeringBehavior): void {
    this.activeBehaviors.add(behavior);
  }

  disableBehavior(behavior: SteeringBehavior): void {
    this.activeBehaviors.delete(behavior);
  }

  update(dt: number, neighbors: NavigationAgent[] = [], obstacles: ObstacleConfig[] = []): void {
    if (!this.isMoving && !this.targetPosition && this.activeBehaviors.size === 0) {
      return;
    }

    let steeringForce = Vec3.zero();

    // Path following
    if (this.currentPath && this.currentWaypoint < this.currentPath.points.length) {
      const waypoint = this.currentPath.points[this.currentWaypoint];
      const toWaypoint = Vec3.sub(waypoint, this.position);
      const distance = Vec3.distance2D(this.position, waypoint);

      if (distance < this.waypointRadius) {
        this.currentWaypoint++;
        
        if (this.currentWaypoint >= this.currentPath.points.length) {
          this.isMoving = false;
          this.emit('pathComplete');
        } else {
          this.emit('waypointReached', this.currentWaypoint - 1);
        }
      } else {
        // Seek waypoint
        const desired = Vec3.scale(Vec3.normalize(toWaypoint), this.maxSpeed);
        steeringForce = Vec3.add(steeringForce, Vec3.sub(desired, this.velocity));
      }
    }

    // Apply steering behaviors
    for (const behavior of this.activeBehaviors) {
      const force = this.calculateBehavior(behavior, neighbors, obstacles);
      steeringForce = Vec3.add(steeringForce, force);
    }

    // Apply steering force
    steeringForce = Vec3.clampLength(steeringForce, this.maxAcceleration);
    this.velocity = Vec3.add(this.velocity, Vec3.scale(steeringForce, dt));
    this.velocity = Vec3.clampLength(this.velocity, this.maxSpeed);

    // Update position
    if (Vec3.length(this.velocity) > 0.01) {
      this.position = Vec3.add(this.position, Vec3.scale(this.velocity, dt));
      this.forward = Vec3.normalize(this.velocity);
    }
  }

  private calculateBehavior(
    behavior: SteeringBehavior,
    neighbors: NavigationAgent[],
    obstacles: ObstacleConfig[]
  ): Vector3 {
    switch (behavior) {
      case 'seek':
        return this.seek(this.targetPosition ?? this.position);
      
      case 'flee':
        return this.flee(this.targetPosition ?? this.position);
      
      case 'arrive':
        return this.arrive(this.targetPosition ?? this.position);
      
      case 'wander':
        return this.wander();
      
      case 'obstacle_avoidance':
        return this.avoidObstacles(obstacles);
      
      case 'separation':
        return Vec3.scale(this.separation(neighbors), this.separationWeight);
      
      case 'cohesion':
        return Vec3.scale(this.cohesion(neighbors), this.cohesionWeight);
      
      case 'alignment':
        return Vec3.scale(this.alignment(neighbors), this.alignmentWeight);
      
      default:
        return Vec3.zero();
    }
  }

  private seek(target: Vector3): Vector3 {
    const desired = Vec3.sub(target, this.position);
    const desiredNorm = Vec3.scale(Vec3.normalize(desired), this.maxSpeed);
    return Vec3.sub(desiredNorm, this.velocity);
  }

  private flee(target: Vector3): Vector3 {
    const desired = Vec3.sub(this.position, target);
    const desiredNorm = Vec3.scale(Vec3.normalize(desired), this.maxSpeed);
    return Vec3.sub(desiredNorm, this.velocity);
  }

  private arrive(target: Vector3, slowingRadius = 3): Vector3 {
    const toTarget = Vec3.sub(target, this.position);
    const distance = Vec3.length(toTarget);

    if (distance < 0.1) {
      return Vec3.scale(this.velocity, -1); // Stop
    }

    const rampedSpeed = this.maxSpeed * (distance / slowingRadius);
    const clippedSpeed = Math.min(rampedSpeed, this.maxSpeed);
    const desired = Vec3.scale(toTarget, clippedSpeed / distance);

    return Vec3.sub(desired, this.velocity);
  }

  private wander(): Vector3 {
    const wanderRadius = 1;
    const wanderDistance = 2;
    const wanderJitter = 0.5;

    const randomOffset = {
      x: (Math.random() * 2 - 1) * wanderJitter,
      y: 0,
      z: (Math.random() * 2 - 1) * wanderJitter,
    };

    const circleCenter = Vec3.add(
      this.position,
      Vec3.scale(this.forward, wanderDistance)
    );

    const target = Vec3.add(
      circleCenter,
      Vec3.scale(Vec3.normalize(randomOffset), wanderRadius)
    );

    return this.seek(target);
  }

  private avoidObstacles(obstacles: ObstacleConfig[]): Vector3 {
    const lookAhead = 3;
    let avoidance = Vec3.zero();

    for (const obstacle of obstacles) {
      const toObstacle = Vec3.sub(obstacle.position, this.position);
      const distance = Vec3.length(toObstacle);
      const obstacleRadius = obstacle.radius ?? obstacle.size?.x ?? 1;

      if (distance < lookAhead + obstacleRadius + this.radius) {
        // Calculate avoidance force
        const awayFromObstacle = Vec3.normalize(Vec3.sub(this.position, obstacle.position));
        const strength = (lookAhead + obstacleRadius - distance) / lookAhead;
        avoidance = Vec3.add(
          avoidance,
          Vec3.scale(awayFromObstacle, strength * this.obstacleAvoidanceWeight)
        );
      }
    }

    return avoidance;
  }

  private separation(neighbors: NavigationAgent[]): Vector3 {
    let force = Vec3.zero();
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor.id === this.id) continue;

      const distance = Vec3.distance(this.position, neighbor.position);
      const minDistance = this.radius + neighbor.radius + 1;

      if (distance < minDistance && distance > 0) {
        const away = Vec3.normalize(Vec3.sub(this.position, neighbor.position));
        const strength = (minDistance - distance) / minDistance;
        force = Vec3.add(force, Vec3.scale(away, strength));
        count++;
      }
    }

    if (count > 0) {
      force = Vec3.scale(force, 1 / count);
    }

    return force;
  }

  private cohesion(neighbors: NavigationAgent[]): Vector3 {
    let centerOfMass = Vec3.zero();
    let count = 0;

    const cohesionRadius = 5;

    for (const neighbor of neighbors) {
      if (neighbor.id === this.id) continue;

      const distance = Vec3.distance(this.position, neighbor.position);

      if (distance < cohesionRadius) {
        centerOfMass = Vec3.add(centerOfMass, neighbor.position);
        count++;
      }
    }

    if (count > 0) {
      centerOfMass = Vec3.scale(centerOfMass, 1 / count);
      return this.seek(centerOfMass);
    }

    return Vec3.zero();
  }

  private alignment(neighbors: NavigationAgent[]): Vector3 {
    let avgVelocity = Vec3.zero();
    let count = 0;

    const alignmentRadius = 5;

    for (const neighbor of neighbors) {
      if (neighbor.id === this.id) continue;

      const distance = Vec3.distance(this.position, neighbor.position);

      if (distance < alignmentRadius) {
        avgVelocity = Vec3.add(avgVelocity, neighbor.velocity);
        count++;
      }
    }

    if (count > 0) {
      avgVelocity = Vec3.scale(avgVelocity, 1 / count);
      avgVelocity = Vec3.normalize(avgVelocity);
      avgVelocity = Vec3.scale(avgVelocity, this.maxSpeed);
      return Vec3.sub(avgVelocity, this.velocity);
    }

    return Vec3.zero();
  }

  stop(): void {
    this.velocity = Vec3.zero();
    this.isMoving = false;
    this.currentPath = null;
    this.targetPosition = null;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }

  getCurrentPath(): NavigationPath | null {
    return this.currentPath;
  }
}

// Navigation System

export class NavigationSystem extends EventEmitter {
  private static instance: NavigationSystem | null = null;
  
  private grid: NavigationGrid | null = null;
  private navMesh: NavMesh | null = null;
  private agents = new Map<string, NavigationAgent>();
  private obstacles: ObstacleConfig[] = [];
  
  private isRunning = false;
  private lastTime = 0;
  private animationFrameId: number | null = null;

  private constructor() {
    super();
  }

  static getInstance(): NavigationSystem {
    if (!NavigationSystem.instance) {
      NavigationSystem.instance = new NavigationSystem();
    }
    return NavigationSystem.instance;
  }

  static resetInstance(): void {
    if (NavigationSystem.instance) {
      NavigationSystem.instance.stop();
      NavigationSystem.instance.clear();
      NavigationSystem.instance = null;
    }
  }

  // Grid navigation
  createGrid(config: GridConfig): NavigationGrid {
    this.grid = new NavigationGrid(config);
    this.emit('gridCreated', this.grid);
    return this.grid;
  }

  getGrid(): NavigationGrid | null {
    return this.grid;
  }

  // NavMesh navigation
  loadNavMesh(data: NavMeshData): NavMesh {
    this.navMesh = new NavMesh();
    this.navMesh.loadFromData(data);
    this.emit('navMeshLoaded', this.navMesh);
    return this.navMesh;
  }

  getNavMesh(): NavMesh | null {
    return this.navMesh;
  }

  // Agent management
  createAgent(config: AgentConfig): NavigationAgent {
    const agent = new NavigationAgent(config);
    this.agents.set(agent.id, agent);
    this.emit('agentCreated', agent);
    return agent;
  }

  getAgent(id: string): NavigationAgent | undefined {
    return this.agents.get(id);
  }

  removeAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      agent.removeAllListeners();
      this.agents.delete(id);
      this.emit('agentRemoved', agent);
      return true;
    }
    return false;
  }

  getAllAgents(): NavigationAgent[] {
    return Array.from(this.agents.values());
  }

  // Obstacle management
  addObstacle(config: ObstacleConfig): void {
    this.obstacles.push(config);
    
    // Update grid if exists
    if (this.grid) {
      const radius = config.radius ?? (config.size?.x ?? 1) / 2;
      this.grid.setObstacle(config.position, radius);
    }
    
    this.emit('obstacleAdded', config);
  }

  removeObstacle(position: Vector3): boolean {
    const index = this.obstacles.findIndex(
      o => Vec3.distance(o.position, position) < 0.1
    );
    
    if (index !== -1) {
      const obstacle = this.obstacles[index];
      this.obstacles.splice(index, 1);
      
      // Update grid if exists
      if (this.grid) {
        const radius = obstacle.radius ?? (obstacle.size?.x ?? 1) / 2;
        this.grid.clearObstacle(obstacle.position, radius);
      }
      
      this.emit('obstacleRemoved', obstacle);
      return true;
    }
    
    return false;
  }

  // Pathfinding
  findPath(start: Vector3, end: Vector3): NavigationPath {
    // Try NavMesh first, then grid
    if (this.navMesh) {
      const path = this.navMesh.findPath(start, end);
      if (path.isComplete) return path;
    }
    
    if (this.grid) {
      return this.grid.findPath(start, end);
    }
    
    // Direct path if no navigation data
    return {
      points: [start, end],
      totalCost: Vec3.distance(start, end),
      isComplete: true,
    };
  }

  // Move agent to target
  moveAgentTo(agentId: string, target: Vector3): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    const path = this.findPath(agent.position, target);
    if (path.isComplete) {
      agent.setPath(path);
      return true;
    }
    
    return false;
  }

  // Simulation
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    this.update(dt);
    
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  update(dt: number): void {
    const agentsList = this.getAllAgents();
    
    for (const agent of agentsList) {
      agent.update(dt, agentsList, this.obstacles);
    }
    
    this.emit('update', dt);
  }

  clear(): void {
    for (const agent of this.agents.values()) {
      agent.removeAllListeners();
    }
    this.agents.clear();
    this.obstacles = [];
    this.grid = null;
    this.navMesh = null;
  }

  dispose(): void {
    this.stop();
    this.clear();
    this.removeAllListeners();
  }
}

export default NavigationSystem;
