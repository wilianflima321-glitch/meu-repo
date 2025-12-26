import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL GAME AI ENGINE - Behavior Trees, NavMesh, Perception System
// Production-ready AI for game development
// ============================================================================

// ============================================================================
// VECTOR TYPES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// ============================================================================
// BEHAVIOR TREE SYSTEM
// ============================================================================

/**
 * Behavior tree node status
 */
export type BTStatus = 'success' | 'failure' | 'running';

/**
 * Behavior tree node types
 */
export type BTNodeType = 
  | 'root'
  | 'sequence'
  | 'selector'
  | 'parallel'
  | 'decorator'
  | 'action'
  | 'condition';

/**
 * Base behavior tree node
 */
export interface BTNode {
  id: string;
  type: BTNodeType;
  name: string;
  children: BTNode[];
  decorators?: BTDecorator[];
  metadata?: Record<string, unknown>;
}

/**
 * Action node - performs an action
 */
export interface BTActionNode extends BTNode {
  type: 'action';
  actionType: string;
  parameters: Record<string, unknown>;
}

/**
 * Condition node - checks a condition
 */
export interface BTConditionNode extends BTNode {
  type: 'condition';
  conditionType: string;
  parameters: Record<string, unknown>;
  negate?: boolean;
}

/**
 * Decorator types
 */
export type BTDecoratorType = 
  | 'inverter'
  | 'repeater'
  | 'retry'
  | 'timeout'
  | 'cooldown'
  | 'force-success'
  | 'force-failure'
  | 'until-success'
  | 'until-failure';

/**
 * Decorator definition
 */
export interface BTDecorator {
  type: BTDecoratorType;
  parameters?: Record<string, unknown>;
}

/**
 * Parallel policy
 */
export type ParallelPolicy = 'require-all' | 'require-one' | 'require-none';

/**
 * Parallel node with policy
 */
export interface BTParallelNode extends BTNode {
  type: 'parallel';
  successPolicy: ParallelPolicy;
  failurePolicy: ParallelPolicy;
}

/**
 * Behavior tree blackboard for data sharing
 */
export class Blackboard {
  private data = new Map<string, unknown>();
  private readonly observers = new Map<string, Set<(value: unknown) => void>>();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
    const observers = this.observers.get(key);
    if (observers) {
      for (const observer of observers) {
        observer(value);
      }
    }
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): boolean {
    return this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  observe(key: string, callback: (value: unknown) => void): () => void {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    this.observers.get(key)!.add(callback);
    
    return () => {
      this.observers.get(key)?.delete(callback);
    };
  }
}

/**
 * Behavior tree execution context
 */
export interface BTContext {
  entityId: string;
  blackboard: Blackboard;
  deltaTime: number;
  services: AIServices;
}

/**
 * AI services available to behavior tree
 */
export interface AIServices {
  navigation: NavigationService;
  perception: PerceptionSystem;
  animation: AnimationService;
  audio: AudioService;
}

interface AnimationService {
  play(entityId: string, animationName: string): void;
  stop(entityId: string): void;
  setBlendWeight(entityId: string, weight: number): void;
}

interface AudioService {
  play(entityId: string, soundId: string): void;
  stop(entityId: string): void;
}

/**
 * Action handler function type
 */
export type ActionHandler = (
  context: BTContext,
  parameters: Record<string, unknown>
) => BTStatus | Promise<BTStatus>;

/**
 * Condition handler function type
 */
export type ConditionHandler = (
  context: BTContext,
  parameters: Record<string, unknown>
) => boolean;

/**
 * Behavior Tree Engine
 */
@injectable()
export class BehaviorTreeEngine {
  private readonly trees = new Map<string, BTNode>();
  private readonly runningNodes = new Map<string, Map<string, BTStatus>>();
  private readonly actionHandlers = new Map<string, ActionHandler>();
  private readonly conditionHandlers = new Map<string, ConditionHandler>();

  private readonly onNodeExecutedEmitter = new Emitter<{ treeId: string; nodeId: string; status: BTStatus }>();
  private readonly onTreeCompletedEmitter = new Emitter<{ treeId: string; status: BTStatus }>();

  readonly onNodeExecuted: Event<{ treeId: string; nodeId: string; status: BTStatus }> = this.onNodeExecutedEmitter.event;
  readonly onTreeCompleted: Event<{ treeId: string; status: BTStatus }> = this.onTreeCompletedEmitter.event;

  constructor() {
    this.registerBuiltinActions();
    this.registerBuiltinConditions();
  }

  // ========================================================================
  // TREE MANAGEMENT
  // ========================================================================

  /**
   * Register a behavior tree
   */
  registerTree(id: string, root: BTNode): void {
    this.trees.set(id, root);
  }

  /**
   * Get a behavior tree by ID
   */
  getTree(id: string): BTNode | undefined {
    return this.trees.get(id);
  }

  /**
   * Remove a behavior tree
   */
  removeTree(id: string): void {
    this.trees.delete(id);
    this.runningNodes.delete(id);
  }

  /**
   * Register an action handler
   */
  registerAction(type: string, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Register a condition handler
   */
  registerCondition(type: string, handler: ConditionHandler): void {
    this.conditionHandlers.set(type, handler);
  }

  // ========================================================================
  // EXECUTION
  // ========================================================================

  /**
   * Execute a behavior tree tick
   */
  async tick(treeId: string, context: BTContext): Promise<BTStatus> {
    const tree = this.trees.get(treeId);
    if (!tree) {
      return 'failure';
    }

    // Initialize running nodes tracking for this tree
    if (!this.runningNodes.has(treeId)) {
      this.runningNodes.set(treeId, new Map());
    }

    const status = await this.executeNode(treeId, tree, context);
    this.onTreeCompletedEmitter.fire({ treeId, status });
    return status;
  }

  /**
   * Execute a single node
   */
  private async executeNode(treeId: string, node: BTNode, context: BTContext): Promise<BTStatus> {
    // Apply decorators
    let status = await this.executeNodeCore(treeId, node, context);
    
    if (node.decorators) {
      for (const decorator of node.decorators) {
        status = this.applyDecorator(decorator, status);
      }
    }

    this.onNodeExecutedEmitter.fire({ treeId, nodeId: node.id, status });
    return status;
  }

  /**
   * Execute node without decorators
   */
  private async executeNodeCore(treeId: string, node: BTNode, context: BTContext): Promise<BTStatus> {
    switch (node.type) {
      case 'root':
      case 'sequence':
        return this.executeSequence(treeId, node, context);
      case 'selector':
        return this.executeSelector(treeId, node, context);
      case 'parallel':
        return this.executeParallel(treeId, node as BTParallelNode, context);
      case 'action':
        return this.executeAction(node as BTActionNode, context);
      case 'condition':
        return this.executeCondition(node as BTConditionNode, context);
      default:
        return 'failure';
    }
  }

  /**
   * Execute sequence node (AND logic)
   */
  private async executeSequence(treeId: string, node: BTNode, context: BTContext): Promise<BTStatus> {
    for (const child of node.children) {
      const status = await this.executeNode(treeId, child, context);
      if (status !== 'success') {
        return status;
      }
    }
    return 'success';
  }

  /**
   * Execute selector node (OR logic)
   */
  private async executeSelector(treeId: string, node: BTNode, context: BTContext): Promise<BTStatus> {
    for (const child of node.children) {
      const status = await this.executeNode(treeId, child, context);
      if (status !== 'failure') {
        return status;
      }
    }
    return 'failure';
  }

  /**
   * Execute parallel node
   */
  private async executeParallel(treeId: string, node: BTParallelNode, context: BTContext): Promise<BTStatus> {
    const results = await Promise.all(
      node.children.map(child => this.executeNode(treeId, child, context))
    );

    const successCount = results.filter(r => r === 'success').length;
    const failureCount = results.filter(r => r === 'failure').length;
    const runningCount = results.filter(r => r === 'running').length;

    // Check success policy
    if (node.successPolicy === 'require-all' && successCount === node.children.length) {
      return 'success';
    }
    if (node.successPolicy === 'require-one' && successCount >= 1) {
      return 'success';
    }

    // Check failure policy
    if (node.failurePolicy === 'require-all' && failureCount === node.children.length) {
      return 'failure';
    }
    if (node.failurePolicy === 'require-one' && failureCount >= 1) {
      return 'failure';
    }

    // If any are running, we're still running
    if (runningCount > 0) {
      return 'running';
    }

    return 'failure';
  }

  /**
   * Execute action node
   */
  private async executeAction(node: BTActionNode, context: BTContext): Promise<BTStatus> {
    const handler = this.actionHandlers.get(node.actionType);
    if (!handler) {
      console.warn(`Unknown action type: ${node.actionType}`);
      return 'failure';
    }

    return handler(context, node.parameters);
  }

  /**
   * Execute condition node
   */
  private executeCondition(node: BTConditionNode, context: BTContext): BTStatus {
    const handler = this.conditionHandlers.get(node.conditionType);
    if (!handler) {
      console.warn(`Unknown condition type: ${node.conditionType}`);
      return 'failure';
    }

    let result = handler(context, node.parameters);
    if (node.negate) {
      result = !result;
    }

    return result ? 'success' : 'failure';
  }

  /**
   * Apply decorator to status
   */
  private applyDecorator(decorator: BTDecorator, status: BTStatus): BTStatus {
    switch (decorator.type) {
      case 'inverter':
        if (status === 'success') return 'failure';
        if (status === 'failure') return 'success';
        return status;
      case 'force-success':
        return status === 'running' ? 'running' : 'success';
      case 'force-failure':
        return status === 'running' ? 'running' : 'failure';
      default:
        return status;
    }
  }

  // ========================================================================
  // BUILT-IN HANDLERS
  // ========================================================================

  private registerBuiltinActions(): void {
    // Wait action
    this.registerAction('wait', async (ctx, params) => {
      const duration = params.duration as number || 1;
      const key = `wait_${ctx.entityId}`;
      
      let elapsed = ctx.blackboard.get<number>(key) || 0;
      elapsed += ctx.deltaTime;
      
      if (elapsed >= duration) {
        ctx.blackboard.delete(key);
        return 'success';
      }
      
      ctx.blackboard.set(key, elapsed);
      return 'running';
    });

    // Move to action
    this.registerAction('move-to', async (ctx, params) => {
      const target = params.target as Vector3;
      const speed = params.speed as number || 5;
      
      const path = ctx.services.navigation.findPath(ctx.entityId, target);
      if (!path || path.length === 0) {
        return 'failure';
      }
      
      const arrived = ctx.services.navigation.moveAlongPath(ctx.entityId, path, speed, ctx.deltaTime);
      return arrived ? 'success' : 'running';
    });

    // Play animation action
    this.registerAction('play-animation', (ctx, params) => {
      const animName = params.animation as string;
      ctx.services.animation.play(ctx.entityId, animName);
      return 'success';
    });

    // Set blackboard value
    this.registerAction('set-value', (ctx, params) => {
      const key = params.key as string;
      const value = params.value;
      ctx.blackboard.set(key, value);
      return 'success';
    });

    // Log action (for debugging)
    this.registerAction('log', (ctx, params) => {
      console.log(`[BT] ${ctx.entityId}: ${params.message}`);
      return 'success';
    });
  }

  private registerBuiltinConditions(): void {
    // Check blackboard value
    this.registerCondition('has-value', (ctx, params) => {
      const key = params.key as string;
      return ctx.blackboard.has(key);
    });

    // Compare blackboard values
    this.registerCondition('compare', (ctx, params) => {
      const key = params.key as string;
      const value = params.value;
      const operator = params.operator as string || '==';
      
      const actual = ctx.blackboard.get(key);
      
      switch (operator) {
        case '==': return actual === value;
        case '!=': return actual !== value;
        case '>': return (actual as number) > (value as number);
        case '<': return (actual as number) < (value as number);
        case '>=': return (actual as number) >= (value as number);
        case '<=': return (actual as number) <= (value as number);
        default: return false;
      }
    });

    // Can see target
    this.registerCondition('can-see', (ctx, params) => {
      const targetId = params.targetId as string;
      return ctx.services.perception.canSee(ctx.entityId, targetId);
    });

    // Is in range
    this.registerCondition('in-range', (ctx, params) => {
      const targetId = params.targetId as string;
      const range = params.range as number;
      return ctx.services.perception.isInRange(ctx.entityId, targetId, range);
    });

    // Path exists
    this.registerCondition('path-exists', (ctx, params) => {
      const target = params.target as Vector3;
      const path = ctx.services.navigation.findPath(ctx.entityId, target);
      return path !== null && path.length > 0;
    });
  }

  // ========================================================================
  // TREE BUILDING HELPERS
  // ========================================================================

  static sequence(name: string, ...children: BTNode[]): BTNode {
    return {
      id: generateId(),
      type: 'sequence',
      name,
      children,
    };
  }

  static selector(name: string, ...children: BTNode[]): BTNode {
    return {
      id: generateId(),
      type: 'selector',
      name,
      children,
    };
  }

  static action(name: string, actionType: string, parameters: Record<string, unknown> = {}): BTActionNode {
    return {
      id: generateId(),
      type: 'action',
      name,
      actionType,
      parameters,
      children: [],
    };
  }

  static condition(name: string, conditionType: string, parameters: Record<string, unknown> = {}, negate = false): BTConditionNode {
    return {
      id: generateId(),
      type: 'condition',
      name,
      conditionType,
      parameters,
      negate,
      children: [],
    };
  }
}

// ============================================================================
// NAVIGATION MESH SYSTEM
// ============================================================================

/**
 * NavMesh polygon
 */
export interface NavPolygon {
  id: number;
  vertices: Vector3[];
  center: Vector3;
  neighbors: number[];
  area: number;
  cost: number;
}

/**
 * NavMesh data structure
 */
export interface NavMeshData {
  id: string;
  polygons: NavPolygon[];
  vertices: Vector3[];
  boundingBox: {
    min: Vector3;
    max: Vector3;
  };
}

/**
 * Path point with additional info
 */
export interface PathPoint {
  position: Vector3;
  polygonId: number;
  type: 'waypoint' | 'portal' | 'destination';
}

/**
 * Navigation query filter
 */
export interface NavQueryFilter {
  includeFlags?: number;
  excludeFlags?: number;
  areaCost?: Record<number, number>;
}

/**
 * Navigation service interface
 */
export interface NavigationService {
  findPath(entityId: string, target: Vector3): PathPoint[] | null;
  moveAlongPath(entityId: string, path: PathPoint[], speed: number, deltaTime: number): boolean;
  getClosestPointOnNavMesh(point: Vector3): Vector3 | null;
  isPointOnNavMesh(point: Vector3): boolean;
  raycast(start: Vector3, end: Vector3): { hit: boolean; point?: Vector3; normal?: Vector3 };
}

/**
 * Navigation Mesh System
 */
@injectable()
export class NavMeshSystem implements NavigationService {
  private navMeshes = new Map<string, NavMeshData>();
  private activeNavMesh: NavMeshData | null = null;
  private entityPositions = new Map<string, Vector3>();

  private readonly onPathFoundEmitter = new Emitter<{ entityId: string; path: PathPoint[] }>();
  private readonly onPathFailedEmitter = new Emitter<{ entityId: string; reason: string }>();

  readonly onPathFound: Event<{ entityId: string; path: PathPoint[] }> = this.onPathFoundEmitter.event;
  readonly onPathFailed: Event<{ entityId: string; reason: string }> = this.onPathFailedEmitter.event;

  // ========================================================================
  // NAVMESH MANAGEMENT
  // ========================================================================

  /**
   * Load a navigation mesh
   */
  loadNavMesh(data: NavMeshData): void {
    this.navMeshes.set(data.id, data);
    if (!this.activeNavMesh) {
      this.activeNavMesh = data;
    }
  }

  /**
   * Set active navigation mesh
   */
  setActiveNavMesh(id: string): void {
    const navMesh = this.navMeshes.get(id);
    if (navMesh) {
      this.activeNavMesh = navMesh;
    }
  }

  /**
   * Generate NavMesh from geometry (simplified)
   */
  generateFromGeometry(
    vertices: Vector3[],
    indices: number[],
    options: {
      cellSize?: number;
      cellHeight?: number;
      agentHeight?: number;
      agentRadius?: number;
      maxSlope?: number;
    } = {}
  ): NavMeshData {
    // Simplified navmesh generation
    // In production, use a proper navmesh generation library like recast-navigation
    
    const cellSize = options.cellSize || 0.3;
    const _agentRadius = options.agentRadius || 0.6;
    
    // Calculate bounding box
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    
    for (const v of vertices) {
      min.x = Math.min(min.x, v.x);
      min.y = Math.min(min.y, v.y);
      min.z = Math.min(min.z, v.z);
      max.x = Math.max(max.x, v.x);
      max.y = Math.max(max.y, v.y);
      max.z = Math.max(max.z, v.z);
    }

    // Generate polygons from triangles
    const polygons: NavPolygon[] = [];
    
    for (let i = 0; i < indices.length; i += 3) {
      const v0 = vertices[indices[i]];
      const v1 = vertices[indices[i + 1]];
      const v2 = vertices[indices[i + 2]];
      
      const center = {
        x: (v0.x + v1.x + v2.x) / 3,
        y: (v0.y + v1.y + v2.y) / 3,
        z: (v0.z + v1.z + v2.z) / 3,
      };
      
      const area = this.calculateTriangleArea(v0, v1, v2);
      
      polygons.push({
        id: polygons.length,
        vertices: [v0, v1, v2],
        center,
        neighbors: [],
        area,
        cost: 1,
      });
    }

    // Find neighbors (polygons that share an edge)
    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        if (this.polygonsShareEdge(polygons[i], polygons[j])) {
          polygons[i].neighbors.push(j);
          polygons[j].neighbors.push(i);
        }
      }
    }

    const navMesh: NavMeshData = {
      id: generateId(),
      polygons,
      vertices,
      boundingBox: { min, max },
    };

    this.loadNavMesh(navMesh);
    return navMesh;
  }

  // ========================================================================
  // PATHFINDING
  // ========================================================================

  /**
   * Find path using A* algorithm
   */
  findPath(entityId: string, target: Vector3): PathPoint[] | null {
    if (!this.activeNavMesh) {
      this.onPathFailedEmitter.fire({ entityId, reason: 'No active navmesh' });
      return null;
    }

    const startPos = this.entityPositions.get(entityId);
    if (!startPos) {
      this.onPathFailedEmitter.fire({ entityId, reason: 'Entity position unknown' });
      return null;
    }

    // Find start and end polygons
    const startPoly = this.findContainingPolygon(startPos);
    const endPoly = this.findContainingPolygon(target);

    if (!startPoly || !endPoly) {
      this.onPathFailedEmitter.fire({ entityId, reason: 'Start or end not on navmesh' });
      return null;
    }

    // A* pathfinding
    const path = this.aStarPath(startPoly.id, endPoly.id, startPos, target);
    
    if (path) {
      this.onPathFoundEmitter.fire({ entityId, path });
    } else {
      this.onPathFailedEmitter.fire({ entityId, reason: 'No path found' });
    }

    return path;
  }

  /**
   * A* pathfinding implementation
   */
  private aStarPath(
    startId: number,
    endId: number,
    startPos: Vector3,
    endPos: Vector3
  ): PathPoint[] | null {
    if (!this.activeNavMesh) return null;

    const openSet = new Set<number>([startId]);
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();

    gScore.set(startId, 0);
    fScore.set(startId, this.heuristic(startId, endId));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = -1;
      let lowestF = Infinity;
      
      for (const node of openSet) {
        const f = fScore.get(node) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = node;
        }
      }

      if (current === endId) {
        return this.reconstructPath(cameFrom, current, startPos, endPos);
      }

      openSet.delete(current);
      const currentPoly = this.activeNavMesh.polygons[current];

      for (const neighborId of currentPoly.neighbors) {
        const neighbor = this.activeNavMesh.polygons[neighborId];
        const tentativeG = (gScore.get(current) ?? Infinity) + 
          this.distance(currentPoly.center, neighbor.center) * neighbor.cost;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.heuristic(neighborId, endId));
          openSet.add(neighborId);
        }
      }
    }

    return null;
  }

  /**
   * Heuristic function (straight-line distance)
   */
  private heuristic(fromId: number, toId: number): number {
    if (!this.activeNavMesh) return Infinity;
    
    const from = this.activeNavMesh.polygons[fromId];
    const to = this.activeNavMesh.polygons[toId];
    
    return this.distance(from.center, to.center);
  }

  /**
   * Reconstruct path from A* result
   */
  private reconstructPath(
    cameFrom: Map<number, number>,
    current: number,
    startPos: Vector3,
    endPos: Vector3
  ): PathPoint[] {
    const path: PathPoint[] = [];
    
    // Add destination
    path.unshift({
      position: endPos,
      polygonId: current,
      type: 'destination',
    });

    while (cameFrom.has(current)) {
      const prev = cameFrom.get(current)!;
      const poly = this.activeNavMesh!.polygons[current];
      
      // Add portal point between polygons
      path.unshift({
        position: poly.center,
        polygonId: current,
        type: 'portal',
      });
      
      current = prev;
    }

    // Add start
    path.unshift({
      position: startPos,
      polygonId: current,
      type: 'waypoint',
    });

    return this.smoothPath(path);
  }

  /**
   * Smooth path using string pulling (funnel algorithm)
   */
  private smoothPath(path: PathPoint[]): PathPoint[] {
    if (path.length <= 2) return path;

    // Simplified path smoothing
    const smoothed: PathPoint[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      // Try to skip waypoints if direct line is clear
      let furthest = current + 1;
      
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasDirectPath(path[current].position, path[i].position)) {
          furthest = i;
        }
      }

      smoothed.push(path[furthest]);
      current = furthest;
    }

    return smoothed;
  }

  /**
   * Check if there's a direct path between two points
   */
  private hasDirectPath(start: Vector3, end: Vector3): boolean {
    const result = this.raycast(start, end);
    return !result.hit;
  }

  // ========================================================================
  // MOVEMENT
  // ========================================================================

  /**
   * Move entity along path
   */
  moveAlongPath(entityId: string, path: PathPoint[], speed: number, deltaTime: number): boolean {
    const currentPos = this.entityPositions.get(entityId);
    if (!currentPos || path.length === 0) return true;

    const target = path[0].position;
    const direction = this.normalize(this.subtract(target, currentPos));
    const distance = this.distance(currentPos, target);
    const moveDistance = speed * deltaTime;

    if (moveDistance >= distance) {
      // Reached waypoint
      this.entityPositions.set(entityId, target);
      path.shift();
      return path.length === 0;
    }

    // Move towards waypoint
    const newPos = {
      x: currentPos.x + direction.x * moveDistance,
      y: currentPos.y + direction.y * moveDistance,
      z: currentPos.z + direction.z * moveDistance,
    };
    
    this.entityPositions.set(entityId, newPos);
    return false;
  }

  /**
   * Set entity position
   */
  setEntityPosition(entityId: string, position: Vector3): void {
    this.entityPositions.set(entityId, position);
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get closest point on navmesh
   */
  getClosestPointOnNavMesh(point: Vector3): Vector3 | null {
    if (!this.activeNavMesh) return null;

    let closestPoint: Vector3 | null = null;
    let closestDist = Infinity;

    for (const poly of this.activeNavMesh.polygons) {
      const projected = this.projectPointOnPolygon(point, poly);
      const dist = this.distance(point, projected);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = projected;
      }
    }

    return closestPoint;
  }

  /**
   * Check if point is on navmesh
   */
  isPointOnNavMesh(point: Vector3): boolean {
    return this.findContainingPolygon(point) !== null;
  }

  /**
   * Raycast on navmesh
   */
  raycast(start: Vector3, end: Vector3): { hit: boolean; point?: Vector3; normal?: Vector3 } {
    if (!this.activeNavMesh) return { hit: false };

    // Simplified raycast - check if line crosses any polygon boundary
    const startPoly = this.findContainingPolygon(start);
    const endPoly = this.findContainingPolygon(end);

    if (!startPoly || startPoly === endPoly) {
      return { hit: false };
    }

    // Find intersection point with polygon edges
    // This is a simplified implementation
    return { hit: true, point: this.lerp(start, end, 0.5) };
  }

  /**
   * Find polygon containing point
   */
  private findContainingPolygon(point: Vector3): NavPolygon | null {
    if (!this.activeNavMesh) return null;

    for (const poly of this.activeNavMesh.polygons) {
      if (this.pointInPolygon(point, poly)) {
        return poly;
      }
    }

    return null;
  }

  /**
   * Check if point is inside polygon (2D projection)
   */
  private pointInPolygon(point: Vector3, poly: NavPolygon): boolean {
    const verts = poly.vertices;
    let inside = false;

    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, zi = verts[i].z;
      const xj = verts[j].x, zj = verts[j].z;

      if (((zi > point.z) !== (zj > point.z)) &&
          (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  private calculateTriangleArea(a: Vector3, b: Vector3, c: Vector3): number {
    const ab = this.subtract(b, a);
    const ac = this.subtract(c, a);
    const cross = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x,
    };
    return 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
  }

  private polygonsShareEdge(a: NavPolygon, b: NavPolygon): boolean {
    let sharedCount = 0;
    const threshold = 0.001;
    
    for (const va of a.vertices) {
      for (const vb of b.vertices) {
        if (this.distance(va, vb) < threshold) {
          sharedCount++;
          if (sharedCount >= 2) return true;
        }
      }
    }
    
    return false;
  }

  private projectPointOnPolygon(point: Vector3, poly: NavPolygon): Vector3 {
    // Project point to polygon plane and clamp to polygon bounds
    // Simplified: return polygon center
    return poly.center;
  }
}

// ============================================================================
// PERCEPTION SYSTEM
// ============================================================================

/**
 * Perception stimulus type
 */
export type StimulusType = 'sight' | 'hearing' | 'damage' | 'touch' | 'custom';

/**
 * Perception stimulus
 */
export interface Stimulus {
  id: string;
  type: StimulusType;
  sourceId: string;
  position: Vector3;
  strength: number;
  radius: number;
  expiresAt: number;
  tags: string[];
  data?: Record<string, unknown>;
}

/**
 * Perceived entity
 */
export interface PerceivedEntity {
  entityId: string;
  lastSeenPosition: Vector3;
  lastSeenTime: number;
  lastHeardPosition?: Vector3;
  lastHeardTime?: number;
  threat: number;
  relationship: 'friendly' | 'neutral' | 'hostile' | 'unknown';
}

/**
 * Perception component configuration
 */
export interface PerceptionConfig {
  sightRange: number;
  sightAngle: number;  // Degrees
  hearingRange: number;
  memoryDuration: number;  // How long to remember entities
  updateInterval: number;  // How often to update perception
}

/**
 * Interface for Physics integration - Line of Sight raycasting
 */
export interface IPhysicsRaycastProvider {
  raycast(origin: Vector3, direction: Vector3, maxDistance: number): RaycastResult | null;
}

/**
 * Result of a raycast operation
 */
export interface RaycastResult {
  hit: boolean;
  point?: Vector3;
  normal?: Vector3;
  distance?: number;
  entityId?: string;
}

/**
 * Perception System
 */
@injectable()
export class PerceptionSystem {
  private readonly entities = new Map<string, {
    position: Vector3;
    forward: Vector3;
    config: PerceptionConfig;
    perceived: Map<string, PerceivedEntity>;
    teamId: number;
  }>();
  
  private readonly stimuli: Stimulus[] = [];
  private readonly teamRelationships = new Map<string, 'friendly' | 'neutral' | 'hostile'>();
  
  /**
   * Physics provider for line-of-sight raycasting
   * Set this to enable occlusion-based visibility checks
   */
  private physicsProvider: IPhysicsRaycastProvider | null = null;

  private readonly onEntityPerceivedEmitter = new Emitter<{ perceiverI: string; targetId: string }>();
  private readonly onEntityLostEmitter = new Emitter<{ perceiverId: string; targetId: string }>();
  private readonly onStimulusReceivedEmitter = new Emitter<{ entityId: string; stimulus: Stimulus }>();

  readonly onEntityPerceived: Event<{ perceiverI: string; targetId: string }> = this.onEntityPerceivedEmitter.event;
  readonly onEntityLost: Event<{ perceiverId: string; targetId: string }> = this.onEntityLostEmitter.event;
  readonly onStimulusReceived: Event<{ entityId: string; stimulus: Stimulus }> = this.onStimulusReceivedEmitter.event;

  // ========================================================================
  // PHYSICS INTEGRATION
  // ========================================================================
  
  /**
   * Set physics provider for line-of-sight raycasting
   */
  setPhysicsProvider(provider: IPhysicsRaycastProvider): void {
    this.physicsProvider = provider;
  }
  
  /**
   * Remove physics provider
   */
  clearPhysicsProvider(): void {
    this.physicsProvider = null;
  }

  // ========================================================================
  // ENTITY MANAGEMENT
  // ========================================================================

  /**
   * Register entity for perception
   */
  registerEntity(
    entityId: string,
    config: Partial<PerceptionConfig> = {},
    teamId = 0
  ): void {
    const defaultConfig: PerceptionConfig = {
      sightRange: 20,
      sightAngle: 120,
      hearingRange: 15,
      memoryDuration: 10000,
      updateInterval: 100,
    };

    this.entities.set(entityId, {
      position: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: 1 },
      config: { ...defaultConfig, ...config },
      perceived: new Map(),
      teamId,
    });
  }

  /**
   * Update entity transform
   */
  updateEntityTransform(entityId: string, position: Vector3, forward: Vector3): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.position = position;
      entity.forward = forward;
    }
  }

  /**
   * Remove entity from perception
   */
  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
    
    // Remove from other entities' perception
    for (const entity of this.entities.values()) {
      entity.perceived.delete(entityId);
    }
  }

  // ========================================================================
  // PERCEPTION UPDATE
  // ========================================================================

  /**
   * Update perception for all entities
   */
  update(deltaTime: number): void {
    const now = Date.now();

    // Clean up expired stimuli
    this.cleanupStimuli(now);

    // Update perception for each entity
    for (const [entityId, entity] of this.entities) {
      this.updateEntityPerception(entityId, entity, now);
    }
  }

  /**
   * Update perception for a single entity
   */
  private updateEntityPerception(
    entityId: string,
    entity: ReturnType<typeof this.entities.get>,
    now: number
  ): void {
    if (!entity) return;

    // Check sight for all other entities
    for (const [targetId, target] of this.entities) {
      if (targetId === entityId) continue;

      const wasPerceived = entity.perceived.has(targetId);
      const canSeeNow = this.canSeeEntity(entity, target);
      const canHearNow = this.canHearEntity(entity, target);

      if (canSeeNow || canHearNow) {
        const perceived = entity.perceived.get(targetId) || {
          entityId: targetId,
          lastSeenPosition: target.position,
          lastSeenTime: 0,
          threat: 0,
          relationship: this.getRelationship(entity.teamId, target.teamId),
        };

        if (canSeeNow) {
          perceived.lastSeenPosition = { ...target.position };
          perceived.lastSeenTime = now;
        }

        if (canHearNow) {
          perceived.lastHeardPosition = { ...target.position };
          perceived.lastHeardTime = now;
        }

        entity.perceived.set(targetId, perceived);

        if (!wasPerceived) {
          this.onEntityPerceivedEmitter.fire({ perceiverI: entityId, targetId });
        }
      } else if (wasPerceived) {
        const perceived = entity.perceived.get(targetId)!;
        
        // Check if memory has expired
        const timeSinceSeen = now - perceived.lastSeenTime;
        const timeSinceHeard = perceived.lastHeardTime ? now - perceived.lastHeardTime : Infinity;
        
        if (timeSinceSeen > entity.config.memoryDuration && 
            timeSinceHeard > entity.config.memoryDuration) {
          entity.perceived.delete(targetId);
          this.onEntityLostEmitter.fire({ perceiverId: entityId, targetId });
        }
      }
    }

    // Process stimuli
    for (const stimulus of this.stimuli) {
      if (this.canReceiveStimulus(entity, stimulus)) {
        this.onStimulusReceivedEmitter.fire({ entityId, stimulus });
        
        // Update perceived entity if stimulus has source
        if (stimulus.sourceId && this.entities.has(stimulus.sourceId)) {
          const perceived = entity.perceived.get(stimulus.sourceId) || {
            entityId: stimulus.sourceId,
            lastSeenPosition: stimulus.position,
            lastSeenTime: 0,
            threat: 0,
            relationship: 'unknown' as const,
          };

          if (stimulus.type === 'hearing') {
            perceived.lastHeardPosition = stimulus.position;
            perceived.lastHeardTime = now;
          } else if (stimulus.type === 'damage') {
            perceived.threat += stimulus.strength;
          }

          entity.perceived.set(stimulus.sourceId, perceived);
        }
      }
    }
  }

  /**
   * Check if entity can see target
   */
  private canSeeEntity(
    perceiver: NonNullable<ReturnType<typeof this.entities.get>>,
    target: NonNullable<ReturnType<typeof this.entities.get>>
  ): boolean {
    const distance = this.distance(perceiver.position, target.position);
    
    // Range check
    if (distance > perceiver.config.sightRange) return false;

    // Angle check
    const toTarget = this.normalize(this.subtract(target.position, perceiver.position));
    const dot = this.dot(perceiver.forward, toTarget);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI);
    
    if (angle > perceiver.config.sightAngle / 2) return false;

    // Line of sight check using physics raycasting
    if (this.physicsProvider) {
      const rayResult = this.physicsProvider.raycast(
        perceiver.position,
        toTarget,
        distance
      );
      
      // If we hit something, check if it's the target or an obstacle
      if (rayResult && rayResult.hit) {
        // If the hit distance is significantly less than the distance to target,
        // there's an obstacle blocking the view
        if (rayResult.distance !== undefined && rayResult.distance < distance * 0.95) {
          return false; // Obstacle blocks view
        }
      }
    }

    return true;
  }

  /**
   * Check if entity can hear target
   */
  private canHearEntity(
    perceiver: NonNullable<ReturnType<typeof this.entities.get>>,
    target: NonNullable<ReturnType<typeof this.entities.get>>
  ): boolean {
    const distance = this.distance(perceiver.position, target.position);
    return distance <= perceiver.config.hearingRange;
  }

  /**
   * Check if entity can receive stimulus
   */
  private canReceiveStimulus(
    entity: NonNullable<ReturnType<typeof this.entities.get>>,
    stimulus: Stimulus
  ): boolean {
    const distance = this.distance(entity.position, stimulus.position);
    return distance <= stimulus.radius;
  }

  // ========================================================================
  // STIMULUS MANAGEMENT
  // ========================================================================

  /**
   * Create a new stimulus
   */
  createStimulus(stimulus: Omit<Stimulus, 'id'>): string {
    const id = generateId();
    this.stimuli.push({ ...stimulus, id });
    return id;
  }

  /**
   * Remove a stimulus
   */
  removeStimulus(id: string): void {
    const index = this.stimuli.findIndex(s => s.id === id);
    if (index !== -1) {
      this.stimuli.splice(index, 1);
    }
  }

  /**
   * Clean up expired stimuli
   */
  private cleanupStimuli(now: number): void {
    for (let i = this.stimuli.length - 1; i >= 0; i--) {
      if (this.stimuli[i].expiresAt <= now) {
        this.stimuli.splice(i, 1);
      }
    }
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Check if perceiver can see target
   */
  canSee(perceiverId: string, targetId: string): boolean {
    const perceiver = this.entities.get(perceiverId);
    const target = this.entities.get(targetId);
    
    if (!perceiver || !target) return false;
    
    return this.canSeeEntity(perceiver, target);
  }

  /**
   * Check if target is in range
   */
  isInRange(perceiverId: string, targetId: string, range: number): boolean {
    const perceiver = this.entities.get(perceiverId);
    const target = this.entities.get(targetId);
    
    if (!perceiver || !target) return false;
    
    return this.distance(perceiver.position, target.position) <= range;
  }

  /**
   * Get perceived entities for an entity
   */
  getPerceivedEntities(entityId: string): PerceivedEntity[] {
    const entity = this.entities.get(entityId);
    if (!entity) return [];
    return Array.from(entity.perceived.values());
  }

  /**
   * Get hostile perceived entities
   */
  getHostileEntities(entityId: string): PerceivedEntity[] {
    return this.getPerceivedEntities(entityId).filter(e => e.relationship === 'hostile');
  }

  /**
   * Get nearest perceived entity
   */
  getNearestPerceived(entityId: string, filter?: (entity: PerceivedEntity) => boolean): PerceivedEntity | null {
    const perceiver = this.entities.get(entityId);
    if (!perceiver) return null;

    let nearest: PerceivedEntity | null = null;
    let nearestDist = Infinity;

    for (const perceived of perceiver.perceived.values()) {
      if (filter && !filter(perceived)) continue;

      const dist = this.distance(perceiver.position, perceived.lastSeenPosition);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = perceived;
      }
    }

    return nearest;
  }

  // ========================================================================
  // TEAM MANAGEMENT
  // ========================================================================

  /**
   * Set relationship between teams
   */
  setTeamRelationship(team1: number, team2: number, relationship: 'friendly' | 'neutral' | 'hostile'): void {
    const key = `${Math.min(team1, team2)}_${Math.max(team1, team2)}`;
    this.teamRelationships.set(key, relationship);
  }

  /**
   * Get relationship between teams
   */
  private getRelationship(team1: number, team2: number): 'friendly' | 'neutral' | 'hostile' | 'unknown' {
    if (team1 === team2) return 'friendly';
    
    const key = `${Math.min(team1, team2)}_${Math.max(team1, team2)}`;
    return this.teamRelationships.get(key) || 'unknown';
  }

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
}

// ============================================================================
// UTILITY
// ============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

