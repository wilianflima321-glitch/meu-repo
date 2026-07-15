/**
 * Procedural PBR map generation from a single dropped albedo/base-color image
 * (CLAUDE_MASTER_EXECUTION_PLAN_V8 R2 — "Drag-and-Drop Multimodal PBR").
 *
 * IMPORTANT / honesty note: there is no wired AI image-to-image provider in
 * this codebase capable of albedo -> Normal/Roughness/Displacement (see
 * `app/api/ai/3d/generate/route.ts`: `text-to-texture` mode is explicitly
 * `GENERATION_MODE_HELD`, and no image-conditioned texture endpoint exists).
 * Rather than fabricate a call to a non-existent endpoint, this module
 * generates the three auxiliary maps deterministically, entirely on-device,
 * using standard, well-established image-processing techniques:
 *
 *  - Height/displacement: grayscale luminance of the source image.
 *  - Normal map: Sobel-filter gradient of the height map, encoded as a
 *    standard tangent-space normal map (RGB = XYZ * 0.5 + 0.5).
 *  - Roughness: inverted, contrast-stretched luminance (brighter texture
 *    regions are treated as smoother/less rough — a common heuristic used by
 *    texture tools such as Substance's "Height to Normal/Roughness" filters
 *    when no dedicated PBR scan is available).
 *
 * This is real, working, callable code — not a stub — but it is classic
 * image processing, not generative AI. If/when a genuine image-to-image PBR
 * provider is wired, swap `generateProceduralPBRMaps`'s internals for a
 * server call without changing its signature.
 */

import type { ViewportSceneObject } from '@/components/viewport/viewport-model';

export interface ProceduralPBRMaps {
  albedo: string;
  normal: string;
  roughness: string;
  displacement: string;
}

const MAX_DIMENSION = 1024;

async function loadImageBitmapFromFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function drawToCanvas(source: ImageBitmap | HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const width = 'width' in source ? source.width : 0;
  const height = 'height' in source ? source.height : 0;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height, 1));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function luminanceAt(data: Uint8ClampedArray, x: number, y: number, width: number, height: number): number {
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  const i = (cy * width + cx) * 4;
  return (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
}

/** Sobel-filter tangent-space normal map derived from source luminance. */
function buildNormalMap(data: Uint8ClampedArray, width: number, height: number, strength = 2.2): ImageData {
  const out = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = luminanceAt(data, x - 1, y - 1, width, height);
      const t = luminanceAt(data, x, y - 1, width, height);
      const tr = luminanceAt(data, x + 1, y - 1, width, height);
      const l = luminanceAt(data, x - 1, y, width, height);
      const r = luminanceAt(data, x + 1, y, width, height);
      const bl = luminanceAt(data, x - 1, y + 1, width, height);
      const b = luminanceAt(data, x, y + 1, width, height);
      const br = luminanceAt(data, x + 1, y + 1, width, height);

      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -gx * strength;
      let ny = -gy * strength;
      let nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const i = (y * width + x) * 4;
      out.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** Grayscale height/displacement map from source luminance. */
function buildDisplacementMap(data: Uint8ClampedArray, width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = Math.round(luminanceAt(data, x, y, width, height) * 255);
      const i = (y * width + x) * 4;
      out.data[i] = l;
      out.data[i + 1] = l;
      out.data[i + 2] = l;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** Inverted, contrast-stretched luminance heuristic for roughness. */
function buildRoughnessMap(data: Uint8ClampedArray, width: number, height: number): ImageData {
  let min = 1, max = 0;
  const raw = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = luminanceAt(data, x, y, width, height);
      raw[y * width + x] = l;
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }
  const range = Math.max(1e-4, max - min);

  const out = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const normalized = (raw[y * width + x] - min) / range;
      const roughness = Math.round((1 - normalized) * 255);
      const i = (y * width + x) * 4;
      out.data[i] = roughness;
      out.data[i + 1] = roughness;
      out.data[i + 2] = roughness;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function generateProceduralPBRMaps(file: File): Promise<ProceduralPBRMaps> {
  const source = await loadImageBitmapFromFile(file);
  const { canvas, ctx } = drawToCanvas(source);
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const normal = buildNormalMap(data, width, height);
  const roughness = buildRoughnessMap(data, width, height);
  const displacement = buildDisplacementMap(data, width, height);

  return {
    albedo: canvas.toDataURL('image/png'),
    normal: imageDataToDataUrl(normal),
    roughness: imageDataToDataUrl(roughness),
    displacement: imageDataToDataUrl(displacement),
  };
}

export const PBR_SOURCE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export type PBRSourceImageExtension = (typeof PBR_SOURCE_IMAGE_EXTENSIONS)[number];

export function isPBRSourceImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return !!ext && (PBR_SOURCE_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Builds a textured plane scene object from a dropped albedo image + its
 * generated PBR maps, positioned like `buildViewportImportedObject` slots
 * mesh imports (`lib/viewport/viewport-asset-import.ts`).
 */
export function buildViewportPBRPlaneObject({
  file,
  maps,
  existingCount,
  index,
  importedAt,
}: {
  file: { name: string };
  maps: ProceduralPBRMaps;
  existingCount: number;
  index: number;
  importedAt: string;
}): ViewportSceneObject {
  const baseName = file.name.replace(/\.[^.]+$/, '').trim() || `PBR Material ${index + 1}`;
  const slot = existingCount + index;
  const position: [number, number, number] = [
    ((slot % 3) - 1) * 1.6,
    0.01,
    -1.2 - Math.floor(slot / 3) * 0.9,
  ];

  return {
    id: `pbr-${importedAt}-${index}-${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `${baseName} (PBR)`,
    type: 'mesh',
    geometry: 'plane',
    color: 'rgb(255, 255, 255)',
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    textureMaps: {
      albedo: maps.albedo,
      normal: maps.normal,
      roughness: maps.roughness,
      displacement: maps.displacement,
      sourceFileName: file.name,
    },
  };
}
