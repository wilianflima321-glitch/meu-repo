/** @aethel-heavy-async-boundary Studio/volumetric-cloud noise generation. */

import * as THREE from 'three';

// ============================================================================
// NOISE GENERATORS
// ============================================================================

export class WorleyNoise3D {
  private points: THREE.Vector3[] = [];
  private cellSize: number;

  constructor(numPoints: number = 32, seed: number = 12345) {
    this.cellSize = 1;

    // Generate random points
    const rng = this.seededRandom(seed);
    for (let i = 0; i < numPoints; i++) {
      this.points.push(new THREE.Vector3(
        rng() * this.cellSize,
        rng() * this.cellSize,
        rng() * this.cellSize
      ));
    }
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  evaluate(x: number, y: number, z: number): number {
    const px = ((x % this.cellSize) + this.cellSize) % this.cellSize;
    const py = ((y % this.cellSize) + this.cellSize) % this.cellSize;
    const pz = ((z % this.cellSize) + this.cellSize) % this.cellSize;

    let minDist = Infinity;

    for (const point of this.points) {
      // Check cell and neighbors
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const offsetPoint = point.clone().add(
              new THREE.Vector3(ox * this.cellSize, oy * this.cellSize, oz * this.cellSize)
            );

            const dist = Math.sqrt(
              (px - offsetPoint.x) ** 2 +
              (py - offsetPoint.y) ** 2 +
              (pz - offsetPoint.z) ** 2
            );

            minDist = Math.min(minDist, dist);
          }
        }
      }
    }

    return minDist / (this.cellSize * 0.5); // Normalize to 0-1
  }
}

export class PerlinNoise3D {
  private permutation: number[] = [];

  constructor(seed: number = 12345) {
    // Generate permutation table
    const rng = this.seededRandom(seed);

    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }

    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }

    // Duplicate
    for (let i = 0; i < 256; i++) {
      this.permutation[256 + i] = this.permutation[i];
    }
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  evaluate(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const p = this.permutation;

    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z), u),
        this.lerp(this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  fbm(x: number, y: number, z: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.evaluate(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

// ============================================================================
// CLOUD NOISE TEXTURE GENERATOR
// ============================================================================

export class CloudNoiseGenerator {
  private worley: WorleyNoise3D;
  private perlin: PerlinNoise3D;

  constructor(seed: number = 12345) {
    this.worley = new WorleyNoise3D(32, seed);
    this.perlin = new PerlinNoise3D(seed + 1);
  }

  generate3DTexture(size: number = 128): THREE.Data3DTexture {
    const data = new Float32Array(size * size * size * 4);

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const fx = x / size;
          const fy = y / size;
          const fz = z / size;

          // Base shape (Perlin-Worley)
          const perlin = (this.perlin.fbm(fx * 4, fy * 4, fz * 4, 4) + 1) * 0.5;
          const worley1 = 1 - this.worley.evaluate(fx * 8, fy * 8, fz * 8);
          const worley2 = 1 - this.worley.evaluate(fx * 16, fy * 16, fz * 16);
          const worley3 = 1 - this.worley.evaluate(fx * 32, fy * 32, fz * 32);

          // Combine for base shape
          const worleyFBM = worley1 * 0.625 + worley2 * 0.25 + worley3 * 0.125;
          const baseShape = this.remap(perlin, 1 - worleyFBM, 1, 0, 1);

          // Detail noise
          const detail1 = 1 - this.worley.evaluate(fx * 16, fy * 16, fz * 16);
          const detail2 = 1 - this.worley.evaluate(fx * 32, fy * 32, fz * 32);
          const detail3 = 1 - this.worley.evaluate(fx * 64, fy * 64, fz * 64);

          const idx = (z * size * size + y * size + x) * 4;
          data[idx] = Math.max(0, Math.min(1, baseShape));     // R: Base shape
          data[idx + 1] = Math.max(0, Math.min(1, detail1));   // G: Detail 1
          data[idx + 2] = Math.max(0, Math.min(1, detail2));   // B: Detail 2
          data[idx + 3] = Math.max(0, Math.min(1, detail3));   // A: Detail 3
        }
      }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.wrapR = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  generateWeatherMap(size: number = 512): THREE.DataTexture {
    const data = new Float32Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = x / size;
        const fy = y / size;

        // Coverage (R)
        const coverage = (this.perlin.fbm(fx * 2, fy * 2, 0, 4) + 1) * 0.5;

        // Precipitation/density (G)
        const precipitation = (this.perlin.fbm(fx * 4 + 100, fy * 4 + 100, 0, 3) + 1) * 0.5;

        // Cloud type (B) - 0: stratus, 0.5: cumulus, 1: cumulonimbus
        const type = (this.perlin.fbm(fx + 200, fy + 200, 0, 2) + 1) * 0.5;

        const idx = (y * size + x) * 4;
        data[idx] = Math.max(0, Math.min(1, coverage));
        data[idx + 1] = Math.max(0, Math.min(1, precipitation));
        data[idx + 2] = Math.max(0, Math.min(1, type));
        data[idx + 3] = 1;
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private remap(value: number, low1: number, high1: number, low2: number, high2: number): number {
    return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
  }
}
