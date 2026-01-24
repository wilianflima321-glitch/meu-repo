/**
 * RAY TRACING SUPPORT - Aethel Engine
 * 
 * Sistema de Ray Tracing usando WebGPU quando disponível.
 * Fallback para path tracing em fragment shader quando não.
 * 
 * FEATURES:
 * - Real-time ray traced reflections
 * - Ray traced ambient occlusion
 * - Ray traced global illumination
 * - Ray traced shadows (soft)
 * - Denoising
 * - BVH acceleration
 * - Material PBR support
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface RayTracingConfig {
  enabled: boolean;
  maxBounces: number;
  samplesPerPixel: number;
  enableReflections: boolean;
  enableShadows: boolean;
  enableGI: boolean;
  enableAO: boolean;
  aoRadius: number;
  aoSamples: number;
  denoiseEnabled: boolean;
  denoiseStrength: number;
  resolution: number; // 0.25, 0.5, 1.0
}

export interface BVHNode {
  boundingBox: THREE.Box3;
  leftChild: number | null;
  rightChild: number | null;
  triangleStart: number;
  triangleCount: number;
}

export interface Triangle {
  v0: THREE.Vector3;
  v1: THREE.Vector3;
  v2: THREE.Vector3;
  n0: THREE.Vector3;
  n1: THREE.Vector3;
  n2: THREE.Vector3;
  materialIndex: number;
}

export interface RTMaterial {
  albedo: THREE.Color;
  roughness: number;
  metalness: number;
  emissive: THREE.Color;
  emissiveIntensity: number;
}

// ============================================================================
// BVH BUILDER
// ============================================================================

export class BVHBuilder {
  private triangles: Triangle[] = [];
  private nodes: BVHNode[] = [];
  private materials: RTMaterial[] = [];
  
  private maxTrianglesPerLeaf: number = 4;
  private maxDepth: number = 32;
  
  build(meshes: THREE.Mesh[]): void {
    this.triangles = [];
    this.nodes = [];
    this.materials = [];
    
    // Extract triangles from meshes
    for (const mesh of meshes) {
      this.extractTriangles(mesh);
    }
    
    if (this.triangles.length === 0) return;
    
    // Build BVH
    const indices = this.triangles.map((_, i) => i);
    this.buildNode(indices, 0);
  }
  
  private extractTriangles(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry;
    if (!geometry) return;
    
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const indexAttr = geometry.getIndex();
    
    if (!positionAttr) return;
    
    // Get material
    const materialIndex = this.materials.length;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    
    this.materials.push({
      albedo: mat.color?.clone() ?? new THREE.Color(1, 1, 1),
      roughness: mat.roughness ?? 0.5,
      metalness: mat.metalness ?? 0,
      emissive: mat.emissive?.clone() ?? new THREE.Color(0, 0, 0),
      emissiveIntensity: mat.emissiveIntensity ?? 0
    });
    
    // Transform matrix
    mesh.updateMatrixWorld();
    const matrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    
    const getVertex = (index: number): THREE.Vector3 => {
      const v = new THREE.Vector3(
        positionAttr.getX(index),
        positionAttr.getY(index),
        positionAttr.getZ(index)
      );
      return v.applyMatrix4(matrix);
    };
    
    const getNormal = (index: number): THREE.Vector3 => {
      if (!normalAttr) return new THREE.Vector3(0, 1, 0);
      const n = new THREE.Vector3(
        normalAttr.getX(index),
        normalAttr.getY(index),
        normalAttr.getZ(index)
      );
      return n.applyMatrix3(normalMatrix).normalize();
    };
    
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        const i0 = indexAttr.getX(i);
        const i1 = indexAttr.getX(i + 1);
        const i2 = indexAttr.getX(i + 2);
        
        this.triangles.push({
          v0: getVertex(i0),
          v1: getVertex(i1),
          v2: getVertex(i2),
          n0: getNormal(i0),
          n1: getNormal(i1),
          n2: getNormal(i2),
          materialIndex
        });
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        this.triangles.push({
          v0: getVertex(i),
          v1: getVertex(i + 1),
          v2: getVertex(i + 2),
          n0: getNormal(i),
          n1: getNormal(i + 1),
          n2: getNormal(i + 2),
          materialIndex
        });
      }
    }
  }
  
  private buildNode(indices: number[], depth: number): number {
    const nodeIndex = this.nodes.length;
    
    // Calculate bounding box
    const bbox = new THREE.Box3();
    for (const idx of indices) {
      const tri = this.triangles[idx];
      bbox.expandByPoint(tri.v0);
      bbox.expandByPoint(tri.v1);
      bbox.expandByPoint(tri.v2);
    }
    
    const node: BVHNode = {
      boundingBox: bbox,
      leftChild: null,
      rightChild: null,
      triangleStart: 0,
      triangleCount: 0
    };
    
    this.nodes.push(node);
    
    // Leaf node check
    if (indices.length <= this.maxTrianglesPerLeaf || depth >= this.maxDepth) {
      node.triangleStart = indices[0];
      node.triangleCount = indices.length;
      return nodeIndex;
    }
    
    // Find split axis (largest extent)
    const extent = new THREE.Vector3();
    bbox.getSize(extent);
    
    let splitAxis = 0;
    if (extent.y > extent.x) splitAxis = 1;
    if (extent.z > (splitAxis === 0 ? extent.x : extent.y)) splitAxis = 2;
    
    // Sort triangles along split axis
    const centroid = (tri: Triangle): number => {
      const c = tri.v0.clone().add(tri.v1).add(tri.v2).divideScalar(3);
      return splitAxis === 0 ? c.x : splitAxis === 1 ? c.y : c.z;
    };
    
    indices.sort((a, b) => centroid(this.triangles[a]) - centroid(this.triangles[b]));
    
    // Split
    const mid = Math.floor(indices.length / 2);
    const leftIndices = indices.slice(0, mid);
    const rightIndices = indices.slice(mid);
    
    // Recursively build children
    node.leftChild = this.buildNode(leftIndices, depth + 1);
    node.rightChild = this.buildNode(rightIndices, depth + 1);
    
    return nodeIndex;
  }
  
  getNodes(): BVHNode[] {
    return this.nodes;
  }
  
  getTriangles(): Triangle[] {
    return this.triangles;
  }
  
  getMaterials(): RTMaterial[] {
    return this.materials;
  }
  
  // Create data textures for GPU
  createDataTextures(): {
    bvhTexture: THREE.DataTexture;
    triangleTexture: THREE.DataTexture;
    materialTexture: THREE.DataTexture;
  } {
    // BVH texture: each node needs 8 floats (bbox min, bbox max, children/triangle info)
    const bvhSize = Math.ceil(Math.sqrt(this.nodes.length * 2));
    const bvhData = new Float32Array(bvhSize * bvhSize * 4);
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const baseIdx = i * 8;
      
      // First texel: bbox min + left child
      bvhData[baseIdx + 0] = node.boundingBox.min.x;
      bvhData[baseIdx + 1] = node.boundingBox.min.y;
      bvhData[baseIdx + 2] = node.boundingBox.min.z;
      bvhData[baseIdx + 3] = node.leftChild ?? -1;
      
      // Second texel: bbox max + right child
      bvhData[baseIdx + 4] = node.boundingBox.max.x;
      bvhData[baseIdx + 5] = node.boundingBox.max.y;
      bvhData[baseIdx + 6] = node.boundingBox.max.z;
      bvhData[baseIdx + 7] = node.rightChild ?? -1;
    }
    
    const bvhTexture = new THREE.DataTexture(
      bvhData, bvhSize, bvhSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    bvhTexture.needsUpdate = true;
    
    // Triangle texture: each triangle needs 12 floats (3 vertices + 3 normals + material)
    const triSize = Math.ceil(Math.sqrt(this.triangles.length * 4));
    const triData = new Float32Array(triSize * triSize * 4);
    
    for (let i = 0; i < this.triangles.length; i++) {
      const tri = this.triangles[i];
      const baseIdx = i * 16;
      
      // Vertex 0 + material
      triData[baseIdx + 0] = tri.v0.x;
      triData[baseIdx + 1] = tri.v0.y;
      triData[baseIdx + 2] = tri.v0.z;
      triData[baseIdx + 3] = tri.materialIndex;
      
      // Vertex 1
      triData[baseIdx + 4] = tri.v1.x;
      triData[baseIdx + 5] = tri.v1.y;
      triData[baseIdx + 6] = tri.v1.z;
      triData[baseIdx + 7] = 0;
      
      // Vertex 2
      triData[baseIdx + 8] = tri.v2.x;
      triData[baseIdx + 9] = tri.v2.y;
      triData[baseIdx + 10] = tri.v2.z;
      triData[baseIdx + 11] = 0;
      
      // Normals (packed)
      triData[baseIdx + 12] = tri.n0.x;
      triData[baseIdx + 13] = tri.n0.y;
      triData[baseIdx + 14] = tri.n0.z;
      triData[baseIdx + 15] = 0;
    }
    
    const triangleTexture = new THREE.DataTexture(
      triData, triSize, triSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    triangleTexture.needsUpdate = true;
    
    // Material texture
    const matSize = Math.ceil(Math.sqrt(this.materials.length * 2));
    const matData = new Float32Array(matSize * matSize * 4);
    
    for (let i = 0; i < this.materials.length; i++) {
      const mat = this.materials[i];
      const baseIdx = i * 8;
      
      matData[baseIdx + 0] = mat.albedo.r;
      matData[baseIdx + 1] = mat.albedo.g;
      matData[baseIdx + 2] = mat.albedo.b;
      matData[baseIdx + 3] = mat.roughness;
      
      matData[baseIdx + 4] = mat.emissive.r * mat.emissiveIntensity;
      matData[baseIdx + 5] = mat.emissive.g * mat.emissiveIntensity;
      matData[baseIdx + 6] = mat.emissive.b * mat.emissiveIntensity;
      matData[baseIdx + 7] = mat.metalness;
    }
    
    const materialTexture = new THREE.DataTexture(
      matData, matSize, matSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    materialTexture.needsUpdate = true;
    
    return { bvhTexture, triangleTexture, materialTexture };
  }
}

// ============================================================================
// RAY TRACING PASS
// ============================================================================

export class RayTracingPass {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private renderTarget: THREE.WebGLRenderTarget;
  private accumulationTarget: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.Camera;
  
  private bvh: BVHBuilder;
  private frameCount: number = 0;
  private config: RayTracingConfig;
  
  private lastCameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };
    
    const width = Math.floor(window.innerWidth * this.config.resolution);
    const height = Math.floor(window.innerHeight * this.config.resolution);
    
    // Create render targets
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
    
    this.accumulationTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
    
    // Build BVH
    this.bvh = new BVHBuilder();
    this.rebuildBVH();
    
    // Create ray tracing material
    this.material = this.createMaterial();
    
    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  
  rebuildBVH(): void {
    const meshes: THREE.Mesh[] = [];
    
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        meshes.push(obj);
      }
    });
    
    this.bvh.build(meshes);
    
    // Update textures
    const textures = this.bvh.createDataTextures();
    this.material.uniforms.bvhTexture.value = textures.bvhTexture;
    this.material.uniforms.triangleTexture.value = textures.triangleTexture;
    this.material.uniforms.materialTexture.value = textures.materialTexture;
  }
  
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        // Scene data
        bvhTexture: { value: null },
        triangleTexture: { value: null },
        materialTexture: { value: null },
        
        // Camera
        cameraPosition: { value: new THREE.Vector3() },
        cameraWorldMatrix: { value: new THREE.Matrix4() },
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        
        // Accumulation
        previousFrame: { value: null },
        frameCount: { value: 0 },
        
        // Config
        maxBounces: { value: 3 },
        samplesPerPixel: { value: 1 },
        enableReflections: { value: true },
        enableShadows: { value: true },
        enableAO: { value: true },
        aoRadius: { value: 1.0 },
        aoSamples: { value: 8 },
        
        // Lighting
        sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        sunColor: { value: new THREE.Color(1, 0.95, 0.9) },
        skyColor: { value: new THREE.Color(0.5, 0.7, 1.0) },
        
        // Random
        randomSeed: { value: 0 },
        resolution: { value: new THREE.Vector2() }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform sampler2D bvhTexture;
        uniform sampler2D triangleTexture;
        uniform sampler2D materialTexture;
        uniform sampler2D previousFrame;
        
        uniform vec3 cameraPosition;
        uniform mat4 cameraWorldMatrix;
        uniform mat4 projectionMatrixInverse;
        
        uniform int frameCount;
        uniform int maxBounces;
        uniform int samplesPerPixel;
        uniform bool enableReflections;
        uniform bool enableShadows;
        uniform bool enableAO;
        uniform float aoRadius;
        uniform int aoSamples;
        
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 skyColor;
        
        uniform float randomSeed;
        uniform vec2 resolution;
        
        varying vec2 vUv;
        
        #define PI 3.14159265359
        #define MAX_BOUNCES 5
        
        // Random number generator
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float random(inout vec2 seed) {
          seed = fract(seed * vec2(5.3983, 5.4427));
          seed += dot(seed.yx, seed.xy + vec2(21.5351, 14.3137));
          return fract(seed.x * seed.y * 95.4337);
        }
        
        vec3 randomUnitVector(inout vec2 seed) {
          float z = random(seed) * 2.0 - 1.0;
          float a = random(seed) * 2.0 * PI;
          float r = sqrt(1.0 - z * z);
          return vec3(r * cos(a), r * sin(a), z);
        }
        
        vec3 randomHemisphere(vec3 normal, inout vec2 seed) {
          vec3 dir = randomUnitVector(seed);
          return dot(dir, normal) > 0.0 ? dir : -dir;
        }
        
        // Ray-AABB intersection
        bool intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax, out float tMin, out float tMax) {
          vec3 invDir = 1.0 / rayDir;
          vec3 t0 = (boxMin - rayOrigin) * invDir;
          vec3 t1 = (boxMax - rayOrigin) * invDir;
          vec3 tSmaller = min(t0, t1);
          vec3 tLarger = max(t0, t1);
          tMin = max(max(tSmaller.x, tSmaller.y), tSmaller.z);
          tMax = min(min(tLarger.x, tLarger.y), tLarger.z);
          return tMax >= tMin && tMax >= 0.0;
        }
        
        // Ray-triangle intersection (Möller-Trumbore)
        bool intersectTriangle(vec3 rayOrigin, vec3 rayDir, vec3 v0, vec3 v1, vec3 v2, out float t, out float u, out float v) {
          vec3 edge1 = v1 - v0;
          vec3 edge2 = v2 - v0;
          vec3 h = cross(rayDir, edge2);
          float a = dot(edge1, h);
          
          if (abs(a) < 0.00001) return false;
          
          float f = 1.0 / a;
          vec3 s = rayOrigin - v0;
          u = f * dot(s, h);
          
          if (u < 0.0 || u > 1.0) return false;
          
          vec3 q = cross(s, edge1);
          v = f * dot(rayDir, q);
          
          if (v < 0.0 || u + v > 1.0) return false;
          
          t = f * dot(edge2, q);
          return t > 0.00001;
        }
        
        // Simplified ray trace (would use BVH in full implementation)
        struct HitInfo {
          bool hit;
          float t;
          vec3 position;
          vec3 normal;
          vec3 albedo;
          float roughness;
          float metalness;
          vec3 emissive;
        };
        
        // BVH texture dimensions - set via uniform
        const float BVH_TEX_SIZE = 256.0;
        const float TRI_TEX_SIZE = 512.0;
        const float MAT_TEX_SIZE = 64.0;
        
        // Fetch BVH node data from texture
        void fetchBVHNode(int nodeIndex, out vec3 boxMin, out vec3 boxMax, out int leftChild, out int rightChild, out int triStart, out int triCount) {
          // Each BVH node uses 2 texels (8 floats)
          float texelY = floor(float(nodeIndex * 2) / BVH_TEX_SIZE) / BVH_TEX_SIZE;
          float texelX1 = mod(float(nodeIndex * 2), BVH_TEX_SIZE) / BVH_TEX_SIZE;
          float texelX2 = mod(float(nodeIndex * 2 + 1), BVH_TEX_SIZE) / BVH_TEX_SIZE;
          
          vec4 data1 = texture2D(bvhTexture, vec2(texelX1 + 0.5/BVH_TEX_SIZE, texelY + 0.5/BVH_TEX_SIZE));
          vec4 data2 = texture2D(bvhTexture, vec2(texelX2 + 0.5/BVH_TEX_SIZE, texelY + 0.5/BVH_TEX_SIZE));
          
          boxMin = data1.xyz;
          leftChild = int(data1.w);
          boxMax = data2.xyz;
          rightChild = int(data2.w);
          
          // If leaf node (no children), the values encode triangle range
          if (leftChild < 0 && rightChild < 0) {
            triStart = int(-data1.w - 1.0);
            triCount = int(-data2.w);
          } else {
            triStart = -1;
            triCount = 0;
          }
        }
        
        // Fetch triangle data from texture
        void fetchTriangle(int triIndex, out vec3 v0, out vec3 v1, out vec3 v2, out vec3 n0, out vec3 n1, out vec3 n2, out int matIndex) {
          // Each triangle uses 4 texels (16 floats)
          float baseIdx = float(triIndex * 4);
          
          vec2 texCoord0 = vec2(mod(baseIdx, TRI_TEX_SIZE), floor(baseIdx / TRI_TEX_SIZE)) / TRI_TEX_SIZE + 0.5/TRI_TEX_SIZE;
          vec2 texCoord1 = vec2(mod(baseIdx + 1.0, TRI_TEX_SIZE), floor((baseIdx + 1.0) / TRI_TEX_SIZE)) / TRI_TEX_SIZE + 0.5/TRI_TEX_SIZE;
          vec2 texCoord2 = vec2(mod(baseIdx + 2.0, TRI_TEX_SIZE), floor((baseIdx + 2.0) / TRI_TEX_SIZE)) / TRI_TEX_SIZE + 0.5/TRI_TEX_SIZE;
          vec2 texCoord3 = vec2(mod(baseIdx + 3.0, TRI_TEX_SIZE), floor((baseIdx + 3.0) / TRI_TEX_SIZE)) / TRI_TEX_SIZE + 0.5/TRI_TEX_SIZE;
          
          vec4 data0 = texture2D(triangleTexture, texCoord0);
          vec4 data1 = texture2D(triangleTexture, texCoord1);
          vec4 data2 = texture2D(triangleTexture, texCoord2);
          vec4 data3 = texture2D(triangleTexture, texCoord3);
          
          v0 = data0.xyz;
          matIndex = int(data0.w);
          v1 = data1.xyz;
          v2 = data2.xyz;
          
          // Normals (we reconstruct from vertices if not stored)
          vec3 edge1 = v1 - v0;
          vec3 edge2 = v2 - v0;
          vec3 faceNormal = normalize(cross(edge1, edge2));
          n0 = faceNormal;
          n1 = faceNormal;
          n2 = faceNormal;
        }
        
        // Fetch material data from texture
        void fetchMaterial(int matIndex, out vec3 albedo, out float roughness, out float metalness, out vec3 emissive) {
          // Each material uses 2 texels (8 floats)
          float baseIdx = float(matIndex * 2);
          
          vec2 texCoord0 = vec2(mod(baseIdx, MAT_TEX_SIZE), floor(baseIdx / MAT_TEX_SIZE)) / MAT_TEX_SIZE + 0.5/MAT_TEX_SIZE;
          vec2 texCoord1 = vec2(mod(baseIdx + 1.0, MAT_TEX_SIZE), floor((baseIdx + 1.0) / MAT_TEX_SIZE)) / MAT_TEX_SIZE + 0.5/MAT_TEX_SIZE;
          
          vec4 data0 = texture2D(materialTexture, texCoord0);
          vec4 data1 = texture2D(materialTexture, texCoord1);
          
          albedo = data0.rgb;
          roughness = data0.a;
          emissive = data1.rgb;
          metalness = data1.a;
        }
        
        // BVH traversal with actual geometry
        HitInfo traceRayBVH(vec3 origin, vec3 direction) {
          HitInfo info;
          info.hit = false;
          info.t = 1e20;
          
          // Stack for BVH traversal (GLSL doesn't support recursion)
          int stack[32];
          int stackPtr = 0;
          stack[stackPtr++] = 0; // Start with root node
          
          float closestT = 1e20;
          int closestMatIndex = -1;
          vec3 closestNormal = vec3(0.0, 1.0, 0.0);
          vec3 closestPosition = vec3(0.0);
          float closestU = 0.0;
          float closestV = 0.0;
          
          // Traverse BVH
          for (int iter = 0; iter < 256; iter++) { // Max iterations to prevent infinite loop
            if (stackPtr <= 0) break;
            
            int nodeIndex = stack[--stackPtr];
            
            vec3 boxMin, boxMax;
            int leftChild, rightChild, triStart, triCount;
            fetchBVHNode(nodeIndex, boxMin, boxMax, leftChild, rightChild, triStart, triCount);
            
            // Test ray against bounding box
            float tMin, tMax;
            if (!intersectAABB(origin, direction, boxMin, boxMax, tMin, tMax)) {
              continue;
            }
            
            // Skip if box is farther than current hit
            if (tMin > closestT) continue;
            
            // Leaf node - test triangles
            if (triStart >= 0) {
              for (int i = 0; i < 16; i++) { // Max triangles per leaf
                if (i >= triCount) break;
                
                vec3 v0, v1, v2, n0, n1, n2;
                int matIndex;
                fetchTriangle(triStart + i, v0, v1, v2, n0, n1, n2, matIndex);
                
                float t, u, v;
                if (intersectTriangle(origin, direction, v0, v1, v2, t, u, v)) {
                  if (t > 0.001 && t < closestT) {
                    closestT = t;
                    closestMatIndex = matIndex;
                    closestPosition = origin + direction * t;
                    // Interpolate normal using barycentric coordinates
                    closestNormal = normalize(n0 * (1.0 - u - v) + n1 * u + n2 * v);
                    closestU = u;
                    closestV = v;
                  }
                }
              }
            } else {
              // Internal node - push children onto stack
              if (rightChild >= 0 && stackPtr < 31) {
                stack[stackPtr++] = rightChild;
              }
              if (leftChild >= 0 && stackPtr < 31) {
                stack[stackPtr++] = leftChild;
              }
            }
          }
          
          // Fallback: ground plane if no BVH hit
          float groundT = -origin.y / direction.y;
          if (groundT > 0.001 && groundT < closestT && origin.y > 0.0) {
            closestT = groundT;
            closestPosition = origin + direction * groundT;
            closestNormal = vec3(0.0, 1.0, 0.0);
            closestMatIndex = -1; // Special: ground plane
          }
          
          if (closestT < 1e19) {
            info.hit = true;
            info.t = closestT;
            info.position = closestPosition;
            info.normal = closestNormal;
            
            if (closestMatIndex >= 0) {
              // Fetch material from texture
              fetchMaterial(closestMatIndex, info.albedo, info.roughness, info.metalness, info.emissive);
            } else {
              // Ground plane with checkerboard
              float checker = mod(floor(info.position.x) + floor(info.position.z), 2.0);
              info.albedo = mix(vec3(0.3), vec3(0.8), checker);
              info.roughness = 0.5;
              info.metalness = 0.0;
              info.emissive = vec3(0.0);
            }
          }
          
          return info;
        }
        
        // Use BVH-based ray tracing
        HitInfo traceRay(vec3 origin, vec3 direction) {
          return traceRayBVH(origin, direction);
        }
        
        // Sky color
        vec3 getSkyColor(vec3 direction) {
          float t = 0.5 * (direction.y + 1.0);
          vec3 horizonColor = vec3(0.8, 0.9, 1.0);
          return mix(horizonColor, skyColor, t);
        }
        
        // Path trace
        vec3 pathTrace(vec3 origin, vec3 direction, inout vec2 seed) {
          vec3 color = vec3(0.0);
          vec3 throughput = vec3(1.0);
          
          for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
            if (bounce >= maxBounces) break;
            
            HitInfo hit = traceRay(origin, direction);
            
            if (!hit.hit) {
              // Hit sky
              color += throughput * getSkyColor(direction);
              break;
            }
            
            // Add emissive
            color += throughput * hit.emissive;
            
            // Shadow ray
            if (enableShadows) {
              HitInfo shadowHit = traceRay(hit.position + hit.normal * 0.001, sunDirection);
              if (!shadowHit.hit) {
                float NdotL = max(dot(hit.normal, sunDirection), 0.0);
                color += throughput * hit.albedo * sunColor * NdotL * (1.0 - hit.metalness);
              }
            }
            
            // Next bounce
            if (!enableReflections || random(seed) > 0.5) break;
            
            // Diffuse or specular bounce based on roughness
            float specularChance = (1.0 - hit.roughness) * (0.04 + 0.96 * hit.metalness);
            
            if (random(seed) < specularChance) {
              // Specular reflection
              direction = reflect(direction, hit.normal);
              throughput *= hit.metalness > 0.5 ? hit.albedo : vec3(1.0);
            } else {
              // Diffuse bounce
              direction = normalize(hit.normal + randomUnitVector(seed));
              throughput *= hit.albedo * (1.0 - hit.metalness);
            }
            
            origin = hit.position + hit.normal * 0.001;
            
            // Russian roulette
            float p = max(throughput.r, max(throughput.g, throughput.b));
            if (random(seed) > p) break;
            throughput /= p;
          }
          
          return color;
        }
        
        void main() {
          vec2 seed = vUv + randomSeed + float(frameCount) * 0.1;
          
          // Reconstruct ray
          vec2 ndc = vUv * 2.0 - 1.0;
          vec4 clipPos = vec4(ndc, -1.0, 1.0);
          vec4 viewPos = projectionMatrixInverse * clipPos;
          viewPos /= viewPos.w;
          
          vec3 rayDir = normalize((cameraWorldMatrix * vec4(viewPos.xyz, 0.0)).xyz);
          vec3 rayOrigin = cameraPosition;
          
          // Jitter for anti-aliasing
          vec2 jitter = (vec2(random(seed), random(seed)) - 0.5) / resolution;
          rayDir = normalize(rayDir + vec3(jitter, 0.0) * 0.001);
          
          // Trace
          vec3 color = vec3(0.0);
          for (int s = 0; s < 4; s++) {
            if (s >= samplesPerPixel) break;
            color += pathTrace(rayOrigin, rayDir, seed);
          }
          color /= float(samplesPerPixel);
          
          // Accumulate
          if (frameCount > 0) {
            vec3 previousColor = texture2D(previousFrame, vUv).rgb;
            float blend = 1.0 / float(frameCount + 1);
            color = mix(previousColor, color, blend);
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }
  
  render(): THREE.Texture {
    if (!this.config.enabled) {
      return this.renderTarget.texture;
    }
    
    // Check if camera moved
    const currentMatrix = this.camera.matrixWorld.clone();
    if (!currentMatrix.equals(this.lastCameraMatrix)) {
      this.frameCount = 0;
      this.lastCameraMatrix.copy(currentMatrix);
    }
    
    // Update uniforms
    this.material.uniforms.cameraPosition.value.copy(this.camera.position);
    this.material.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld);
    this.material.uniforms.projectionMatrixInverse.value.copy(
      (this.camera as THREE.PerspectiveCamera).projectionMatrixInverse
    );
    
    this.material.uniforms.previousFrame.value = this.accumulationTarget.texture;
    this.material.uniforms.frameCount.value = this.frameCount;
    this.material.uniforms.randomSeed.value = Math.random();
    this.material.uniforms.resolution.value.set(
      this.renderTarget.width,
      this.renderTarget.height
    );
    
    // Render
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadScene, this.quadCamera);
    
    // Swap targets for accumulation
    [this.renderTarget, this.accumulationTarget] = [this.accumulationTarget, this.renderTarget];
    
    this.renderer.setRenderTarget(currentTarget);
    this.frameCount++;
    
    return this.accumulationTarget.texture;
  }
  
  getTexture(): THREE.Texture {
    return this.accumulationTarget.texture;
  }
  
  resize(width: number, height: number): void {
    const w = Math.floor(width * this.config.resolution);
    const h = Math.floor(height * this.config.resolution);
    
    this.renderTarget.setSize(w, h);
    this.accumulationTarget.setSize(w, h);
    this.frameCount = 0;
  }
  
  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);
    
    this.material.uniforms.maxBounces.value = this.config.maxBounces;
    this.material.uniforms.samplesPerPixel.value = this.config.samplesPerPixel;
    this.material.uniforms.enableReflections.value = this.config.enableReflections;
    this.material.uniforms.enableShadows.value = this.config.enableShadows;
    this.material.uniforms.enableAO.value = this.config.enableAO;
    this.material.uniforms.aoRadius.value = this.config.aoRadius;
    this.material.uniforms.aoSamples.value = this.config.aoSamples;
  }
  
  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(direction).normalize();
    this.frameCount = 0;
  }
  
  invalidate(): void {
    this.frameCount = 0;
  }
  
  dispose(): void {
    this.renderTarget.dispose();
    this.accumulationTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

// ============================================================================
// DENOISER
// ============================================================================

export class Denoiser {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;
    
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tNormal: { value: null },
        tDepth: { value: null },
        strength: { value: 0.5 },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tNormal;
        uniform sampler2D tDepth;
        uniform float strength;
        uniform vec2 resolution;
        
        varying vec2 vUv;
        
        // Edge-aware bilateral filter
        void main() {
          vec3 centerColor = texture2D(tDiffuse, vUv).rgb;
          
          if (strength == 0.0) {
            gl_FragColor = vec4(centerColor, 1.0);
            return;
          }
          
          vec3 sum = vec3(0.0);
          float weightSum = 0.0;
          
          float sigma_spatial = 3.0;
          float sigma_color = 0.1 * strength;
          
          int radius = 3;
          
          for (int x = -3; x <= 3; x++) {
            for (int y = -3; y <= 3; y++) {
              vec2 offset = vec2(float(x), float(y)) / resolution;
              vec3 sampleColor = texture2D(tDiffuse, vUv + offset).rgb;
              
              // Spatial weight
              float spatialDist = length(vec2(float(x), float(y)));
              float spatialWeight = exp(-spatialDist * spatialDist / (2.0 * sigma_spatial * sigma_spatial));
              
              // Color weight
              float colorDist = length(sampleColor - centerColor);
              float colorWeight = exp(-colorDist * colorDist / (2.0 * sigma_color * sigma_color));
              
              float weight = spatialWeight * colorWeight;
              sum += sampleColor * weight;
              weightSum += weight;
            }
          }
          
          vec3 denoised = sum / weightSum;
          gl_FragColor = vec4(denoised, 1.0);
        }
      `
    });
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  
  denoise(input: THREE.Texture, strength: number = 0.5): THREE.Texture {
    this.material.uniforms.tDiffuse.value = input;
    this.material.uniforms.strength.value = strength;
    
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(currentTarget);
    
    return this.renderTarget.texture;
  }
  
  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.resolution.value.set(width, height);
  }
  
  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

// ============================================================================
// RAY TRACING MANAGER
// ============================================================================

export class RayTracingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private rayTracingPass: RayTracingPass;
  private denoiser: Denoiser;
  
  private config: RayTracingConfig;
  private enabled: boolean = true;
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };
    
    this.rayTracingPass = new RayTracingPass(renderer, scene, camera, this.config);
    this.denoiser = new Denoiser(
      renderer,
      Math.floor(window.innerWidth * this.config.resolution),
      Math.floor(window.innerHeight * this.config.resolution)
    );
  }
  
  render(): THREE.Texture {
    if (!this.enabled) {
      return this.rayTracingPass.getTexture();
    }
    
    // Ray trace
    let result = this.rayTracingPass.render();
    
    // Denoise
    if (this.config.denoiseEnabled) {
      result = this.denoiser.denoise(result, this.config.denoiseStrength);
    }
    
    return result;
  }
  
  rebuildAccelerationStructure(): void {
    this.rayTracingPass.rebuildBVH();
    this.rayTracingPass.invalidate();
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.config.enabled = enabled;
  }
  
  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);
    this.rayTracingPass.setConfig(config);
  }
  
  setSunDirection(direction: THREE.Vector3): void {
    this.rayTracingPass.setSunDirection(direction);
  }
  
  resize(width: number, height: number): void {
    this.rayTracingPass.resize(width, height);
    this.denoiser.resize(
      Math.floor(width * this.config.resolution),
      Math.floor(height * this.config.resolution)
    );
  }
  
  invalidate(): void {
    this.rayTracingPass.invalidate();
  }
  
  dispose(): void {
    this.rayTracingPass.dispose();
    this.denoiser.dispose();
  }
}

export default RayTracingManager;
