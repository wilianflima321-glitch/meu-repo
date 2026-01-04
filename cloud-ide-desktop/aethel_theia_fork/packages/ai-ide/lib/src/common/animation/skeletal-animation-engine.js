"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkeletalAnimationEngine = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// SKELETAL ANIMATION ENGINE
// ============================================================================
let SkeletalAnimationEngine = class SkeletalAnimationEngine {
    constructor() {
        this.skeletons = new Map();
        this.meshes = new Map();
        this.clips = new Map();
        this.stateMachines = new Map();
        this.blendSpaces1D = new Map();
        this.blendSpaces2D = new Map();
        this.motionDatabases = new Map();
        this.instances = new Map();
        this.montages = new Map();
        this.poseAssets = new Map();
        // Events
        this.onAnimationEventEmitter = new common_1.Emitter();
        this.onStateChangedEmitter = new common_1.Emitter();
        this.onMontageEndedEmitter = new common_1.Emitter();
        this.onAnimationEvent = this.onAnimationEventEmitter.event;
        this.onStateChanged = this.onStateChangedEmitter.event;
        this.onMontageEnded = this.onMontageEndedEmitter.event;
    }
    // ========================================================================
    // SKELETON MANAGEMENT
    // ========================================================================
    createSkeleton(config) {
        const boneNameToIndex = new Map();
        config.bones.forEach((bone, index) => {
            boneNameToIndex.set(bone.name, index);
        });
        const skeleton = {
            ...config,
            boneNameToIndex,
        };
        this.skeletons.set(skeleton.id, skeleton);
        return skeleton;
    }
    getSkeleton(id) {
        return this.skeletons.get(id);
    }
    // ========================================================================
    // SKELETAL MESH MANAGEMENT
    // ========================================================================
    createSkeletalMesh(config) {
        this.meshes.set(config.id, config);
        return config;
    }
    getSkeletalMesh(id) {
        return this.meshes.get(id);
    }
    // ========================================================================
    // ANIMATION CLIP MANAGEMENT
    // ========================================================================
    createAnimationClip(config) {
        this.clips.set(config.id, config);
        return config;
    }
    getAnimationClip(id) {
        return this.clips.get(id);
    }
    /**
     * Compress animation using curve reduction
     */
    compressAnimation(clipId, errorThreshold = 0.01) {
        const clip = this.clips.get(clipId);
        if (!clip)
            return;
        let totalOriginalKeys = 0;
        let totalCompressedKeys = 0;
        for (const track of clip.tracks) {
            totalOriginalKeys += track.positionKeys.length + track.rotationKeys.length + track.scaleKeys.length;
            // Compress position keys
            track.positionKeys = this.compressKeyframes(track.positionKeys, errorThreshold);
            // Compress rotation keys
            track.rotationKeys = this.compressQuaternionKeyframes(track.rotationKeys, errorThreshold);
            // Compress scale keys
            track.scaleKeys = this.compressKeyframes(track.scaleKeys, errorThreshold);
            totalCompressedKeys += track.positionKeys.length + track.rotationKeys.length + track.scaleKeys.length;
        }
        clip.compressed = true;
        clip.compressionRatio = totalCompressedKeys / totalOriginalKeys;
    }
    compressKeyframes(keys, threshold) {
        if (keys.length <= 2)
            return keys;
        const result = [keys[0]];
        for (let i = 1; i < keys.length - 1; i++) {
            const prev = result[result.length - 1];
            const curr = keys[i];
            const next = keys[i + 1];
            // Calculate interpolated value at curr.time
            const t = (curr.time - prev.time) / (next.time - prev.time);
            const interpolated = this.lerpVec3(prev.value, next.value, t);
            // Check if error exceeds threshold
            const error = this.vec3Distance(interpolated, curr.value);
            if (error > threshold) {
                result.push(curr);
            }
        }
        result.push(keys[keys.length - 1]);
        return result;
    }
    compressQuaternionKeyframes(keys, threshold) {
        if (keys.length <= 2)
            return keys;
        const result = [keys[0]];
        for (let i = 1; i < keys.length - 1; i++) {
            const prev = result[result.length - 1];
            const curr = keys[i];
            const next = keys[i + 1];
            const t = (curr.time - prev.time) / (next.time - prev.time);
            const interpolated = this.slerpQuat(prev.value, next.value, t);
            const error = this.quatDistance(interpolated, curr.value);
            if (error > threshold) {
                result.push(curr);
            }
        }
        result.push(keys[keys.length - 1]);
        return result;
    }
    // ========================================================================
    // STATE MACHINE MANAGEMENT
    // ========================================================================
    createStateMachine(config) {
        this.stateMachines.set(config.id, config);
        return config;
    }
    getStateMachine(id) {
        return this.stateMachines.get(id);
    }
    // ========================================================================
    // BLEND SPACE MANAGEMENT
    // ========================================================================
    createBlendSpace1D(config) {
        // Sort samples by position
        config.samples.sort((a, b) => a.position - b.position);
        this.blendSpaces1D.set(config.id, config);
        return config;
    }
    createBlendSpace2D(config) {
        // Generate Delaunay triangulation
        const triangulation = this.generateDelaunayTriangulation(config.samples);
        const blendSpace = {
            ...config,
            triangulation,
        };
        this.blendSpaces2D.set(blendSpace.id, blendSpace);
        return blendSpace;
    }
    generateDelaunayTriangulation(samples) {
        // Simple implementation - in production use proper library
        if (samples.length < 3)
            return [];
        const triangles = [];
        const n = samples.length;
        // Simple ear clipping for now
        for (let i = 0; i < n - 2; i++) {
            triangles.push([i, i + 1, i + 2]);
        }
        return triangles;
    }
    // ========================================================================
    // MOTION MATCHING
    // ========================================================================
    createMotionMatchingDatabase(config) {
        // Build KD-tree for fast feature search
        const kdTree = this.buildKDTree(config.features, 0);
        const database = {
            ...config,
            kdTree,
        };
        this.motionDatabases.set(database.id, database);
        return database;
    }
    buildKDTree(features, depth) {
        if (features.length === 0)
            return undefined;
        if (features.length === 1) {
            return { feature: features[0], splitAxis: depth % 6 };
        }
        const axis = depth % 6; // 6 dimensions for trajectory + pose
        features.sort((a, b) => this.getFeatureDimension(a, axis) - this.getFeatureDimension(b, axis));
        const mid = Math.floor(features.length / 2);
        return {
            feature: features[mid],
            splitAxis: axis,
            left: this.buildKDTree(features.slice(0, mid), depth + 1),
            right: this.buildKDTree(features.slice(mid + 1), depth + 1),
        };
    }
    getFeatureDimension(feature, dim) {
        switch (dim) {
            case 0: return feature.trajectoryPositions[0]?.x || 0;
            case 1: return feature.trajectoryPositions[0]?.y || 0;
            case 2: return feature.trajectoryPositions[0]?.z || 0;
            case 3: return feature.leftFootPosition.x;
            case 4: return feature.leftFootPosition.y;
            case 5: return feature.leftFootPosition.z;
            default: return 0;
        }
    }
    findBestMotionMatch(databaseId, query) {
        const database = this.motionDatabases.get(databaseId);
        if (!database || !database.kdTree)
            return null;
        let bestMatch = null;
        let bestCost = Infinity;
        // KNN search in KD-tree
        this.searchKDTree(database.kdTree, query, (feature) => {
            const cost = this.calculateMotionCost(feature, query);
            if (cost < bestCost) {
                bestCost = cost;
                bestMatch = feature;
            }
        });
        return bestMatch;
    }
    searchKDTree(node, query, callback) {
        if (!node)
            return;
        callback(node.feature);
        // Simple full search for now - optimize with proper KNN
        this.searchKDTree(node.left, query, callback);
        this.searchKDTree(node.right, query, callback);
    }
    calculateMotionCost(feature, query) {
        let cost = 0;
        // Trajectory cost
        for (let i = 0; i < Math.min(feature.trajectoryPositions.length, query.desiredTrajectory.length); i++) {
            cost += this.vec3Distance(feature.trajectoryPositions[i], query.desiredTrajectory[i]) * query.weights.trajectoryPosition;
            cost += this.vec3Distance(feature.trajectoryFacings[i], query.desiredFacings[i]) * query.weights.trajectoryFacing;
        }
        // Foot position cost
        const currentLeftFoot = query.currentPose.boneTransforms[0]?.position || { x: 0, y: 0, z: 0 };
        const currentRightFoot = query.currentPose.boneTransforms[1]?.position || { x: 0, y: 0, z: 0 };
        cost += this.vec3Distance(feature.leftFootPosition, currentLeftFoot) * query.weights.footPosition;
        cost += this.vec3Distance(feature.rightFootPosition, currentRightFoot) * query.weights.footPosition;
        return cost;
    }
    // ========================================================================
    // ANIMATION INSTANCE MANAGEMENT
    // ========================================================================
    createInstance(meshId, stateMachineId) {
        const mesh = this.meshes.get(meshId);
        const stateMachine = this.stateMachines.get(stateMachineId);
        if (!mesh || !stateMachine)
            return null;
        const instance = {
            id: this.generateId(),
            mesh,
            stateMachine,
            currentPose: this.getReferencePose(mesh.skeleton),
            variables: new Map(),
            currentStateId: stateMachine.defaultStateId,
            stateTime: 0,
            motionMatchingEnabled: false,
            ikChains: [],
            ikTargets: [],
            footIK: {
                enabled: false,
                raycastDistance: 1,
                footOffset: 0,
                interpolationSpeed: 10,
                pelvisAdjustment: true,
                maxPelvisOffset: 0.3,
            },
            lookAtIK: {
                enabled: false,
                targetBone: -1,
                headBone: -1,
                neckBone: -1,
                spineBones: [],
                horizontalLimit: 70,
                verticalLimit: 45,
                interpolationSpeed: 5,
            },
            activeMontages: [],
            layers: [{ name: 'Base', weight: 1, blendMode: 'override' }],
        };
        // Initialize variables
        for (const variable of stateMachine.variables) {
            instance.variables.set(variable.name, variable.defaultValue);
        }
        this.instances.set(instance.id, instance);
        return instance;
    }
    getInstance(id) {
        return this.instances.get(id);
    }
    getReferencePose(skeleton) {
        return {
            boneTransforms: skeleton.bones.map(bone => ({ ...bone.localTransform })),
            rootTransform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
            },
            timestamp: 0,
        };
    }
    // ========================================================================
    // UPDATE LOOP
    // ========================================================================
    /**
     * Update all animation instances
     */
    update(deltaTime) {
        for (const instance of this.instances.values()) {
            this.updateInstance(instance, deltaTime);
        }
    }
    /**
     * Update single animation instance
     */
    updateInstance(instance, deltaTime) {
        // 1. Update state machine
        this.updateStateMachine(instance, deltaTime);
        // 2. Sample current animation pose
        let pose = this.sampleCurrentState(instance);
        // 3. Apply active montages
        pose = this.applyMontages(instance, pose, deltaTime);
        // 4. Apply IK
        pose = this.applyIK(instance, pose);
        // 5. Apply root motion
        this.applyRootMotion(instance, pose);
        // 6. Store final pose
        instance.currentPose = pose;
    }
    updateStateMachine(instance, deltaTime) {
        instance.stateTime += deltaTime;
        // Handle active transition
        if (instance.transitionInfo) {
            instance.transitionInfo.progress += deltaTime / instance.transitionInfo.duration;
            if (instance.transitionInfo.progress >= 1) {
                // Transition complete
                const fromState = instance.currentStateId;
                instance.currentStateId = instance.transitionInfo.toStateId;
                instance.stateTime = 0;
                instance.transitionInfo = undefined;
                this.onStateChangedEmitter.fire({
                    instanceId: instance.id,
                    fromState,
                    toState: instance.currentStateId,
                });
            }
        }
        else {
            // Check for transitions
            const currentState = instance.stateMachine.states.find(s => s.id === instance.currentStateId);
            if (!currentState)
                return;
            const validTransitions = instance.stateMachine.transitions
                .filter(t => t.fromStateId === instance.currentStateId)
                .filter(t => this.evaluateTransitionConditions(instance, t))
                .sort((a, b) => b.priority - a.priority);
            if (validTransitions.length > 0) {
                const transition = validTransitions[0];
                instance.transitionInfo = {
                    toStateId: transition.toStateId,
                    progress: 0,
                    duration: transition.duration,
                    blendMode: transition.blendMode,
                    fromPose: { ...instance.currentPose },
                };
            }
        }
        // Reset triggers
        for (const variable of instance.stateMachine.variables) {
            if (variable.type === 'trigger') {
                instance.variables.set(variable.name, false);
            }
        }
    }
    evaluateTransitionConditions(instance, transition) {
        for (const condition of transition.conditions) {
            const value = instance.variables.get(condition.variableName);
            switch (condition.type) {
                case 'bool':
                    if (value !== condition.value)
                        return false;
                    break;
                case 'trigger':
                    if (value !== true)
                        return false;
                    break;
                case 'float_greater':
                    if (typeof value !== 'number' || value <= (condition.compareValue || 0))
                        return false;
                    break;
                case 'float_less':
                    if (typeof value !== 'number' || value >= (condition.compareValue || 0))
                        return false;
                    break;
                case 'float_equals':
                    if (typeof value !== 'number' || Math.abs(value - (condition.compareValue || 0)) > 0.001)
                        return false;
                    break;
                case 'time_remaining':
                    // Check if remaining time in animation is less than value
                    // Would need animation duration here
                    break;
            }
        }
        return true;
    }
    sampleCurrentState(instance) {
        const state = instance.stateMachine.states.find(s => s.id === instance.currentStateId);
        if (!state)
            return instance.currentPose;
        let currentPose;
        switch (state.type) {
            case 'single':
                if (state.animation) {
                    currentPose = this.sampleAnimation(state.animation, instance.stateTime, instance.mesh.skeleton);
                }
                else {
                    currentPose = instance.currentPose;
                }
                break;
            case 'blendspace1d':
                if (state.blendSpace1D) {
                    const param = instance.variables.get(state.blendSpace1D.axisName) || 0;
                    currentPose = this.sampleBlendSpace1D(state.blendSpace1D, param, instance.stateTime, instance.mesh.skeleton);
                }
                else {
                    currentPose = instance.currentPose;
                }
                break;
            case 'blendspace2d':
                if (state.blendSpace2D) {
                    const paramX = instance.variables.get(state.blendSpace2D.axisXName) || 0;
                    const paramY = instance.variables.get(state.blendSpace2D.axisYName) || 0;
                    currentPose = this.sampleBlendSpace2D(state.blendSpace2D, paramX, paramY, instance.stateTime, instance.mesh.skeleton);
                }
                else {
                    currentPose = instance.currentPose;
                }
                break;
            default:
                currentPose = instance.currentPose;
        }
        // Blend with transition
        if (instance.transitionInfo) {
            const weight = this.getTransitionBlendWeight(instance.transitionInfo);
            currentPose = this.blendPoses(instance.transitionInfo.fromPose, currentPose, weight);
        }
        return currentPose;
    }
    getTransitionBlendWeight(transition) {
        const t = Math.min(1, Math.max(0, transition.progress));
        switch (transition.blendMode) {
            case 'linear':
                return t;
            case 'cubic':
                return t * t * (3 - 2 * t); // Smoothstep
            case 'inertialization':
                // Inertialization blend curve
                return 1 - Math.pow(1 - t, 3);
            default:
                return t;
        }
    }
    // ========================================================================
    // ANIMATION SAMPLING
    // ========================================================================
    sampleAnimation(clip, time, skeleton) {
        let normalizedTime = time * clip.frameRate;
        if (clip.looping) {
            normalizedTime = normalizedTime % clip.duration;
        }
        else {
            normalizedTime = Math.min(normalizedTime, clip.duration);
        }
        const pose = {
            boneTransforms: [],
            rootTransform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
            },
            timestamp: time,
        };
        // Sample each bone track
        for (let boneIndex = 0; boneIndex < skeleton.bones.length; boneIndex++) {
            const track = clip.tracks.find(t => t.boneIndex === boneIndex);
            if (track) {
                pose.boneTransforms[boneIndex] = {
                    position: this.sampleVec3Track(track.positionKeys, normalizedTime),
                    rotation: this.sampleQuatTrack(track.rotationKeys, normalizedTime),
                    scale: this.sampleVec3Track(track.scaleKeys, normalizedTime),
                };
            }
            else {
                pose.boneTransforms[boneIndex] = { ...skeleton.bones[boneIndex].localTransform };
            }
        }
        // Sample root motion
        if (clip.rootMotionTrack) {
            pose.rootTransform = {
                position: this.sampleVec3Track(clip.rootMotionTrack.positionKeys, normalizedTime),
                rotation: this.sampleQuatTrack(clip.rootMotionTrack.rotationKeys, normalizedTime),
                scale: { x: 1, y: 1, z: 1 },
            };
        }
        // Fire animation events
        for (const event of clip.events) {
            // Would need to track which events have been fired
        }
        return pose;
    }
    sampleVec3Track(keys, time) {
        if (keys.length === 0)
            return { x: 0, y: 0, z: 0 };
        if (keys.length === 1)
            return { ...keys[0].value };
        // Find surrounding keys
        let i = 0;
        while (i < keys.length - 1 && keys[i + 1].time < time) {
            i++;
        }
        if (i >= keys.length - 1)
            return { ...keys[keys.length - 1].value };
        const key1 = keys[i];
        const key2 = keys[i + 1];
        const t = (time - key1.time) / (key2.time - key1.time);
        if (key1.interpolation === 'step') {
            return { ...key1.value };
        }
        return this.lerpVec3(key1.value, key2.value, t);
    }
    sampleQuatTrack(keys, time) {
        if (keys.length === 0)
            return { x: 0, y: 0, z: 0, w: 1 };
        if (keys.length === 1)
            return { ...keys[0].value };
        let i = 0;
        while (i < keys.length - 1 && keys[i + 1].time < time) {
            i++;
        }
        if (i >= keys.length - 1)
            return { ...keys[keys.length - 1].value };
        const key1 = keys[i];
        const key2 = keys[i + 1];
        const t = (time - key1.time) / (key2.time - key1.time);
        if (key1.interpolation === 'step') {
            return { ...key1.value };
        }
        return this.slerpQuat(key1.value, key2.value, t);
    }
    // ========================================================================
    // BLEND SPACE SAMPLING
    // ========================================================================
    sampleBlendSpace1D(blendSpace, parameter, time, skeleton) {
        const clampedParam = Math.max(blendSpace.min, Math.min(blendSpace.max, parameter));
        // Find surrounding samples
        let lowerIndex = 0;
        for (let i = 0; i < blendSpace.samples.length - 1; i++) {
            if (blendSpace.samples[i + 1].position > clampedParam) {
                lowerIndex = i;
                break;
            }
            lowerIndex = i;
        }
        const upperIndex = Math.min(lowerIndex + 1, blendSpace.samples.length - 1);
        if (lowerIndex === upperIndex) {
            return this.sampleAnimation(blendSpace.samples[lowerIndex].animation, time, skeleton);
        }
        const lower = blendSpace.samples[lowerIndex];
        const upper = blendSpace.samples[upperIndex];
        const t = (clampedParam - lower.position) / (upper.position - lower.position);
        const pose1 = this.sampleAnimation(lower.animation, time, skeleton);
        const pose2 = this.sampleAnimation(upper.animation, time, skeleton);
        return this.blendPoses(pose1, pose2, t);
    }
    sampleBlendSpace2D(blendSpace, paramX, paramY, time, skeleton) {
        // Find containing triangle
        const point = { x: paramX, y: paramY };
        for (const triangle of blendSpace.triangulation) {
            const p0 = blendSpace.samples[triangle[0]].position;
            const p1 = blendSpace.samples[triangle[1]].position;
            const p2 = blendSpace.samples[triangle[2]].position;
            const bary = this.getBarycentricCoords(point, p0, p1, p2);
            if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                // Point is inside this triangle
                const pose0 = this.sampleAnimation(blendSpace.samples[triangle[0]].animation, time, skeleton);
                const pose1 = this.sampleAnimation(blendSpace.samples[triangle[1]].animation, time, skeleton);
                const pose2 = this.sampleAnimation(blendSpace.samples[triangle[2]].animation, time, skeleton);
                // Blend using barycentric coordinates
                const intermediate = this.blendPoses(pose0, pose1, bary.v / (bary.u + bary.v + 0.0001));
                return this.blendPoses(intermediate, pose2, bary.w);
            }
        }
        // Fallback to nearest sample
        let nearestIndex = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < blendSpace.samples.length; i++) {
            const sample = blendSpace.samples[i];
            const dist = Math.sqrt(Math.pow(sample.position.x - paramX, 2) +
                Math.pow(sample.position.y - paramY, 2));
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIndex = i;
            }
        }
        return this.sampleAnimation(blendSpace.samples[nearestIndex].animation, time, skeleton);
    }
    getBarycentricCoords(p, a, b, c) {
        const v0 = { x: c.x - a.x, y: c.y - a.y };
        const v1 = { x: b.x - a.x, y: b.y - a.y };
        const v2 = { x: p.x - a.x, y: p.y - a.y };
        const dot00 = v0.x * v0.x + v0.y * v0.y;
        const dot01 = v0.x * v1.x + v0.y * v1.y;
        const dot02 = v0.x * v2.x + v0.y * v2.y;
        const dot11 = v1.x * v1.x + v1.y * v1.y;
        const dot12 = v1.x * v2.x + v1.y * v2.y;
        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        return { u: 1 - u - v, v, w: u };
    }
    // ========================================================================
    // POSE BLENDING
    // ========================================================================
    blendPoses(pose1, pose2, weight) {
        const result = {
            boneTransforms: [],
            rootTransform: this.blendTransforms(pose1.rootTransform, pose2.rootTransform, weight),
            timestamp: pose1.timestamp + (pose2.timestamp - pose1.timestamp) * weight,
        };
        const boneCount = Math.max(pose1.boneTransforms.length, pose2.boneTransforms.length);
        for (let i = 0; i < boneCount; i++) {
            const t1 = pose1.boneTransforms[i] || this.identityTransform();
            const t2 = pose2.boneTransforms[i] || this.identityTransform();
            result.boneTransforms[i] = this.blendTransforms(t1, t2, weight);
        }
        return result;
    }
    blendTransforms(t1, t2, weight) {
        return {
            position: this.lerpVec3(t1.position, t2.position, weight),
            rotation: this.slerpQuat(t1.rotation, t2.rotation, weight),
            scale: this.lerpVec3(t1.scale, t2.scale, weight),
        };
    }
    // ========================================================================
    // MONTAGE SYSTEM
    // ========================================================================
    createMontage(config) {
        this.montages.set(config.id, config);
        return config;
    }
    playMontage(instanceId, montageId, startSection) {
        const instance = this.instances.get(instanceId);
        const montage = this.montages.get(montageId);
        if (!instance || !montage)
            return;
        const activeMontage = {
            montage,
            currentSection: startSection || montage.sections[0].name,
            time: 0,
            weight: 0,
            isBlendingOut: false,
        };
        instance.activeMontages.push(activeMontage);
    }
    stopMontage(instanceId, montageId, blendOutTime) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        const montageIndex = instance.activeMontages.findIndex(m => m.montage.id === montageId);
        if (montageIndex >= 0) {
            instance.activeMontages[montageIndex].isBlendingOut = true;
        }
    }
    applyMontages(instance, basePose, deltaTime) {
        let result = basePose;
        for (let i = instance.activeMontages.length - 1; i >= 0; i--) {
            const active = instance.activeMontages[i];
            active.time += deltaTime;
            // Update weight
            if (active.isBlendingOut) {
                active.weight -= deltaTime / active.montage.blendOutTime;
                if (active.weight <= 0) {
                    instance.activeMontages.splice(i, 1);
                    this.onMontageEndedEmitter.fire({ instanceId: instance.id, montageId: active.montage.id });
                    continue;
                }
            }
            else if (active.weight < 1) {
                active.weight += deltaTime / active.montage.blendInTime;
                active.weight = Math.min(1, active.weight);
            }
            // Sample montage animation
            const slot = active.montage.slots[0];
            if (slot) {
                const montagePose = this.sampleAnimation(slot.animation, active.time, instance.mesh.skeleton);
                result = this.blendPoses(result, montagePose, active.weight);
            }
        }
        return result;
    }
    // ========================================================================
    // IK SYSTEM
    // ========================================================================
    addIKChain(instanceId, chain) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.ikChains.push(chain);
        }
    }
    setIKTarget(instanceId, target) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        const existingIndex = instance.ikTargets.findIndex(t => t.chainId === target.chainId);
        if (existingIndex >= 0) {
            instance.ikTargets[existingIndex] = target;
        }
        else {
            instance.ikTargets.push(target);
        }
    }
    applyIK(instance, pose) {
        const result = { ...pose, boneTransforms: [...pose.boneTransforms] };
        // Apply IK chains
        for (const target of instance.ikTargets) {
            const chain = instance.ikChains.find(c => c.id === target.chainId);
            if (!chain || target.weight <= 0)
                continue;
            switch (chain.solverType) {
                case 'two_bone':
                    this.solveTwoBoneIK(result, chain, target);
                    break;
                case 'fabrik':
                    this.solveFABRIK(result, chain, target);
                    break;
                case 'ccd':
                    this.solveCCD(result, chain, target);
                    break;
            }
        }
        return result;
    }
    solveTwoBoneIK(pose, chain, target) {
        if (chain.bones.length < 3)
            return;
        const rootIndex = chain.bones[0];
        const midIndex = chain.bones[1];
        const effectorIndex = chain.bones[2];
        // Get current positions (simplified - would need world transforms)
        const rootPos = pose.boneTransforms[rootIndex].position;
        const midPos = pose.boneTransforms[midIndex].position;
        const effectorPos = pose.boneTransforms[effectorIndex].position;
        // Calculate bone lengths
        const upperLength = this.vec3Distance(rootPos, midPos);
        const lowerLength = this.vec3Distance(midPos, effectorPos);
        // Distance to target
        const targetDist = this.vec3Distance(rootPos, target.position);
        // Solve using law of cosines
        const a = upperLength;
        const b = lowerLength;
        const c = Math.min(targetDist, a + b - 0.01);
        // Angle at mid joint
        const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
        const midAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        // Apply rotations (simplified)
        // In production, would calculate proper quaternions
    }
    solveFABRIK(pose, chain, target) {
        // Forward And Backward Reaching Inverse Kinematics
        for (let iteration = 0; iteration < chain.iterations; iteration++) {
            // Forward reaching
            // ... 
            // Backward reaching
            // ...
        }
    }
    solveCCD(pose, chain, target) {
        // Cyclic Coordinate Descent
        for (let iteration = 0; iteration < chain.iterations; iteration++) {
            for (let i = chain.bones.length - 2; i >= 0; i--) {
                // Rotate bone towards target
                // ...
            }
        }
    }
    applyRootMotion(instance, pose) {
        // Apply root motion to character transform
        // Would integrate with character movement system
    }
    // ========================================================================
    // VARIABLE SETTERS
    // ========================================================================
    setVariable(instanceId, name, value) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.variables.set(name, value);
        }
    }
    setTrigger(instanceId, name) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.variables.set(name, true);
        }
    }
    getVariable(instanceId, name) {
        const instance = this.instances.get(instanceId);
        return instance?.variables.get(name);
    }
    // ========================================================================
    // GPU SKINNING
    // ========================================================================
    /**
     * Calculate final bone matrices for GPU skinning
     */
    calculateSkinningMatrices(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return null;
        const boneCount = instance.mesh.skeleton.bones.length;
        const matrices = new Float32Array(boneCount * 16);
        for (let i = 0; i < boneCount; i++) {
            const bone = instance.mesh.skeleton.bones[i];
            const pose = instance.currentPose.boneTransforms[i];
            // Calculate world transform
            const worldMatrix = this.calculateBoneWorldMatrix(instance, i);
            // Multiply by inverse bind pose
            const skinMatrix = this.multiplyMatrices(worldMatrix, bone.inverseBindPose);
            // Copy to output array
            matrices.set(skinMatrix.m, i * 16);
        }
        return matrices;
    }
    calculateBoneWorldMatrix(instance, boneIndex) {
        const bone = instance.mesh.skeleton.bones[boneIndex];
        const transform = instance.currentPose.boneTransforms[boneIndex];
        const localMatrix = this.transformToMatrix(transform);
        if (bone.parentIndex < 0) {
            return localMatrix;
        }
        const parentMatrix = this.calculateBoneWorldMatrix(instance, bone.parentIndex);
        return this.multiplyMatrices(parentMatrix, localMatrix);
    }
    // ========================================================================
    // MATH UTILITIES
    // ========================================================================
    lerpVec3(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
        };
    }
    slerpQuat(a, b, t) {
        // Ensure shortest path
        let bx = b.x, by = b.y, bz = b.z, bw = b.w;
        let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        if (dot < 0) {
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
            dot = -dot;
        }
        const threshold = 0.9995;
        if (dot > threshold) {
            // Linear interpolation for very close quaternions
            return this.normalizeQuat({
                x: a.x + (bx - a.x) * t,
                y: a.y + (by - a.y) * t,
                z: a.z + (bz - a.z) * t,
                w: a.w + (bw - a.w) * t,
            });
        }
        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);
        const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
        const s1 = sinTheta / sinTheta0;
        return {
            x: a.x * s0 + bx * s1,
            y: a.y * s0 + by * s1,
            z: a.z * s0 + bz * s1,
            w: a.w * s0 + bw * s1,
        };
    }
    normalizeQuat(q) {
        const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        if (len === 0)
            return { x: 0, y: 0, z: 0, w: 1 };
        return {
            x: q.x / len,
            y: q.y / len,
            z: q.z / len,
            w: q.w / len,
        };
    }
    vec3Distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    quatDistance(a, b) {
        const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        return Math.acos(2 * dot * dot - 1);
    }
    identityTransform() {
        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
        };
    }
    transformToMatrix(transform) {
        // Convert transform to 4x4 matrix
        const m = new Float32Array(16);
        // Extract quaternion components
        const { x, y, z, w } = transform.rotation;
        const { x: px, y: py, z: pz } = transform.position;
        const { x: sx, y: sy, z: sz } = transform.scale;
        // Rotation matrix from quaternion
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        m[0] = (1 - (yy + zz)) * sx;
        m[1] = (xy + wz) * sx;
        m[2] = (xz - wy) * sx;
        m[3] = 0;
        m[4] = (xy - wz) * sy;
        m[5] = (1 - (xx + zz)) * sy;
        m[6] = (yz + wx) * sy;
        m[7] = 0;
        m[8] = (xz + wy) * sz;
        m[9] = (yz - wx) * sz;
        m[10] = (1 - (xx + yy)) * sz;
        m[11] = 0;
        m[12] = px;
        m[13] = py;
        m[14] = pz;
        m[15] = 1;
        return { m };
    }
    multiplyMatrices(a, b) {
        const result = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a.m[i * 4] * b.m[j] +
                        a.m[i * 4 + 1] * b.m[4 + j] +
                        a.m[i * 4 + 2] * b.m[8 + j] +
                        a.m[i * 4 + 3] * b.m[12 + j];
            }
        }
        return { m: result };
    }
    generateId() {
        return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.SkeletalAnimationEngine = SkeletalAnimationEngine;
exports.SkeletalAnimationEngine = SkeletalAnimationEngine = __decorate([
    (0, inversify_1.injectable)()
], SkeletalAnimationEngine);
