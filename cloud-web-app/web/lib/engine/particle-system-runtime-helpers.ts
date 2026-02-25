import type {
  Color,
  ColorGradient,
  Particle,
  ValueRange,
  Vector3,
} from './particle-system-types';

export const Vec3 = {
  create(x = 0, y = 0, z = 0): Vector3 {
    return { x, y, z };
  },

  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  normalize(v: Vector3): Vector3 {
    const len = Vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  random(): Vector3 {
    return Vec3.normalize({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
    });
  },
};

export const ColorUtil = {
  lerp(a: Color, b: Color, t: number): Color {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
      a: a.a + (b.a - a.a) * t,
    };
  },

  toRGBA(c: Color): string {
    return `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${c.a})`;
  },

  fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 1, g: 1, b: 1, a: 1 };
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
      a: 1,
    };
  },
};

export function randomRange(range: ValueRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

export function sampleGradient(gradient: ColorGradient[], t: number): Color {
  if (gradient.length === 0) return { r: 1, g: 1, b: 1, a: 1 };
  if (gradient.length === 1) return gradient[0].color;
  
  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].time && t <= gradient[i + 1].time) {
      const localT = (t - gradient[i].time) / (gradient[i + 1].time - gradient[i].time);
      return ColorUtil.lerp(gradient[i].color, gradient[i + 1].color, localT);
    }
  }
  
  return gradient[gradient.length - 1].color;
}

export function sampleCurve(curve: { time: number; [key: string]: number }[], t: number, key: string): number {
  if (curve.length === 0) return 1;
  if (curve.length === 1) return curve[0][key];
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].time && t <= curve[i + 1].time) {
      const localT = (t - curve[i].time) / (curve[i + 1].time - curve[i].time);
      return curve[i][key] + (curve[i + 1][key] - curve[i][key]) * localT;
    }
  }
  
  return curve[curve.length - 1][key];
}

export class SimplexNoise {
  private perm: number[] = [];
  
  constructor(seed = Math.random()) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    let s = seed * 1000;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  noise3D(x: number, y: number, z: number): number {
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);
    
    let n0 = 0;
    const dot = (g: number[], px: number, py: number, pz: number) => g[0]*px + g[1]*py + g[2]*pz;
    
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 > 0) {
      t0 *= t0;
      const gi0 = this.perm[(i + this.perm[(j + this.perm[k & 255]) & 255]) & 255] % 12;
      n0 = t0 * t0 * dot(grad3[gi0], x0, y0, z0);
    }
    
    return n0 * 32;
  }
}

export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];

  constructor(maxSize: number) {
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      size: 1,
      rotation: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 1,
      age: 0,
      userData: {},
    };
  }

  spawn(): Particle | null {
    if (this.pool.length === 0) return null;
    
    const particle = this.pool.pop()!;
    this.active.push(particle);
    return particle;
  }

  recycle(particle: Particle): void {
    const index = this.active.indexOf(particle);
    if (index !== -1) {
      this.active.splice(index, 1);
      particle.position = { x: 0, y: 0, z: 0 };
      particle.velocity = { x: 0, y: 0, z: 0 };
      particle.acceleration = { x: 0, y: 0, z: 0 };
      particle.life = 0;
      particle.age = 0;
      particle.userData = {};
      this.pool.push(particle);
    }
  }

  getActive(): Particle[] {
    return this.active;
  }

  getActiveCount(): number {
    return this.active.length;
  }

  getAvailableCount(): number {
    return this.pool.length;
  }

  clear(): void {
    while (this.active.length > 0) {
      const particle = this.active.pop()!;
      this.pool.push(particle);
    }
  }
}
