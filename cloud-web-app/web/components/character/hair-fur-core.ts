export interface HairData {
  strandCount: number;
  regions: HairRegion[];
  clumping: ClumpingSettings;
  curl: CurlSettings;
  gradient: GradientStop[];
  physics: PhysicsSettings;
  lod: LODSettings;
  preset: HairPreset;
}

export interface HairRegion {
  id: string;
  name: string;
  length: number;
  density: number;
  enabled: boolean;
}

export interface ClumpingSettings {
  factor: number;
  iterations: number;
  noise: number;
  tightness: number;
}

export interface CurlSettings {
  intensity: number;
  frequency: number;
  randomness: number;
  type: 'wave' | 'curl' | 'coil';
}

export interface GradientStop {
  position: number;
  color: string;
}

export interface PhysicsSettings {
  gravity: number;
  stiffness: number;
  damping: number;
  windStrength: number;
  windTurbulence: number;
}

export interface LODSettings {
  strandDistance: number;
  cardDistance: number;
  cardCount: number;
  enableLOD: boolean;
}

export type HairPreset = 'straight' | 'wavy' | 'curly' | 'afro' | 'fur' | 'custom';
export type BrushTool = 'comb' | 'cut' | 'add' | 'length';

export interface BrushSettings {
  tool: BrushTool;
  size: number;
  strength: number;
}

export const HAIR_PRESETS: Record<HairPreset, Partial<HairData>> = {
  straight: {
    curl: { intensity: 0, frequency: 0, randomness: 0.1, type: 'wave' },
    clumping: { factor: 0.3, iterations: 2, noise: 0.1, tightness: 0.7 },
  },
  wavy: {
    curl: { intensity: 0.4, frequency: 2, randomness: 0.2, type: 'wave' },
    clumping: { factor: 0.4, iterations: 3, noise: 0.15, tightness: 0.5 },
  },
  curly: {
    curl: { intensity: 0.7, frequency: 4, randomness: 0.3, type: 'curl' },
    clumping: { factor: 0.5, iterations: 4, noise: 0.2, tightness: 0.4 },
  },
  afro: {
    curl: { intensity: 1.0, frequency: 8, randomness: 0.5, type: 'coil' },
    clumping: { factor: 0.6, iterations: 5, noise: 0.3, tightness: 0.3 },
  },
  fur: {
    curl: { intensity: 0.1, frequency: 1, randomness: 0.4, type: 'wave' },
    clumping: { factor: 0.2, iterations: 1, noise: 0.4, tightness: 0.8 },
  },
  custom: {},
};

export const DEFAULT_REGIONS: HairRegion[] = [
  { id: 'top', name: 'Topo', length: 0.8, density: 1.0, enabled: true },
  { id: 'sides', name: 'Laterais', length: 0.6, density: 0.9, enabled: true },
  { id: 'back', name: 'Traseira', length: 0.7, density: 0.95, enabled: true },
  { id: 'front', name: 'Frontal', length: 0.5, density: 0.85, enabled: true },
  { id: 'nape', name: 'Nuca', length: 0.4, density: 0.8, enabled: true },
];

export const DEFAULT_GRADIENT: GradientStop[] = [
  { position: 0, color: '#2d1810' },
  { position: 0.5, color: '#4a2c1a' },
  { position: 1, color: '#6b3d22' },
];

function interpolateGradient(gradient: GradientStop[], t: number): { r: number; g: number; b: number } {
  if (gradient.length === 0) return { r: 0.5, g: 0.3, b: 0.2 };
  if (gradient.length === 1) {
    const c = hexToRgb(gradient[0].color);
    return c || { r: 0.5, g: 0.3, b: 0.2 };
  }

  let lower = gradient[0];
  let upper = gradient[gradient.length - 1];

  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].position && t <= gradient[i + 1].position) {
      lower = gradient[i];
      upper = gradient[i + 1];
      break;
    }
  }

  const range = upper.position - lower.position;
  const localT = range > 0 ? (t - lower.position) / range : 0;

  const c1 = hexToRgb(lower.color) || { r: 0, g: 0, b: 0 };
  const c2 = hexToRgb(upper.color) || { r: 1, g: 1, b: 1 };

  return {
    r: c1.r + (c2.r - c1.r) * localT,
    g: c1.g + (c2.g - c1.g) * localT,
    b: c1.b + (c2.b - c1.b) * localT,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateHairStrands(
  strandCount: number,
  regions: HairRegion[],
  clumping: ClumpingSettings,
  curl: CurlSettings,
  gradient: GradientStop[],
  physics: PhysicsSettings,
  time: number
): { positions: Float32Array; colors: Float32Array } {
  const segmentsPerStrand = 12;
  const totalPoints = strandCount * segmentsPerStrand * 2;
  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);

  const enabledRegions = regions.filter((r) => r.enabled);
  const strandsPerRegion = Math.floor(strandCount / Math.max(enabledRegions.length, 1));

  let pointIndex = 0;

  enabledRegions.forEach((region, regionIdx) => {
    const regionAngleStart = (regionIdx / enabledRegions.length) * Math.PI * 2;
    const regionAngleEnd = ((regionIdx + 1) / enabledRegions.length) * Math.PI * 2;

    for (let i = 0; i < strandsPerRegion; i++) {
      const theta = regionAngleStart + Math.random() * (regionAngleEnd - regionAngleStart);
      const phi = Math.acos(1 - 2 * (0.2 + Math.random() * 0.3));
      const scalRadius = 0.5;

      const rootX = scalRadius * Math.sin(phi) * Math.cos(theta);
      const rootY = scalRadius * Math.cos(phi) + 0.3;
      const rootZ = scalRadius * Math.sin(phi) * Math.sin(theta);

      const dirX = rootX;
      const dirY = rootY - 0.3;
      const dirZ = rootZ;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;

      const clumpSeed = Math.floor(i / (strandsPerRegion * clumping.factor + 1));
      const clumpOffsetX = Math.sin(clumpSeed * 12.9898) * 0.5 * clumping.tightness;
      const clumpOffsetZ = Math.cos(clumpSeed * 78.233) * 0.5 * clumping.tightness;

      for (let seg = 0; seg < segmentsPerStrand; seg++) {
        const t = seg / (segmentsPerStrand - 1);
        const tNext = (seg + 1) / (segmentsPerStrand - 1);
        const length = region.length * 0.8;

        let curlX = 0;
        let curlZ = 0;
        if (curl.intensity > 0) {
          const curlPhase = i * 0.1 + curl.randomness * Math.random();
          const curlAmp = curl.intensity * 0.1 * t;

          if (curl.type === 'wave') {
            curlX = Math.sin(t * curl.frequency * Math.PI + curlPhase) * curlAmp;
          } else if (curl.type === 'curl') {
            curlX = Math.sin(t * curl.frequency * Math.PI * 2 + curlPhase) * curlAmp;
            curlZ = Math.cos(t * curl.frequency * Math.PI * 2 + curlPhase) * curlAmp;
          } else if (curl.type === 'coil') {
            curlX = Math.sin(t * curl.frequency * Math.PI * 3 + curlPhase) * curlAmp * 1.5;
            curlZ = Math.cos(t * curl.frequency * Math.PI * 3 + curlPhase) * curlAmp * 1.5;
          }
        }

        const gravityEffect = t * t * physics.gravity * 0.3;
        const windEffect = Math.sin(time * 2 + rootX * 5) * physics.windStrength * t * 0.1;
        const windTurbEffect = Math.sin(time * 5 + rootZ * 10) * physics.windTurbulence * t * 0.05;

        const calcPos = (tVal: number) => {
          const stiffMult = 1 - physics.stiffness * 0.5;
          return {
            x: rootX + (dirX / dirLen) * tVal * length + curlX + clumpOffsetX * tVal + windEffect * stiffMult,
            y: rootY + (dirY / dirLen) * tVal * length - gravityEffect * stiffMult + windTurbEffect,
            z: rootZ + (dirZ / dirLen) * tVal * length + curlZ + clumpOffsetZ * tVal,
          };
        };

        const p1 = calcPos(t);
        const p2 = calcPos(Math.min(tNext, 1));

        positions[pointIndex * 3] = p1.x;
        positions[pointIndex * 3 + 1] = p1.y;
        positions[pointIndex * 3 + 2] = p1.z;
        pointIndex++;

        positions[pointIndex * 3] = p2.x;
        positions[pointIndex * 3 + 1] = p2.y;
        positions[pointIndex * 3 + 2] = p2.z;
        pointIndex++;

        const color1 = interpolateGradient(gradient, t);
        const color2 = interpolateGradient(gradient, tNext);

        colors[(pointIndex - 2) * 3] = color1.r;
        colors[(pointIndex - 2) * 3 + 1] = color1.g;
        colors[(pointIndex - 2) * 3 + 2] = color1.b;

        colors[(pointIndex - 1) * 3] = color2.r;
        colors[(pointIndex - 1) * 3 + 1] = color2.g;
        colors[(pointIndex - 1) * 3 + 2] = color2.b;
      }
    }
  });

  return { positions, colors };
}
