/**
 * Asset importer extracted from asset-pipeline.
 */

import { EventEmitter } from 'events';
import type { AssetMetadata, AssetType } from './asset-pipeline';

export interface ImportSettings {
  texture?: {
    maxSize?: number;
    generateMipmaps?: boolean;
    compression?: 'none' | 'dxt' | 'etc' | 'astc';
    filterMode?: 'point' | 'bilinear' | 'trilinear';
    wrapMode?: 'repeat' | 'clamp' | 'mirror';
  };
  model?: {
    scale?: number;
    importMaterials?: boolean;
    importAnimations?: boolean;
    generateColliders?: boolean;
    optimizeMesh?: boolean;
  };
  audio?: {
    loadType?: 'decompress' | 'streaming' | 'compressed';
    sampleRate?: number;
    channels?: 1 | 2;
    quality?: number;
  };
}

export class AssetImporter extends EventEmitter {
  private settings = new Map<string, ImportSettings>();

  setImportSettings(path: string, settings: ImportSettings): void {
    this.settings.set(path, settings);
  }

  getImportSettings(path: string): ImportSettings | undefined {
    return this.settings.get(path);
  }

  async import(file: File, targetPath: string): Promise<AssetMetadata> {
    const settings = this.settings.get(targetPath);
    
    this.emit('importStart', { file, targetPath });

    // Determine asset type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const type = this.getAssetType(ext);

    // Process based on type
    let processedData: ArrayBuffer | Blob = await file.arrayBuffer();
    
    if (type === 'texture' && settings?.texture) {
      processedData = await this.processTexture(processedData, settings.texture);
    }

    // Create metadata
    const metadata: AssetMetadata = {
      id: crypto.randomUUID(),
      name: file.name,
      type,
      path: targetPath,
      size: processedData instanceof Blob ? processedData.size : processedData.byteLength,
      lastModified: Date.now(),
    };

    this.emit('importComplete', { metadata, data: processedData });

    return metadata;
  }

  private getAssetType(ext: string): AssetType {
    const typeMap: Record<string, AssetType> = {
      '.png': 'texture',
      '.jpg': 'texture',
      '.jpeg': 'texture',
      '.gif': 'texture',
      '.webp': 'texture',
      '.obj': 'model',
      '.gltf': 'model',
      '.glb': 'model',
      '.fbx': 'model',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.ogg': 'audio',
      '.glsl': 'shader',
      '.vert': 'shader',
      '.frag': 'shader',
      '.json': 'json',
      '.ttf': 'font',
      '.otf': 'font',
      '.woff': 'font',
      '.woff2': 'font',
    };

    return typeMap[ext] ?? 'binary';
  }

  private async processTexture(
    data: ArrayBuffer,
    settings: ImportSettings['texture']
  ): Promise<Blob> {
    // Create image from buffer
    const blob = new Blob([data]);
    const img = await createImageBitmap(blob);

    // Resize if needed
    let width = img.width;
    let height = img.height;
    
    if (settings?.maxSize) {
      const maxDim = Math.max(width, height);
      if (maxDim > settings.maxSize) {
        const scale = settings.maxSize / maxDim;
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
    }

    // Draw to canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    return canvas.convertToBlob({ type: 'image/png' });
  }
}
