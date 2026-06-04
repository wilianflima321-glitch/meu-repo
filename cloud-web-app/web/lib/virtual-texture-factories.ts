// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Virtual texture source factories.
 */

import { ProceduralVirtualTextureSource } from './virtual-texture-system';

// ============================================================================
// TERRAIN VIRTUAL TEXTURE (Example)
// ============================================================================

export function createTerrainVirtualTexture(): ProceduralVirtualTextureSource {
  return new ProceduralVirtualTextureSource(
    16384, 16384, 128,
    (tileX: number, tileY: number, mip: number) => {
      const tileSize = 128;
      const data = new Uint8ClampedArray(tileSize * tileSize * 4);
      const scale = Math.pow(2, mip);

      for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
          const worldX = (tileX * tileSize + x) * scale;
          const worldY = (tileY * tileSize + y) * scale;

          // Simple noise-based terrain color
          const noise = Math.sin(worldX * 0.01) * Math.cos(worldY * 0.01) * 0.5 + 0.5;

          // Grass to dirt gradient
          const grassColor = [34, 139, 34];
          const dirtColor = [139, 90, 43];

          const idx = (y * tileSize + x) * 4;
          data[idx + 0] = Math.floor(grassColor[0] * (1 - noise) + dirtColor[0] * noise);
          data[idx + 1] = Math.floor(grassColor[1] * (1 - noise) + dirtColor[1] * noise);
          data[idx + 2] = Math.floor(grassColor[2] * (1 - noise) + dirtColor[2] * noise);
          data[idx + 3] = 255;
        }
      }

      return new ImageData(data, tileSize, tileSize);
    }
  );
}
