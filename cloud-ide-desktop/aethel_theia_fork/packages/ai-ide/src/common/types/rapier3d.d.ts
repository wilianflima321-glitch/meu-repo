// ============================================================================
// AETHEL RAPIER3D TYPE DECLARATIONS
// Type definitions for @dimforge/rapier3d (optional dependency)
// ============================================================================

declare module '@dimforge/rapier3d' {
  export function init(): Promise<void>;
  
  export class World {
    constructor(gravity: { x: number; y: number; z: number });
    free(): void;
    step(collisionPipeline?: CollisionPipeline): void;
    createRigidBody(desc: RigidBodyDesc): RigidBody;
    removeRigidBody(body: RigidBody): void;
    createCollider(desc: ColliderDesc, parent?: RigidBody): Collider;
    removeCollider(collider: Collider, wakeUp?: boolean): void;
    integrationParameters: IntegrationParameters;
    gravity: { x: number; y: number; z: number };
    bodies: RigidBodySet;
    colliders: ColliderSet;
    
    contactsWith(collider: Collider, callback: (collider: Collider) => void): void;
    intersectionsWith(collider: Collider, callback: (collider: Collider) => void): void;
    castRay(
      ray: Ray,
      maxToi: number,
      solid: boolean,
      groups?: InteractionGroups
    ): RayColliderHit | null;
    castRayAndGetNormal(
      ray: Ray,
      maxToi: number,
      solid: boolean,
      groups?: InteractionGroups
    ): RayColliderIntersection | null;
  }
  
  export class RigidBodyDesc {
    static dynamic(): RigidBodyDesc;
    static fixed(): RigidBodyDesc;
    static kinematicPositionBased(): RigidBodyDesc;
    static kinematicVelocityBased(): RigidBodyDesc;
    
    setTranslation(x: number, y: number, z: number): RigidBodyDesc;
    setRotation(quat: { x: number; y: number; z: number; w: number }): RigidBodyDesc;
    setLinvel(x: number, y: number, z: number): RigidBodyDesc;
    setAngvel(vec: { x: number; y: number; z: number }): RigidBodyDesc;
    setGravityScale(scale: number): RigidBodyDesc;
    setLinearDamping(damping: number): RigidBodyDesc;
    setAngularDamping(damping: number): RigidBodyDesc;
    setCanSleep(canSleep: boolean): RigidBodyDesc;
    setCcdEnabled(enabled: boolean): RigidBodyDesc;
    setUserData(data: unknown): RigidBodyDesc;
  }
  
  export class RigidBody {
    handle: number;
    translation(): { x: number; y: number; z: number };
    rotation(): { x: number; y: number; z: number; w: number };
    linvel(): { x: number; y: number; z: number };
    angvel(): { x: number; y: number; z: number };
    setTranslation(translation: { x: number; y: number; z: number }, wakeUp: boolean): void;
    setRotation(rotation: { x: number; y: number; z: number; w: number }, wakeUp: boolean): void;
    setLinvel(linvel: { x: number; y: number; z: number }, wakeUp: boolean): void;
    setAngvel(angvel: { x: number; y: number; z: number }, wakeUp: boolean): void;
    applyImpulse(impulse: { x: number; y: number; z: number }, wakeUp: boolean): void;
    applyTorqueImpulse(torque: { x: number; y: number; z: number }, wakeUp: boolean): void;
    applyImpulseAtPoint(impulse: { x: number; y: number; z: number }, point: { x: number; y: number; z: number }, wakeUp: boolean): void;
    addForce(force: { x: number; y: number; z: number }, wakeUp: boolean): void;
    addTorque(torque: { x: number; y: number; z: number }, wakeUp: boolean): void;
    addForceAtPoint(force: { x: number; y: number; z: number }, point: { x: number; y: number; z: number }, wakeUp: boolean): void;
    resetForces(wakeUp: boolean): void;
    resetTorques(wakeUp: boolean): void;
    mass(): number;
    setAdditionalMass(mass: number): void;
    isSleeping(): boolean;
    wakeUp(): void;
    sleep(): void;
    userData: unknown;
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    bodyType(): number;
    setBodyType(bodyType: number): void;
    lockTranslations(locked: boolean, wakeUp: boolean): void;
    lockRotations(locked: boolean, wakeUp: boolean): void;
    enabledTranslations(): { x: boolean; y: boolean; z: boolean };
    enabledRotations(): { x: boolean; y: boolean; z: boolean };
    setEnabledTranslations(x: boolean, y: boolean, z: boolean, wakeUp: boolean): void;
    setEnabledRotations(x: boolean, y: boolean, z: boolean, wakeUp: boolean): void;
  }
  
  export class ColliderDesc {
    static ball(radius: number): ColliderDesc;
    static cuboid(hx: number, hy: number, hz: number): ColliderDesc;
    static capsule(halfHeight: number, radius: number): ColliderDesc;
    static cylinder(halfHeight: number, radius: number): ColliderDesc;
    static cone(halfHeight: number, radius: number): ColliderDesc;
    static convexHull(vertices: Float32Array): ColliderDesc | null;
    static trimesh(vertices: Float32Array, indices: Uint32Array): ColliderDesc;
    static heightfield(nrows: number, ncols: number, heights: Float32Array, scale: { x: number; y: number; z: number }): ColliderDesc;
    
    setTranslation(x: number, y: number, z: number): ColliderDesc;
    setRotation(quat: { x: number; y: number; z: number; w: number }): ColliderDesc;
    setDensity(density: number): ColliderDesc;
    setMass(mass: number): ColliderDesc;
    setRestitution(restitution: number): ColliderDesc;
    setFriction(friction: number): ColliderDesc;
    setSensor(isSensor: boolean): ColliderDesc;
    setCollisionGroups(groups: number): ColliderDesc;
    setSolverGroups(groups: number): ColliderDesc;
    setActiveEvents(events: number): ColliderDesc;
    setActiveCollisionTypes(types: number): ColliderDesc;
  }
  
  export class Collider {
    handle: number;
    parent(): RigidBody | null;
    translation(): { x: number; y: number; z: number };
    rotation(): { x: number; y: number; z: number; w: number };
    setTranslation(translation: { x: number; y: number; z: number }): void;
    setRotation(rotation: { x: number; y: number; z: number; w: number }): void;
    isSensor(): boolean;
    setSensor(isSensor: boolean): void;
    setRestitution(restitution: number): void;
    setFriction(friction: number): void;
    friction(): number;
    restitution(): number;
    density(): number;
    mass(): number;
    shape: ColliderShape;
    setShape(shape: ColliderShape): void;
    setCollisionGroups(groups: number): void;
    collisionGroups(): number;
    castRay(ray: Ray, maxToi: number, solid: boolean): number | null;
    castRayAndGetNormal(ray: Ray, maxToi: number, solid: boolean): RayIntersection | null;
  }
  
  export interface ColliderShape {
    type: string;
  }
  
  export class Ray {
    constructor(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number });
    origin: { x: number; y: number; z: number };
    dir: { x: number; y: number; z: number };
    pointAt(t: number): { x: number; y: number; z: number };
  }
  
  export interface RayColliderHit {
    collider: Collider;
    toi: number;
  }
  
  export interface RayColliderIntersection {
    collider: Collider;
    toi: number;
    normal: { x: number; y: number; z: number };
  }
  
  export interface RayIntersection {
    toi: number;
    normal: { x: number; y: number; z: number };
  }
  
  export interface InteractionGroups {
    memberships: number;
    filter: number;
  }
  
  export class RigidBodySet {
    len(): number;
    get(handle: number): RigidBody | undefined;
    forEach(callback: (body: RigidBody) => void): void;
  }
  
  export class ColliderSet {
    len(): number;
    get(handle: number): Collider | undefined;
    forEach(callback: (collider: Collider) => void): void;
  }
  
  export class CollisionPipeline {}
  
  export class IntegrationParameters {
    dt: number;
    minCcdDt: number;
    erp: number;
    dampingRatio: number;
    jointErp: number;
    jointDampingRatio: number;
    allowedLinearError: number;
    maxPenetrationCorrection: number;
    predictionDistance: number;
    maxVelocityIterations: number;
    maxVelocityFrictionIterations: number;
    maxStabilizationIterations: number;
    interleaveRestitutionAndFrictionResolution: boolean;
    minIslandSize: number;
    maxCcdSubsteps: number;
  }
  
  // Event types
  export const ActiveEvents: {
    COLLISION_EVENTS: number;
    CONTACT_FORCE_EVENTS: number;
  };
  
  export const ActiveCollisionTypes: {
    DEFAULT: number;
    DYNAMIC_DYNAMIC: number;
    DYNAMIC_KINEMATIC: number;
    DYNAMIC_FIXED: number;
    KINEMATIC_KINEMATIC: number;
    KINEMATIC_FIXED: number;
    FIXED_FIXED: number;
  };
  
  // Collision groups helper
  export function interactionGroups(memberships: number, filter: number): number;
  
  // Body types enum
  export const RigidBodyType: {
    Dynamic: number;
    Fixed: number;
    KinematicPositionBased: number;
    KinematicVelocityBased: number;
  };
}
