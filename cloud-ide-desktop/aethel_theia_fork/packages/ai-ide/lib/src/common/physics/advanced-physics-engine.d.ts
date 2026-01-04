import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * ADVANCED PHYSICS SYSTEM - AAA-LEVEL PHYSICS
 * ============================================================================
 *
 * Extensão do sistema de física para recursos AAA:
 *
 * 1. VEHICLE PHYSICS
 *    - Realistic car physics (suspension, tire friction, engine)
 *    - Motorcycle, boat, aircraft physics
 *    - Tank treads
 *
 * 2. DESTRUCTION SYSTEM
 *    - Voronoi fracture
 *    - Structural integrity
 *    - Debris simulation
 *
 * 3. RAGDOLL PHYSICS
 *    - Configurable ragdolls
 *    - Blending with animations
 *    - Hit reactions
 *
 * 4. CLOTH/ROPE SIMULATION
 *    - Wind interaction
 *    - Collision with environment
 *
 * 5. WATER PHYSICS
 *    - Buoyancy
 *    - Water flow/currents
 *    - Splash effects
 */
export interface VehicleConfig {
    type: 'car' | 'motorcycle' | 'boat' | 'aircraft' | 'tank' | 'hovercraft';
    mass: number;
    centerOfMass: {
        x: number;
        y: number;
        z: number;
    };
    dimensions: {
        width: number;
        height: number;
        length: number;
    };
    engine: EngineConfig;
    wheels?: WheelConfig[];
    suspension?: SuspensionConfig;
    aerodynamics?: AerodynamicsConfig;
    hull?: HullConfig;
}
export interface EngineConfig {
    maxPower: number;
    maxTorque: number;
    powerCurve: {
        rpm: number;
        power: number;
    }[];
    idleRPM: number;
    maxRPM: number;
    redlineRPM: number;
    gearRatios: number[];
    finalDriveRatio: number;
    reverseRatio: number;
    driveType: 'fwd' | 'rwd' | 'awd';
    differentialType: 'open' | 'limited_slip' | 'locked';
}
export interface WheelConfig {
    position: {
        x: number;
        y: number;
        z: number;
    };
    radius: number;
    width: number;
    mass: number;
    tireFriction: TireFriction;
    powered: boolean;
    steered: boolean;
    braked: boolean;
}
export interface TireFriction {
    B: number;
    C: number;
    D: number;
    E: number;
    surfaceGrip: Record<string, number>;
}
export interface SuspensionConfig {
    type: 'spring' | 'double_wishbone' | 'mcpherson' | 'leaf';
    springRate: number;
    damping: number;
    travel: number;
    preload: number;
    antirollBarRate: number;
}
export interface AerodynamicsConfig {
    dragCoefficient: number;
    liftCoefficient: number;
    frontArea: number;
    downforceCoefficient: number;
}
export interface HullConfig {
    buoyancyPoints: {
        x: number;
        y: number;
        z: number;
    }[];
    displacement: number;
    waterDrag: number;
    propellerPosition: {
        x: number;
        y: number;
        z: number;
    };
}
export interface VehicleState {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    angularVelocity: {
        x: number;
        y: number;
        z: number;
    };
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    clutch: number;
    wheelStates: WheelState[];
    lateralG: number;
    longitudinalG: number;
    speedKmh: number;
}
export interface WheelState {
    rotation: number;
    steerAngle: number;
    suspensionCompression: number;
    slipRatio: number;
    slipAngle: number;
    isGrounded: boolean;
    groundSurface: string;
}
export interface DestructibleConfig {
    fractureType: 'voronoi' | 'prefractured' | 'procedural';
    fragmentCount: number;
    minFragmentSize: number;
    maxFragmentSize: number;
    material: DestructibleMaterial;
    structuralIntegrity: boolean;
    supportPoints?: {
        x: number;
        y: number;
        z: number;
    }[];
    debrisLifetime: number;
    debrisCollision: boolean;
}
export interface DestructibleMaterial {
    density: number;
    strength: number;
    toughness: number;
    brittleness: number;
    interiorMaterial: string;
    fracturePattern: 'random' | 'radial' | 'grid' | 'custom';
}
export interface FractureResult {
    fragments: Fragment[];
    breakLocation: {
        x: number;
        y: number;
        z: number;
    };
    breakForce: number;
    impactVelocity: {
        x: number;
        y: number;
        z: number;
    };
}
export interface Fragment {
    id: string;
    mesh: Float32Array;
    mass: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    angularVelocity: {
        x: number;
        y: number;
        z: number;
    };
    isDebris: boolean;
}
export interface RagdollConfig {
    bones: RagdollBone[];
    constraints: RagdollConstraint[];
    blendTime: number;
    partialRagdoll: boolean;
    mass: number;
    drag: number;
    angularDrag: number;
}
export interface RagdollBone {
    name: string;
    parentBone?: string;
    colliderType: 'capsule' | 'box' | 'sphere';
    colliderSize: {
        x: number;
        y: number;
        z: number;
    };
    colliderOffset: {
        x: number;
        y: number;
        z: number;
    };
    mass: number;
    drag: number;
}
export interface RagdollConstraint {
    bone1: string;
    bone2: string;
    type: 'hinge' | 'cone_twist' | 'fixed';
    swingLimit?: number;
    twistLimit?: number;
    hingeLimits?: {
        min: number;
        max: number;
    };
    spring?: {
        stiffness: number;
        damping: number;
    };
}
export interface RagdollState {
    active: boolean;
    blendFactor: number;
    boneTransforms: Map<string, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        rotation: {
            x: number;
            y: number;
            z: number;
            w: number;
        };
    }>;
}
export interface ClothConfig {
    width: number;
    height: number;
    segmentsX: number;
    segmentsY: number;
    mass: number;
    stiffness: number;
    damping: number;
    bendingStiffness: number;
    pinned: {
        x: number;
        y: number;
    }[];
    windInfluence: number;
    collisionMargin: number;
}
export interface ClothState {
    vertices: Float32Array;
    normals: Float32Array;
    velocities: Float32Array;
}
export interface RopeConfig {
    length: number;
    segments: number;
    radius: number;
    mass: number;
    stiffness: number;
    damping: number;
    startAttachment?: {
        body: string;
        offset: {
            x: number;
            y: number;
            z: number;
        };
    };
    endAttachment?: {
        body: string;
        offset: {
            x: number;
            y: number;
            z: number;
        };
    };
}
export interface RopeState {
    points: {
        x: number;
        y: number;
        z: number;
    }[];
    velocities: {
        x: number;
        y: number;
        z: number;
    }[];
    tension: number;
}
export interface WaterConfig {
    bounds: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    waterLevel: number;
    density: number;
    viscosity: number;
    flowDirection?: {
        x: number;
        y: number;
        z: number;
    };
    flowSpeed?: number;
    waveConfig?: {
        amplitude: number;
        frequency: number;
        direction: {
            x: number;
            z: number;
        };
    }[];
}
export interface BuoyancyResult {
    force: {
        x: number;
        y: number;
        z: number;
    };
    torque: {
        x: number;
        y: number;
        z: number;
    };
    submergedVolume: number;
    submergedPercentage: number;
}
export declare class AdvancedPhysicsEngine {
    private vehicles;
    private destructibles;
    private fragments;
    private ragdolls;
    private cloths;
    private ropes;
    private waterVolumes;
    private readonly onCollisionEmitter;
    readonly onCollision: Event<CollisionEvent>;
    private readonly onDestructionEmitter;
    readonly onDestruction: Event<DestructionEvent>;
    private readonly onVehicleEventEmitter;
    readonly onVehicleEvent: Event<VehicleEvent>;
    createVehicle(id: string, config: VehicleConfig): void;
    updateVehicle(id: string, input: VehicleInput, deltaTime: number): VehicleState | undefined;
    getVehicleState(id: string): VehicleState | undefined;
    removeVehicle(id: string): void;
    createDestructible(id: string, config: DestructibleConfig, mesh: Float32Array): void;
    applyDamage(id: string, damage: DamageInfo): FractureResult | undefined;
    updateFragments(deltaTime: number): void;
    createRagdoll(id: string, config: RagdollConfig): void;
    activateRagdoll(id: string, initialPose: Map<string, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        rotation: {
            x: number;
            y: number;
            z: number;
            w: number;
        };
    }>, initialVelocity?: {
        x: number;
        y: number;
        z: number;
    }, impactForce?: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        force: {
            x: number;
            y: number;
            z: number;
        };
        bone: string;
    }): void;
    deactivateRagdoll(id: string): void;
    updateRagdoll(id: string, deltaTime: number): RagdollState | undefined;
    getRagdollState(id: string): RagdollState | undefined;
    createCloth(id: string, config: ClothConfig): void;
    updateCloth(id: string, deltaTime: number, wind?: {
        x: number;
        y: number;
        z: number;
    }): ClothState | undefined;
    getClothState(id: string): ClothState | undefined;
    createRope(id: string, config: RopeConfig): void;
    updateRope(id: string, deltaTime: number): RopeState | undefined;
    getRopeState(id: string): RopeState | undefined;
    createWaterVolume(id: string, config: WaterConfig): void;
    calculateBuoyancy(position: {
        x: number;
        y: number;
        z: number;
    }, volume: number, submergedPoints?: {
        x: number;
        y: number;
        z: number;
    }[]): BuoyancyResult;
    getWaterHeightAt(x: number, z: number): number;
    update(deltaTime: number): void;
    getStatistics(): PhysicsStatistics;
}
export interface VehicleInput {
    throttle: number;
    brake: number;
    steering: number;
    handbrake: boolean;
    gearUp?: boolean;
    gearDown?: boolean;
}
export interface DamageInfo {
    type: 'impact' | 'explosion' | 'projectile' | 'cut';
    amount: number;
    point: {
        x: number;
        y: number;
        z: number;
    };
    direction: {
        x: number;
        y: number;
        z: number;
    };
    radius?: number;
}
export interface CollisionEvent {
    body1: string;
    body2: string;
    point: {
        x: number;
        y: number;
        z: number;
    };
    normal: {
        x: number;
        y: number;
        z: number;
    };
    impulse: number;
}
export interface DestructionEvent {
    objectId: string;
    result: FractureResult;
}
export interface VehicleEvent {
    vehicleId: string;
    type: 'collision' | 'damage' | 'wheel_contact' | 'engine_stall';
    data?: unknown;
}
export interface PhysicsStatistics {
    vehicleCount: number;
    destructibleCount: number;
    fragmentCount: number;
    ragdollCount: number;
    clothCount: number;
    ropeCount: number;
    waterVolumeCount: number;
}
