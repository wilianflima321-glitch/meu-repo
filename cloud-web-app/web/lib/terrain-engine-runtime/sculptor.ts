// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

import * as THREE from 'three';
import type { TerrainChunk, SculptBrush } from './types';
import type { TerrainEngine } from './engine';

export class TerrainSculptor {
  private terrain: TerrainEngine;
  private brush: SculptBrush;
  private isActive: boolean = false;

  constructor(terrain: TerrainEngine) {
    this.terrain = terrain;
    this.brush = {
      type: 'raise',
      size: 10,
      strength: 0.5,
      falloff: 'smooth',
    };
  }

  setBrush(brush: Partial<SculptBrush>): void {
    Object.assign(this.brush, brush);
  }

  getBrush(): SculptBrush {
    return { ...this.brush };
  }

  startSculpting(): void {
    this.isActive = true;
  }

  stopSculpting(): void {
    this.isActive = false;
  }

  sculpt(position: THREE.Vector3, deltaTime: number): void {
    if (!this.isActive) return;

    const config = this.terrain.getConfig();
    const chunks = this.terrain.getChunksNearPosition(position, this.brush.size * 2);

    for (const chunk of chunks) {
      this.sculptChunk(chunk, position, deltaTime);
    }

    // Update affected chunks
    this.terrain.updateChunks(chunks.map(c => c.id));
  }

  private sculptChunk(chunk: TerrainChunk, center: THREE.Vector3, deltaTime: number): void {
    const config = this.terrain.getConfig();
    const heightWidth = Math.sqrt(chunk.heightData.length);
    const cellSize = config.chunkSize / heightWidth;

    const chunkWorldX = chunk.x * config.chunkSize;
    const chunkWorldZ = chunk.z * config.chunkSize;

    // Find affected vertices
    const minX = Math.max(0, Math.floor((center.x - this.brush.size - chunkWorldX) / cellSize));
    const maxX = Math.min(heightWidth - 1, Math.ceil((center.x + this.brush.size - chunkWorldX) / cellSize));
    const minZ = Math.max(0, Math.floor((center.z - this.brush.size - chunkWorldZ) / cellSize));
    const maxZ = Math.min(heightWidth - 1, Math.ceil((center.z + this.brush.size - chunkWorldZ) / cellSize));

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const worldX = chunkWorldX + x * cellSize;
        const worldZ = chunkWorldZ + z * cellSize;

        const dx = worldX - center.x;
        const dz = worldZ - center.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= this.brush.size) {
          const falloff = this.calculateFalloff(distance / this.brush.size);
          const strength = this.brush.strength * falloff * deltaTime;

          const idx = z * heightWidth + x;

          switch (this.brush.type) {
            case 'raise':
              chunk.heightData[idx] += strength;
              break;
            case 'lower':
              chunk.heightData[idx] -= strength;
              break;
            case 'smooth':
              chunk.heightData[idx] = this.smoothVertex(chunk.heightData, idx, heightWidth, strength);
              break;
            case 'flatten':
              const targetHeight = center.y / config.heightScale;
              chunk.heightData[idx] = THREE.MathUtils.lerp(
                chunk.heightData[idx],
                targetHeight,
                strength
              );
              break;
            case 'noise':
              chunk.heightData[idx] += (Math.random() - 0.5) * strength;
              break;
          }

          // Clamp height
          chunk.heightData[idx] = Math.max(0, Math.min(1, chunk.heightData[idx]));
        }
      }
    }
  }

  private calculateFalloff(t: number): number {
    switch (this.brush.falloff) {
      case 'linear':
        return 1 - t;
      case 'smooth':
        return 1 - (3 * t * t - 2 * t * t * t);
      case 'sharp':
        return Math.pow(1 - t, 2);
      default:
        return 1 - t;
    }
  }

  private smoothVertex(
    data: Float32Array,
    idx: number,
    width: number,
    strength: number
  ): number {
    const x = idx % width;
    const z = Math.floor(idx / width);

    let sum = 0;
    let count = 0;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < width && nz >= 0 && nz < width) {
          sum += data[nz * width + nx];
          count++;
        }
      }
    }

    const average = sum / count;
    return THREE.MathUtils.lerp(data[idx], average, strength);
  }
}

// ============================================================================
// TERRAIN ENGINE
// ============================================================================
