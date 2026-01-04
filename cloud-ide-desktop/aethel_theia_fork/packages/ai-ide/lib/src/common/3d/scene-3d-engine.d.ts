/**
 * 3D SCENE ENGINE - Motor de Cenas 3D
 *
 * Sistema profissional de edição 3D com:
 * - Gerenciamento de cenas e objetos
 * - Sistema de materiais PBR
 * - Iluminação avançada
 * - Câmeras e animação
 * - Physics integration
 * - Level of Detail (LOD)
 * - Culling e otimizações
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Vector2 {
    x: number;
    y: number;
}
export interface Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface Matrix4 {
    elements: Float32Array;
}
export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}
export interface BoundingSphere {
    center: Vector3;
    radius: number;
}
export interface Color3 {
    r: number;
    g: number;
    b: number;
}
export interface Transform3D {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
    eulerAngles?: Vector3;
    localMatrix?: Matrix4;
    worldMatrix?: Matrix4;
}
export type SceneObjectType = 'empty' | 'mesh' | 'camera' | 'light' | 'particle-system' | 'audio-source' | 'probe' | 'bone' | 'rig';
export interface SceneObject {
    id: string;
    name: string;
    type: SceneObjectType;
    parentId?: string;
    childrenIds: string[];
    transform: Transform3D;
    visible: boolean;
    enabled: boolean;
    layer: number;
    tags: string[];
    components: Component[];
    userData: Record<string, unknown>;
}
export interface MeshObject extends SceneObject {
    type: 'mesh';
    geometry: GeometryData;
    materials: string[];
    castShadows: boolean;
    receiveShadows: boolean;
    lod?: LODConfig;
    instanceMatrix?: Float32Array;
    instanceCount?: number;
}
export interface GeometryData {
    id: string;
    name: string;
    positions: Float32Array;
    normals?: Float32Array;
    tangents?: Float32Array;
    uvs?: Float32Array[];
    colors?: Float32Array;
    indices?: Uint32Array;
    boneWeights?: Float32Array;
    boneIndices?: Uint32Array;
    morphTargets?: MorphTarget[];
    boundingBox: BoundingBox;
    boundingSphere: BoundingSphere;
    groups?: GeometryGroup[];
}
export interface GeometryGroup {
    start: number;
    count: number;
    materialIndex: number;
}
export interface MorphTarget {
    name: string;
    positions?: Float32Array;
    normals?: Float32Array;
}
export interface LODConfig {
    levels: LODLevel[];
    fadeMode: 'none' | 'cross-fade' | 'speed-tree';
    bias: number;
}
export interface LODLevel {
    distance: number;
    geometryId?: string;
    screenRelativeHeight?: number;
}
export type MaterialType = 'standard' | 'unlit' | 'toon' | 'matcap' | 'glass' | 'subsurface' | 'hair' | 'custom';
export interface Material {
    id: string;
    name: string;
    type: MaterialType;
    doubleSided: boolean;
    alphaMode: 'opaque' | 'mask' | 'blend';
    alphaCutoff: number;
    baseColor: Color3;
    baseColorMap?: TextureSlot;
    metallic: number;
    roughness: number;
    metallicRoughnessMap?: TextureSlot;
    normalMap?: TextureSlot;
    normalScale: number;
    aoMap?: TextureSlot;
    aoIntensity: number;
    emissive: Color3;
    emissiveIntensity: number;
    emissiveMap?: TextureSlot;
    heightMap?: TextureSlot;
    heightScale: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    clearcoatMap?: TextureSlot;
    sheen?: Color3;
    sheenRoughness?: number;
    transmission?: number;
    thickness?: number;
    ior?: number;
    subsurfaceColor?: Color3;
    subsurfaceRadius?: Vector3;
    customUniforms?: Record<string, ShaderUniform>;
    customShader?: string;
}
export interface TextureSlot {
    textureId: string;
    channel?: number;
    offset?: Vector2;
    scale?: Vector2;
    rotation?: number;
}
export interface ShaderUniform {
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'sampler2D';
    value: number | number[] | string;
}
export interface Texture {
    id: string;
    name: string;
    source: string;
    width: number;
    height: number;
    depth?: number;
    format: TextureFormat;
    type: TextureDataType;
    minFilter: TextureFilter;
    magFilter: TextureFilter;
    wrapS: TextureWrap;
    wrapT: TextureWrap;
    wrapR?: TextureWrap;
    generateMipmaps: boolean;
    maxAnisotropy?: number;
    colorSpace: 'sRGB' | 'linear';
}
export type TextureFormat = 'rgba' | 'rgb' | 'rg' | 'r' | 'depth' | 'depth-stencil';
export type TextureDataType = 'uint8' | 'uint16' | 'float16' | 'float32';
export type TextureFilter = 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-linear';
export type TextureWrap = 'repeat' | 'clamp' | 'mirror';
export type LightType = 'directional' | 'point' | 'spot' | 'area' | 'ambient';
export interface LightObject extends SceneObject {
    type: 'light';
    lightType: LightType;
    color: Color3;
    intensity: number;
    castShadows: boolean;
    shadowConfig?: ShadowConfig;
    range?: number;
    decay?: number;
    innerConeAngle?: number;
    outerConeAngle?: number;
    areaWidth?: number;
    areaHeight?: number;
    areaShape?: 'rect' | 'disc';
}
export interface ShadowConfig {
    mapSize: number;
    bias: number;
    normalBias: number;
    near: number;
    far: number;
    radius?: number;
    samples?: number;
    cascadeCount?: number;
    cascadeSplits?: number[];
}
export type CameraType = 'perspective' | 'orthographic';
export interface CameraObject extends SceneObject {
    type: 'camera';
    cameraType: CameraType;
    near: number;
    far: number;
    fov?: number;
    aspect?: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    zoom?: number;
    renderTarget?: string;
    postProcessing?: PostProcessConfig;
    viewport?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    clearColor?: Color3;
    clearDepth?: boolean;
}
export interface PostProcessConfig {
    enabled: boolean;
    effects: PostProcessEffect[];
}
export interface PostProcessEffect {
    type: string;
    enabled: boolean;
    parameters: Record<string, unknown>;
}
export interface ParticleSystemObject extends SceneObject {
    type: 'particle-system';
    emissionRate: number;
    emissionShape: EmissionShape;
    maxParticles: number;
    lifetime: NumberRange;
    startSpeed: NumberRange;
    startSize: NumberRange;
    startRotation: NumberRange;
    startColor: ColorGradient;
    velocityOverLifetime?: Vector3Curve;
    sizeOverLifetime?: NumberCurve;
    rotationOverLifetime?: NumberCurve;
    colorOverLifetime?: ColorGradient;
    gravity: Vector3;
    drag: number;
    collision?: ParticleCollision;
    renderMode: 'billboard' | 'stretched' | 'mesh';
    material: string;
    sortMode: 'none' | 'distance' | 'age';
}
export type EmissionShape = {
    type: 'point';
} | {
    type: 'sphere';
    radius: number;
} | {
    type: 'box';
    size: Vector3;
} | {
    type: 'cone';
    angle: number;
    radius: number;
    length: number;
} | {
    type: 'mesh';
    meshId: string;
};
export interface NumberRange {
    min: number;
    max: number;
}
export interface NumberCurve {
    keys: Array<{
        time: number;
        value: number;
    }>;
}
export interface Vector3Curve {
    x: NumberCurve;
    y: NumberCurve;
    z: NumberCurve;
}
export interface ColorGradient {
    keys: Array<{
        time: number;
        color: Color3;
        alpha: number;
    }>;
}
export interface ParticleCollision {
    enabled: boolean;
    bounce: number;
    dampen: number;
    lifetime: 'destroy' | 'callback';
}
export interface AnimationClip {
    id: string;
    name: string;
    duration: number;
    tracks: AnimationTrack[];
}
export interface AnimationTrack {
    targetId: string;
    targetProperty: string;
    interpolation: 'linear' | 'step' | 'cubic';
    times: Float32Array;
    values: Float32Array;
    inTangents?: Float32Array;
    outTangents?: Float32Array;
}
export interface AnimationState {
    clipId: string;
    time: number;
    speed: number;
    weight: number;
    loop: boolean;
    playing: boolean;
}
export interface AnimationMixer {
    objectId: string;
    states: AnimationState[];
    blendTree?: BlendTree;
}
export interface BlendTree {
    type: '1D' | '2D' | 'direct';
    parameter?: string;
    children: BlendTreeChild[];
}
export interface BlendTreeChild {
    clipId: string;
    threshold?: number;
    position?: Vector2;
}
export interface Skeleton {
    id: string;
    name: string;
    bones: Bone[];
    bindPose: Matrix4[];
}
export interface Bone {
    id: string;
    name: string;
    parentIndex: number;
    localTransform: Transform3D;
}
export type ComponentType = 'mesh-renderer' | 'skinned-mesh-renderer' | 'light' | 'camera' | 'collider' | 'rigidbody' | 'audio-source' | 'animation' | 'script' | 'lod-group' | 'reflection-probe';
export interface Component {
    id: string;
    type: ComponentType;
    enabled: boolean;
    data: Record<string, unknown>;
}
export type ColliderType = 'box' | 'sphere' | 'capsule' | 'mesh' | 'convex-hull';
export interface ColliderComponent extends Component {
    type: 'collider';
    data: {
        colliderType: ColliderType;
        isTrigger: boolean;
        center: Vector3;
        size?: Vector3;
        radius?: number;
        height?: number;
        direction?: 'x' | 'y' | 'z';
        meshId?: string;
        convex?: boolean;
    };
}
export interface RigidbodyComponent extends Component {
    type: 'rigidbody';
    data: {
        mass: number;
        drag: number;
        angularDrag: number;
        useGravity: boolean;
        isKinematic: boolean;
        constraints: {
            freezePosition: {
                x: boolean;
                y: boolean;
                z: boolean;
            };
            freezeRotation: {
                x: boolean;
                y: boolean;
                z: boolean;
            };
        };
    };
}
export interface Scene3D {
    id: string;
    name: string;
    objects: Map<string, SceneObject>;
    rootObjects: string[];
    geometries: Map<string, GeometryData>;
    materials: Map<string, Material>;
    textures: Map<string, Texture>;
    animations: Map<string, AnimationClip>;
    skeletons: Map<string, Skeleton>;
    environment: EnvironmentSettings;
    physicsWorld?: PhysicsWorldSettings;
    activeCameraId?: string;
    selectedIds: string[];
    metadata: Record<string, unknown>;
}
export interface EnvironmentSettings {
    skybox?: {
        type: 'color' | 'gradient' | 'cubemap' | 'hdri' | 'procedural';
        color?: Color3;
        gradientTop?: Color3;
        gradientBottom?: Color3;
        textureId?: string;
        intensity?: number;
        rotation?: number;
    };
    ambientLight?: {
        type: 'flat' | 'gradient' | 'skybox';
        color?: Color3;
        intensity?: number;
    };
    fog?: {
        enabled: boolean;
        type: 'linear' | 'exponential' | 'exponential-squared';
        color: Color3;
        density?: number;
        near?: number;
        far?: number;
    };
    reflectionProbe?: string;
}
export interface PhysicsWorldSettings {
    gravity: Vector3;
    solver: 'sequential' | 'pgs' | 'dantzig';
    iterations: number;
}
export declare class Scene3DEngine {
    private currentScene;
    private clipboard;
    /**
     * Cria nova cena
     */
    createScene(name: string): Scene3D;
    /**
     * Carrega cena
     */
    loadScene(sceneData: Scene3D): void;
    /**
     * Cria objeto vazio
     */
    createEmpty(name: string): SceneObject;
    /**
     * Cria mesh primitiva
     */
    createPrimitive(type: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus', name?: string): MeshObject;
    /**
     * Cria câmera
     */
    createCamera(name: string, cameraType: CameraType): CameraObject;
    /**
     * Cria luz
     */
    createLight(name: string, lightType: LightType): LightObject;
    /**
     * Cria sistema de partículas
     */
    createParticleSystem(name: string): ParticleSystemObject;
    /**
     * Cria material
     */
    createMaterial(name: string, type: MaterialType): Material;
    /**
     * Atualiza propriedades do material
     */
    updateMaterial(materialId: string, updates: Partial<Material>): void;
    private createPrimitiveGeometry;
    private createCubeGeometry;
    private createSphereGeometry;
    private createCylinderGeometry;
    private createConeGeometry;
    private createPlaneGeometry;
    private createTorusGeometry;
    private addObjectToScene;
    /**
     * Adiciona objeto à cena atual
     */
    addObject(object: SceneObject): void;
    /**
     * Remove objeto da cena
     */
    removeObject(objectId: string): void;
    /**
     * Duplica objeto
     */
    duplicateObject(objectId: string): SceneObject | null;
    /**
     * Define pai do objeto
     */
    setParent(objectId: string, parentId: string | null): void;
    /**
     * Define posição do objeto
     */
    setPosition(objectId: string, position: Vector3): void;
    /**
     * Define rotação do objeto (Euler)
     */
    setRotationEuler(objectId: string, euler: Vector3): void;
    /**
     * Define escala do objeto
     */
    setScale(objectId: string, scale: Vector3): void;
    /**
     * Converte Euler para Quaternion
     */
    private eulerToQuaternion;
    /**
     * Calcula matriz local
     */
    computeLocalMatrix(transform: Transform3D): Matrix4;
    /**
     * Cria animation clip
     */
    createAnimationClip(name: string, duration: number): AnimationClip;
    /**
     * Adiciona track à animação
     */
    addAnimationTrack(clipId: string, targetId: string, targetProperty: string, keyframes: Array<{
        time: number;
        value: number | number[];
    }>): void;
    /**
     * Sample animation at time
     */
    sampleAnimation(clipId: string, time: number): Map<string, Record<string, number | number[]>>;
    private createDefaultTransform;
    private generateId;
    /**
     * Obtém cena atual
     */
    getCurrentScene(): Scene3D | null;
    /**
     * Obtém objeto por ID
     */
    getObject(objectId: string): SceneObject | undefined;
    /**
     * Lista todos os objetos
     */
    getAllObjects(): SceneObject[];
    /**
     * Seleciona objetos
     */
    setSelection(objectIds: string[]): void;
    /**
     * Obtém seleção
     */
    getSelection(): string[];
}
