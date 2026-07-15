// @aethel-heavy-async-boundary Studio/terrain heightmap runtime; do not import from public route shells.
/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

import * as THREE from 'three';
import { SimplexNoise } from './noise';

export class HeightmapGenerator {
  private noise: SimplexNoise;
  private seed: number;
  
  constructor(seed: number = Math.random() * 65536) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }
  
  generate(
    width: number,
    height: number,
    options: {
      scale?: number;
      octaves?: number;
      persistence?: number;
      lacunarity?: number;
      offset?: THREE.Vector2;
    } = {}
  ): Float32Array {
    const {
      scale = 100,
      octaves = 6,
      persistence = 0.5,
      lacunarity = 2,
      offset = new THREE.Vector2(0, 0),
    } = options;
    
    const data = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x + offset.x) / scale;
        const ny = (y + offset.y) / scale;
        
        let value = this.noise.fbm(nx, ny, octaves, lacunarity, persistence);
        
        // Normalize to 0-1
        value = (value + 1) * 0.5;
        
        data[y * width + x] = value;
      }
    }
    
    return data;
  }
  
  generateIsland(width: number, height: number, scale: number = 100): Float32Array {
    const data = this.generate(width, height, { scale });
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    
    // Apply island mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const falloff = 1 - Math.pow(dist, 2);
        
        const idx = y * width + x;
        data[idx] *= Math.max(0, falloff);
      }
    }
    
    return data;
  }
  
  generateMountains(width: number, height: number): Float32Array {
    const data = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / 80;
        const ny = y / 80;
        
        // Ridged noise for mountain ranges
        let value = this.noise.ridged(nx, ny, 6);
        
        // Add some variation
        value += this.noise.fbm(nx * 2, ny * 2, 4) * 0.3;
        
        // Normalize
        data[y * width + x] = Math.min(1, Math.max(0, value / 2));
      }
    }
    
    return data;
  }
  
  applyErosion(
    heightmap: Float32Array,
    width: number,
    height: number,
    iterations: number = 50000
  ): Float32Array {
    const result = new Float32Array(heightmap);
    
    // Hydraulic erosion simulation
    for (let i = 0; i < iterations; i++) {
      // Random droplet position
      let x = Math.random() * (width - 1);
      let y = Math.random() * (height - 1);
      
      let sediment = 0;
      let water = 1;
      let speed = 0;
      let dx = 0;
      let dy = 0;
      
      const inertia = 0.3;
      const sedimentCapacity = 4;
      const erosionRate = 0.3;
      const depositionRate = 0.3;
      const evaporationRate = 0.01;
      const gravity = 4;
      
      for (let step = 0; step < 64; step++) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        if (xi < 1 || xi >= width - 1 || yi < 1 || yi >= height - 1) break;
        
        // Calculate gradient
        const h00 = result[yi * width + xi];
        const h10 = result[yi * width + xi + 1];
        const h01 = result[(yi + 1) * width + xi];
        const h11 = result[(yi + 1) * width + xi + 1];
        
        const gx = (h10 - h00 + h11 - h01) / 2;
        const gy = (h01 - h00 + h11 - h10) / 2;
        
        // Update direction with inertia
        dx = dx * inertia - gx * (1 - inertia);
        dy = dy * inertia - gy * (1 - inertia);
        
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) break;
        
        dx /= len;
        dy /= len;
        
        // Move droplet
        x += dx;
        y += dy;
        
        const newXi = Math.floor(x);
        const newYi = Math.floor(y);
        
        if (newXi < 1 || newXi >= width - 1 || newYi < 1 || newYi >= height - 1) break;
        
        // Calculate height difference
        const newH = result[newYi * width + newXi];
        const heightDiff = newH - h00;
        
        // Update speed
        speed = Math.sqrt(Math.max(0, speed * speed + heightDiff * gravity));
        
        // Calculate sediment capacity
        const capacity = Math.max(0.01, -heightDiff) * speed * water * sedimentCapacity;
        
        if (sediment > capacity) {
          // Deposit
          const deposit = (sediment - capacity) * depositionRate;
          sediment -= deposit;
          result[yi * width + xi] += deposit;
        } else {
          // Erode
          const erode = Math.min((capacity - sediment) * erosionRate, -heightDiff);
          sediment += erode;
          result[yi * width + xi] -= erode;
        }
        
        // Evaporate water
        water *= (1 - evaporationRate);
        if (water < 0.01) break;
      }
    }
    
    return result;
  }
  
  loadFromImage(image: HTMLImageElement): Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = new Float32Array(image.width * image.height);
    
    for (let i = 0; i < data.length; i++) {
      // Use red channel as height
      data[i] = imageData.data[i * 4] / 255;
    }
    
    return data;
  }
}

// ============================================================================
// TERRAIN MATERIAL (SPLAT MAP)
// ============================================================================
