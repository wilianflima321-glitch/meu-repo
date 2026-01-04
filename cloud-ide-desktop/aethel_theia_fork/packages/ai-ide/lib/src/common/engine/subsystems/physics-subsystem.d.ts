import { IEngineSubsystem, SubsystemPriority, EngineState, EngineMode } from '../aethel-engine-runtime';
/**
 * Physics configuration
 */
export interface PhysicsConfig {
    gravity: [number, number, number];
    fixedTimestep: number;
    maxSubsteps: number;
    enableCCD: boolean;
    solverIterations: number;
}
/**
 * Collision info returned from physics queries
 */
export interface CollisionInfo {
    entityA: string;
    entityB: string;
    point: [number, number, number];
    normal: [number, number, number];
    impulse: number;
}
/**
 * Raycast result
 */
export interface RaycastResult {
    hit: boolean;
    entity?: string;
    point?: [number, number, number];
    normal?: [number, number, number];
    distance?: number;
}
/**
 * Physics body types
 */
export type BodyType = 'static' | 'dynamic' | 'kinematic';
/**
 * Physics body definition
 */
export interface PhysicsBody {
    entityId: string;
    type: BodyType;
    mass: number;
    position: [number, number, number];
    rotation: [number, number, number, number];
    linearVelocity: [number, number, number];
    angularVelocity: [number, number, number];
    restitution: number;
    friction: number;
    colliderType: 'box' | 'sphere' | 'capsule' | 'mesh' | 'convex';
    colliderSize: number[];
}
export declare class PhysicsSubsystem implements IEngineSubsystem {
    readonly name = "PhysicsSubsystem";
    readonly priority: SubsystemPriority;
    private _isInitialized;
    private _isEnabled;
    lastTickTime: number;
    private config;
    private bodies;
    private accumulator;
    private simulationTime;
    private collisionCallbacks;
    get isInitialized(): boolean;
    get isEnabled(): boolean;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    tick(deltaTime: number): void;
    onEngineStateChange(state: EngineState): void;
    onEngineModeChange(_mode: EngineMode): void;
    setConfig(config: Partial<PhysicsConfig>): void;
    setGravity(x: number, y: number, z: number): void;
    createBody(entityId: string, definition: Partial<PhysicsBody>): PhysicsBody;
    removeBody(entityId: string): void;
    getBody(entityId: string): PhysicsBody | undefined;
    applyForce(entityId: string, force: [number, number, number]): void;
    applyImpulse(entityId: string, impulse: [number, number, number]): void;
    setVelocity(entityId: string, velocity: [number, number, number]): void;
    raycast(origin: [number, number, number], direction: [number, number, number], maxDistance: number): RaycastResult;
    overlapSphere(center: [number, number, number], radius: number): string[];
    onCollision(callback: (collision: CollisionInfo) => void): void;
    private stepSimulation;
    private detectCollisions;
    private resolveCollision;
    private interpolateBodies;
    getStats(): Record<string, number>;
}
