import type { AssetType, AudioFormat, HDRIFormat, ModelFormat, TextureFormat } from './asset-importer-contracts';

export function getAssetExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

export function detectAssetType(source: string | File): AssetType {
  const name = typeof source === 'string' ? source : source.name;
  const ext = getAssetExtension(name);

  if (['gltf', 'glb', 'fbx', 'obj'].includes(ext)) return 'model';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tga'].includes(ext)) return 'texture';
  if (['hdr', 'exr'].includes(ext)) return 'hdri';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';

  return 'data';
}

export function detectModelFormat(source: string | File | ArrayBuffer): ModelFormat {
  if (source instanceof ArrayBuffer) return 'glb';
  const name = typeof source === 'string' ? source : source.name;
  return getAssetExtension(name) as ModelFormat;
}

export function detectTextureFormat(source: string | File): TextureFormat {
  const name = typeof source === 'string' ? source : source.name;
  return getAssetExtension(name) as TextureFormat;
}

export function detectHDRIFormat(source: string | File): HDRIFormat {
  const name = typeof source === 'string' ? source : source.name;
  return getAssetExtension(name) as HDRIFormat;
}

export function detectAudioFormat(source: string | File): AudioFormat {
  const name = typeof source === 'string' ? source : source.name;
  return getAssetExtension(name) as AudioFormat;
}

export function extractAssetName(source: string | File | ArrayBuffer): string {
  if (source instanceof ArrayBuffer) return 'model';
  if (source instanceof File) return source.name.split('.')[0];
  return source.split('/').pop()?.split('.')[0] || 'asset';
}

export function getAssetDataSize(source: string | File | ArrayBuffer): number {
  if (source instanceof ArrayBuffer) return source.byteLength;
  if (source instanceof File) return source.size;
  return 0;
}
