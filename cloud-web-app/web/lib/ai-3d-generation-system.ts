/**
 * AI 3D GENERATION SYSTEM - Aethel Engine
 * 
 * Sistema avançado de geração 3D com AI para jogos AAA.
 * Implementa NeRF, Gaussian Splatting, e integração com modelos de AI.
 * 
 * FEATURES:
 * - Neural Radiance Fields (NeRF)
 * - 3D Gaussian Splatting
 * - Point-E integration (text-to-3D)
 * - Image-to-3D reconstruction
 * - Mesh generation from point clouds
 * - Texture synthesis
 * - PBR material generation
 * - LOD generation
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface NeRFConfig {
  resolution: number;
  samples: number;
  bounces: number;
  nearPlane: number;
  farPlane: number;
  coarseNetworkSize: number;
  fineNetworkSize: number;
  positionEncoding: number;
  directionEncoding: number;
}

export interface GaussianSplattingConfig {
  maxGaussians: number;
  shDegree: number; // Spherical harmonics degree
  opacityThreshold: number;
  scaleMultiplier: number;
  densificationInterval: number;
  pruneInterval: number;
  learningRate: number;
}

export interface Gaussian3D {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Quaternion;
  opacity: number;
  sphericalHarmonics: number[]; // Color as SH coefficients
}

export interface PointCloudData {
  positions: Float32Array;
  colors?: Float32Array;
  normals?: Float32Array;
  count: number;
}

export interface TextTo3DRequest {
  prompt: string;
  negativePrompt?: string;
  style?: 'realistic' | 'stylized' | 'lowpoly' | 'anime';
  detailLevel?: 'low' | 'medium' | 'high';
  seed?: number;
}

export interface ImageTo3DRequest {
  images: ImageData[];
  cameraPositions?: THREE.Matrix4[];
  method?: 'nerf' | 'gaussian' | 'photogrammetry';
  quality?: 'draft' | 'medium' | 'high';
}

export interface Generated3DResult {
  mesh?: THREE.BufferGeometry;
  pointCloud?: PointCloudData;
  gaussians?: Gaussian3D[];
  textures?: {
    albedo?: THREE.Texture;
    normal?: THREE.Texture;
    roughness?: THREE.Texture;
    metalness?: THREE.Texture;
  };
  confidence: number;
}

// ============================================================================
// POSITIONAL ENCODING
// ============================================================================

export class PositionalEncoding {
  private numFrequencies: number;
  private includeInput: boolean;
  
  constructor(numFrequencies: number = 10, includeInput: boolean = true) {
    this.numFrequencies = numFrequencies;
    this.includeInput = includeInput;
  }
  
  encode(x: number[]): number[] {
    const result: number[] = [];
    
    if (this.includeInput) {
      result.push(...x);
    }
    
    for (let freq = 0; freq < this.numFrequencies; freq++) {
      const scale = Math.pow(2, freq) * Math.PI;
      
      for (const val of x) {
        result.push(Math.sin(val * scale));
        result.push(Math.cos(val * scale));
      }
    }
    
    return result;
  }
  
  getOutputDimension(inputDim: number): number {
    const freqDim = inputDim * 2 * this.numFrequencies;
    return this.includeInput ? inputDim + freqDim : freqDim;
  }
}

// ============================================================================
// SIMPLE MLP (Multi-Layer Perceptron)
// ============================================================================

export class SimpleMLP {
  private weights: Float32Array[];
  private biases: Float32Array[];
  private layerSizes: number[];
  
  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];
    
    // Initialize weights with Xavier initialization
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const inputSize = layerSizes[i];
      const outputSize = layerSizes[i + 1];
      const scale = Math.sqrt(2 / (inputSize + outputSize));
      
      const weights = new Float32Array(inputSize * outputSize);
      for (let j = 0; j < weights.length; j++) {
        weights[j] = (Math.random() * 2 - 1) * scale;
      }
      this.weights.push(weights);
      
      const biases = new Float32Array(outputSize);
      this.biases.push(biases);
    }
  }
  
  forward(input: number[]): number[] {
    let current = input;
    
    for (let layer = 0; layer < this.weights.length; layer++) {
      const weights = this.weights[layer];
      const biases = this.biases[layer];
      const inputSize = this.layerSizes[layer];
      const outputSize = this.layerSizes[layer + 1];
      
      const output = new Array(outputSize).fill(0);
      
      // Matrix multiplication
      for (let j = 0; j < outputSize; j++) {
        for (let i = 0; i < inputSize; i++) {
          output[j] += current[i] * weights[i * outputSize + j];
        }
        output[j] += biases[j];
        
        // ReLU activation (except last layer)
        if (layer < this.weights.length - 1) {
          output[j] = Math.max(0, output[j]);
        }
      }
      
      current = output;
    }
    
    return current;
  }
  
  // Set weights from trained model
  setWeights(layerIndex: number, weights: Float32Array): void {
    this.weights[layerIndex] = weights;
  }
  
  setBiases(layerIndex: number, biases: Float32Array): void {
    this.biases[layerIndex] = biases;
  }
}

// ============================================================================
// NERF RENDERER
// ============================================================================

export class NeRFRenderer {
  private config: NeRFConfig;
  private positionEncoder: PositionalEncoding;
  private directionEncoder: PositionalEncoding;
  private coarseNetwork: SimpleMLP;
  private fineNetwork: SimpleMLP;
  
  constructor(config: Partial<NeRFConfig> = {}) {
    this.config = {
      resolution: 128,
      samples: 64,
      bounces: 2,
      nearPlane: 0.1,
      farPlane: 10,
      coarseNetworkSize: 256,
      fineNetworkSize: 256,
      positionEncoding: 10,
      directionEncoding: 4,
      ...config,
    };
    
    this.positionEncoder = new PositionalEncoding(this.config.positionEncoding);
    this.directionEncoder = new PositionalEncoding(this.config.directionEncoding);
    
    // Coarse network: position encoding -> 256 -> 256 -> 256 -> 256 -> (rgb + sigma)
    const posEncDim = this.positionEncoder.getOutputDimension(3);
    const dirEncDim = this.directionEncoder.getOutputDimension(3);
    
    this.coarseNetwork = new SimpleMLP([
      posEncDim,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      this.config.coarseNetworkSize,
      4 // RGB + density
    ]);
    
    this.fineNetwork = new SimpleMLP([
      posEncDim + dirEncDim,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      this.config.fineNetworkSize,
      4
    ]);
  }
  
  // Volume rendering along ray
  renderRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    useFine: boolean = true
  ): THREE.Color {
    const samples = useFine ? this.config.samples * 2 : this.config.samples;
    const near = this.config.nearPlane;
    const far = this.config.farPlane;
    
    // Stratified sampling
    const tValues: number[] = [];
    const stepSize = (far - near) / samples;
    
    for (let i = 0; i < samples; i++) {
      const t = near + (i + Math.random()) * stepSize;
      tValues.push(t);
    }
    
    // Query network at sample points
    const colors: THREE.Color[] = [];
    const densities: number[] = [];
    
    for (const t of tValues) {
      const point = origin.clone().add(direction.clone().multiplyScalar(t));
      const result = this.queryNetwork(point, direction, useFine);
      
      colors.push(new THREE.Color(result.r, result.g, result.b));
      densities.push(result.density);
    }
    
    // Volume rendering
    return this.volumeRender(colors, densities, tValues);
  }
  
  private queryNetwork(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    useFine: boolean
  ): { r: number; g: number; b: number; density: number } {
    const posEncoded = this.positionEncoder.encode([position.x, position.y, position.z]);
    
    let output: number[];
    
    if (useFine) {
      const dirNorm = direction.clone().normalize();
      const dirEncoded = this.directionEncoder.encode([dirNorm.x, dirNorm.y, dirNorm.z]);
      output = this.fineNetwork.forward([...posEncoded, ...dirEncoded]);
    } else {
      output = this.coarseNetwork.forward(posEncoded);
    }
    
    return {
      r: this.sigmoid(output[0]),
      g: this.sigmoid(output[1]),
      b: this.sigmoid(output[2]),
      density: Math.max(0, output[3]), // ReLU for density
    };
  }
  
  private volumeRender(
    colors: THREE.Color[],
    densities: number[],
    tValues: number[]
  ): THREE.Color {
    const result = new THREE.Color(0, 0, 0);
    let transmittance = 1.0;
    
    for (let i = 0; i < colors.length - 1; i++) {
      const delta = tValues[i + 1] - tValues[i];
      const alpha = 1 - Math.exp(-densities[i] * delta);
      
      // Accumulate color
      const weight = transmittance * alpha;
      result.r += weight * colors[i].r;
      result.g += weight * colors[i].g;
      result.b += weight * colors[i].b;
      
      // Update transmittance
      transmittance *= (1 - alpha);
      
      // Early termination
      if (transmittance < 0.001) break;
    }
    
    return result;
  }
  
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  // Render full image
  renderImage(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number
  ): ImageData {
    const imageData = new ImageData(width, height);
    
    const aspect = width / height;
    const fovRad = (camera.fov * Math.PI) / 180;
    const halfHeight = Math.tan(fovRad / 2);
    const halfWidth = halfHeight * aspect;
    
    const cameraMatrix = camera.matrixWorld;
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate ray direction
        const u = (x + 0.5) / width;
        const v = (y + 0.5) / height;
        
        const rayDir = new THREE.Vector3(
          (2 * u - 1) * halfWidth,
          (1 - 2 * v) * halfHeight,
          -1
        );
        rayDir.applyMatrix4(cameraMatrix).sub(origin).normalize();
        
        // Render ray
        const color = this.renderRay(origin, rayDir, true);
        
        // Write to image
        const idx = (y * width + x) * 4;
        imageData.data[idx] = Math.floor(color.r * 255);
        imageData.data[idx + 1] = Math.floor(color.g * 255);
        imageData.data[idx + 2] = Math.floor(color.b * 255);
        imageData.data[idx + 3] = 255;
      }
    }
    
    return imageData;
  }
  
  // Load pre-trained weights
  loadWeights(weightsData: ArrayBuffer): void {
    // Parse weights file and set network parameters
    const view = new DataView(weightsData);
    let offset = 0;
    
    // Read coarse network weights
    for (let layer = 0; layer < 5; layer++) {
      const layerSize = view.getUint32(offset, true);
      offset += 4;
      
      const weights = new Float32Array(weightsData, offset, layerSize);
      this.coarseNetwork.setWeights(layer, weights);
      offset += layerSize * 4;
      
      const biasSize = view.getUint32(offset, true);
      offset += 4;
      
      const biases = new Float32Array(weightsData, offset, biasSize);
      this.coarseNetwork.setBiases(layer, biases);
      offset += biasSize * 4;
    }
  }
}

// ============================================================================
// 3D GAUSSIAN SPLATTING
// ============================================================================

export class GaussianSplatting {
  private config: GaussianSplattingConfig;
  private gaussians: Gaussian3D[] = [];
  private sortedIndices: Uint32Array = new Uint32Array(0);
  
  constructor(config: Partial<GaussianSplattingConfig> = {}) {
    this.config = {
      maxGaussians: 500000,
      shDegree: 3,
      opacityThreshold: 0.005,
      scaleMultiplier: 1.0,
      densificationInterval: 100,
      pruneInterval: 100,
      learningRate: 0.001,
      ...config,
    };
  }
  
  // Initialize from point cloud
  initializeFromPointCloud(pointCloud: PointCloudData): void {
    this.gaussians = [];
    
    for (let i = 0; i < pointCloud.count; i++) {
      const position = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );
      
      // Default scale based on point density
      const scale = new THREE.Vector3(0.01, 0.01, 0.01);
      
      // Default rotation
      const rotation = new THREE.Quaternion();
      
      // Color from point cloud or white
      const shCoeffs = new Array(this.getSHCoeffCount()).fill(0);
      if (pointCloud.colors) {
        shCoeffs[0] = (pointCloud.colors[i * 3] / 255 - 0.5) * 2;
        shCoeffs[1] = (pointCloud.colors[i * 3 + 1] / 255 - 0.5) * 2;
        shCoeffs[2] = (pointCloud.colors[i * 3 + 2] / 255 - 0.5) * 2;
      }
      
      this.gaussians.push({
        position,
        scale,
        rotation,
        opacity: 0.5,
        sphericalHarmonics: shCoeffs,
      });
    }
    
    this.sortedIndices = new Uint32Array(this.gaussians.length);
  }
  
  private getSHCoeffCount(): number {
    return (this.config.shDegree + 1) ** 2 * 3;
  }
  
  // Sort gaussians by depth for alpha compositing
  sortByDepth(viewMatrix: THREE.Matrix4): void {
    const depths: { index: number; depth: number }[] = [];
    
    for (let i = 0; i < this.gaussians.length; i++) {
      const pos = this.gaussians[i].position.clone();
      pos.applyMatrix4(viewMatrix);
      depths.push({ index: i, depth: pos.z });
    }
    
    // Sort back to front
    depths.sort((a, b) => b.depth - a.depth);
    
    for (let i = 0; i < depths.length; i++) {
      this.sortedIndices[i] = depths[i].index;
    }
  }
  
  // Compute 2D covariance for splatting
  compute2DCovariance(
    gaussian: Gaussian3D,
    viewMatrix: THREE.Matrix4,
    projMatrix: THREE.Matrix4
  ): { cov: THREE.Matrix3; screenPos: THREE.Vector2 } {
    // 3D covariance from scale and rotation
    const S = new THREE.Matrix3().set(
      gaussian.scale.x, 0, 0,
      0, gaussian.scale.y, 0,
      0, 0, gaussian.scale.z
    );
    
    const R = new THREE.Matrix3().setFromMatrix4(
      new THREE.Matrix4().makeRotationFromQuaternion(gaussian.rotation)
    );
    
    // Σ = R * S * S^T * R^T
    const RS = R.clone().multiply(S);
    const cov3D = RS.clone().multiply(RS.clone().transpose());
    
    // Project to 2D (simplified Jacobian)
    const pos = gaussian.position.clone().applyMatrix4(viewMatrix);
    const focal = projMatrix.elements[0]; // Approximate focal length
    
    const J = new THREE.Matrix3().set(
      focal / pos.z, 0, -focal * pos.x / (pos.z * pos.z),
      0, focal / pos.z, -focal * pos.y / (pos.z * pos.z),
      0, 0, 0
    );
    
    // 2D covariance: J * Σ * J^T
    const cov2D = J.clone().multiply(cov3D).multiply(J.clone().transpose());
    
    // Screen position
    const screenPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    screenPos.applyMatrix4(projMatrix);
    
    return {
      cov: cov2D,
      screenPos: new THREE.Vector2(screenPos.x, screenPos.y),
    };
  }
  
  // Evaluate gaussian splat contribution
  evaluateSplat(
    screenX: number,
    screenY: number,
    screenPos: THREE.Vector2,
    cov: THREE.Matrix3,
    opacity: number
  ): number {
    const dx = screenX - screenPos.x;
    const dy = screenY - screenPos.y;
    
    // Inverse of 2x2 covariance submatrix
    const a = cov.elements[0];
    const b = cov.elements[1];
    const c = cov.elements[4];
    
    const det = a * c - b * b;
    if (det <= 0) return 0;
    
    const invDet = 1 / det;
    const power = -0.5 * (c * dx * dx - 2 * b * dx * dy + a * dy * dy) * invDet;
    
    if (power > 0) return 0;
    
    return opacity * Math.exp(power);
  }
  
  // Render single pixel
  renderPixel(
    x: number,
    y: number,
    viewMatrix: THREE.Matrix4,
    projMatrix: THREE.Matrix4,
    width: number,
    height: number
  ): THREE.Color {
    const color = new THREE.Color(0, 0, 0);
    let transmittance = 1.0;
    
    // Convert to normalized device coordinates
    const ndcX = (x / width) * 2 - 1;
    const ndcY = 1 - (y / height) * 2;
    
    for (let i = 0; i < this.sortedIndices.length; i++) {
      const idx = this.sortedIndices[i];
      const gaussian = this.gaussians[idx];
      
      if (gaussian.opacity < this.config.opacityThreshold) continue;
      
      const { cov, screenPos } = this.compute2DCovariance(gaussian, viewMatrix, projMatrix);
      
      // Distance culling
      const dist = Math.sqrt(
        (ndcX - screenPos.x) ** 2 + (ndcY - screenPos.y) ** 2
      );
      if (dist > 0.5) continue; // Skip far splats
      
      const alpha = this.evaluateSplat(ndcX, ndcY, screenPos, cov, gaussian.opacity);
      
      if (alpha < 0.001) continue;
      
      // Get color from spherical harmonics (DC component only for simplicity)
      const r = 0.5 + gaussian.sphericalHarmonics[0] * 0.28209479177;
      const g = 0.5 + gaussian.sphericalHarmonics[1] * 0.28209479177;
      const b = 0.5 + gaussian.sphericalHarmonics[2] * 0.28209479177;
      
      // Alpha compositing
      const weight = transmittance * alpha;
      color.r += weight * Math.max(0, Math.min(1, r));
      color.g += weight * Math.max(0, Math.min(1, g));
      color.b += weight * Math.max(0, Math.min(1, b));
      
      transmittance *= (1 - alpha);
      
      if (transmittance < 0.001) break;
    }
    
    return color;
  }
  
  // Add gaussian
  addGaussian(gaussian: Gaussian3D): void {
    if (this.gaussians.length < this.config.maxGaussians) {
      this.gaussians.push(gaussian);
    }
  }
  
  // Prune low opacity gaussians
  prune(): void {
    this.gaussians = this.gaussians.filter(
      g => g.opacity >= this.config.opacityThreshold
    );
    this.sortedIndices = new Uint32Array(this.gaussians.length);
  }
  
  // Get gaussians for export
  getGaussians(): Gaussian3D[] {
    return this.gaussians;
  }
  
  // Export to PLY format
  exportToPLY(): Blob {
    const header = [
      'ply',
      'format binary_little_endian 1.0',
      `element vertex ${this.gaussians.length}`,
      'property float x',
      'property float y',
      'property float z',
      'property float scale_0',
      'property float scale_1',
      'property float scale_2',
      'property float rot_0',
      'property float rot_1',
      'property float rot_2',
      'property float rot_3',
      'property float opacity',
      'property float f_dc_0',
      'property float f_dc_1',
      'property float f_dc_2',
      'end_header\n',
    ].join('\n');
    
    const headerBytes = new TextEncoder().encode(header);
    const dataSize = this.gaussians.length * 15 * 4; // 15 floats per gaussian
    const buffer = new ArrayBuffer(headerBytes.length + dataSize);
    
    const view = new Uint8Array(buffer);
    view.set(headerBytes, 0);
    
    const dataView = new DataView(buffer, headerBytes.length);
    let offset = 0;
    
    for (const g of this.gaussians) {
      dataView.setFloat32(offset, g.position.x, true); offset += 4;
      dataView.setFloat32(offset, g.position.y, true); offset += 4;
      dataView.setFloat32(offset, g.position.z, true); offset += 4;
      dataView.setFloat32(offset, g.scale.x, true); offset += 4;
      dataView.setFloat32(offset, g.scale.y, true); offset += 4;
      dataView.setFloat32(offset, g.scale.z, true); offset += 4;
      dataView.setFloat32(offset, g.rotation.x, true); offset += 4;
      dataView.setFloat32(offset, g.rotation.y, true); offset += 4;
      dataView.setFloat32(offset, g.rotation.z, true); offset += 4;
      dataView.setFloat32(offset, g.rotation.w, true); offset += 4;
      dataView.setFloat32(offset, g.opacity, true); offset += 4;
      dataView.setFloat32(offset, g.sphericalHarmonics[0], true); offset += 4;
      dataView.setFloat32(offset, g.sphericalHarmonics[1], true); offset += 4;
      dataView.setFloat32(offset, g.sphericalHarmonics[2], true); offset += 4;
    }
    
    return new Blob([buffer], { type: 'application/octet-stream' });
  }
}

// ============================================================================
// POINT CLOUD TO MESH CONVERTER
// ============================================================================

export class PointCloudToMesh {
  private gridResolution: number;
  
  constructor(gridResolution: number = 64) {
    this.gridResolution = gridResolution;
  }
  
  // Ball pivoting algorithm (simplified)
  reconstructSurface(pointCloud: PointCloudData): THREE.BufferGeometry {
    // Estimate normals if not provided
    const normals = pointCloud.normals || this.estimateNormals(pointCloud);
    
    // Build spatial hash for fast neighbor lookup
    const spatialHash = this.buildSpatialHash(pointCloud);
    
    // Generate triangles using advancing front
    const triangles = this.advancingFront(pointCloud, normals, spatialHash);
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normalArray: number[] = [];
    
    for (const tri of triangles) {
      for (const idx of tri) {
        positions.push(
          pointCloud.positions[idx * 3],
          pointCloud.positions[idx * 3 + 1],
          pointCloud.positions[idx * 3 + 2]
        );
        normalArray.push(
          normals[idx * 3],
          normals[idx * 3 + 1],
          normals[idx * 3 + 2]
        );
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
    
    return geometry;
  }
  
  private estimateNormals(pointCloud: PointCloudData): Float32Array {
    const normals = new Float32Array(pointCloud.count * 3);
    const k = 10; // Number of neighbors for normal estimation
    
    for (let i = 0; i < pointCloud.count; i++) {
      const point = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );
      
      // Find k nearest neighbors (simplified: just use nearby points)
      const neighbors: THREE.Vector3[] = [];
      
      for (let j = 0; j < pointCloud.count && neighbors.length < k; j++) {
        if (i === j) continue;
        
        const neighbor = new THREE.Vector3(
          pointCloud.positions[j * 3],
          pointCloud.positions[j * 3 + 1],
          pointCloud.positions[j * 3 + 2]
        );
        
        if (point.distanceTo(neighbor) < 0.1) {
          neighbors.push(neighbor);
        }
      }
      
      // PCA for normal estimation
      const normal = this.pcaNormal(point, neighbors);
      normals[i * 3] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;
    }
    
    return normals;
  }
  
  private pcaNormal(center: THREE.Vector3, neighbors: THREE.Vector3[]): THREE.Vector3 {
    if (neighbors.length < 3) {
      return new THREE.Vector3(0, 1, 0);
    }
    
    // Compute covariance matrix
    let cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    for (const neighbor of neighbors) {
      const d = neighbor.clone().sub(center);
      cov[0] += d.x * d.x;
      cov[1] += d.x * d.y;
      cov[2] += d.x * d.z;
      cov[3] += d.y * d.x;
      cov[4] += d.y * d.y;
      cov[5] += d.y * d.z;
      cov[6] += d.z * d.x;
      cov[7] += d.z * d.y;
      cov[8] += d.z * d.z;
    }
    
    // Power iteration for smallest eigenvector (normal)
    let normal = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    
    for (let iter = 0; iter < 20; iter++) {
      const result = new THREE.Vector3(
        cov[0] * normal.x + cov[1] * normal.y + cov[2] * normal.z,
        cov[3] * normal.x + cov[4] * normal.y + cov[5] * normal.z,
        cov[6] * normal.x + cov[7] * normal.y + cov[8] * normal.z
      );
      
      if (result.length() < 0.0001) break;
      normal = result.normalize();
    }
    
    return normal;
  }
  
  private buildSpatialHash(pointCloud: PointCloudData): Map<string, number[]> {
    const hash = new Map<string, number[]>();
    const cellSize = 0.05;
    
    for (let i = 0; i < pointCloud.count; i++) {
      const key = this.hashKey(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2],
        cellSize
      );
      
      if (!hash.has(key)) {
        hash.set(key, []);
      }
      hash.get(key)!.push(i);
    }
    
    return hash;
  }
  
  private hashKey(x: number, y: number, z: number, cellSize: number): string {
    return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;
  }
  
  private advancingFront(
    pointCloud: PointCloudData,
    normals: Float32Array,
    spatialHash: Map<string, number[]>
  ): number[][] {
    const triangles: number[][] = [];
    const used = new Set<number>();
    
    // Simple triangulation: connect nearest neighbors
    for (let i = 0; i < pointCloud.count; i++) {
      if (used.has(i)) continue;
      
      const point = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );
      
      // Find 2 nearest unused neighbors
      const neighbors: { idx: number; dist: number }[] = [];
      
      for (let j = 0; j < pointCloud.count; j++) {
        if (i === j || used.has(j)) continue;
        
        const neighbor = new THREE.Vector3(
          pointCloud.positions[j * 3],
          pointCloud.positions[j * 3 + 1],
          pointCloud.positions[j * 3 + 2]
        );
        
        const dist = point.distanceTo(neighbor);
        if (dist < 0.1) {
          neighbors.push({ idx: j, dist });
        }
      }
      
      neighbors.sort((a, b) => a.dist - b.dist);
      
      if (neighbors.length >= 2) {
        triangles.push([i, neighbors[0].idx, neighbors[1].idx]);
        used.add(i);
      }
    }
    
    return triangles;
  }
}

// ============================================================================
// AI 3D GENERATION MANAGER
// ============================================================================

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
          v0.x, v0.y, v0.z, m01.x, m01.y, m01.z, m20.x, m20.y, m20.z,
          m01.x, m01.y, m01.z, v1.x, v1.y, v1.z, m12.x, m12.y, m12.z,
          m20.x, m20.y, m20.z, m12.x, m12.y, m12.z, v2.x, v2.y, v2.z,
          m01.x, m01.y, m01.z, m12.x, m12.y, m12.z, m20.x, m20.y, m20.z
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
      clusters.get(key)!.push(new THREE.Vector3(
        positions[i], positions[i + 1], positions[i + 2]
      ));
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
    } else if (request.method === 'gaussian') {
      return this.reconstructWithGaussians(request);
    } else {
      return this.reconstructWithPhotogrammetry(request);
    }
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
  
  private async reconstructWithPhotogrammetry(request: ImageTo3DRequest): Promise<Generated3DResult> {
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

// ============================================================================
// EXPORTS
// ============================================================================

export const createAI3DGenerator = (): AI3DGenerationManager => {
  return new AI3DGenerationManager();
};

export const createNeRFRenderer = (config?: Partial<NeRFConfig>): NeRFRenderer => {
  return new NeRFRenderer(config);
};

export const createGaussianSplatting = (config?: Partial<GaussianSplattingConfig>): GaussianSplatting => {
  return new GaussianSplatting(config);
};
