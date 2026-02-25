/**
 * CPU/WebGL2 fallback culling runtime for Nanite-like meshlets.
 */
import * as THREE from 'three';
import type { CullingStats, Meshlet, MeshletCluster, VirtualizedMesh } from './nanite-types';

export class GPUCullingSystem {
  private gl: WebGL2RenderingContext | null = null;
  private hiZBuffer: WebGLTexture | null = null;
  private hiZLevels: number = 0;
  private cullingProgram: WebGLProgram | null = null;
  
  private frustumPlanes: THREE.Plane[] = [];
  private stats: CullingStats = {
    totalMeshlets: 0,
    visibleMeshlets: 0,
    culledByFrustum: 0,
    culledByOcclusion: 0,
    culledByLOD: 0,
    trianglesRendered: 0,
    trianglesCulled: 0,
  };
  
  initialize(gl: WebGL2RenderingContext): void {
    this.gl = gl;
    this.createHiZBuffer();
    this.createCullingShader();
  }
  
  private createHiZBuffer(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    
    this.hiZLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
    
    this.hiZBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.hiZBuffer);
    gl.texStorage2D(gl.TEXTURE_2D, this.hiZLevels, gl.R32F, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  
  private createCullingShader(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `#version 300 es
      void main() {
        gl_Position = vec4(0.0);
      }
    `);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `#version 300 es
      precision highp float;
      
      uniform sampler2D uHiZ;
      uniform mat4 uViewProjection;
      uniform vec4 uFrustumPlanes[6];
      
      // Meshlet data - seria um SSBO em um cenário real
      // Usando uniform para compatibilidade com WebGL2
      
      out vec4 fragColor;
      
      bool frustumCull(vec4 sphere) {
        for (int i = 0; i < 6; i++) {
          float dist = dot(uFrustumPlanes[i].xyz, sphere.xyz) + uFrustumPlanes[i].w;
          if (dist < -sphere.w) return true;
        }
        return false;
      }
      
      bool occlusionCull(vec4 sphere, mat4 viewProj) {
        // Projetar esfera para screen space
        vec4 center = viewProj * vec4(sphere.xyz, 1.0);
        if (center.w <= 0.0) return false;
        
        center.xyz /= center.w;
        
        // Calcular nível de mip apropriado
        float screenRadius = sphere.w / center.w;
        float mipLevel = log2(screenRadius * 2.0);
        
        // Sample Hi-Z
        vec2 uv = center.xy * 0.5 + 0.5;
        float hiZ = textureLod(uHiZ, uv, mipLevel).r;
        
        return center.z > hiZ;
      }
      
      void main() {
        fragColor = vec4(1.0);
      }
    `);
    gl.compileShader(fragmentShader);
    
    this.cullingProgram = gl.createProgram()!;
    gl.attachShader(this.cullingProgram, vertexShader);
    gl.attachShader(this.cullingProgram, fragmentShader);
    gl.linkProgram(this.cullingProgram);
  }
  
  /**
   * Atualiza Hi-Z buffer a partir do depth buffer atual
   */
  updateHiZBuffer(depthTexture: WebGLTexture): void {
    if (!this.gl || !this.hiZBuffer) return;
    
    const gl = this.gl;
    
    // Copiar depth para nível 0
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, 
      gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    // Gerar mipmaps com downsampling de máximo
    // (Em WebGL2 real, isso seria feito com compute shader)
    gl.bindTexture(gl.TEXTURE_2D, this.hiZBuffer);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  
  /**
   * Extrai planos do frustum da matriz de projeção
   */
  updateFrustum(camera: THREE.Camera): void {
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    
    const me = projScreenMatrix.elements;
    
    this.frustumPlanes = [
      // Left
      new THREE.Plane().setComponents(me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]).normalize(),
      // Right
      new THREE.Plane().setComponents(me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]).normalize(),
      // Bottom
      new THREE.Plane().setComponents(me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]).normalize(),
      // Top
      new THREE.Plane().setComponents(me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]).normalize(),
      // Near
      new THREE.Plane().setComponents(me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]).normalize(),
      // Far
      new THREE.Plane().setComponents(me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]).normalize(),
    ];
  }
  
  /**
   * Realiza culling de meshlets (CPU fallback)
   */
  cullMeshlets(mesh: VirtualizedMesh, camera: THREE.Camera): Meshlet[] {
    this.updateFrustum(camera);
    
    this.stats = {
      totalMeshlets: 0,
      visibleMeshlets: 0,
      culledByFrustum: 0,
      culledByOcclusion: 0,
      culledByLOD: 0,
      trianglesRendered: 0,
      trianglesCulled: 0,
    };
    
    const visibleMeshlets: Meshlet[] = [];
    const cameraPosition = camera.position;
    
    for (const cluster of mesh.clusters) {
      // Determinar se este cluster deve ser usado baseado em LOD
      const distance = cluster.boundingSphere.center.distanceTo(cameraPosition);
      const screenSize = cluster.boundingSphere.radius / distance;
      
      // Selecionar LOD apropriado
      if (!this.shouldUseCluster(cluster, screenSize)) {
        this.stats.culledByLOD += cluster.meshlets.length;
        continue;
      }
      
      // Frustum culling do cluster
      if (!this.isClusterInFrustum(cluster)) {
        this.stats.culledByFrustum += cluster.meshlets.length;
        continue;
      }
      
      // Processar meshlets individuais
      for (const meshlet of cluster.meshlets) {
        this.stats.totalMeshlets++;
        
        // Frustum culling
        if (!this.isMeshletInFrustum(meshlet)) {
          this.stats.culledByFrustum++;
          this.stats.trianglesCulled += meshlet.triangleCount;
          continue;
        }
        
        // Backface cone culling
        if (this.isMeshletBackfacing(meshlet, cameraPosition)) {
          this.stats.culledByFrustum++;
          this.stats.trianglesCulled += meshlet.triangleCount;
          continue;
        }
        
        visibleMeshlets.push(meshlet);
        this.stats.visibleMeshlets++;
        this.stats.trianglesRendered += meshlet.triangleCount;
      }
    }
    
    return visibleMeshlets;
  }
  
  private shouldUseCluster(cluster: MeshletCluster, screenSize: number): boolean {
    // Usar clusters de LOD mais baixo para objetos mais distantes
    const errorThreshold = 0.01; // Ajustar baseado em qualidade desejada
    return cluster.screenSpaceError * screenSize < errorThreshold || cluster.childClusters.length === 0;
  }
  
  private isClusterInFrustum(cluster: MeshletCluster): boolean {
    const sphere = cluster.boundingSphere;
    
    for (const plane of this.frustumPlanes) {
      if (plane.distanceToPoint(sphere.center) < -sphere.radius) {
        return false;
      }
    }
    
    return true;
  }
  
  private isMeshletInFrustum(meshlet: Meshlet): boolean {
    const sphere = meshlet.boundingSphere;
    
    for (const plane of this.frustumPlanes) {
      if (plane.distanceToPoint(sphere.center) < -sphere.radius) {
        return false;
      }
    }
    
    return true;
  }
  
  private isMeshletBackfacing(meshlet: Meshlet, cameraPos: THREE.Vector3): boolean {
    const cone = meshlet.boundingCone;
    const toCamera = new THREE.Vector3().subVectors(cameraPos, cone.apex).normalize();
    const dot = toCamera.dot(cone.axis);
    
    // Se o cone está apontando para longe da câmera
    return dot < -cone.cutoff;
  }
  
  getStats(): CullingStats {
    return { ...this.stats };
  }
}

