"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedPhysicsEngine = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// ADVANCED PHYSICS ENGINE
// ============================================================================
let AdvancedPhysicsEngine = class AdvancedPhysicsEngine {
    constructor() {
        // Vehicles
        this.vehicles = new Map();
        // Destruction
        this.destructibles = new Map();
        this.fragments = new Map();
        // Ragdolls
        this.ragdolls = new Map();
        // Soft bodies
        this.cloths = new Map();
        this.ropes = new Map();
        // Water
        this.waterVolumes = new Map();
        // Events
        this.onCollisionEmitter = new common_1.Emitter();
        this.onCollision = this.onCollisionEmitter.event;
        this.onDestructionEmitter = new common_1.Emitter();
        this.onDestruction = this.onDestructionEmitter.event;
        this.onVehicleEventEmitter = new common_1.Emitter();
        this.onVehicleEvent = this.onVehicleEventEmitter.event;
    }
    // ========================================================================
    // VEHICLE PHYSICS
    // ========================================================================
    createVehicle(id, config) {
        const vehicle = new Vehicle(id, config);
        this.vehicles.set(id, vehicle);
    }
    updateVehicle(id, input, deltaTime) {
        const vehicle = this.vehicles.get(id);
        if (!vehicle)
            return undefined;
        return vehicle.update(input, deltaTime);
    }
    getVehicleState(id) {
        return this.vehicles.get(id)?.getState();
    }
    removeVehicle(id) {
        this.vehicles.delete(id);
    }
    // ========================================================================
    // DESTRUCTION SYSTEM
    // ========================================================================
    createDestructible(id, config, mesh) {
        const destructible = new Destructible(id, config, mesh);
        this.destructibles.set(id, destructible);
    }
    applyDamage(id, damage) {
        const destructible = this.destructibles.get(id);
        if (!destructible)
            return undefined;
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
    updateFragments(deltaTime) {
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
    createRagdoll(id, config) {
        const ragdoll = new Ragdoll(id, config);
        this.ragdolls.set(id, ragdoll);
    }
    activateRagdoll(id, initialPose, initialVelocity, impactForce) {
        const ragdoll = this.ragdolls.get(id);
        if (!ragdoll)
            return;
        ragdoll.activate(initialPose, initialVelocity, impactForce);
    }
    deactivateRagdoll(id) {
        const ragdoll = this.ragdolls.get(id);
        if (ragdoll) {
            ragdoll.deactivate();
        }
    }
    updateRagdoll(id, deltaTime) {
        const ragdoll = this.ragdolls.get(id);
        if (!ragdoll)
            return undefined;
        return ragdoll.update(deltaTime);
    }
    getRagdollState(id) {
        return this.ragdolls.get(id)?.getState();
    }
    // ========================================================================
    // CLOTH SIMULATION
    // ========================================================================
    createCloth(id, config) {
        const cloth = new Cloth(id, config);
        this.cloths.set(id, cloth);
    }
    updateCloth(id, deltaTime, wind) {
        const cloth = this.cloths.get(id);
        if (!cloth)
            return undefined;
        return cloth.update(deltaTime, wind);
    }
    getClothState(id) {
        return this.cloths.get(id)?.getState();
    }
    // ========================================================================
    // ROPE SIMULATION
    // ========================================================================
    createRope(id, config) {
        const rope = new Rope(id, config);
        this.ropes.set(id, rope);
    }
    updateRope(id, deltaTime) {
        const rope = this.ropes.get(id);
        if (!rope)
            return undefined;
        return rope.update(deltaTime);
    }
    getRopeState(id) {
        return this.ropes.get(id)?.getState();
    }
    // ========================================================================
    // WATER PHYSICS
    // ========================================================================
    createWaterVolume(id, config) {
        const water = new WaterVolume(id, config);
        this.waterVolumes.set(id, water);
    }
    calculateBuoyancy(position, volume, submergedPoints) {
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
    getWaterHeightAt(x, z) {
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
    update(deltaTime) {
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
    getStatistics() {
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
};
exports.AdvancedPhysicsEngine = AdvancedPhysicsEngine;
exports.AdvancedPhysicsEngine = AdvancedPhysicsEngine = __decorate([
    (0, inversify_1.injectable)()
], AdvancedPhysicsEngine);
// ============================================================================
// INTERNAL CLASSES
// ============================================================================
class Vehicle {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.state = this.createInitialState();
    }
    createInitialState() {
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
    update(input, deltaTime) {
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
    physicsUpdate(deltaTime) {
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
        const speed = Math.sqrt(this.state.velocity.x ** 2 +
            this.state.velocity.y ** 2 +
            this.state.velocity.z ** 2);
        this.state.speedKmh = speed * 3.6;
    }
    updateEngine(deltaTime) {
        const engine = this.config.engine;
        // RPM calculation
        const targetRPM = engine.idleRPM + this.state.throttle * (engine.maxRPM - engine.idleRPM);
        const rpmChange = (targetRPM - this.state.rpm) * deltaTime * 5;
        this.state.rpm = Math.max(engine.idleRPM, Math.min(engine.redlineRPM, this.state.rpm + rpmChange));
        // Auto gear shift
        if (this.state.rpm > engine.redlineRPM * 0.95 && this.state.gear < engine.gearRatios.length) {
            this.state.gear++;
            this.state.rpm *= 0.7;
        }
        else if (this.state.rpm < engine.idleRPM * 1.5 && this.state.gear > 1) {
            this.state.gear--;
            this.state.rpm *= 1.4;
        }
    }
    updateWheels(deltaTime) {
        // Simplified wheel physics
        for (let i = 0; i < this.state.wheelStates.length; i++) {
            const wheelState = this.state.wheelStates[i];
            // Ground check (simplified)
            wheelState.isGrounded = this.state.position.y <= 0.5;
            if (wheelState.isGrounded) {
                wheelState.suspensionCompression = Math.max(0, 0.5 - this.state.position.y);
                // Wheel rotation
                const wheelSpeed = Math.sqrt(this.state.velocity.x ** 2 +
                    this.state.velocity.z ** 2);
                wheelState.rotation += wheelSpeed * deltaTime;
            }
        }
    }
    updateAerodynamics(deltaTime) {
        if (!this.config.aerodynamics)
            return;
        const aero = this.config.aerodynamics;
        const speed = Math.sqrt(this.state.velocity.x ** 2 +
            this.state.velocity.y ** 2 +
            this.state.velocity.z ** 2);
        const airDensity = 1.225;
        const dragForce = 0.5 * airDensity * speed * speed * aero.dragCoefficient * aero.frontArea;
        // Apply drag
        if (speed > 0.1) {
            const dragMultiplier = 1 - (dragForce / this.config.mass) * deltaTime;
            this.state.velocity.x *= dragMultiplier;
            this.state.velocity.z *= dragMultiplier;
        }
    }
    integrate(deltaTime) {
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
    calculateGForces() {
        // Simplified G-force calculation
        this.state.lateralG = 0;
        this.state.longitudinalG = (this.state.throttle - this.state.brake) * 0.5;
    }
    getState() {
        return { ...this.state };
    }
}
class Destructible {
    constructor(id, config, mesh) {
        this.id = id;
        this.config = config;
        this.mesh = mesh;
        this.health = config.material.strength;
    }
    applyDamage(damage) {
        this.health -= damage.amount;
        if (this.health <= 0) {
            return this.fracture(damage);
        }
        return undefined;
    }
    fracture(damage) {
        const fragments = [];
        // Generate fragments using Voronoi
        const numFragments = this.config.fragmentCount;
        for (let i = 0; i < numFragments; i++) {
            const fragment = {
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
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.boneVelocities = new Map();
        this.state = {
            active: false,
            blendFactor: 0,
            boneTransforms: new Map(),
        };
    }
    activate(initialPose, initialVelocity, impactForce) {
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
    deactivate() {
        this.state.active = false;
        this.state.blendFactor = 0;
    }
    update(deltaTime) {
        if (!this.state.active)
            return this.state;
        // Blend in
        if (this.state.blendFactor < 1) {
            this.state.blendFactor = Math.min(1, this.state.blendFactor + deltaTime / this.config.blendTime);
        }
        // Update bone physics
        for (const [boneName, transform] of this.state.boneTransforms) {
            const velocity = this.boneVelocities.get(boneName);
            if (!velocity)
                continue;
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
    applyConstraints() {
        // Apply joint constraints between connected bones
        for (const constraint of this.config.constraints) {
            const bone1 = this.state.boneTransforms.get(constraint.bone1);
            const bone2 = this.state.boneTransforms.get(constraint.bone2);
            if (!bone1 || !bone2)
                continue;
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
    getState() {
        return this.state;
    }
}
class Cloth {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        const numVertices = (config.segmentsX + 1) * (config.segmentsY + 1);
        this.vertices = new Float32Array(numVertices * 3);
        this.velocities = new Float32Array(numVertices * 3);
        this.prevVertices = new Float32Array(numVertices * 3);
        this.initializeVertices();
    }
    initializeVertices() {
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
    update(deltaTime, wind) {
        const { segmentsX, segmentsY, mass, stiffness, damping, windInfluence, pinned } = this.config;
        // Apply forces
        const numVertices = (segmentsX + 1) * (segmentsY + 1);
        for (let i = 0; i < numVertices; i++) {
            const idx = i * 3;
            // Check if pinned
            const x = i % (segmentsX + 1);
            const y = Math.floor(i / (segmentsX + 1));
            const isPinned = pinned.some(p => p.x === x && p.y === y);
            if (isPinned)
                continue;
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
    applyConstraints(stiffness) {
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
    applyDistanceConstraint(i1, i2, restLength, stiffness, pinned, x1, y1, x2, y2) {
        const dx = this.vertices[i2] - this.vertices[i1];
        const dy = this.vertices[i2 + 1] - this.vertices[i1 + 1];
        const dz = this.vertices[i2 + 2] - this.vertices[i1 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist === 0)
            return;
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
        }
        else if (!pin1) {
            this.vertices[i1] += dx * diff;
            this.vertices[i1 + 1] += dy * diff;
            this.vertices[i1 + 2] += dz * diff;
        }
        else if (!pin2) {
            this.vertices[i2] -= dx * diff;
            this.vertices[i2 + 1] -= dy * diff;
            this.vertices[i2 + 2] -= dz * diff;
        }
    }
    getState() {
        return {
            vertices: new Float32Array(this.vertices),
            normals: this.calculateNormals(),
            velocities: new Float32Array(this.velocities),
        };
    }
    calculateNormals() {
        const normals = new Float32Array(this.vertices.length);
        // Simplified - return up vectors
        for (let i = 0; i < normals.length; i += 3) {
            normals[i + 1] = 1;
        }
        return normals;
    }
}
class Rope {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.points = [];
        this.velocities = [];
        this.initializePoints();
    }
    initializePoints() {
        const segmentLength = this.config.length / this.config.segments;
        for (let i = 0; i <= this.config.segments; i++) {
            this.points.push({ x: 0, y: -i * segmentLength, z: 0 });
            this.velocities.push({ x: 0, y: 0, z: 0 });
        }
    }
    update(deltaTime) {
        const { mass, stiffness, damping, segments, length } = this.config;
        const segmentLength = length / segments;
        // Apply forces
        for (let i = 0; i < this.points.length; i++) {
            // Skip attached points
            if (i === 0 && this.config.startAttachment)
                continue;
            if (i === this.points.length - 1 && this.config.endAttachment)
                continue;
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
                if (dist === 0)
                    continue;
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
                }
                else if (!pin1) {
                    p1.x += dx * diff;
                    p1.y += dy * diff;
                    p1.z += dz * diff;
                }
                else if (!pin2) {
                    p2.x -= dx * diff;
                    p2.y -= dy * diff;
                    p2.z -= dz * diff;
                }
            }
        }
        return this.getState();
    }
    getState() {
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
    constructor(id, config) {
        this.id = id;
        this.config = config;
    }
    calculateBuoyancy(position, volume, submergedPoints) {
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
        }
        else {
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
    getHeightAt(x, z) {
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
