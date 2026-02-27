/**
 * AI 3D generation Gaussian splatting runtime internals.
 */

import * as THREE from 'three';

import type { Gaussian3D, GaussianSplattingConfig, PointCloudData } from './ai-3d-generation-types';

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

  initializeFromPointCloud(pointCloud: PointCloudData): void {
    this.gaussians = [];

    for (let i = 0; i < pointCloud.count; i++) {
      const position = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );

      const scale = new THREE.Vector3(0.01, 0.01, 0.01);
      const rotation = new THREE.Quaternion();

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

  sortByDepth(viewMatrix: THREE.Matrix4): void {
    const depths: { index: number; depth: number }[] = [];

    for (let i = 0; i < this.gaussians.length; i++) {
      const pos = this.gaussians[i].position.clone();
      pos.applyMatrix4(viewMatrix);
      depths.push({ index: i, depth: pos.z });
    }

    depths.sort((a, b) => b.depth - a.depth);

    for (let i = 0; i < depths.length; i++) {
      this.sortedIndices[i] = depths[i].index;
    }
  }

  compute2DCovariance(
    gaussian: Gaussian3D,
    viewMatrix: THREE.Matrix4,
    projMatrix: THREE.Matrix4
  ): { cov: THREE.Matrix3; screenPos: THREE.Vector2 } {
    const S = new THREE.Matrix3().set(
      gaussian.scale.x, 0, 0,
      0, gaussian.scale.y, 0,
      0, 0, gaussian.scale.z
    );

    const R = new THREE.Matrix3().setFromMatrix4(
      new THREE.Matrix4().makeRotationFromQuaternion(gaussian.rotation)
    );

    const RS = R.clone().multiply(S);
    const cov3D = RS.clone().multiply(RS.clone().transpose());

    const pos = gaussian.position.clone().applyMatrix4(viewMatrix);
    const focal = projMatrix.elements[0];

    const J = new THREE.Matrix3().set(
      focal / pos.z, 0, -focal * pos.x / (pos.z * pos.z),
      0, focal / pos.z, -focal * pos.y / (pos.z * pos.z),
      0, 0, 0
    );

    const cov2D = J.clone().multiply(cov3D).multiply(J.clone().transpose());

    const screenPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    screenPos.applyMatrix4(projMatrix);

    return {
      cov: cov2D,
      screenPos: new THREE.Vector2(screenPos.x, screenPos.y),
    };
  }

  evaluateSplat(
    screenX: number,
    screenY: number,
    screenPos: THREE.Vector2,
    cov: THREE.Matrix3,
    opacity: number
  ): number {
    const dx = screenX - screenPos.x;
    const dy = screenY - screenPos.y;

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

    const ndcX = (x / width) * 2 - 1;
    const ndcY = 1 - (y / height) * 2;

    for (let i = 0; i < this.sortedIndices.length; i++) {
      const idx = this.sortedIndices[i];
      const gaussian = this.gaussians[idx];

      if (gaussian.opacity < this.config.opacityThreshold) continue;

      const { cov, screenPos } = this.compute2DCovariance(gaussian, viewMatrix, projMatrix);

      const dist = Math.sqrt((ndcX - screenPos.x) ** 2 + (ndcY - screenPos.y) ** 2);
      if (dist > 0.5) continue;

      const alpha = this.evaluateSplat(ndcX, ndcY, screenPos, cov, gaussian.opacity);
      if (alpha < 0.001) continue;

      const r = 0.5 + gaussian.sphericalHarmonics[0] * 0.28209479177;
      const g = 0.5 + gaussian.sphericalHarmonics[1] * 0.28209479177;
      const b = 0.5 + gaussian.sphericalHarmonics[2] * 0.28209479177;

      const weight = transmittance * alpha;
      color.r += weight * Math.max(0, Math.min(1, r));
      color.g += weight * Math.max(0, Math.min(1, g));
      color.b += weight * Math.max(0, Math.min(1, b));

      transmittance *= 1 - alpha;
      if (transmittance < 0.001) break;
    }

    return color;
  }

  addGaussian(gaussian: Gaussian3D): void {
    if (this.gaussians.length < this.config.maxGaussians) {
      this.gaussians.push(gaussian);
    }
  }

  prune(): void {
    this.gaussians = this.gaussians.filter((g) => g.opacity >= this.config.opacityThreshold);
    this.sortedIndices = new Uint32Array(this.gaussians.length);
  }

  getGaussians(): Gaussian3D[] {
    return this.gaussians;
  }

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
    const dataSize = this.gaussians.length * 15 * 4;
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

