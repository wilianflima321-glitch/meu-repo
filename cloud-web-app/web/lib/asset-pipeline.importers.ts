import type { Asset, AssetImportResult, ImportSettings } from './asset-pipeline';

export interface AssetImporter {
  extensions: string[];
  import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult>;
}

export const textureImporter: AssetImporter = {
  extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;

      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'texture';
      }

      // Criar URL temporária
      const url = URL.createObjectURL(blob);

      // Carregar imagem para obter dimensões
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const asset: Asset = {
        id: `texture_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: settings?.textureType === 'sprite' ? 'sprite' : 'texture',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          width: img.width,
          height: img.height,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {
          filterMode: 'bilinear',
          wrapMode: 'clamp',
          generateMipmaps: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gerar thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 128, 128);
      asset.thumbnail = canvas.toDataURL('image/png');

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import texture'],
      };
    }
  },
};

export const audioImporter: AssetImporter = {
  extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;

      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'audio';
      }

      const url = URL.createObjectURL(blob);

      // Carregar áudio para obter duração
      const audio = new Audio();
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
        audio.src = url;
      });

      const asset: Asset = {
        id: `audio_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'audio',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          duration: audio.duration,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {
          loadType: 'decompress',
          normalize: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import audio'],
      };
    }
  },
};

export const modelImporter: AssetImporter = {
  extensions: ['.gltf', '.glb', '.obj', '.fbx', '.dae'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;

      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'model';
      }

      const url = URL.createObjectURL(blob);

      // Para modelos, precisaríamos de GLTFLoader ou outros loaders
      // Por enquanto, retornamos asset básico
      const asset: Asset = {
        id: `model_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'model',
        path: url,
        size: blob.size,
        mimeType: 'model/gltf-binary',
        metadata: {
          format: fileName.split('.').pop(),
        },
        importSettings: settings || {
          scaleFactor: 1,
          importMaterials: true,
          importAnimations: true,
          optimizeMesh: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import model'],
      };
    }
  },
};

export const fontImporter: AssetImporter = {
  extensions: ['.ttf', '.otf', '.woff', '.woff2'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;

      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'font';
      }

      const url = URL.createObjectURL(blob);

      const asset: Asset = {
        id: `font_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'font',
        path: url,
        size: blob.size,
        mimeType: 'font/' + (fileName.split('.').pop() || 'ttf'),
        metadata: {
          format: fileName.split('.').pop(),
        },
        importSettings: settings || {},
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import font'],
      };
    }
  },
};

export const videoImporter: AssetImporter = {
  extensions: ['.mp4', '.webm', '.mov', '.avi'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;

      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'video';
      }

      const url = URL.createObjectURL(blob);

      // Carregar vídeo para obter metadados
      const video = document.createElement('video');
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = url;
      });

      const asset: Asset = {
        id: `video_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'video',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {},
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gerar thumbnail do primeiro frame
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 72;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, 128, 72);
      asset.thumbnail = canvas.toDataURL('image/png');

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import video'],
      };
    }
  },
};
