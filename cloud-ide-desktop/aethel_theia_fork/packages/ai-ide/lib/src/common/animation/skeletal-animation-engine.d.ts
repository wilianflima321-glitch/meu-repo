import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL SKELETAL ANIMATION SYSTEM
 * ============================================================================
 *
 * Sistema de animação esquelética de nível AAA inspirado em:
 * - Unreal Engine Animation Blueprints
 * - Motion Matching (UE 5.4)
 * - Control Rig / Full Body IK
 *
 * Recursos:
 * - Skeletal mesh runtime
 * - Blend spaces (1D, 2D)
 * - State machines
 * - Additive animations
 * - Root motion
 * - Motion matching
 * - IK solvers
 * - Animation compression
 * - GPU skinning
 */
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
export interface Transform {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
}
export interface Matrix4x4 {
    m: Float32Array;
}
export interface Bone {
    name: string;
    index: number;
    parentIndex: number;
    localTransform: Transform;
    inverseBindPose: Matrix4x4;
    children: number[];
}
export interface Skeleton {
    id: string;
    name: string;
    bones: Bone[];
    boneNameToIndex: Map<string, number>;
    rootBoneIndex: number;
}
export interface SkeletalMesh {
    id: string;
    skeleton: Skeleton;
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
    boneWeights: Float32Array;
    boneIndices: Uint8Array;
    morphTargets: MorphTarget[];
}
export interface MorphTarget {
    name: string;
    vertexDeltas: Float32Array;
    normalDeltas: Float32Array;
}
export interface AnimationClip {
    id: string;
    name: string;
    duration: number;
    frameRate: number;
    tracks: BoneTrack[];
    rootMotionTrack?: RootMotionTrack;
    events: AnimationEvent[];
    additive: boolean;
    looping: boolean;
    compressed: boolean;
    compressionRatio?: number;
}
export interface BoneTrack {
    boneIndex: number;
    positionKeys: KeyframeVec3[];
    rotationKeys: KeyframeQuat[];
    scaleKeys: KeyframeVec3[];
}
export interface KeyframeVec3 {
    time: number;
    value: Vector3;
    interpolation: 'linear' | 'cubic' | 'step';
    inTangent?: Vector3;
    outTangent?: Vector3;
}
export interface KeyframeQuat {
    time: number;
    value: Quaternion;
    interpolation: 'linear' | 'cubic' | 'step';
}
export interface RootMotionTrack {
    positionKeys: KeyframeVec3[];
    rotationKeys: KeyframeQuat[];
    extractionMode: 'none' | 'root_only' | 'root_and_hips';
}
export interface AnimationEvent {
    time: number;
    name: string;
    payload?: Record<string, unknown>;
}
export interface BlendSpace1D {
    id: string;
    name: string;
    axisName: string;
    min: number;
    max: number;
    samples: BlendSample1D[];
}
export interface BlendSample1D {
    animation: AnimationClip;
    position: number;
}
export interface BlendSpace2D {
    id: string;
    name: string;
    axisXName: string;
    axisYName: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    samples: BlendSample2D[];
    triangulation: number[][];
}
export interface BlendSample2D {
    animation: AnimationClip;
    position: {
        x: number;
        y: number;
    };
}
export interface AnimationStateMachine {
    id: string;
    name: string;
    states: AnimationState[];
    transitions: StateTransition[];
    defaultStateId: string;
    variables: StateMachineVariable[];
}
export interface AnimationState {
    id: string;
    name: string;
    type: 'single' | 'blendspace1d' | 'blendspace2d' | 'montage' | 'composite';
    animation?: AnimationClip;
    blendSpace1D?: BlendSpace1D;
    blendSpace2D?: BlendSpace2D;
    playRate: number;
    looping: boolean;
    rootMotionMode: 'ignore' | 'apply_to_root' | 'apply_to_character';
}
export interface StateTransition {
    id: string;
    fromStateId: string;
    toStateId: string;
    duration: number;
    blendMode: 'linear' | 'cubic' | 'inertialization';
    conditions: TransitionCondition[];
    canInterrupt: boolean;
    priority: number;
}
export interface TransitionCondition {
    type: 'bool' | 'float_greater' | 'float_less' | 'float_equals' | 'trigger' | 'time_remaining';
    variableName: string;
    value: number | boolean;
    compareValue?: number;
}
export interface StateMachineVariable {
    name: string;
    type: 'bool' | 'float' | 'int' | 'trigger';
    defaultValue: number | boolean;
}
export interface MotionMatchingDatabase {
    id: string;
    name: string;
    clips: AnimationClip[];
    features: MotionFeature[];
    kdTree?: KDTreeNode;
}
export interface MotionFeature {
    clipIndex: number;
    frameIndex: number;
    trajectoryPositions: Vector3[];
    trajectoryFacings: Vector3[];
    leftFootPosition: Vector3;
    leftFootVelocity: Vector3;
    rightFootPosition: Vector3;
    rightFootVelocity: Vector3;
    hipPosition: Vector3;
    hipVelocity: Vector3;
}
export interface KDTreeNode {
    feature: MotionFeature;
    splitAxis: number;
    left?: KDTreeNode;
    right?: KDTreeNode;
}
export interface MotionMatchingQuery {
    desiredTrajectory: Vector3[];
    desiredFacings: Vector3[];
    currentPose: PoseSnapshot;
    weights: MotionMatchingWeights;
}
export interface MotionMatchingWeights {
    trajectoryPosition: number;
    trajectoryFacing: number;
    footPosition: number;
    footVelocity: number;
    hipPosition: number;
    hipVelocity: number;
}
export interface IKChain {
    id: string;
    name: string;
    bones: number[];
    effectorBone: number;
    rootBone: number;
    solverType: 'two_bone' | 'fabrik' | 'ccd' | 'jacobian';
    iterations: number;
    tolerance: number;
    stiffness: number[];
}
export interface IKTarget {
    chainId: string;
    position: Vector3;
    rotation?: Quaternion;
    weight: number;
    blendMode: 'override' | 'additive';
}
export interface FootIKSettings {
    enabled: boolean;
    raycastDistance: number;
    footOffset: number;
    interpolationSpeed: number;
    pelvisAdjustment: boolean;
    maxPelvisOffset: number;
}
export interface LookAtIKSettings {
    enabled: boolean;
    targetBone: number;
    headBone: number;
    neckBone: number;
    spineBones: number[];
    horizontalLimit: number;
    verticalLimit: number;
    interpolationSpeed: number;
}
export interface PoseSnapshot {
    boneTransforms: Transform[];
    rootTransform: Transform;
    timestamp: number;
}
export interface PoseAsset {
    id: string;
    name: string;
    skeleton: Skeleton;
    pose: PoseSnapshot;
    additiveBasePose?: PoseSnapshot;
}
export interface AnimationMontage {
    id: string;
    name: string;
    sections: MontageSection[];
    slots: MontageSlot[];
    blendInTime: number;
    blendOutTime: number;
    blendOutTriggerTime: number;
}
export interface MontageSection {
    name: string;
    startTime: number;
    nextSection: string | null;
}
export interface MontageSlot {
    name: string;
    animation: AnimationClip;
}
export interface AnimationInstance {
    id: string;
    mesh: SkeletalMesh;
    stateMachine: AnimationStateMachine;
    currentPose: PoseSnapshot;
    variables: Map<string, number | boolean>;
    currentStateId: string;
    stateTime: number;
    transitionInfo?: ActiveTransition;
    motionMatchingEnabled: boolean;
    motionDatabase?: MotionMatchingDatabase;
    ikChains: IKChain[];
    ikTargets: IKTarget[];
    footIK: FootIKSettings;
    lookAtIK: LookAtIKSettings;
    activeMontages: ActiveMontage[];
    layers: AnimationLayer[];
}
export interface ActiveTransition {
    toStateId: string;
    progress: number;
    duration: number;
    blendMode: 'linear' | 'cubic' | 'inertialization';
    fromPose: PoseSnapshot;
}
export interface ActiveMontage {
    montage: AnimationMontage;
    currentSection: string;
    time: number;
    weight: number;
    isBlendingOut: boolean;
}
export interface AnimationLayer {
    name: string;
    weight: number;
    blendMode: 'override' | 'additive';
    boneMask?: boolean[];
    stateMachineId?: string;
}
export declare class SkeletalAnimationEngine {
    private skeletons;
    private meshes;
    private clips;
    private stateMachines;
    private blendSpaces1D;
    private blendSpaces2D;
    private motionDatabases;
    private instances;
    private montages;
    private poseAssets;
    private readonly onAnimationEventEmitter;
    private readonly onStateChangedEmitter;
    private readonly onMontageEndedEmitter;
    readonly onAnimationEvent: Event<{
        instanceId: string;
        event: AnimationEvent;
    }>;
    readonly onStateChanged: Event<{
        instanceId: string;
        fromState: string;
        toState: string;
    }>;
    readonly onMontageEnded: Event<{
        instanceId: string;
        montageId: string;
    }>;
    createSkeleton(config: Omit<Skeleton, 'boneNameToIndex'>): Skeleton;
    getSkeleton(id: string): Skeleton | undefined;
    createSkeletalMesh(config: SkeletalMesh): SkeletalMesh;
    getSkeletalMesh(id: string): SkeletalMesh | undefined;
    createAnimationClip(config: AnimationClip): AnimationClip;
    getAnimationClip(id: string): AnimationClip | undefined;
    /**
     * Compress animation using curve reduction
     */
    compressAnimation(clipId: string, errorThreshold?: number): void;
    private compressKeyframes;
    private compressQuaternionKeyframes;
    createStateMachine(config: AnimationStateMachine): AnimationStateMachine;
    getStateMachine(id: string): AnimationStateMachine | undefined;
    createBlendSpace1D(config: BlendSpace1D): BlendSpace1D;
    createBlendSpace2D(config: Omit<BlendSpace2D, 'triangulation'>): BlendSpace2D;
    private generateDelaunayTriangulation;
    createMotionMatchingDatabase(config: Omit<MotionMatchingDatabase, 'kdTree'>): MotionMatchingDatabase;
    private buildKDTree;
    private getFeatureDimension;
    findBestMotionMatch(databaseId: string, query: MotionMatchingQuery): MotionFeature | null;
    private searchKDTree;
    private calculateMotionCost;
    createInstance(meshId: string, stateMachineId: string): AnimationInstance | null;
    getInstance(id: string): AnimationInstance | undefined;
    private getReferencePose;
    /**
     * Update all animation instances
     */
    update(deltaTime: number): void;
    /**
     * Update single animation instance
     */
    updateInstance(instance: AnimationInstance, deltaTime: number): void;
    private updateStateMachine;
    private evaluateTransitionConditions;
    private sampleCurrentState;
    private getTransitionBlendWeight;
    sampleAnimation(clip: AnimationClip, time: number, skeleton: Skeleton): PoseSnapshot;
    private sampleVec3Track;
    private sampleQuatTrack;
    sampleBlendSpace1D(blendSpace: BlendSpace1D, parameter: number, time: number, skeleton: Skeleton): PoseSnapshot;
    sampleBlendSpace2D(blendSpace: BlendSpace2D, paramX: number, paramY: number, time: number, skeleton: Skeleton): PoseSnapshot;
    private getBarycentricCoords;
    blendPoses(pose1: PoseSnapshot, pose2: PoseSnapshot, weight: number): PoseSnapshot;
    private blendTransforms;
    createMontage(config: AnimationMontage): AnimationMontage;
    playMontage(instanceId: string, montageId: string, startSection?: string): void;
    stopMontage(instanceId: string, montageId: string, blendOutTime?: number): void;
    private applyMontages;
    addIKChain(instanceId: string, chain: IKChain): void;
    setIKTarget(instanceId: string, target: IKTarget): void;
    private applyIK;
    private solveTwoBoneIK;
    private solveFABRIK;
    private solveCCD;
    private applyRootMotion;
    setVariable(instanceId: string, name: string, value: number | boolean): void;
    setTrigger(instanceId: string, name: string): void;
    getVariable(instanceId: string, name: string): number | boolean | undefined;
    /**
     * Calculate final bone matrices for GPU skinning
     */
    calculateSkinningMatrices(instanceId: string): Float32Array | null;
    private calculateBoneWorldMatrix;
    private lerpVec3;
    private slerpQuat;
    private normalizeQuat;
    private vec3Distance;
    private quatDistance;
    private identityTransform;
    private transformToMatrix;
    private multiplyMatrices;
    private generateId;
}
