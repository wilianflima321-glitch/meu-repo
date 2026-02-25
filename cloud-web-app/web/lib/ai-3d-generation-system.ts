/**
 * AI 3D generation runtime.
 * Orchestrates NeRF, Gaussian splatting, and point-cloud meshing pipelines.
 */

import * as THREE from 'three';

import { GaussianSplatting } from './ai-3d-generation-gaussian';
import { PointCloudToMesh } from './ai-3d-generation-meshing';
import { NeRFRenderer, PositionalEncoding, SimpleMLP } from './ai-3d-generation-nerf';
import type {
  Gaussian3D,
  GaussianSplattingConfig,
  Generated3DResult,
  ImageTo3DRequest,
  NeRFConfig,
  PointCloudData,
  TextTo3DRequest,
} from './ai-3d-generation-types';

export type {
  Gaussian3D,
  GaussianSplattingConfig,
  Generated3DResult,
  ImageTo3DRequest,
  NeRFConfig,
  PointCloudData,
  TextTo3DRequest,
} from './ai-3d-generation-types';

export { GaussianSplatting } from './ai-3d-generation-gaussian';
export { PointCloudToMesh } from './ai-3d-generation-meshing';
export { NeRFRenderer, PositionalEncoding, SimpleMLP } from './ai-3d-generation-nerf';

// AI 3D GENERATION MANAGER

export class AI3DGenerationManager {
  private nerf: NeRFRenderer | null = null;
  private gaussianSplatting: GaussianSplatting | null = null;
  private pointCloudToMesh: PointCloudToMesh;

  // API endpoints for AI services
  private textTo3DEndpoint: string = '';
  private imageTo3DEndpoint: string = '';

  constructor() {
    this.pointCloudToMesh = new PointCloudToMesh();
  }

  setEndpoints(textTo3D: string, imageTo3D: string): void {
    this.textTo3DEndpoint = textTo3D;
    this.imageTo3DEndpoint = imageTo3D;
  }

  // Generate 3D from text using external AI API
  async textTo3D(request: TextTo3DRequest): Promise<Generated3DResult> {
    if (!this.textTo3DEndpoint) {
      // Use procedural generation as fallback
      return this.proceduralFromText(request);
    }

    try {
      const response = await fetch(this.textTo3DEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return this.processAPIResponse(data);
    } catch (error) {
      console.error('Text-to-3D API error:', error);
      return this.proceduralFromText(request);
    }
  }

  // Fallback procedural generation based on text
  private proceduralFromText(request: TextTo3DRequest): Generated3DResult {
    const prompt = request.prompt.toLowerCase();
    let geometry: THREE.BufferGeometry;

    // Simple keyword-based shape generation
    if (prompt.includes('sphere') || prompt.includes('ball')) {
      geometry = new THREE.SphereGeometry(1, 32, 32);
    } else if (prompt.includes('cube') || prompt.includes('box')) {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    } else if (prompt.includes('cylinder') || prompt.includes('pillar')) {
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    } else if (prompt.includes('cone') || prompt.includes('pyramid')) {
      geometry = new THREE.ConeGeometry(0.5, 1, 32);
    } else if (prompt.includes('torus') || prompt.includes('ring') || prompt.includes('donut')) {
      geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
    } else if (prompt.includes('plane') || prompt.includes('floor') || prompt.includes('ground')) {
      geometry = new THREE.PlaneGeometry(2, 2);
    } else {
      // Default: icosahedron
      geometry = new THREE.IcosahedronGeometry(1, 2);
    }

    // Apply detail level
    if (request.detailLevel === 'high') {
      geometry = this.subdivideGeometry(geometry, 2);
    } else if (request.detailLevel === 'low') {
      geometry = this.simplifyGeometry(geometry);
    }

    return {
      mesh: geometry,
      confidence: 0.5,
    };
  }

  private subdivideGeometry(geometry: THREE.BufferGeometry, levels: number): THREE.BufferGeometry {
    // Simple subdivision by adding midpoint vertices
    for (let level = 0; level < levels; level++) {
      const positions = geometry.getAttribute('position').array as Float32Array;
      const newPositions: number[] = [];

      for (let i = 0; i < positions.length; i += 9) {
        // Original triangle vertices
        const v0 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const v1 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const v2 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

        // Midpoints
        const m01 = v0.clone().add(v1).multiplyScalar(0.5);
        const m12 = v1.clone().add(v2).multiplyScalar(0.5);
        const m20 = v2.clone().add(v0).multiplyScalar(0.5);

        // 4 new triangles
        newPositions.push(
          v0.x,
          v0.y,
          v0.z,
          m01.x,
          m01.y,
          m01.z,
          m20.x,
          m20.y,
          m20.z,
          m01.x,
          m01.y,
          m01.z,
          v1.x,
          v1.y,
          v1.z,
          m12.x,
          m12.y,
          m12.z,
          m20.x,
          m20.y,
          m20.z,
          m12.x,
          m12.y,
          m12.z,
          v2.x,
          v2.y,
          v2.z,
          m01.x,
          m01.y,
          m01.z,
          m12.x,
          m12.y,
          m12.z,
          m20.x,
          m20.y,
          m20.z
        );
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      geometry.computeVertexNormals();
    }

    return geometry;
  }

  private simplifyGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    // Vertex clustering simplification
    const positions = geometry.getAttribute('position').array as Float32Array;
    const gridSize = 0.1;
    const clusters = new Map<string, THREE.Vector3[]>();

    for (let i = 0; i < positions.length; i += 3) {
      const key = [
        Math.floor(positions[i] / gridSize),
        Math.floor(positions[i + 1] / gridSize),
        Math.floor(positions[i + 2] / gridSize),
      ].join(',');

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
    }

    // Average cluster positions
    const newPositions: number[] = [];
    for (const [, verts] of clusters) {
      const avg = new THREE.Vector3();
      for (const v of verts) {
        avg.add(v);
      }
      avg.divideScalar(verts.length);
      newPositions.push(avg.x, avg.y, avg.z);
    }

    const simplified = new THREE.BufferGeometry();
    simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

    return simplified;
  }

  // Image-based 3D reconstruction
  async imageTo3D(request: ImageTo3DRequest): Promise<Generated3DResult> {
    if (request.method === 'nerf') {
      return this.reconstructWithNeRF(request);
    }
    if (request.method === 'gaussian') {
      return this.reconstructWithGaussians(request);
    }
    return this.reconstructWithPhotogrammetry(request);
  }

  private async reconstructWithNeRF(request: ImageTo3DRequest): Promise<Generated3DResult> {
    // Initialize NeRF if needed
    if (!this.nerf) {
      this.nerf = new NeRFRenderer({
        resolution: request.quality === 'high' ? 256 : 128,
      });
    }

    // In production, train NeRF on the input images
    // For now, return empty result

    return {
      confidence: 0.3,
    };
  }

  private async reconstructWithGaussians(request: ImageTo3DRequest): Promise<Generated3DResult> {
    // Initialize Gaussian Splatting if needed
    if (!this.gaussianSplatting) {
      this.gaussianSplatting = new GaussianSplatting({
        maxGaussians: request.quality === 'high' ? 500000 : 100000,
      });
    }

    // In production, optimize Gaussians from input images
    // For now, return empty result

    return {
      confidence: 0.3,
    };
  }

  private async reconstructWithPhotogrammetry(_request: ImageTo3DRequest): Promise<Generated3DResult> {
    // Simple feature-based reconstruction
    // In production, use full SfM pipeline

    return {
      confidence: 0.3,
    };
  }

  private processAPIResponse(data: any): Generated3DResult {
    const result: Generated3DResult = {
      confidence: data.confidence || 0.5,
    };

    // Process mesh data
    if (data.vertices && data.faces) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3));
      geometry.setIndex(data.faces);
      geometry.computeVertexNormals();
      result.mesh = geometry;
    }

    // Process point cloud
    if (data.points) {
      result.pointCloud = {
        positions: new Float32Array(data.points),
        colors: data.colors ? new Float32Array(data.colors) : undefined,
        count: data.points.length / 3,
      };
    }

    // Process textures
    if (data.textures) {
      result.textures = {};

      const loader = new THREE.TextureLoader();

      if (data.textures.albedo) {
        result.textures.albedo = loader.load(data.textures.albedo);
      }
      if (data.textures.normal) {
        result.textures.normal = loader.load(data.textures.normal);
      }
      if (data.textures.roughness) {
        result.textures.roughness = loader.load(data.textures.roughness);
      }
      if (data.textures.metalness) {
        result.textures.metalness = loader.load(data.textures.metalness);
      }
    }

    return result;
  }

  // Convert point cloud to mesh
  pointCloudToMeshConvert(pointCloud: PointCloudData): THREE.BufferGeometry {
    return this.pointCloudToMesh.reconstructSurface(pointCloud);
  }

  // Create Gaussian Splatting from point cloud
  createGaussianSplatting(pointCloud: PointCloudData): GaussianSplatting {
    const gs = new GaussianSplatting();
    gs.initializeFromPointCloud(pointCloud);
    return gs;
  }

  // Get NeRF renderer
  getNeRFRenderer(): NeRFRenderer {
    if (!this.nerf) {
      this.nerf = new NeRFRenderer();
    }
    return this.nerf;
  }
}

// EXPORTS

export const createAI3DGenerator = (): AI3DGenerationManager => {
  return new AI3DGenerationManager();
};

export const createNeRFRenderer = (config?: Partial<NeRFConfig>): NeRFRenderer => {
  return new NeRFRenderer(config);
};

export const createGaussianSplatting = (
  config?: Partial<GaussianSplattingConfig>
): GaussianSplatting => {
  return new GaussianSplatting(config);
};
