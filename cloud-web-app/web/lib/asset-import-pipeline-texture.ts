// @aethel-heavy-async-boundary
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

import { loadThree } from '@/lib/three';
import type { Texture } from '@/lib/three';
import type { ImportOptions, ImportProgressCallback, ImportedAsset } from './asset-import-pipeline-contracts';
import {
  createAssetImportId,
  getImportDisplayName,
  getImportExtension,
  getImportFileName,
} from './asset-import-pipeline-runtime';

export class TextureImporter {
  private ktx2Loader: KTX2Loader;

  constructor() {
    this.ktx2Loader = new KTX2Loader();
  }

  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = getImportFileName(file);
    const ext = getImportExtension(filename);

    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading texture...' });

    const url = typeof file === 'string' ? file : URL.createObjectURL(file);

    try {
      let texture: Texture;

      if (ext === '.ktx2') {
        texture = await this.loadKTX2(url);
      } else {
        texture = await this.loadTexture(url, onProgress);
      }

      if (options.generateMipmaps !== false) {
        texture.generateMipmaps = true;
      }

      if (options.flipY === false) {
        texture.flipY = false;
      }

      const image = texture.image;
      let width = 0, height = 0;

      if (image instanceof HTMLImageElement) {
        width = image.naturalWidth;
        height = image.naturalHeight;
      } else if (image instanceof ImageBitmap) {
        width = image.width;
        height = image.height;
      }

      if (options.maxTextureSize && (width > options.maxTextureSize || height > options.maxTextureSize)) {
        onProgress?.({ stage: 'processing', progress: 70, message: 'Resizing texture...' });
        texture = await this.resizeTexture(texture, options.maxTextureSize);
        width = Math.min(width, options.maxTextureSize);
        height = Math.min(height, options.maxTextureSize);
      }

      const hasAlpha = ['.png', '.webp', '.tga'].includes(ext);
      const isHDR = ['.hdr', '.exr'].includes(ext);

      let thumbnail: string | undefined;
      if (options.createThumbnail && image instanceof HTMLImageElement) {
        onProgress?.({ stage: 'processing', progress: 90, message: 'Generating thumbnail...' });
        thumbnail = this.generateThumbnail(image, options.thumbnailSize || 128);
      }

      onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });

      return {
        id: createAssetImportId('texture'),
        name: getImportDisplayName(filename),
        type: 'texture',
        originalPath: filename,
        size: typeof file === 'string' ? 0 : file.size,
        format: ext.substring(1).toUpperCase(),
        importDate: new Date(),
        thumbnail,
        metadata: {
          width,
          height,
          channels: hasAlpha ? 4 : 3,
          hasAlpha,
          isHDR,
        },
        data: texture,
      };
    } finally {
      if (typeof file !== 'string') {
        URL.revokeObjectURL(url);
      }
    }
  }

  private async loadTexture(url: string, onProgress?: ImportProgressCallback): Promise<Texture> {
    const THREE = await loadThree();
    const textureLoader = new THREE.TextureLoader();
    return new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        resolve,
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 60;
          onProgress?.({ stage: 'loading', progress, message: 'Loading texture...' });
        },
        reject
      );
    });
  }

  private loadKTX2(url: string): Promise<Texture> {
    return this.ktx2Loader.loadAsync(url);
  }

  private async resizeTexture(texture: Texture, maxSize: number): Promise<Texture> {
    const THREE = await loadThree();
    const image = texture.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const ratio = Math.min(maxSize / image.width, maxSize / image.height);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.copy(texture);
    return newTexture;
  }

  private generateThumbnail(image: HTMLImageElement, size: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    canvas.width = image.naturalWidth * ratio;
    canvas.height = image.naturalHeight * ratio;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }
}
