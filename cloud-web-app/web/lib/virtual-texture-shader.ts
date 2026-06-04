// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Shader source for sparse virtual texture sampling and feedback.
 */

import * as THREE from 'three';

// ============================================================================
// VIRTUAL TEXTURE SHADER
// ============================================================================

export const VirtualTextureShader = {
  uniforms: {
    pageTable: { value: null as THREE.Texture | null },
    physicalTexture: { value: null as THREE.Texture | null },
    virtualTextureSize: { value: 16384 },
    physicalTextureSize: { value: 4096 },
    tileSize: { value: 128 },
    tilesPerSide: { value: 32 },
    mipBias: { value: 0.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D pageTable;
    uniform sampler2D physicalTexture;
    uniform float virtualTextureSize;
    uniform float physicalTextureSize;
    uniform float tileSize;
    uniform float tilesPerSide;
    uniform float mipBias;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    float getMipLevel(vec2 uv) {
      vec2 dx = dFdx(uv * virtualTextureSize);
      vec2 dy = dFdy(uv * virtualTextureSize);
      float d = max(dot(dx, dx), dot(dy, dy));
      return 0.5 * log2(d) + mipBias;
    }

    vec4 sampleVirtualTexture(vec2 uv) {
      float mip = getMipLevel(uv);
      mip = clamp(floor(mip), 0.0, 10.0);

      // Calculate tile coordinates
      float scale = pow(2.0, mip);
      float tilesAtMip = virtualTextureSize / tileSize / scale;

      vec2 tileCoord = uv * tilesAtMip;
      vec2 tileIndex = floor(tileCoord);
      vec2 inTileUV = fract(tileCoord);

      // Look up page table
      vec2 pageTableUV = vec2(
        (tileIndex.x + 0.5) / tilesAtMip,
        (mip * tilesAtMip + tileIndex.y + 0.5) / (tilesAtMip * 11.0)
      );

      vec4 pageEntry = texture2D(pageTable, pageTableUV);

      // Check if valid
      if (pageEntry.a < 0.5) {
        // Fall back to lower mip
        return vec4(1.0, 0.0, 1.0, 1.0); // Debug magenta
      }

      // Calculate physical texture coordinates
      float tileSizeInAtlas = tileSize / physicalTextureSize;
      vec2 physicalUV = vec2(pageEntry.xy) * tileSizeInAtlas + inTileUV * tileSizeInAtlas;

      return texture2D(physicalTexture, physicalUV);
    }

    void main() {
      gl_FragColor = sampleVirtualTexture(vUv);
    }
  `,

  // Feedback pass shader - encodes required tiles into color
  feedbackFragmentShader: `
    uniform float virtualTextureSize;
    uniform float tileSize;
    uniform float mipBias;

    varying vec2 vUv;

    float getMipLevel(vec2 uv) {
      vec2 dx = dFdx(uv * virtualTextureSize);
      vec2 dy = dFdy(uv * virtualTextureSize);
      float d = max(dot(dx, dx), dot(dy, dy));
      return 0.5 * log2(d) + mipBias;
    }

    void main() {
      float mip = getMipLevel(vUv);
      mip = clamp(floor(mip), 0.0, 10.0);

      float scale = pow(2.0, mip);
      float tilesAtMip = virtualTextureSize / tileSize / scale;

      vec2 tileCoord = vUv * tilesAtMip;
      vec2 tileIndex = floor(tileCoord);

      // Encode tile address into color
      // R: tileX low 8 bits
      // G: tileY low 8 bits
      // B: mip level
      // A: tileX/Y high bits

      float tileX = tileIndex.x;
      float tileY = tileIndex.y;

      gl_FragColor = vec4(
        mod(tileX, 256.0) / 255.0,
        mod(tileY, 256.0) / 255.0,
        mip / 255.0,
        (floor(tileX / 256.0) + floor(tileY / 256.0) * 16.0) / 255.0
      );
    }
  `
};
