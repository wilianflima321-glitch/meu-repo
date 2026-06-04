// @aethel-heavy-async-boundary Studio/terrain heightmap runtime.
import * as THREE from 'three';
import type { BrushSettings, NoiseSettings } from './terrain-contracts';

// ============================================================================
// NOISE GENERATORS
// ============================================================================

export class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = 0) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p.push(i);
    }

    // Shuffle using seed
    let random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate array
    return [...p, ...p];
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, y),
        this.grad(this.permutation[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, y - 1),
        this.grad(this.permutation[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  }

  octaveNoise2D(
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

// ============================================================================
// HEIGHT MAP
// ============================================================================

export class HeightMap {
  private data: Float32Array;
  readonly width: number;
  readonly height: number;
  private min: number = 0;
  private max: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
  }

  get(x: number, y: number): number {
    x = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    return this.data[y * this.width + x];
  }

  getInterpolated(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);

    const fx = x - x0;
    const fy = y - y0;

    const v00 = this.get(x0, y0);
    const v10 = this.get(x1, y0);
    const v01 = this.get(x0, y1);
    const v11 = this.get(x1, y1);

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;

    return v0 * (1 - fy) + v1 * fy;
  }

  set(x: number, y: number, value: number): void {
    x = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    this.data[y * this.width + x] = value;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
  }

  fill(value: number): void {
    this.data.fill(value);
    this.min = value;
    this.max = value;
  }

  normalize(): void {
    const range = this.max - this.min;
    if (range === 0) return;

    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = (this.data[i] - this.min) / range;
    }

    this.min = 0;
    this.max = 1;
  }

  generateFromNoise(settings: NoiseSettings): void {
    const noise = new PerlinNoise(settings.seed);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = (x + settings.offset.x) * settings.frequency / this.width;
        const ny = (y + settings.offset.y) * settings.frequency / this.height;

        let value = noise.octaveNoise2D(
          nx,
          ny,
          settings.octaves,
          settings.persistence,
          settings.lacunarity
        );

        // Apply noise type transformations
        switch (settings.type) {
          case 'ridged':
            value = 1 - Math.abs(value);
            value = value * value;
            break;
          case 'billowy':
            value = Math.abs(value);
            break;
          case 'hybrid':
            value = (1 - Math.abs(value)) * 0.5 + Math.abs(value) * 0.5;
            break;
        }

        value = (value + 1) * 0.5 * settings.amplitude;
        this.set(x, y, value);
      }
    }

    this.normalize();
  }

  generateDiamondSquare(roughness: number = 0.5, seed: number = 0): void {
    const size = Math.max(this.width, this.height);
    const random = this.seededRandom(seed);

    // Initialize corners
    this.set(0, 0, random());
    this.set(size - 1, 0, random());
    this.set(0, size - 1, random());
    this.set(size - 1, size - 1, random());

    let step = size - 1;
    let scale = roughness;

    while (step > 1) {
      const halfStep = step / 2;

      // Diamond step
      for (let y = halfStep; y < size; y += step) {
        for (let x = halfStep; x < size; x += step) {
          const avg = (
            this.get(x - halfStep, y - halfStep) +
            this.get(x + halfStep, y - halfStep) +
            this.get(x - halfStep, y + halfStep) +
            this.get(x + halfStep, y + halfStep)
          ) / 4;
          this.set(x, y, avg + (random() * 2 - 1) * scale);
        }
      }

      // Square step
      for (let y = 0; y < size; y += halfStep) {
        for (let x = (y + halfStep) % step; x < size; x += step) {
          let sum = 0;
          let count = 0;

          if (x - halfStep >= 0) { sum += this.get(x - halfStep, y); count++; }
          if (x + halfStep < size) { sum += this.get(x + halfStep, y); count++; }
          if (y - halfStep >= 0) { sum += this.get(x, y - halfStep); count++; }
          if (y + halfStep < size) { sum += this.get(x, y + halfStep); count++; }

          this.set(x, y, sum / count + (random() * 2 - 1) * scale);
        }
      }

      step = halfStep;
      scale *= roughness;
    }

    this.normalize();
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  }

  applyBrush(
    centerX: number,
    centerY: number,
    brush: BrushSettings,
    operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise',
    targetHeight?: number
  ): void {
    const halfSize = brush.size / 2;
    const startX = Math.max(0, Math.floor(centerX - halfSize));
    const startY = Math.max(0, Math.floor(centerY - halfSize));
    const endX = Math.min(this.width - 1, Math.ceil(centerX + halfSize));
    const endY = Math.min(this.height - 1, Math.ceil(centerY + halfSize));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if within brush
        if (brush.shape === 'square' || distance <= halfSize) {
          // Calculate falloff
          let strength = brush.strength;
          if (brush.shape !== 'square') {
            const t = distance / halfSize;
            if (brush.shape === 'soft') {
              strength *= 1 - (t * t); // Quadratic falloff
            } else {
              strength *= Math.pow(1 - t, brush.falloff);
            }
          }

          const current = this.get(x, y);
          let newValue = current;

          switch (operation) {
            case 'raise':
              newValue = current + strength * 0.01;
              break;
            case 'lower':
              newValue = current - strength * 0.01;
              break;
            case 'smooth':
              // Average with neighbors
              let sum = 0;
              let count = 0;
              for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                  sum += this.get(x + nx, y + ny);
                  count++;
                }
              }
              const avg = sum / count;
              newValue = current + (avg - current) * strength * 0.1;
              break;
            case 'flatten':
              if (targetHeight !== undefined) {
                newValue = current + (targetHeight - current) * strength * 0.1;
              }
              break;
            case 'noise':
              newValue = current + (Math.random() * 2 - 1) * strength * 0.01;
              break;
          }

          this.set(x, y, Math.max(0, Math.min(1, newValue)));
        }
      }
    }
  }

  getNormal(x: number, y: number, scale: number = 1): THREE.Vector3 {
    const left = this.get(x - 1, y) * scale;
    const right = this.get(x + 1, y) * scale;
    const down = this.get(x, y - 1) * scale;
    const up = this.get(x, y + 1) * scale;

    const normal = new THREE.Vector3(
      left - right,
      2,
      down - up
    );

    return normal.normalize();
  }

  getSlope(x: number, y: number, scale: number = 1): number {
    const normal = this.getNormal(x, y, scale);
    return Math.acos(normal.y);
  }

  getData(): Float32Array {
    return this.data;
  }

  toImageData(): ImageData {
    const imageData = new ImageData(this.width, this.height);

    for (let i = 0; i < this.data.length; i++) {
      const value = Math.floor(this.data[i] * 255);
      const j = i * 4;
      imageData.data[j] = value;
      imageData.data[j + 1] = value;
      imageData.data[j + 2] = value;
      imageData.data[j + 3] = 255;
    }

    return imageData;
  }

  static fromImageData(imageData: ImageData): HeightMap {
    const heightMap = new HeightMap(imageData.width, imageData.height);

    for (let i = 0; i < imageData.width * imageData.height; i++) {
      const j = i * 4;
      // Use luminance formula
      const r = imageData.data[j];
      const g = imageData.data[j + 1];
      const b = imageData.data[j + 2];
      const value = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      heightMap.data[i] = value;
    }

    return heightMap;
  }
}
