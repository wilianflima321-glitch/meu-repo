import { injectable } from 'inversify';

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

// ============================================================================
// TIPOS MATEMÁTICOS
// ============================================================================

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
    elements: Float32Array;  // 16 elementos (4x4)
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

// ============================================================================
// TRANSFORM
// ============================================================================

export interface Transform3D {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
    
    // Euler angles (read/write convenience)
    eulerAngles?: Vector3;
    
    // Matrix cacheada
    localMatrix?: Matrix4;
    worldMatrix?: Matrix4;
}

// ============================================================================
// SCENE OBJECT
// ============================================================================

export type SceneObjectType = 
    | 'empty'
    | 'mesh'
    | 'camera'
    | 'light'
    | 'particle-system'
    | 'audio-source'
    | 'probe'
    | 'bone'
    | 'rig';

export interface SceneObject {
    id: string;
    name: string;
    type: SceneObjectType;
    
    // Hierarquia
    parentId?: string;
    childrenIds: string[];
    
    // Transform
    transform: Transform3D;
    
    // Estado
    visible: boolean;
    enabled: boolean;
    layer: number;
    tags: string[];
    
    // Componentes
    components: Component[];
    
    // Metadata
    userData: Record<string, unknown>;
}

// ============================================================================
// MESH
// ============================================================================

export interface MeshObject extends SceneObject {
    type: 'mesh';
    geometry: GeometryData;
    materials: string[];               // IDs dos materiais
    castShadows: boolean;
    receiveShadows: boolean;
    
    // LOD
    lod?: LODConfig;
    
    // Instancing
    instanceMatrix?: Float32Array;     // Para instanced rendering
    instanceCount?: number;
}

export interface GeometryData {
    id: string;
    name: string;
    
    // Vertex attributes
    positions: Float32Array;           // vec3 * vertexCount
    normals?: Float32Array;            // vec3 * vertexCount
    tangents?: Float32Array;           // vec4 * vertexCount
    uvs?: Float32Array[];              // Multiple UV channels
    colors?: Float32Array;             // vec4 * vertexCount
    
    // Indices
    indices?: Uint32Array;
    
    // Skinning
    boneWeights?: Float32Array;        // vec4 * vertexCount
    boneIndices?: Uint32Array;         // uvec4 * vertexCount
    
    // Morph targets
    morphTargets?: MorphTarget[];
    
    // Bounds
    boundingBox: BoundingBox;
    boundingSphere: BoundingSphere;
    
    // Submeshes para múltiplos materiais
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
    geometryId?: string;               // Geometry alternativa
    screenRelativeHeight?: number;     // Ou usar altura relativa
}

// ============================================================================
// MATERIALS
// ============================================================================

export type MaterialType = 
    | 'standard'                       // PBR Standard
    | 'unlit'                          // Sem iluminação
    | 'toon'                           // Cel shading
    | 'matcap'                         // Material capture
    | 'glass'                          // Transmissive
    | 'subsurface'                     // SSS
    | 'hair'                           // Hair shading
    | 'custom';                        // Custom shader

export interface Material {
    id: string;
    name: string;
    type: MaterialType;
    
    // Render state
    doubleSided: boolean;
    alphaMode: 'opaque' | 'mask' | 'blend';
    alphaCutoff: number;
    
    // Base PBR
    baseColor: Color3;
    baseColorMap?: TextureSlot;
    metallic: number;
    roughness: number;
    metallicRoughnessMap?: TextureSlot;
    
    // Normal
    normalMap?: TextureSlot;
    normalScale: number;
    
    // Occlusion
    aoMap?: TextureSlot;
    aoIntensity: number;
    
    // Emission
    emissive: Color3;
    emissiveIntensity: number;
    emissiveMap?: TextureSlot;
    
    // Additional
    heightMap?: TextureSlot;
    heightScale: number;
    
    // Clearcoat
    clearcoat?: number;
    clearcoatRoughness?: number;
    clearcoatMap?: TextureSlot;
    
    // Sheen
    sheen?: Color3;
    sheenRoughness?: number;
    
    // Transmission
    transmission?: number;
    thickness?: number;
    ior?: number;
    
    // Subsurface
    subsurfaceColor?: Color3;
    subsurfaceRadius?: Vector3;
    
    // Custom uniforms
    customUniforms?: Record<string, ShaderUniform>;
    customShader?: string;
}

export interface TextureSlot {
    textureId: string;
    channel?: number;                  // UV channel
    offset?: Vector2;
    scale?: Vector2;
    rotation?: number;
}

export interface ShaderUniform {
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'sampler2D';
    value: number | number[] | string;
}

// ============================================================================
// TEXTURES
// ============================================================================

export interface Texture {
    id: string;
    name: string;
    source: string;                    // Path ou data URL
    
    // Dimensões
    width: number;
    height: number;
    depth?: number;                    // Para 3D textures
    
    // Format
    format: TextureFormat;
    type: TextureDataType;
    
    // Sampling
    minFilter: TextureFilter;
    magFilter: TextureFilter;
    wrapS: TextureWrap;
    wrapT: TextureWrap;
    wrapR?: TextureWrap;
    
    // Mipmaps
    generateMipmaps: boolean;
    maxAnisotropy?: number;
    
    // Color space
    colorSpace: 'sRGB' | 'linear';
}

export type TextureFormat = 'rgba' | 'rgb' | 'rg' | 'r' | 'depth' | 'depth-stencil';
export type TextureDataType = 'uint8' | 'uint16' | 'float16' | 'float32';
export type TextureFilter = 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-linear';
export type TextureWrap = 'repeat' | 'clamp' | 'mirror';

// ============================================================================
// LIGHTS
// ============================================================================

export type LightType = 'directional' | 'point' | 'spot' | 'area' | 'ambient';

export interface LightObject extends SceneObject {
    type: 'light';
    lightType: LightType;
    
    color: Color3;
    intensity: number;
    
    // Shadows
    castShadows: boolean;
    shadowConfig?: ShadowConfig;
    
    // Point/Spot specific
    range?: number;
    decay?: number;
    
    // Spot specific
    innerConeAngle?: number;
    outerConeAngle?: number;
    
    // Area specific
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
    radius?: number;                   // Para soft shadows
    samples?: number;
    
    // CSM para directional
    cascadeCount?: number;
    cascadeSplits?: number[];
}

// ============================================================================
// CAMERAS
// ============================================================================

export type CameraType = 'perspective' | 'orthographic';

export interface CameraObject extends SceneObject {
    type: 'camera';
    cameraType: CameraType;
    
    // Common
    near: number;
    far: number;
    
    // Perspective
    fov?: number;                      // Vertical FOV em graus
    aspect?: number;
    
    // Orthographic
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    zoom?: number;
    
    // Render target
    renderTarget?: string;
    
    // Post processing
    postProcessing?: PostProcessConfig;
    
    // Viewport
    viewport?: { x: number; y: number; width: number; height: number };
    
    // Clear
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

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

export interface ParticleSystemObject extends SceneObject {
    type: 'particle-system';
    
    // Emission
    emissionRate: number;
    emissionShape: EmissionShape;
    maxParticles: number;
    
    // Lifetime
    lifetime: NumberRange;
    
    // Initial values
    startSpeed: NumberRange;
    startSize: NumberRange;
    startRotation: NumberRange;
    startColor: ColorGradient;
    
    // Over lifetime
    velocityOverLifetime?: Vector3Curve;
    sizeOverLifetime?: NumberCurve;
    rotationOverLifetime?: NumberCurve;
    colorOverLifetime?: ColorGradient;
    
    // Physics
    gravity: Vector3;
    drag: number;
    
    // Collision
    collision?: ParticleCollision;
    
    // Renderer
    renderMode: 'billboard' | 'stretched' | 'mesh';
    material: string;
    sortMode: 'none' | 'distance' | 'age';
}

export type EmissionShape = 
    | { type: 'point' }
    | { type: 'sphere'; radius: number }
    | { type: 'box'; size: Vector3 }
    | { type: 'cone'; angle: number; radius: number; length: number }
    | { type: 'mesh'; meshId: string };

export interface NumberRange {
    min: number;
    max: number;
}

export interface NumberCurve {
    keys: Array<{ time: number; value: number }>;
}

export interface Vector3Curve {
    x: NumberCurve;
    y: NumberCurve;
    z: NumberCurve;
}

export interface ColorGradient {
    keys: Array<{ time: number; color: Color3; alpha: number }>;
}

export interface ParticleCollision {
    enabled: boolean;
    bounce: number;
    dampen: number;
    lifetime: 'destroy' | 'callback';
}

// ============================================================================
// ANIMATION
// ============================================================================

export interface AnimationClip {
    id: string;
    name: string;
    duration: number;
    tracks: AnimationTrack[];
}

export interface AnimationTrack {
    targetId: string;
    targetProperty: string;            // e.g., "transform.position.x"
    interpolation: 'linear' | 'step' | 'cubic';
    times: Float32Array;
    values: Float32Array;
    
    // Para cubic interpolation
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

// ============================================================================
// SKELETON
// ============================================================================

export interface Skeleton {
    id: string;
    name: string;
    bones: Bone[];
    bindPose: Matrix4[];
}

export interface Bone {
    id: string;
    name: string;
    parentIndex: number;               // -1 para root
    localTransform: Transform3D;
}

// ============================================================================
// COMPONENTS
// ============================================================================

export type ComponentType = 
    | 'mesh-renderer'
    | 'skinned-mesh-renderer'
    | 'light'
    | 'camera'
    | 'collider'
    | 'rigidbody'
    | 'audio-source'
    | 'animation'
    | 'script'
    | 'lod-group'
    | 'reflection-probe';

export interface Component {
    id: string;
    type: ComponentType;
    enabled: boolean;
    data: Record<string, unknown>;
}

// ============================================================================
// PHYSICS
// ============================================================================

export type ColliderType = 'box' | 'sphere' | 'capsule' | 'mesh' | 'convex-hull';

export interface ColliderComponent extends Component {
    type: 'collider';
    data: {
        colliderType: ColliderType;
        isTrigger: boolean;
        center: Vector3;
        // Box
        size?: Vector3;
        // Sphere
        radius?: number;
        // Capsule
        height?: number;
        direction?: 'x' | 'y' | 'z';
        // Mesh
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
            freezePosition: { x: boolean; y: boolean; z: boolean };
            freezeRotation: { x: boolean; y: boolean; z: boolean };
        };
    };
}

// ============================================================================
// SCENE
// ============================================================================

export interface Scene3D {
    id: string;
    name: string;
    
    // Objects
    objects: Map<string, SceneObject>;
    rootObjects: string[];
    
    // Resources
    geometries: Map<string, GeometryData>;
    materials: Map<string, Material>;
    textures: Map<string, Texture>;
    animations: Map<string, AnimationClip>;
    skeletons: Map<string, Skeleton>;
    
    // Environment
    environment: EnvironmentSettings;
    
    // Physics
    physicsWorld?: PhysicsWorldSettings;
    
    // Active camera
    activeCameraId?: string;
    
    // Selection
    selectedIds: string[];
    
    // Metadata
    metadata: Record<string, unknown>;
}

export interface EnvironmentSettings {
    // Skybox
    skybox?: {
        type: 'color' | 'gradient' | 'cubemap' | 'hdri' | 'procedural';
        color?: Color3;
        gradientTop?: Color3;
        gradientBottom?: Color3;
        textureId?: string;
        intensity?: number;
        rotation?: number;
    };
    
    // Ambient
    ambientLight?: {
        type: 'flat' | 'gradient' | 'skybox';
        color?: Color3;
        intensity?: number;
    };
    
    // Fog
    fog?: {
        enabled: boolean;
        type: 'linear' | 'exponential' | 'exponential-squared';
        color: Color3;
        density?: number;
        near?: number;
        far?: number;
    };
    
    // Reflection
    reflectionProbe?: string;
}

export interface PhysicsWorldSettings {
    gravity: Vector3;
    solver: 'sequential' | 'pgs' | 'dantzig';
    iterations: number;
}

// ============================================================================
// 3D SCENE ENGINE
// ============================================================================

@injectable()
export class Scene3DEngine {
    private currentScene: Scene3D | null = null;
    private clipboard: SceneObject[] = [];

    // ========================================================================
    // SCENE MANAGEMENT
    // ========================================================================

    /**
     * Cria nova cena
     */
    createScene(name: string): Scene3D {
        const scene: Scene3D = {
            id: this.generateId(),
            name,
            objects: new Map(),
            rootObjects: [],
            geometries: new Map(),
            materials: new Map(),
            textures: new Map(),
            animations: new Map(),
            skeletons: new Map(),
            environment: {
                skybox: {
                    type: 'color',
                    color: { r: 0.2, g: 0.2, b: 0.3 },
                },
                ambientLight: {
                    type: 'flat',
                    color: { r: 0.3, g: 0.3, b: 0.35 },
                    intensity: 0.5,
                },
            },
            selectedIds: [],
            metadata: {},
        };

        // Adicionar câmera default
        const camera = this.createCamera('Main Camera', 'perspective');
        camera.transform.position = { x: 0, y: 5, z: 10 };
        this.addObjectToScene(scene, camera);
        scene.activeCameraId = camera.id;

        // Adicionar luz direcional default
        const light = this.createLight('Directional Light', 'directional');
        light.transform.position = { x: 5, y: 10, z: 5 };
        this.addObjectToScene(scene, light);

        this.currentScene = scene;
        return scene;
    }

    /**
     * Carrega cena
     */
    loadScene(sceneData: Scene3D): void {
        // Reconstituir Maps se necessário
        if (!(sceneData.objects instanceof Map)) {
            sceneData.objects = new Map(Object.entries(sceneData.objects));
        }
        if (!(sceneData.geometries instanceof Map)) {
            sceneData.geometries = new Map(Object.entries(sceneData.geometries));
        }
        if (!(sceneData.materials instanceof Map)) {
            sceneData.materials = new Map(Object.entries(sceneData.materials));
        }
        if (!(sceneData.textures instanceof Map)) {
            sceneData.textures = new Map(Object.entries(sceneData.textures));
        }
        if (!(sceneData.animations instanceof Map)) {
            sceneData.animations = new Map(Object.entries(sceneData.animations));
        }
        if (!(sceneData.skeletons instanceof Map)) {
            sceneData.skeletons = new Map(Object.entries(sceneData.skeletons));
        }

        this.currentScene = sceneData;
    }

    // ========================================================================
    // OBJECT CREATION
    // ========================================================================

    /**
     * Cria objeto vazio
     */
    createEmpty(name: string): SceneObject {
        return {
            id: this.generateId(),
            name,
            type: 'empty',
            childrenIds: [],
            transform: this.createDefaultTransform(),
            visible: true,
            enabled: true,
            layer: 0,
            tags: [],
            components: [],
            userData: {},
        };
    }

    /**
     * Cria mesh primitiva
     */
    createPrimitive(
        type: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus',
        name?: string
    ): MeshObject {
        const geometry = this.createPrimitiveGeometry(type);
        
        const mesh: MeshObject = {
            id: this.generateId(),
            name: name || type.charAt(0).toUpperCase() + type.slice(1),
            type: 'mesh',
            childrenIds: [],
            transform: this.createDefaultTransform(),
            visible: true,
            enabled: true,
            layer: 0,
            tags: [],
            components: [],
            userData: {},
            geometry,
            materials: [],
            castShadows: true,
            receiveShadows: true,
        };

        // Criar material default
        if (this.currentScene) {
            const material = this.createMaterial('Default Material', 'standard');
            this.currentScene.materials.set(material.id, material);
            mesh.materials.push(material.id);
        }

        return mesh;
    }

    /**
     * Cria câmera
     */
    createCamera(name: string, cameraType: CameraType): CameraObject {
        const camera: CameraObject = {
            id: this.generateId(),
            name,
            type: 'camera',
            childrenIds: [],
            transform: this.createDefaultTransform(),
            visible: true,
            enabled: true,
            layer: 0,
            tags: [],
            components: [],
            userData: {},
            cameraType,
            near: 0.1,
            far: 1000,
        };

        if (cameraType === 'perspective') {
            camera.fov = 60;
            camera.aspect = 16 / 9;
        } else {
            camera.left = -10;
            camera.right = 10;
            camera.top = 10;
            camera.bottom = -10;
            camera.zoom = 1;
        }

        return camera;
    }

    /**
     * Cria luz
     */
    createLight(name: string, lightType: LightType): LightObject {
        const light: LightObject = {
            id: this.generateId(),
            name,
            type: 'light',
            lightType,
            childrenIds: [],
            transform: this.createDefaultTransform(),
            visible: true,
            enabled: true,
            layer: 0,
            tags: [],
            components: [],
            userData: {},
            color: { r: 1, g: 1, b: 1 },
            intensity: 1,
            castShadows: lightType !== 'ambient',
        };

        switch (lightType) {
            case 'directional':
                light.shadowConfig = {
                    mapSize: 2048,
                    bias: -0.0001,
                    normalBias: 0.02,
                    near: 0.5,
                    far: 500,
                    cascadeCount: 4,
                };
                break;
            case 'point':
                light.range = 10;
                light.decay = 2;
                break;
            case 'spot':
                light.range = 10;
                light.decay = 2;
                light.innerConeAngle = 30;
                light.outerConeAngle = 45;
                break;
            case 'area':
                light.areaWidth = 1;
                light.areaHeight = 1;
                light.areaShape = 'rect';
                break;
        }

        return light;
    }

    /**
     * Cria sistema de partículas
     */
    createParticleSystem(name: string): ParticleSystemObject {
        return {
            id: this.generateId(),
            name,
            type: 'particle-system',
            childrenIds: [],
            transform: this.createDefaultTransform(),
            visible: true,
            enabled: true,
            layer: 0,
            tags: [],
            components: [],
            userData: {},
            emissionRate: 10,
            emissionShape: { type: 'point' },
            maxParticles: 1000,
            lifetime: { min: 1, max: 2 },
            startSpeed: { min: 5, max: 10 },
            startSize: { min: 0.1, max: 0.5 },
            startRotation: { min: 0, max: 360 },
            startColor: {
                keys: [
                    { time: 0, color: { r: 1, g: 1, b: 1 }, alpha: 1 },
                ],
            },
            gravity: { x: 0, y: -9.81, z: 0 },
            drag: 0,
            renderMode: 'billboard',
            material: '',
            sortMode: 'distance',
        };
    }

    // ========================================================================
    // MATERIALS
    // ========================================================================

    /**
     * Cria material
     */
    createMaterial(name: string, type: MaterialType): Material {
        return {
            id: this.generateId(),
            name,
            type,
            doubleSided: false,
            alphaMode: 'opaque',
            alphaCutoff: 0.5,
            baseColor: { r: 0.8, g: 0.8, b: 0.8 },
            metallic: 0,
            roughness: 0.5,
            normalScale: 1,
            aoIntensity: 1,
            emissive: { r: 0, g: 0, b: 0 },
            emissiveIntensity: 1,
            heightScale: 0.05,
        };
    }

    /**
     * Atualiza propriedades do material
     */
    updateMaterial(materialId: string, updates: Partial<Material>): void {
        if (!this.currentScene) return;

        const material = this.currentScene.materials.get(materialId);
        if (!material) return;

        Object.assign(material, updates);
    }

    // ========================================================================
    // GEOMETRY PRIMITIVES
    // ========================================================================

    private createPrimitiveGeometry(type: string): GeometryData {
        switch (type) {
            case 'cube':
                return this.createCubeGeometry();
            case 'sphere':
                return this.createSphereGeometry();
            case 'cylinder':
                return this.createCylinderGeometry();
            case 'cone':
                return this.createConeGeometry();
            case 'plane':
                return this.createPlaneGeometry();
            case 'torus':
                return this.createTorusGeometry();
            default:
                return this.createCubeGeometry();
        }
    }

    private createCubeGeometry(): GeometryData {
        const size = 1;
        const s = size / 2;

        // Positions para um cubo com normais separadas por face
        const positions = new Float32Array([
            // Front
            -s, -s,  s,   s, -s,  s,   s,  s,  s,  -s,  s,  s,
            // Back
             s, -s, -s,  -s, -s, -s,  -s,  s, -s,   s,  s, -s,
            // Top
            -s,  s,  s,   s,  s,  s,   s,  s, -s,  -s,  s, -s,
            // Bottom
            -s, -s, -s,   s, -s, -s,   s, -s,  s,  -s, -s,  s,
            // Right
             s, -s,  s,   s, -s, -s,   s,  s, -s,   s,  s,  s,
            // Left
            -s, -s, -s,  -s, -s,  s,  -s,  s,  s,  -s,  s, -s,
        ]);

        const normals = new Float32Array([
            // Front
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            // Back
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            // Bottom
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            // Left
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        ]);

        const uvs = new Float32Array([
            // Front
            0, 0, 1, 0, 1, 1, 0, 1,
            // Back
            0, 0, 1, 0, 1, 1, 0, 1,
            // Top
            0, 0, 1, 0, 1, 1, 0, 1,
            // Bottom
            0, 0, 1, 0, 1, 1, 0, 1,
            // Right
            0, 0, 1, 0, 1, 1, 0, 1,
            // Left
            0, 0, 1, 0, 1, 1, 0, 1,
        ]);

        const indices = new Uint32Array([
            0, 1, 2,    0, 2, 3,      // Front
            4, 5, 6,    4, 6, 7,      // Back
            8, 9, 10,   8, 10, 11,    // Top
            12, 13, 14, 12, 14, 15,   // Bottom
            16, 17, 18, 16, 18, 19,   // Right
            20, 21, 22, 20, 22, 23,   // Left
        ]);

        return {
            id: this.generateId(),
            name: 'Cube',
            positions,
            normals,
            uvs: [uvs],
            indices,
            boundingBox: {
                min: { x: -s, y: -s, z: -s },
                max: { x: s, y: s, z: s },
            },
            boundingSphere: {
                center: { x: 0, y: 0, z: 0 },
                radius: Math.sqrt(3) * s,
            },
        };
    }

    private createSphereGeometry(
        radius: number = 0.5,
        widthSegments: number = 32,
        heightSegments: number = 16
    ): GeometryData {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const theta = v * Math.PI;

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const phi = u * Math.PI * 2;

                const nx = Math.sin(theta) * Math.cos(phi);
                const ny = Math.cos(theta);
                const nz = Math.sin(theta) * Math.sin(phi);

                positions.push(nx * radius, ny * radius, nz * radius);
                normals.push(nx, ny, nz);
                uvs.push(u, v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + widthSegments + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        return {
            id: this.generateId(),
            name: 'Sphere',
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: [new Float32Array(uvs)],
            indices: new Uint32Array(indices),
            boundingBox: {
                min: { x: -radius, y: -radius, z: -radius },
                max: { x: radius, y: radius, z: radius },
            },
            boundingSphere: {
                center: { x: 0, y: 0, z: 0 },
                radius,
            },
        };
    }

    private createCylinderGeometry(
        radiusTop: number = 0.5,
        radiusBottom: number = 0.5,
        height: number = 1,
        radialSegments: number = 32
    ): GeometryData {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const halfHeight = height / 2;

        // Lateral
        for (let y = 0; y <= 1; y++) {
            const radius = y === 0 ? radiusBottom : radiusTop;
            const py = -halfHeight + y * height;

            for (let x = 0; x <= radialSegments; x++) {
                const u = x / radialSegments;
                const theta = u * Math.PI * 2;

                const nx = Math.cos(theta);
                const nz = Math.sin(theta);

                positions.push(nx * radius, py, nz * radius);
                normals.push(nx, 0, nz);
                uvs.push(u, y);
            }
        }

        for (let x = 0; x < radialSegments; x++) {
            const a = x;
            const b = x + radialSegments + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }

        // Caps (simplified)
        const baseIndex = positions.length / 3;

        // Bottom cap
        positions.push(0, -halfHeight, 0);
        normals.push(0, -1, 0);
        uvs.push(0.5, 0.5);

        for (let x = 0; x <= radialSegments; x++) {
            const u = x / radialSegments;
            const theta = u * Math.PI * 2;
            positions.push(Math.cos(theta) * radiusBottom, -halfHeight, Math.sin(theta) * radiusBottom);
            normals.push(0, -1, 0);
            uvs.push(0.5 + Math.cos(theta) * 0.5, 0.5 + Math.sin(theta) * 0.5);
        }

        for (let x = 0; x < radialSegments; x++) {
            indices.push(baseIndex, baseIndex + x + 2, baseIndex + x + 1);
        }

        return {
            id: this.generateId(),
            name: 'Cylinder',
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: [new Float32Array(uvs)],
            indices: new Uint32Array(indices),
            boundingBox: {
                min: { x: -Math.max(radiusTop, radiusBottom), y: -halfHeight, z: -Math.max(radiusTop, radiusBottom) },
                max: { x: Math.max(radiusTop, radiusBottom), y: halfHeight, z: Math.max(radiusTop, radiusBottom) },
            },
            boundingSphere: {
                center: { x: 0, y: 0, z: 0 },
                radius: Math.sqrt(Math.max(radiusTop, radiusBottom) ** 2 + halfHeight ** 2),
            },
        };
    }

    private createConeGeometry(): GeometryData {
        return this.createCylinderGeometry(0, 0.5, 1, 32);
    }

    private createPlaneGeometry(
        width: number = 1,
        height: number = 1,
        widthSegments: number = 1,
        heightSegments: number = 1
    ): GeometryData {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const py = -halfHeight + v * height;

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const px = -halfWidth + u * width;

                positions.push(px, 0, py);
                normals.push(0, 1, 0);
                uvs.push(u, v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + widthSegments + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        return {
            id: this.generateId(),
            name: 'Plane',
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: [new Float32Array(uvs)],
            indices: new Uint32Array(indices),
            boundingBox: {
                min: { x: -halfWidth, y: 0, z: -halfHeight },
                max: { x: halfWidth, y: 0, z: halfHeight },
            },
            boundingSphere: {
                center: { x: 0, y: 0, z: 0 },
                radius: Math.sqrt(halfWidth ** 2 + halfHeight ** 2),
            },
        };
    }

    private createTorusGeometry(
        radius: number = 0.4,
        tube: number = 0.1,
        radialSegments: number = 16,
        tubularSegments: number = 32
    ): GeometryData {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let j = 0; j <= radialSegments; j++) {
            const v = j / radialSegments;
            const theta = v * Math.PI * 2;

            for (let i = 0; i <= tubularSegments; i++) {
                const u = i / tubularSegments;
                const phi = u * Math.PI * 2;

                const nx = Math.cos(phi) * Math.cos(theta);
                const ny = Math.sin(theta);
                const nz = Math.sin(phi) * Math.cos(theta);

                positions.push(
                    (radius + tube * Math.cos(theta)) * Math.cos(phi),
                    tube * Math.sin(theta),
                    (radius + tube * Math.cos(theta)) * Math.sin(phi)
                );
                normals.push(nx, ny, nz);
                uvs.push(u, v);
            }
        }

        for (let j = 0; j < radialSegments; j++) {
            for (let i = 0; i < tubularSegments; i++) {
                const a = j * (tubularSegments + 1) + i;
                const b = a + tubularSegments + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        const outerRadius = radius + tube;

        return {
            id: this.generateId(),
            name: 'Torus',
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: [new Float32Array(uvs)],
            indices: new Uint32Array(indices),
            boundingBox: {
                min: { x: -outerRadius, y: -tube, z: -outerRadius },
                max: { x: outerRadius, y: tube, z: outerRadius },
            },
            boundingSphere: {
                center: { x: 0, y: 0, z: 0 },
                radius: outerRadius,
            },
        };
    }

    // ========================================================================
    // SCENE OPERATIONS
    // ========================================================================

    private addObjectToScene(scene: Scene3D, object: SceneObject): void {
        scene.objects.set(object.id, object);
        if (!object.parentId) {
            scene.rootObjects.push(object.id);
        }
    }

    /**
     * Adiciona objeto à cena atual
     */
    addObject(object: SceneObject): void {
        if (!this.currentScene) return;
        this.addObjectToScene(this.currentScene, object);
    }

    /**
     * Remove objeto da cena
     */
    removeObject(objectId: string): void {
        if (!this.currentScene) return;

        const object = this.currentScene.objects.get(objectId);
        if (!object) return;

        // Remover filhos recursivamente
        for (const childId of object.childrenIds) {
            this.removeObject(childId);
        }

        // Remover da lista de filhos do pai
        if (object.parentId) {
            const parent = this.currentScene.objects.get(object.parentId);
            if (parent) {
                parent.childrenIds = parent.childrenIds.filter(id => id !== objectId);
            }
        }

        // Remover de root objects
        this.currentScene.rootObjects = this.currentScene.rootObjects.filter(id => id !== objectId);

        // Remover da cena
        this.currentScene.objects.delete(objectId);
    }

    /**
     * Duplica objeto
     */
    duplicateObject(objectId: string): SceneObject | null {
        if (!this.currentScene) return null;

        const original = this.currentScene.objects.get(objectId);
        if (!original) return null;

        const duplicate = JSON.parse(JSON.stringify(original)) as SceneObject;
        duplicate.id = this.generateId();
        duplicate.name = `${original.name} (copy)`;
        duplicate.childrenIds = [];

        // Duplicar filhos
        for (const childId of original.childrenIds) {
            const childDuplicate = this.duplicateObject(childId);
            if (childDuplicate) {
                childDuplicate.parentId = duplicate.id;
                duplicate.childrenIds.push(childDuplicate.id);
            }
        }

        this.addObject(duplicate);
        return duplicate;
    }

    /**
     * Define pai do objeto
     */
    setParent(objectId: string, parentId: string | null): void {
        if (!this.currentScene) return;

        const object = this.currentScene.objects.get(objectId);
        if (!object) return;

        // Remover do pai anterior
        if (object.parentId) {
            const oldParent = this.currentScene.objects.get(object.parentId);
            if (oldParent) {
                oldParent.childrenIds = oldParent.childrenIds.filter(id => id !== objectId);
            }
        } else {
            this.currentScene.rootObjects = this.currentScene.rootObjects.filter(id => id !== objectId);
        }

        // Adicionar ao novo pai
        if (parentId) {
            const newParent = this.currentScene.objects.get(parentId);
            if (newParent) {
                object.parentId = parentId;
                newParent.childrenIds.push(objectId);
            }
        } else {
            object.parentId = undefined;
            this.currentScene.rootObjects.push(objectId);
        }
    }

    // ========================================================================
    // TRANSFORM OPERATIONS
    // ========================================================================

    /**
     * Define posição do objeto
     */
    setPosition(objectId: string, position: Vector3): void {
        const object = this.currentScene?.objects.get(objectId);
        if (object) {
            object.transform.position = { ...position };
        }
    }

    /**
     * Define rotação do objeto (Euler)
     */
    setRotationEuler(objectId: string, euler: Vector3): void {
        const object = this.currentScene?.objects.get(objectId);
        if (object) {
            object.transform.eulerAngles = { ...euler };
            object.transform.rotation = this.eulerToQuaternion(euler);
        }
    }

    /**
     * Define escala do objeto
     */
    setScale(objectId: string, scale: Vector3): void {
        const object = this.currentScene?.objects.get(objectId);
        if (object) {
            object.transform.scale = { ...scale };
        }
    }

    /**
     * Converte Euler para Quaternion
     */
    private eulerToQuaternion(euler: Vector3): Quaternion {
        const c1 = Math.cos(euler.x * Math.PI / 360);
        const c2 = Math.cos(euler.y * Math.PI / 360);
        const c3 = Math.cos(euler.z * Math.PI / 360);
        const s1 = Math.sin(euler.x * Math.PI / 360);
        const s2 = Math.sin(euler.y * Math.PI / 360);
        const s3 = Math.sin(euler.z * Math.PI / 360);

        return {
            x: s1 * c2 * c3 + c1 * s2 * s3,
            y: c1 * s2 * c3 - s1 * c2 * s3,
            z: c1 * c2 * s3 + s1 * s2 * c3,
            w: c1 * c2 * c3 - s1 * s2 * s3,
        };
    }

    /**
     * Calcula matriz local
     */
    computeLocalMatrix(transform: Transform3D): Matrix4 {
        const { position, rotation, scale } = transform;
        const elements = new Float32Array(16);

        // Quaternion para matriz de rotação
        const x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        elements[0] = (1 - (yy + zz)) * scale.x;
        elements[1] = (xy + wz) * scale.x;
        elements[2] = (xz - wy) * scale.x;
        elements[3] = 0;

        elements[4] = (xy - wz) * scale.y;
        elements[5] = (1 - (xx + zz)) * scale.y;
        elements[6] = (yz + wx) * scale.y;
        elements[7] = 0;

        elements[8] = (xz + wy) * scale.z;
        elements[9] = (yz - wx) * scale.z;
        elements[10] = (1 - (xx + yy)) * scale.z;
        elements[11] = 0;

        elements[12] = position.x;
        elements[13] = position.y;
        elements[14] = position.z;
        elements[15] = 1;

        return { elements };
    }

    // ========================================================================
    // ANIMATION
    // ========================================================================

    /**
     * Cria animation clip
     */
    createAnimationClip(name: string, duration: number): AnimationClip {
        return {
            id: this.generateId(),
            name,
            duration,
            tracks: [],
        };
    }

    /**
     * Adiciona track à animação
     */
    addAnimationTrack(
        clipId: string,
        targetId: string,
        targetProperty: string,
        keyframes: Array<{ time: number; value: number | number[] }>
    ): void {
        if (!this.currentScene) return;

        const clip = this.currentScene.animations.get(clipId);
        if (!clip) return;

        const times = new Float32Array(keyframes.map(k => k.time));
        const values: number[] = [];
        keyframes.forEach(k => {
            if (Array.isArray(k.value)) {
                values.push(...k.value);
            } else {
                values.push(k.value);
            }
        });

        clip.tracks.push({
            targetId,
            targetProperty,
            interpolation: 'linear',
            times,
            values: new Float32Array(values),
        });
    }

    /**
     * Sample animation at time
     */
    sampleAnimation(clipId: string, time: number): Map<string, Record<string, number | number[]>> {
        const results = new Map<string, Record<string, number | number[]>>();
        
        if (!this.currentScene) return results;

        const clip = this.currentScene.animations.get(clipId);
        if (!clip) return results;

        for (const track of clip.tracks) {
            // Encontrar keyframes adjacentes
            let i = 0;
            while (i < track.times.length - 1 && track.times[i + 1] < time) {
                i++;
            }

            const t0 = track.times[i];
            const t1 = track.times[Math.min(i + 1, track.times.length - 1)];
            const alpha = t1 !== t0 ? (time - t0) / (t1 - t0) : 0;

            // Determinar número de valores por keyframe
            const valuesPerKey = track.values.length / track.times.length;
            const start = i * valuesPerKey;

            // Interpolar
            const value: number[] = [];
            for (let j = 0; j < valuesPerKey; j++) {
                const v0 = track.values[start + j];
                const v1 = track.values[Math.min((i + 1) * valuesPerKey + j, track.values.length - 1)];
                value.push(v0 + (v1 - v0) * alpha);
            }

            if (!results.has(track.targetId)) {
                results.set(track.targetId, {});
            }
            results.get(track.targetId)![track.targetProperty] = 
                value.length === 1 ? value[0] : value;
        }

        return results;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private createDefaultTransform(): Transform3D {
        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
        };
    }

    private generateId(): string {
        return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtém cena atual
     */
    getCurrentScene(): Scene3D | null {
        return this.currentScene;
    }

    /**
     * Obtém objeto por ID
     */
    getObject(objectId: string): SceneObject | undefined {
        return this.currentScene?.objects.get(objectId);
    }

    /**
     * Lista todos os objetos
     */
    getAllObjects(): SceneObject[] {
        if (!this.currentScene) return [];
        return Array.from(this.currentScene.objects.values());
    }

    /**
     * Seleciona objetos
     */
    setSelection(objectIds: string[]): void {
        if (this.currentScene) {
            this.currentScene.selectedIds = [...objectIds];
        }
    }

    /**
     * Obtém seleção
     */
    getSelection(): string[] {
        return this.currentScene?.selectedIds || [];
    }
}
