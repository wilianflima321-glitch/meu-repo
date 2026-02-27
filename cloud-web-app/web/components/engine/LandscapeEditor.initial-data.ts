import type { TerrainConfig } from './LandscapeEditor.types';

export type TerrainPreset = 'flat' | 'hills' | 'mountains' | 'valley' | 'island' | 'canyon';

export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 200,
  height: 200,
  resolution: 129,
  maxHeight: 50,
  layers: [
    {
      id: '1',
      name: 'Grass',
      texture: '',
      tiling: 10,
      color: '#4a7c4f',
      blendWeight: 1,
      minSlope: 0,
      maxSlope: 0.3,
      minHeight: 0,
      maxHeight: 0.3,
    },
    {
      id: '2',
      name: 'Rock',
      texture: '',
      tiling: 5,
      color: '#6b6b6b',
      blendWeight: 1,
      minSlope: 0.3,
      maxSlope: 1,
      minHeight: 0.3,
      maxHeight: 0.7,
    },
    {
      id: '3',
      name: 'Snow',
      texture: '',
      tiling: 8,
      color: '#e8e8e8',
      blendWeight: 1,
      minSlope: 0,
      maxSlope: 0.5,
      minHeight: 0.7,
      maxHeight: 1,
    },
  ],
  foliage: [],
};

export function createInitialHeightmap(resolution: number): Float32Array {
  const data = new Float32Array(resolution * resolution);

  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const nx = x / resolution;
      const nz = z / resolution;
      data[z * resolution + x] = 0.3 + Math.sin(nx * Math.PI * 2) * 0.1 + Math.cos(nz * Math.PI * 3) * 0.1;
    }
  }

  return data;
}

export function generateTerrainHeightmap(type: TerrainPreset, resolution: number): Float32Array {
  const newHeightmap = new Float32Array(resolution * resolution);

  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const nx = x / resolution - 0.5;
      const nz = z / resolution - 0.5;
      const dist = Math.sqrt(nx * nx + nz * nz);

      let height = 0;

      switch (type) {
        case 'flat':
          height = 0.3;
          break;
        case 'hills':
          height =
            0.3 +
            Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.2 +
            Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07 + 2) * 0.15;
          break;
        case 'mountains':
          height = Math.pow(Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 + 0.5, 2) * 0.8 + Math.random() * 0.05;
          break;
        case 'valley':
          height = 0.8 - Math.pow(Math.abs(nx) * 2, 0.5) * 0.6;
          break;
        case 'island':
          height = Math.max(0, 0.6 - dist * 1.5) + Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.1;
          break;
        case 'canyon': {
          const canyonDist = Math.abs(nx);
          height = canyonDist < 0.1 ? 0.1 : 0.5 + Math.sin(z * 0.1) * 0.1;
          break;
        }
      }

      newHeightmap[z * resolution + x] = Math.max(0, Math.min(1, height));
    }
  }

  return newHeightmap;
}
