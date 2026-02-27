import * as THREE from 'three';

export class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed: number = Math.random() * 65536) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];

    this.perm = new Array(512);
    const p = new Array(256);

    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    const random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    let n0, n1, n2;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  private dot3(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + (g[2] || 0) * z;
  }

  noise3D(x: number, y: number, z: number): number {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    let n0, n1, n2, n3;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else { t0 *= t0; n0 = t0 * t0 * this.dot3(this.grad3[gi0], x0, y0, z0); }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else { t1 *= t1; n1 = t1 * t1 * this.dot3(this.grad3[gi1], x1, y1, z1); }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else { t2 *= t2; n2 = t2 * t2 * this.dot3(this.grad3[gi2], x2, y2, z2); }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else { t3 *= t3; n3 = t3 * t3 * this.dot3(this.grad3[gi3], x3, y3, z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  }

  fbm(x: number, y: number, octaves: number, lacunarity: number = 2, gain: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  ridged(x: number, y: number, octaves: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;

    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise2D(x * frequency, y * frequency));
      total += n * n * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total;
  }
}

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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

        const mask = Math.max(0, 1 - dist * dist * 1.5);
        data[y * width + x] *= mask;
      }
    }

    return data;
  }

  generateErosion(
    heightmap: Float32Array,
    width: number,
    height: number,
    iterations: number = 1000
  ): Float32Array {
    const result = new Float32Array(heightmap);

    for (let iter = 0; iter < iterations; iter++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);

      let cx = x;
      let cy = y;
      const sediment = 0.01;

      for (let step = 0; step < 20; step++) {
        const idx = cy * width + cx;
        const currentHeight = result[idx];

        let lowestX = cx;
        let lowestY = cy;
        let lowestHeight = currentHeight;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nHeight = result[ny * width + nx];
              if (nHeight < lowestHeight) {
                lowestHeight = nHeight;
                lowestX = nx;
                lowestY = ny;
              }
            }
          }
        }

        if (lowestX === cx && lowestY === cy) break;

        result[idx] = Math.max(0, result[idx] - sediment);
        result[lowestY * width + lowestX] += sediment;

        cx = lowestX;
        cy = lowestY;
      }
    }

    return result;
  }

  getSeed(): number {
    return this.seed;
  }
}

