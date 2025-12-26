import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

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

// ============================================================================
// VEHICLE PHYSICS
// ============================================================================

export interface VehicleConfig {
    type: 'car' | 'motorcycle' | 'boat' | 'aircraft' | 'tank' | 'hovercraft';
    
    // Mass and dimensions
    mass: number;
    centerOfMass: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; length: number };
    
    // Engine
    engine: EngineConfig;
    
    // Wheels (for ground vehicles)
    wheels?: WheelConfig[];
    
    // Suspension
    suspension?: SuspensionConfig;
    
    // Aerodynamics
    aerodynamics?: AerodynamicsConfig;
    
    // Water (for boats)
    hull?: HullConfig;
}

export interface EngineConfig {
    maxPower: number; // HP
    maxTorque: number; // Nm
    powerCurve: { rpm: number; power: number }[];
    idleRPM: number;
    maxRPM: number;
    redlineRPM: number;
    
    // Transmission
    gearRatios: number[];
    finalDriveRatio: number;
    reverseRatio: number;
    
    driveType: 'fwd' | 'rwd' | 'awd';
    differentialType: 'open' | 'limited_slip' | 'locked';
}

export interface WheelConfig {
    position: { x: number; y: number; z: number };
    radius: number;
    width: number;
    mass: number;
    
    // Tire
    tireFriction: TireFriction;
    
    // Connection
    powered: boolean;
    steered: boolean;
    braked: boolean;
}

export interface TireFriction {
    // Pacejka magic formula coefficients
    B: number; // Stiffness
    C: number; // Shape
    D: number; // Peak
    E: number; // Curvature
    
    // Surface modifiers
    surfaceGrip: Record<string, number>;
}

export interface SuspensionConfig {
    type: 'spring' | 'double_wishbone' | 'mcpherson' | 'leaf';
    springRate: number; // N/m
    damping: number;
    travel: number; // Max suspension travel
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
    buoyancyPoints: { x: number; y: number; z: number }[];
    displacement: number;
    waterDrag: number;
    propellerPosition: { x: number; y: number; z: number };
}

export interface VehicleState {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
    
    // Engine state
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    clutch: number;
    
    // Wheels
    wheelStates: WheelState[];
    
    // Physics
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

// ============================================================================
// DESTRUCTION SYSTEM
// ============================================================================

export interface DestructibleConfig {
    // Fracture settings
    fractureType: 'voronoi' | 'prefractured' | 'procedural';
    fragmentCount: number;
    minFragmentSize: number;
    maxFragmentSize: number;
    
    // Material properties
    material: DestructibleMaterial;
    
    // Structural integrity
    structuralIntegrity: boolean;
    supportPoints?: { x: number; y: number; z: number }[];
    
    // Debris
    debrisLifetime: number;
    debrisCollision: boolean;
}

export interface DestructibleMaterial {
    density: number;
    strength: number;
    toughness: number;
    brittleness: number;
    
    // Fracture appearance
    interiorMaterial: string;
    fracturePattern: 'random' | 'radial' | 'grid' | 'custom';
}

export interface FractureResult {
    fragments: Fragment[];
    breakLocation: { x: number; y: number; z: number };
    breakForce: number;
    impactVelocity: { x: number; y: number; z: number };
}

export interface Fragment {
    id: string;
    mesh: Float32Array; // Vertices
    mass: number;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
    isDebris: boolean;
}

// ============================================================================
// RAGDOLL PHYSICS
// ============================================================================

export interface RagdollConfig {
    bones: RagdollBone[];
    constraints: RagdollConstraint[];
    
    // Blending
    blendTime: number;
    partialRagdoll: boolean;
    
    // Settings
    mass: number;
    drag: number;
    angularDrag: number;
}

export interface RagdollBone {
    name: string;
    parentBone?: string;
    
    // Collider
    colliderType: 'capsule' | 'box' | 'sphere';
    colliderSize: { x: number; y: number; z: number };
    colliderOffset: { x: number; y: number; z: number };
    
    // Physics
    mass: number;
    drag: number;
}

export interface RagdollConstraint {
    bone1: string;
    bone2: string;
    type: 'hinge' | 'cone_twist' | 'fixed';
    
    // Limits
    swingLimit?: number;
    twistLimit?: number;
    hingeLimits?: { min: number; max: number };
    
    // Spring (for muscle simulation)
    spring?: { stiffness: number; damping: number };
}

export interface RagdollState {
    active: boolean;
    blendFactor: number;
    boneTransforms: Map<string, {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number; w: number };
    }>;
}

// ============================================================================
// CLOTH SIMULATION
// ============================================================================

export interface ClothConfig {
    // Mesh
    width: number;
    height: number;
    segmentsX: number;
    segmentsY: number;
    
    // Physics
    mass: number;
    stiffness: number;
    damping: number;
    bendingStiffness: number;
    
    // Constraints
    pinned: { x: number; y: number }[];
    
    // Interaction
    windInfluence: number;
    collisionMargin: number;
}

export interface ClothState {
    vertices: Float32Array;
    normals: Float32Array;
    velocities: Float32Array;
}

// ============================================================================
// ROPE/CABLE SIMULATION
// ============================================================================

export interface RopeConfig {
    length: number;
    segments: number;
    radius: number;
    mass: number;
    stiffness: number;
    damping: number;
    
    // Endpoints
    startAttachment?: { body: string; offset: { x: number; y: number; z: number } };
    endAttachment?: { body: string; offset: { x: number; y: number; z: number } };
}

export interface RopeState {
    points: { x: number; y: number; z: number }[];
    velocities: { x: number; y: number; z: number }[];
    tension: number;
}

// ============================================================================
// WATER PHYSICS
// ============================================================================

export interface WaterConfig {
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
    waterLevel: number;
    density: number;
    viscosity: number;
    
    // Flow
    flowDirection?: { x: number; y: number; z: number };
    flowSpeed?: number;
    
    // Waves
    waveConfig?: {
        amplitude: number;
        frequency: number;
        direction: { x: number; z: number };
    }[];
}

export interface BuoyancyResult {
    force: { x: number; y: number; z: number };
    torque: { x: number; y: number; z: number };
    submergedVolume: number;
    submergedPercentage: number;
}

// ============================================================================
// ADVANCED PHYSICS ENGINE
// ============================================================================

@injectable()
export class AdvancedPhysicsEngine {
    // Vehicles
    private vehicles = new Map<string, Vehicle>();
    
    // Destruction
    private destructibles = new Map<string, Destructible>();
    private fragments = new Map<string, Fragment>();
    
    // Ragdolls
    private ragdolls = new Map<string, Ragdoll>();
    
    // Soft bodies
    private cloths = new Map<string, Cloth>();
    private ropes = new Map<string, Rope>();
    
    // Water
    private waterVolumes = new Map<string, WaterVolume>();
    
    // Events
    private readonly onCollisionEmitter = new Emitter<CollisionEvent>();
    readonly onCollision: Event<CollisionEvent> = this.onCollisionEmitter.event;
    
    private readonly onDestructionEmitter = new Emitter<DestructionEvent>();
    readonly onDestruction: Event<DestructionEvent> = this.onDestructionEmitter.event;
    
    private readonly onVehicleEventEmitter = new Emitter<VehicleEvent>();
    readonly onVehicleEvent: Event<VehicleEvent> = this.onVehicleEventEmitter.event;
    
    // ========================================================================
    // VEHICLE PHYSICS
    // ========================================================================
    
    createVehicle(id: string, config: VehicleConfig): void {
        const vehicle = new Vehicle(id, config);
        this.vehicles.set(id, vehicle);
    }
    
    updateVehicle(id: string, input: VehicleInput, deltaTime: number): VehicleState | undefined {
        const vehicle = this.vehicles.get(id);
        if (!vehicle) return undefined;
        
        return vehicle.update(input, deltaTime);
    }
    
    getVehicleState(id: string): VehicleState | undefined {
        return this.vehicles.get(id)?.getState();
    }
    
    removeVehicle(id: string): void {
        this.vehicles.delete(id);
    }
    
    // ========================================================================
    // DESTRUCTION SYSTEM
    // ========================================================================
    
    createDestructible(id: string, config: DestructibleConfig, mesh: Float32Array): void {
        const destructible = new Destructible(id, config, mesh);
        this.destructibles.set(id, destructible);
    }
    
    applyDamage(id: string, damage: DamageInfo): FractureResult | undefined {
        const destructible = this.destructibles.get(id);
        if (!destructible) return undefined;
        
        const result = destructible.applyDamage(damage);
        
        if (result) {
            // Add fragments to simulation
            for (const fragment of result.fragments) {
                this.fragments.set(fragment.id, fragment);
            }
            
            // Remove original destructible
            this.destructibles.delete(id);
            
            this.onDestructionEmitter.fire({
                objectId: id,
                result,
            });
        }
        
        return result;
    }
    
    updateFragments(deltaTime: number): void {
        for (const [id, fragment] of this.fragments) {
            // Simple physics update
            fragment.velocity.y -= 9.81 * deltaTime;
            fragment.position.x += fragment.velocity.x * deltaTime;
            fragment.position.y += fragment.velocity.y * deltaTime;
            fragment.position.z += fragment.velocity.z * deltaTime;
            
            // Remove if below ground or expired
            if (fragment.position.y < -10) {
                this.fragments.delete(id);
            }
        }
    }
    
    // ========================================================================
    // RAGDOLL PHYSICS
    // ========================================================================
    
    createRagdoll(id: string, config: RagdollConfig): void {
        const ragdoll = new Ragdoll(id, config);
        this.ragdolls.set(id, ragdoll);
    }
    
    activateRagdoll(
        id: string,
        initialPose: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }>,
        initialVelocity?: { x: number; y: number; z: number },
        impactForce?: { position: { x: number; y: number; z: number }; force: { x: number; y: number; z: number }; bone: string }
    ): void {
        const ragdoll = this.ragdolls.get(id);
        if (!ragdoll) return;
        
        ragdoll.activate(initialPose, initialVelocity, impactForce);
    }
    
    deactivateRagdoll(id: string): void {
        const ragdoll = this.ragdolls.get(id);
        if (ragdoll) {
            ragdoll.deactivate();
        }
    }
    
    updateRagdoll(id: string, deltaTime: number): RagdollState | undefined {
        const ragdoll = this.ragdolls.get(id);
        if (!ragdoll) return undefined;
        
        return ragdoll.update(deltaTime);
    }
    
    getRagdollState(id: string): RagdollState | undefined {
        return this.ragdolls.get(id)?.getState();
    }
    
    // ========================================================================
    // CLOTH SIMULATION
    // ========================================================================
    
    createCloth(id: string, config: ClothConfig): void {
        const cloth = new Cloth(id, config);
        this.cloths.set(id, cloth);
    }
    
    updateCloth(id: string, deltaTime: number, wind?: { x: number; y: number; z: number }): ClothState | undefined {
        const cloth = this.cloths.get(id);
        if (!cloth) return undefined;
        
        return cloth.update(deltaTime, wind);
    }
    
    getClothState(id: string): ClothState | undefined {
        return this.cloths.get(id)?.getState();
    }
    
    // ========================================================================
    // ROPE SIMULATION
    // ========================================================================
    
    createRope(id: string, config: RopeConfig): void {
        const rope = new Rope(id, config);
        this.ropes.set(id, rope);
    }
    
    updateRope(id: string, deltaTime: number): RopeState | undefined {
        const rope = this.ropes.get(id);
        if (!rope) return undefined;
        
        return rope.update(deltaTime);
    }
    
    getRopeState(id: string): RopeState | undefined {
        return this.ropes.get(id)?.getState();
    }
    
    // ========================================================================
    // WATER PHYSICS
    // ========================================================================
    
    createWaterVolume(id: string, config: WaterConfig): void {
        const water = new WaterVolume(id, config);
        this.waterVolumes.set(id, water);
    }
    
    calculateBuoyancy(
        position: { x: number; y: number; z: number },
        volume: number,
        submergedPoints?: { x: number; y: number; z: number }[]
    ): BuoyancyResult {
        // Find water volume containing position
        for (const water of this.waterVolumes.values()) {
            const result = water.calculateBuoyancy(position, volume, submergedPoints);
            if (result.submergedVolume > 0) {
                return result;
            }
        }
        
        return {
            force: { x: 0, y: 0, z: 0 },
            torque: { x: 0, y: 0, z: 0 },
            submergedVolume: 0,
            submergedPercentage: 0,
        };
    }
    
    getWaterHeightAt(x: number, z: number): number {
        for (const water of this.waterVolumes.values()) {
            const height = water.getHeightAt(x, z);
            if (height !== undefined) {
                return height;
            }
        }
        return 0;
    }
    
    // ========================================================================
    // MAIN UPDATE
    // ========================================================================
    
    update(deltaTime: number): void {
        // Update vehicles
        for (const vehicle of this.vehicles.values()) {
            vehicle.physicsUpdate(deltaTime);
        }
        
        // Update fragments
        this.updateFragments(deltaTime);
        
        // Update ragdolls
        for (const ragdoll of this.ragdolls.values()) {
            ragdoll.update(deltaTime);
        }
        
        // Update cloths
        for (const cloth of this.cloths.values()) {
            cloth.update(deltaTime);
        }
        
        // Update ropes
        for (const rope of this.ropes.values()) {
            rope.update(deltaTime);
        }
    }
    
    // ========================================================================
    // STATISTICS
    // ========================================================================
    
    getStatistics(): PhysicsStatistics {
        return {
            vehicleCount: this.vehicles.size,
            destructibleCount: this.destructibles.size,
            fragmentCount: this.fragments.size,
            ragdollCount: this.ragdolls.size,
            clothCount: this.cloths.size,
            ropeCount: this.ropes.size,
            waterVolumeCount: this.waterVolumes.size,
        };
    }
}

// ============================================================================
// INTERNAL CLASSES
// ============================================================================

class Vehicle {
    private state: VehicleState;
    
    constructor(
        public readonly id: string,
        private config: VehicleConfig
    ) {
        this.state = this.createInitialState();
    }
    
    private createInitialState(): VehicleState {
        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
            rpm: this.config.engine.idleRPM,
            gear: 1,
            throttle: 0,
            brake: 0,
            clutch: 0,
            wheelStates: this.config.wheels?.map(() => ({
                rotation: 0,
                steerAngle: 0,
                suspensionCompression: 0,
                slipRatio: 0,
                slipAngle: 0,
                isGrounded: false,
                groundSurface: 'asphalt',
            })) || [],
            lateralG: 0,
            longitudinalG: 0,
            speedKmh: 0,
        };
    }
    
    update(input: VehicleInput, deltaTime: number): VehicleState {
        this.state.throttle = input.throttle;
        this.state.brake = input.brake;
        
        // Update steering
        for (const wheelState of this.state.wheelStates) {
            if (this.config.wheels) {
                const wheelConfig = this.config.wheels[this.state.wheelStates.indexOf(wheelState)];
                if (wheelConfig?.steered) {
                    wheelState.steerAngle = input.steering * 35 * Math.PI / 180;
                }
            }
        }
        
        this.physicsUpdate(deltaTime);
        
        return this.state;
    }
    
    physicsUpdate(deltaTime: number): void {
        // Engine simulation
        this.updateEngine(deltaTime);
        
        // Wheel forces
        this.updateWheels(deltaTime);
        
        // Aerodynamics
        this.updateAerodynamics(deltaTime);
        
        // Integration
        this.integrate(deltaTime);
        
        // Calculate G-forces
        this.calculateGForces();
        
        // Speed
        const speed = Math.sqrt(
            this.state.velocity.x ** 2 +
            this.state.velocity.y ** 2 +
            this.state.velocity.z ** 2
        );
        this.state.speedKmh = speed * 3.6;
    }
    
    private updateEngine(deltaTime: number): void {
        const engine = this.config.engine;
        
        // RPM calculation
        const targetRPM = engine.idleRPM + this.state.throttle * (engine.maxRPM - engine.idleRPM);
        const rpmChange = (targetRPM - this.state.rpm) * deltaTime * 5;
        this.state.rpm = Math.max(engine.idleRPM, Math.min(engine.redlineRPM, this.state.rpm + rpmChange));
        
        // Auto gear shift
        if (this.state.rpm > engine.redlineRPM * 0.95 && this.state.gear < engine.gearRatios.length) {
            this.state.gear++;
            this.state.rpm *= 0.7;
        } else if (this.state.rpm < engine.idleRPM * 1.5 && this.state.gear > 1) {
            this.state.gear--;
            this.state.rpm *= 1.4;
        }
    }
    
    private updateWheels(deltaTime: number): void {
        // Simplified wheel physics
        for (let i = 0; i < this.state.wheelStates.length; i++) {
            const wheelState = this.state.wheelStates[i];
            
            // Ground check (simplified)
            wheelState.isGrounded = this.state.position.y <= 0.5;
            
            if (wheelState.isGrounded) {
                wheelState.suspensionCompression = Math.max(0, 0.5 - this.state.position.y);
                
                // Wheel rotation
                const wheelSpeed = Math.sqrt(
                    this.state.velocity.x ** 2 +
                    this.state.velocity.z ** 2
                );
                wheelState.rotation += wheelSpeed * deltaTime;
            }
        }
    }
    
    private updateAerodynamics(deltaTime: number): void {
        if (!this.config.aerodynamics) return;
        
        const aero = this.config.aerodynamics;
        const speed = Math.sqrt(
            this.state.velocity.x ** 2 +
            this.state.velocity.y ** 2 +
            this.state.velocity.z ** 2
        );
        
        const airDensity = 1.225;
        const dragForce = 0.5 * airDensity * speed * speed * aero.dragCoefficient * aero.frontArea;
        
        // Apply drag
        if (speed > 0.1) {
            const dragMultiplier = 1 - (dragForce / this.config.mass) * deltaTime;
            this.state.velocity.x *= dragMultiplier;
            this.state.velocity.z *= dragMultiplier;
        }
    }
    
    private integrate(deltaTime: number): void {
        // Calculate acceleration from inputs
        const acceleration = this.state.throttle * 10 - this.state.brake * 20;
        
        // Simple forward vector
        const forwardX = Math.sin(0);
        const forwardZ = Math.cos(0);
        
        this.state.velocity.x += forwardX * acceleration * deltaTime;
        this.state.velocity.z += forwardZ * acceleration * deltaTime;
        
        // Position integration
        this.state.position.x += this.state.velocity.x * deltaTime;
        this.state.position.y += this.state.velocity.y * deltaTime;
        this.state.position.z += this.state.velocity.z * deltaTime;
        
        // Ground constraint
        if (this.state.position.y < 0) {
            this.state.position.y = 0;
            this.state.velocity.y = 0;
        }
    }
    
    private calculateGForces(): void {
        // Simplified G-force calculation
        this.state.lateralG = 0;
        this.state.longitudinalG = (this.state.throttle - this.state.brake) * 0.5;
    }
    
    getState(): VehicleState {
        return { ...this.state };
    }
}

class Destructible {
    private health: number;
    
    constructor(
        public readonly id: string,
        private config: DestructibleConfig,
        private mesh: Float32Array
    ) {
        this.health = config.material.strength;
    }
    
    applyDamage(damage: DamageInfo): FractureResult | undefined {
        this.health -= damage.amount;
        
        if (this.health <= 0) {
            return this.fracture(damage);
        }
        
        return undefined;
    }
    
    private fracture(damage: DamageInfo): FractureResult {
        const fragments: Fragment[] = [];
        
        // Generate fragments using Voronoi
        const numFragments = this.config.fragmentCount;
        
        for (let i = 0; i < numFragments; i++) {
            const fragment: Fragment = {
                id: `${this.id}_frag_${i}`,
                mesh: new Float32Array(this.mesh.length / numFragments),
                mass: this.config.material.density / numFragments,
                position: {
                    x: damage.point.x + (Math.random() - 0.5) * 2,
                    y: damage.point.y + (Math.random() - 0.5) * 2,
                    z: damage.point.z + (Math.random() - 0.5) * 2,
                },
                velocity: {
                    x: damage.direction.x * damage.amount * 0.1 + (Math.random() - 0.5) * 5,
                    y: damage.direction.y * damage.amount * 0.1 + Math.random() * 5,
                    z: damage.direction.z * damage.amount * 0.1 + (Math.random() - 0.5) * 5,
                },
                angularVelocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10,
                    z: (Math.random() - 0.5) * 10,
                },
                isDebris: true,
            };
            fragments.push(fragment);
        }
        
        return {
            fragments,
            breakLocation: damage.point,
            breakForce: damage.amount,
            impactVelocity: damage.direction,
        };
    }
}

class Ragdoll {
    private state: RagdollState;
    private boneVelocities = new Map<string, { x: number; y: number; z: number }>();
    
    constructor(
        public readonly id: string,
        private config: RagdollConfig
    ) {
        this.state = {
            active: false,
            blendFactor: 0,
            boneTransforms: new Map(),
        };
    }
    
    activate(
        initialPose: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }>,
        initialVelocity?: { x: number; y: number; z: number },
        impactForce?: { position: { x: number; y: number; z: number }; force: { x: number; y: number; z: number }; bone: string }
    ): void {
        this.state.active = true;
        this.state.blendFactor = 0;
        
        // Initialize bone transforms
        for (const [boneName, transform] of initialPose) {
            this.state.boneTransforms.set(boneName, { ...transform });
            
            // Initialize velocities
            const vel = initialVelocity || { x: 0, y: 0, z: 0 };
            
            // Add impact force
            if (impactForce && impactForce.bone === boneName) {
                vel.x += impactForce.force.x;
                vel.y += impactForce.force.y;
                vel.z += impactForce.force.z;
            }
            
            this.boneVelocities.set(boneName, { ...vel });
        }
    }
    
    deactivate(): void {
        this.state.active = false;
        this.state.blendFactor = 0;
    }
    
    update(deltaTime: number): RagdollState {
        if (!this.state.active) return this.state;
        
        // Blend in
        if (this.state.blendFactor < 1) {
            this.state.blendFactor = Math.min(1, this.state.blendFactor + deltaTime / this.config.blendTime);
        }
        
        // Update bone physics
        for (const [boneName, transform] of this.state.boneTransforms) {
            const velocity = this.boneVelocities.get(boneName);
            if (!velocity) continue;
            
            // Gravity
            velocity.y -= 9.81 * deltaTime;
            
            // Drag
            velocity.x *= 1 - this.config.drag * deltaTime;
            velocity.y *= 1 - this.config.drag * deltaTime;
            velocity.z *= 1 - this.config.drag * deltaTime;
            
            // Position integration
            transform.position.x += velocity.x * deltaTime;
            transform.position.y += velocity.y * deltaTime;
            transform.position.z += velocity.z * deltaTime;
            
            // Ground collision
            if (transform.position.y < 0) {
                transform.position.y = 0;
                velocity.y = -velocity.y * 0.3;
            }
        }
        
        // Apply constraints
        this.applyConstraints();
        
        return this.state;
    }
    
    private applyConstraints(): void {
        // Apply joint constraints between connected bones
        for (const constraint of this.config.constraints) {
            const bone1 = this.state.boneTransforms.get(constraint.bone1);
            const bone2 = this.state.boneTransforms.get(constraint.bone2);
            
            if (!bone1 || !bone2) continue;
            
            // Simple distance constraint
            const dx = bone2.position.x - bone1.position.x;
            const dy = bone2.position.y - bone1.position.y;
            const dz = bone2.position.z - bone1.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            const targetDist = 0.3; // Fixed bone length
            if (dist > targetDist) {
                const correction = (dist - targetDist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;
                
                bone1.position.x += nx * correction;
                bone1.position.y += ny * correction;
                bone1.position.z += nz * correction;
                bone2.position.x -= nx * correction;
                bone2.position.y -= ny * correction;
                bone2.position.z -= nz * correction;
            }
        }
    }
    
    getState(): RagdollState {
        return this.state;
    }
}

class Cloth {
    private vertices: Float32Array;
    private velocities: Float32Array;
    private prevVertices: Float32Array;
    
    constructor(
        public readonly id: string,
        private config: ClothConfig
    ) {
        const numVertices = (config.segmentsX + 1) * (config.segmentsY + 1);
        this.vertices = new Float32Array(numVertices * 3);
        this.velocities = new Float32Array(numVertices * 3);
        this.prevVertices = new Float32Array(numVertices * 3);
        
        this.initializeVertices();
    }
    
    private initializeVertices(): void {
        const { segmentsX, segmentsY, width, height } = this.config;
        
        for (let y = 0; y <= segmentsY; y++) {
            for (let x = 0; x <= segmentsX; x++) {
                const i = (y * (segmentsX + 1) + x) * 3;
                this.vertices[i] = (x / segmentsX - 0.5) * width;
                this.vertices[i + 1] = 0;
                this.vertices[i + 2] = (y / segmentsY - 0.5) * height;
                
                this.prevVertices[i] = this.vertices[i];
                this.prevVertices[i + 1] = this.vertices[i + 1];
                this.prevVertices[i + 2] = this.vertices[i + 2];
            }
        }
    }
    
    update(deltaTime: number, wind?: { x: number; y: number; z: number }): ClothState {
        const { segmentsX, segmentsY, mass, stiffness, damping, windInfluence, pinned } = this.config;
        
        // Apply forces
        const numVertices = (segmentsX + 1) * (segmentsY + 1);
        
        for (let i = 0; i < numVertices; i++) {
            const idx = i * 3;
            
            // Check if pinned
            const x = i % (segmentsX + 1);
            const y = Math.floor(i / (segmentsX + 1));
            const isPinned = pinned.some(p => p.x === x && p.y === y);
            
            if (isPinned) continue;
            
            // Verlet integration
            const vx = this.vertices[idx] - this.prevVertices[idx];
            const vy = this.vertices[idx + 1] - this.prevVertices[idx + 1];
            const vz = this.vertices[idx + 2] - this.prevVertices[idx + 2];
            
            this.prevVertices[idx] = this.vertices[idx];
            this.prevVertices[idx + 1] = this.vertices[idx + 1];
            this.prevVertices[idx + 2] = this.vertices[idx + 2];
            
            // Gravity
            const ay = -9.81 / mass;
            
            // Wind
            let wx = 0, wy = 0, wz = 0;
            if (wind) {
                wx = wind.x * windInfluence;
                wy = wind.y * windInfluence;
                wz = wind.z * windInfluence;
            }
            
            // Update position
            this.vertices[idx] += vx * (1 - damping) + wx * deltaTime;
            this.vertices[idx + 1] += vy * (1 - damping) + ay * deltaTime * deltaTime;
            this.vertices[idx + 2] += vz * (1 - damping) + wz * deltaTime;
        }
        
        // Apply distance constraints
        this.applyConstraints(stiffness);
        
        return this.getState();
    }
    
    private applyConstraints(stiffness: number): void {
        const { segmentsX, segmentsY, width, height, pinned } = this.config;
        const restLengthX = width / segmentsX;
        const restLengthY = height / segmentsY;
        
        // Horizontal constraints
        for (let y = 0; y <= segmentsY; y++) {
            for (let x = 0; x < segmentsX; x++) {
                const i1 = (y * (segmentsX + 1) + x) * 3;
                const i2 = (y * (segmentsX + 1) + x + 1) * 3;
                this.applyDistanceConstraint(i1, i2, restLengthX, stiffness, pinned, x, y, x + 1, y);
            }
        }
        
        // Vertical constraints
        for (let y = 0; y < segmentsY; y++) {
            for (let x = 0; x <= segmentsX; x++) {
                const i1 = (y * (segmentsX + 1) + x) * 3;
                const i2 = ((y + 1) * (segmentsX + 1) + x) * 3;
                this.applyDistanceConstraint(i1, i2, restLengthY, stiffness, pinned, x, y, x, y + 1);
            }
        }
    }
    
    private applyDistanceConstraint(
        i1: number,
        i2: number,
        restLength: number,
        stiffness: number,
        pinned: { x: number; y: number }[],
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): void {
        const dx = this.vertices[i2] - this.vertices[i1];
        const dy = this.vertices[i2 + 1] - this.vertices[i1 + 1];
        const dz = this.vertices[i2 + 2] - this.vertices[i1 + 2];
        
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist === 0) return;
        
        const diff = (dist - restLength) / dist * stiffness;
        
        const pin1 = pinned.some(p => p.x === x1 && p.y === y1);
        const pin2 = pinned.some(p => p.x === x2 && p.y === y2);
        
        if (!pin1 && !pin2) {
            this.vertices[i1] += dx * diff * 0.5;
            this.vertices[i1 + 1] += dy * diff * 0.5;
            this.vertices[i1 + 2] += dz * diff * 0.5;
            this.vertices[i2] -= dx * diff * 0.5;
            this.vertices[i2 + 1] -= dy * diff * 0.5;
            this.vertices[i2 + 2] -= dz * diff * 0.5;
        } else if (!pin1) {
            this.vertices[i1] += dx * diff;
            this.vertices[i1 + 1] += dy * diff;
            this.vertices[i1 + 2] += dz * diff;
        } else if (!pin2) {
            this.vertices[i2] -= dx * diff;
            this.vertices[i2 + 1] -= dy * diff;
            this.vertices[i2 + 2] -= dz * diff;
        }
    }
    
    getState(): ClothState {
        return {
            vertices: new Float32Array(this.vertices),
            normals: this.calculateNormals(),
            velocities: new Float32Array(this.velocities),
        };
    }
    
    private calculateNormals(): Float32Array {
        const normals = new Float32Array(this.vertices.length);
        // Simplified - return up vectors
        for (let i = 0; i < normals.length; i += 3) {
            normals[i + 1] = 1;
        }
        return normals;
    }
}

class Rope {
    private points: { x: number; y: number; z: number }[];
    private velocities: { x: number; y: number; z: number }[];
    
    constructor(
        public readonly id: string,
        private config: RopeConfig
    ) {
        this.points = [];
        this.velocities = [];
        this.initializePoints();
    }
    
    private initializePoints(): void {
        const segmentLength = this.config.length / this.config.segments;
        
        for (let i = 0; i <= this.config.segments; i++) {
            this.points.push({ x: 0, y: -i * segmentLength, z: 0 });
            this.velocities.push({ x: 0, y: 0, z: 0 });
        }
    }
    
    update(deltaTime: number): RopeState {
        const { mass, stiffness, damping, segments, length } = this.config;
        const segmentLength = length / segments;
        
        // Apply forces
        for (let i = 0; i < this.points.length; i++) {
            // Skip attached points
            if (i === 0 && this.config.startAttachment) continue;
            if (i === this.points.length - 1 && this.config.endAttachment) continue;
            
            // Gravity
            this.velocities[i].y -= 9.81 * deltaTime;
            
            // Damping
            this.velocities[i].x *= 1 - damping * deltaTime;
            this.velocities[i].y *= 1 - damping * deltaTime;
            this.velocities[i].z *= 1 - damping * deltaTime;
            
            // Position update
            this.points[i].x += this.velocities[i].x * deltaTime;
            this.points[i].y += this.velocities[i].y * deltaTime;
            this.points[i].z += this.velocities[i].z * deltaTime;
        }
        
        // Constraint iterations
        for (let iter = 0; iter < 5; iter++) {
            for (let i = 0; i < this.points.length - 1; i++) {
                const p1 = this.points[i];
                const p2 = this.points[i + 1];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (dist === 0) continue;
                
                const diff = (dist - segmentLength) / dist * stiffness;
                
                const pin1 = i === 0 && this.config.startAttachment;
                const pin2 = i === this.points.length - 2 && this.config.endAttachment;
                
                if (!pin1 && !pin2) {
                    p1.x += dx * diff * 0.5;
                    p1.y += dy * diff * 0.5;
                    p1.z += dz * diff * 0.5;
                    p2.x -= dx * diff * 0.5;
                    p2.y -= dy * diff * 0.5;
                    p2.z -= dz * diff * 0.5;
                } else if (!pin1) {
                    p1.x += dx * diff;
                    p1.y += dy * diff;
                    p1.z += dz * diff;
                } else if (!pin2) {
                    p2.x -= dx * diff;
                    p2.y -= dy * diff;
                    p2.z -= dz * diff;
                }
            }
        }
        
        return this.getState();
    }
    
    getState(): RopeState {
        // Calculate tension
        let totalTension = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            totalTension += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        
        return {
            points: this.points.map(p => ({ ...p })),
            velocities: this.velocities.map(v => ({ ...v })),
            tension: totalTension,
        };
    }
}

class WaterVolume {
    constructor(
        public readonly id: string,
        private config: WaterConfig
    ) {}
    
    calculateBuoyancy(
        position: { x: number; y: number; z: number },
        volume: number,
        submergedPoints?: { x: number; y: number; z: number }[]
    ): BuoyancyResult {
        const waterHeight = this.getHeightAt(position.x, position.z);
        if (waterHeight === undefined) {
            return { force: { x: 0, y: 0, z: 0 }, torque: { x: 0, y: 0, z: 0 }, submergedVolume: 0, submergedPercentage: 0 };
        }
        
        // Calculate submerged volume
        let submergedPercentage = 0;
        if (submergedPoints && submergedPoints.length > 0) {
            let submergedCount = 0;
            for (const point of submergedPoints) {
                if (point.y < waterHeight) {
                    submergedCount++;
                }
            }
            submergedPercentage = submergedCount / submergedPoints.length;
        } else {
            submergedPercentage = Math.max(0, Math.min(1, (waterHeight - position.y + 1) / 2));
        }
        
        const submergedVolume = volume * submergedPercentage;
        
        // Buoyancy force (Archimedes)
        const buoyancyForce = this.config.density * submergedVolume * 9.81;
        
        // Flow force
        let flowX = 0, flowZ = 0;
        if (this.config.flowDirection && this.config.flowSpeed && submergedPercentage > 0) {
            flowX = this.config.flowDirection.x * this.config.flowSpeed * submergedPercentage;
            flowZ = this.config.flowDirection.z * this.config.flowSpeed * submergedPercentage;
        }
        
        return {
            force: { x: flowX, y: buoyancyForce, z: flowZ },
            torque: { x: 0, y: 0, z: 0 },
            submergedVolume,
            submergedPercentage,
        };
    }
    
    getHeightAt(x: number, z: number): number | undefined {
        const { bounds, waterLevel, waveConfig } = this.config;
        
        // Check if point is in bounds
        if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) {
            return undefined;
        }
        
        let height = waterLevel;
        
        // Add waves
        if (waveConfig) {
            const time = Date.now() / 1000;
            for (const wave of waveConfig) {
                const phase = wave.direction.x * x + wave.direction.z * z;
                height += Math.sin(phase * wave.frequency + time) * wave.amplitude;
            }
        }
        
        return height;
    }
}

// ============================================================================
// TYPES
// ============================================================================

export interface VehicleInput {
    throttle: number; // 0-1
    brake: number; // 0-1
    steering: number; // -1 to 1
    handbrake: boolean;
    gearUp?: boolean;
    gearDown?: boolean;
}

export interface DamageInfo {
    type: 'impact' | 'explosion' | 'projectile' | 'cut';
    amount: number;
    point: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
    radius?: number;
}

export interface CollisionEvent {
    body1: string;
    body2: string;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
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
