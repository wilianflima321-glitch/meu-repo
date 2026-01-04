import { Event } from '@theia/core/lib/common';
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
/**
 * Behavior tree node status
 */
export type BTStatus = 'success' | 'failure' | 'running';
/**
 * Behavior tree node types
 */
export type BTNodeType = 'root' | 'sequence' | 'selector' | 'parallel' | 'decorator' | 'action' | 'condition';
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
export type BTDecoratorType = 'inverter' | 'repeater' | 'retry' | 'timeout' | 'cooldown' | 'force-success' | 'force-failure' | 'until-success' | 'until-failure';
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
export declare class Blackboard {
    private data;
    private readonly observers;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    observe(key: string, callback: (value: unknown) => void): () => void;
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
export type ActionHandler = (context: BTContext, parameters: Record<string, unknown>) => BTStatus | Promise<BTStatus>;
/**
 * Condition handler function type
 */
export type ConditionHandler = (context: BTContext, parameters: Record<string, unknown>) => boolean;
/**
 * Behavior Tree Engine
 */
export declare class BehaviorTreeEngine {
    private readonly trees;
    private readonly runningNodes;
    private readonly actionHandlers;
    private readonly conditionHandlers;
    private readonly onNodeExecutedEmitter;
    private readonly onTreeCompletedEmitter;
    readonly onNodeExecuted: Event<{
        treeId: string;
        nodeId: string;
        status: BTStatus;
    }>;
    readonly onTreeCompleted: Event<{
        treeId: string;
        status: BTStatus;
    }>;
    constructor();
    /**
     * Register a behavior tree
     */
    registerTree(id: string, root: BTNode): void;
    /**
     * Get a behavior tree by ID
     */
    getTree(id: string): BTNode | undefined;
    /**
     * Remove a behavior tree
     */
    removeTree(id: string): void;
    /**
     * Register an action handler
     */
    registerAction(type: string, handler: ActionHandler): void;
    /**
     * Register a condition handler
     */
    registerCondition(type: string, handler: ConditionHandler): void;
    /**
     * Execute a behavior tree tick
     */
    tick(treeId: string, context: BTContext): Promise<BTStatus>;
    /**
     * Execute a single node
     */
    private executeNode;
    /**
     * Execute node without decorators
     */
    private executeNodeCore;
    /**
     * Execute sequence node (AND logic)
     */
    private executeSequence;
    /**
     * Execute selector node (OR logic)
     */
    private executeSelector;
    /**
     * Execute parallel node
     */
    private executeParallel;
    /**
     * Execute action node
     */
    private executeAction;
    /**
     * Execute condition node
     */
    private executeCondition;
    /**
     * Apply decorator to status
     */
    private applyDecorator;
    private registerBuiltinActions;
    private registerBuiltinConditions;
    static sequence(name: string, ...children: BTNode[]): BTNode;
    static selector(name: string, ...children: BTNode[]): BTNode;
    static action(name: string, actionType: string, parameters?: Record<string, unknown>): BTActionNode;
    static condition(name: string, conditionType: string, parameters?: Record<string, unknown>, negate?: boolean): BTConditionNode;
}
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
    raycast(start: Vector3, end: Vector3): {
        hit: boolean;
        point?: Vector3;
        normal?: Vector3;
    };
}
/**
 * Navigation Mesh System
 */
export declare class NavMeshSystem implements NavigationService {
    private navMeshes;
    private activeNavMesh;
    private entityPositions;
    private readonly onPathFoundEmitter;
    private readonly onPathFailedEmitter;
    readonly onPathFound: Event<{
        entityId: string;
        path: PathPoint[];
    }>;
    readonly onPathFailed: Event<{
        entityId: string;
        reason: string;
    }>;
    /**
     * Load a navigation mesh
     */
    loadNavMesh(data: NavMeshData): void;
    /**
     * Set active navigation mesh
     */
    setActiveNavMesh(id: string): void;
    /**
     * Generate NavMesh from geometry (simplified)
     */
    generateFromGeometry(vertices: Vector3[], indices: number[], options?: {
        cellSize?: number;
        cellHeight?: number;
        agentHeight?: number;
        agentRadius?: number;
        maxSlope?: number;
    }): NavMeshData;
    /**
     * Find path using A* algorithm
     */
    findPath(entityId: string, target: Vector3): PathPoint[] | null;
    /**
     * A* pathfinding implementation
     */
    private aStarPath;
    /**
     * Heuristic function (straight-line distance)
     */
    private heuristic;
    /**
     * Reconstruct path from A* result
     */
    private reconstructPath;
    /**
     * Smooth path using string pulling (funnel algorithm)
     */
    private smoothPath;
    /**
     * Check if there's a direct path between two points
     */
    private hasDirectPath;
    /**
     * Move entity along path
     */
    moveAlongPath(entityId: string, path: PathPoint[], speed: number, deltaTime: number): boolean;
    /**
     * Set entity position
     */
    setEntityPosition(entityId: string, position: Vector3): void;
    /**
     * Get closest point on navmesh
     */
    getClosestPointOnNavMesh(point: Vector3): Vector3 | null;
    /**
     * Check if point is on navmesh
     */
    isPointOnNavMesh(point: Vector3): boolean;
    /**
     * Raycast on navmesh
     */
    raycast(start: Vector3, end: Vector3): {
        hit: boolean;
        point?: Vector3;
        normal?: Vector3;
    };
    /**
     * Find polygon containing point
     */
    private findContainingPolygon;
    /**
     * Check if point is inside polygon (2D projection)
     */
    private pointInPolygon;
    private distance;
    private subtract;
    private normalize;
    private lerp;
    private calculateTriangleArea;
    private polygonsShareEdge;
    private projectPointOnPolygon;
}
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
    sightAngle: number;
    hearingRange: number;
    memoryDuration: number;
    updateInterval: number;
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
export declare class PerceptionSystem {
    private readonly entities;
    private readonly stimuli;
    private readonly teamRelationships;
    /**
     * Physics provider for line-of-sight raycasting
     * Set this to enable occlusion-based visibility checks
     */
    private physicsProvider;
    private readonly onEntityPerceivedEmitter;
    private readonly onEntityLostEmitter;
    private readonly onStimulusReceivedEmitter;
    readonly onEntityPerceived: Event<{
        perceiverI: string;
        targetId: string;
    }>;
    readonly onEntityLost: Event<{
        perceiverId: string;
        targetId: string;
    }>;
    readonly onStimulusReceived: Event<{
        entityId: string;
        stimulus: Stimulus;
    }>;
    /**
     * Set physics provider for line-of-sight raycasting
     */
    setPhysicsProvider(provider: IPhysicsRaycastProvider): void;
    /**
     * Remove physics provider
     */
    clearPhysicsProvider(): void;
    /**
     * Register entity for perception
     */
    registerEntity(entityId: string, config?: Partial<PerceptionConfig>, teamId?: number): void;
    /**
     * Update entity transform
     */
    updateEntityTransform(entityId: string, position: Vector3, forward: Vector3): void;
    /**
     * Remove entity from perception
     */
    removeEntity(entityId: string): void;
    /**
     * Update perception for all entities
     */
    update(deltaTime: number): void;
    /**
     * Update perception for a single entity
     */
    private updateEntityPerception;
    /**
     * Check if entity can see target
     */
    private canSeeEntity;
    /**
     * Check if entity can hear target
     */
    private canHearEntity;
    /**
     * Check if entity can receive stimulus
     */
    private canReceiveStimulus;
    /**
     * Create a new stimulus
     */
    createStimulus(stimulus: Omit<Stimulus, 'id'>): string;
    /**
     * Remove a stimulus
     */
    removeStimulus(id: string): void;
    /**
     * Clean up expired stimuli
     */
    private cleanupStimuli;
    /**
     * Check if perceiver can see target
     */
    canSee(perceiverId: string, targetId: string): boolean;
    /**
     * Check if target is in range
     */
    isInRange(perceiverId: string, targetId: string, range: number): boolean;
    /**
     * Get perceived entities for an entity
     */
    getPerceivedEntities(entityId: string): PerceivedEntity[];
    /**
     * Get hostile perceived entities
     */
    getHostileEntities(entityId: string): PerceivedEntity[];
    /**
     * Get nearest perceived entity
     */
    getNearestPerceived(entityId: string, filter?: (entity: PerceivedEntity) => boolean): PerceivedEntity | null;
    /**
     * Set relationship between teams
     */
    setTeamRelationship(team1: number, team2: number, relationship: 'friendly' | 'neutral' | 'hostile'): void;
    /**
     * Get relationship between teams
     */
    private getRelationship;
    private distance;
    private subtract;
    private normalize;
    private dot;
}
export {};
