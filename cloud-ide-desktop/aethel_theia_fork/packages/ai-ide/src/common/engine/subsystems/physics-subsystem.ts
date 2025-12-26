import { injectable } from 'inversify';
import { IEngineSubsystem, SubsystemPriority, EngineState, EngineMode } from '../aethel-engine-runtime';

// ============================================================================
// PHYSICS SUBSYSTEM
// Integrates physics simulation into the Aethel Engine Runtime
// ============================================================================

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  gravity: [number, number, number];
  fixedTimestep: number;
  maxSubsteps: number;
  enableCCD: boolean; // Continuous Collision Detection
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
  rotation: [number, number, number, number]; // quaternion
  linearVelocity: [number, number, number];
  angularVelocity: [number, number, number];
  restitution: number;
  friction: number;
  colliderType: 'box' | 'sphere' | 'capsule' | 'mesh' | 'convex';
  colliderSize: number[];
}

@injectable()
export class PhysicsSubsystem implements IEngineSubsystem {
  readonly name = 'PhysicsSubsystem';
  readonly priority: SubsystemPriority = 'core';
  
  private _isInitialized = false;
  private _isEnabled = true;
  
  // Performance tracking
  public lastTickTime = 0;
  
  // Physics state
  private config: PhysicsConfig = {
    gravity: [0, -9.81, 0],
    fixedTimestep: 1 / 60,
    maxSubsteps: 4,
    enableCCD: true,
    solverIterations: 10,
  };
  
  private bodies: Map<string, PhysicsBody> = new Map();
  private accumulator = 0;
  private simulationTime = 0;
  
  // Collision callbacks
  private collisionCallbacks: Array<(collision: CollisionInfo) => void> = [];
  
  get isInitialized(): boolean {
    return this._isInitialized;
  }
  
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  async initialize(): Promise<void> {
    console.log('[PhysicsSubsystem] Initializing...');
    
    // In production, would initialize physics engine (Rapier, Cannon.js, etc.)
    // For now, using simplified physics simulation
    
    this._isInitialized = true;
    console.log('[PhysicsSubsystem] Initialized');
  }

  async shutdown(): Promise<void> {
    console.log('[PhysicsSubsystem] Shutting down...');
    
    this.bodies.clear();
    this.collisionCallbacks = [];
    this._isInitialized = false;
    
    console.log('[PhysicsSubsystem] Shutdown complete');
  }

  tick(deltaTime: number): void {
    if (!this._isEnabled || !this._isInitialized) return;
    
    const startTime = performance.now();
    
    // Fixed timestep physics simulation
    this.accumulator += deltaTime;
    
    let substeps = 0;
    while (this.accumulator >= this.config.fixedTimestep && substeps < this.config.maxSubsteps) {
      this.stepSimulation(this.config.fixedTimestep);
      this.accumulator -= this.config.fixedTimestep;
      this.simulationTime += this.config.fixedTimestep;
      substeps++;
    }
    
    // Interpolate for smooth rendering
    const alpha = this.accumulator / this.config.fixedTimestep;
    this.interpolateBodies(alpha);
    
    this.lastTickTime = performance.now() - startTime;
  }

  onEngineStateChange(state: EngineState): void {
    if (state === 'paused') {
      this._isEnabled = false;
    } else if (state === 'running') {
      this._isEnabled = true;
    }
  }

  onEngineModeChange(_mode: EngineMode): void {
    // Physics behaves the same in all modes
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  setConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setGravity(x: number, y: number, z: number): void {
    this.config.gravity = [x, y, z];
  }

  // ========================================================================
  // BODY MANAGEMENT
  // ========================================================================

  createBody(entityId: string, definition: Partial<PhysicsBody>): PhysicsBody {
    const body: PhysicsBody = {
      entityId,
      type: definition.type || 'dynamic',
      mass: definition.mass || 1,
      position: definition.position || [0, 0, 0],
      rotation: definition.rotation || [0, 0, 0, 1],
      linearVelocity: definition.linearVelocity || [0, 0, 0],
      angularVelocity: definition.angularVelocity || [0, 0, 0],
      restitution: definition.restitution ?? 0.3,
      friction: definition.friction ?? 0.5,
      colliderType: definition.colliderType || 'box',
      colliderSize: definition.colliderSize || [1, 1, 1],
    };
    
    this.bodies.set(entityId, body);
    return body;
  }

  removeBody(entityId: string): void {
    this.bodies.delete(entityId);
  }

  getBody(entityId: string): PhysicsBody | undefined {
    return this.bodies.get(entityId);
  }

  // ========================================================================
  // FORCES & IMPULSES
  // ========================================================================

  applyForce(entityId: string, force: [number, number, number]): void {
    const body = this.bodies.get(entityId);
    if (!body || body.type === 'static') return;
    
    // F = ma, so a = F/m
    const acceleration = force.map(f => f / body.mass) as [number, number, number];
    body.linearVelocity = [
      body.linearVelocity[0] + acceleration[0] * this.config.fixedTimestep,
      body.linearVelocity[1] + acceleration[1] * this.config.fixedTimestep,
      body.linearVelocity[2] + acceleration[2] * this.config.fixedTimestep,
    ];
  }

  applyImpulse(entityId: string, impulse: [number, number, number]): void {
    const body = this.bodies.get(entityId);
    if (!body || body.type === 'static') return;
    
    // Impulse = mass * delta_velocity
    body.linearVelocity = [
      body.linearVelocity[0] + impulse[0] / body.mass,
      body.linearVelocity[1] + impulse[1] / body.mass,
      body.linearVelocity[2] + impulse[2] / body.mass,
    ];
  }

  setVelocity(entityId: string, velocity: [number, number, number]): void {
    const body = this.bodies.get(entityId);
    if (!body) return;
    body.linearVelocity = velocity;
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  raycast(
    origin: [number, number, number],
    direction: [number, number, number],
    maxDistance: number
  ): RaycastResult {
    // Simplified raycast - in production would use spatial acceleration structure
    let closestHit: RaycastResult = { hit: false };
    let closestDistance = maxDistance;
    
    for (const [entityId, body] of this.bodies) {
      // Simple sphere intersection for demonstration
      const toBody = [
        body.position[0] - origin[0],
        body.position[1] - origin[1],
        body.position[2] - origin[2],
      ];
      
      const tca = toBody[0] * direction[0] + toBody[1] * direction[1] + toBody[2] * direction[2];
      if (tca < 0) continue;
      
      const d2 = toBody[0] * toBody[0] + toBody[1] * toBody[1] + toBody[2] * toBody[2] - tca * tca;
      const radius = body.colliderSize[0] || 1;
      const radius2 = radius * radius;
      
      if (d2 > radius2) continue;
      
      const thc = Math.sqrt(radius2 - d2);
      const t0 = tca - thc;
      
      if (t0 > 0 && t0 < closestDistance) {
        closestDistance = t0;
        closestHit = {
          hit: true,
          entity: entityId,
          point: [
            origin[0] + direction[0] * t0,
            origin[1] + direction[1] * t0,
            origin[2] + direction[2] * t0,
          ],
          normal: [0, 1, 0], // Simplified
          distance: t0,
        };
      }
    }
    
    return closestHit;
  }

  overlapSphere(center: [number, number, number], radius: number): string[] {
    const overlapping: string[] = [];
    
    for (const [entityId, body] of this.bodies) {
      const dx = body.position[0] - center[0];
      const dy = body.position[1] - center[1];
      const dz = body.position[2] - center[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const bodyRadius = body.colliderSize[0] || 1;
      if (distance < radius + bodyRadius) {
        overlapping.push(entityId);
      }
    }
    
    return overlapping;
  }

  // ========================================================================
  // COLLISION CALLBACKS
  // ========================================================================

  onCollision(callback: (collision: CollisionInfo) => void): void {
    this.collisionCallbacks.push(callback);
  }

  // ========================================================================
  // SIMULATION
  // ========================================================================

  private stepSimulation(dt: number): void {
    // Apply gravity to all dynamic bodies
    for (const body of this.bodies.values()) {
      if (body.type !== 'dynamic') continue;
      
      // Apply gravity
      body.linearVelocity[0] += this.config.gravity[0] * dt;
      body.linearVelocity[1] += this.config.gravity[1] * dt;
      body.linearVelocity[2] += this.config.gravity[2] * dt;
      
      // Integrate position
      body.position[0] += body.linearVelocity[0] * dt;
      body.position[1] += body.linearVelocity[1] * dt;
      body.position[2] += body.linearVelocity[2] * dt;
    }
    
    // Detect and resolve collisions
    this.detectCollisions();
  }

  private detectCollisions(): void {
    const bodyList = Array.from(this.bodies.values());
    
    for (let i = 0; i < bodyList.length; i++) {
      for (let j = i + 1; j < bodyList.length; j++) {
        const bodyA = bodyList[i];
        const bodyB = bodyList[j];
        
        if (bodyA.type === 'static' && bodyB.type === 'static') continue;
        
        // Simple sphere-sphere collision detection
        const dx = bodyB.position[0] - bodyA.position[0];
        const dy = bodyB.position[1] - bodyA.position[1];
        const dz = bodyB.position[2] - bodyA.position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const radiusA = bodyA.colliderSize[0] || 1;
        const radiusB = bodyB.colliderSize[0] || 1;
        const minDistance = radiusA + radiusB;
        
        if (distance < minDistance) {
          // Collision detected!
          const collision: CollisionInfo = {
            entityA: bodyA.entityId,
            entityB: bodyB.entityId,
            point: [
              (bodyA.position[0] + bodyB.position[0]) / 2,
              (bodyA.position[1] + bodyB.position[1]) / 2,
              (bodyA.position[2] + bodyB.position[2]) / 2,
            ],
            normal: distance > 0 ? [dx / distance, dy / distance, dz / distance] : [0, 1, 0],
            impulse: 0,
          };
          
          // Resolve collision
          this.resolveCollision(bodyA, bodyB, collision);
          
          // Notify callbacks
          for (const callback of this.collisionCallbacks) {
            callback(collision);
          }
        }
      }
    }
  }

  private resolveCollision(bodyA: PhysicsBody, bodyB: PhysicsBody, collision: CollisionInfo): void {
    if (bodyA.type === 'static' && bodyB.type === 'static') return;
    
    const normal = collision.normal;
    
    // Calculate relative velocity
    const relVel = [
      bodyB.linearVelocity[0] - bodyA.linearVelocity[0],
      bodyB.linearVelocity[1] - bodyA.linearVelocity[1],
      bodyB.linearVelocity[2] - bodyA.linearVelocity[2],
    ];
    
    const velAlongNormal = relVel[0] * normal[0] + relVel[1] * normal[1] + relVel[2] * normal[2];
    
    // Don't resolve if velocities are separating
    if (velAlongNormal > 0) return;
    
    // Calculate restitution
    const e = Math.min(bodyA.restitution, bodyB.restitution);
    
    // Calculate impulse scalar
    const invMassA = bodyA.type === 'static' ? 0 : 1 / bodyA.mass;
    const invMassB = bodyB.type === 'static' ? 0 : 1 / bodyB.mass;
    
    const j = -(1 + e) * velAlongNormal / (invMassA + invMassB);
    collision.impulse = j;
    
    // Apply impulse
    if (bodyA.type !== 'static') {
      bodyA.linearVelocity[0] -= j * invMassA * normal[0];
      bodyA.linearVelocity[1] -= j * invMassA * normal[1];
      bodyA.linearVelocity[2] -= j * invMassA * normal[2];
    }
    
    if (bodyB.type !== 'static') {
      bodyB.linearVelocity[0] += j * invMassB * normal[0];
      bodyB.linearVelocity[1] += j * invMassB * normal[1];
      bodyB.linearVelocity[2] += j * invMassB * normal[2];
    }
    
    // Positional correction to prevent sinking
    const radiusA = bodyA.colliderSize[0] || 1;
    const radiusB = bodyB.colliderSize[0] || 1;
    const dx = bodyB.position[0] - bodyA.position[0];
    const dy = bodyB.position[1] - bodyA.position[1];
    const dz = bodyB.position[2] - bodyA.position[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const penetration = radiusA + radiusB - distance;
    
    if (penetration > 0) {
      const percent = 0.8;
      const slop = 0.01;
      const correctionMag = Math.max(penetration - slop, 0) / (invMassA + invMassB) * percent;
      
      if (bodyA.type !== 'static') {
        bodyA.position[0] -= correctionMag * invMassA * normal[0];
        bodyA.position[1] -= correctionMag * invMassA * normal[1];
        bodyA.position[2] -= correctionMag * invMassA * normal[2];
      }
      
      if (bodyB.type !== 'static') {
        bodyB.position[0] += correctionMag * invMassB * normal[0];
        bodyB.position[1] += correctionMag * invMassB * normal[1];
        bodyB.position[2] += correctionMag * invMassB * normal[2];
      }
    }
  }

  private interpolateBodies(_alpha: number): void {
    // For smooth rendering between fixed timesteps
    // In production, would store previous positions and lerp
  }

  // ========================================================================
  // STATS
  // ========================================================================

  getStats(): Record<string, number> {
    return {
      bodyCount: this.bodies.size,
      simulationTime: this.simulationTime,
      lastTickTime: this.lastTickTime,
    };
  }
}
