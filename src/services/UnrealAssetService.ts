import { EventBus } from './EventBus';

export type AssetType = 
  | 'StaticMesh'
  | 'SkeletalMesh'
  | 'Material'
  | 'Texture'
  | 'Blueprint'
  | 'Animation'
  | 'Sound'
  | 'Particle'
  | 'Level'
  | 'Folder';

export interface Asset {
  path: string;
  name: string;
  type: AssetType;
  thumbnail?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface AssetImportOptions {
  overwrite?: boolean;
  generateThumbnails?: boolean;
  importMaterials?: boolean;
  importTextures?: boolean;
}

export class UnrealAssetService {
  private static instance: UnrealAssetService;
  private eventBus: EventBus;
  private assets: Map<string, Asset>;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.assets = new Map();
    this.initializeMockAssets();
  }

  public static getInstance(): UnrealAssetService {
    if (!UnrealAssetService.instance) {
      UnrealAssetService.instance = new UnrealAssetService();
    }
    return UnrealAssetService.instance;
  }

  private initializeMockAssets(): void {
    // Mock assets for demonstration
    const mockAssets: Asset[] = [
      { path: '/Game/Characters', name: 'Characters', type: 'Folder' },
      { path: '/Game/Environment', name: 'Environment', type: 'Folder' },
      { path: '/Game/Materials', name: 'Materials', type: 'Folder' },
      { path: '/Game/Textures', name: 'Textures', type: 'Folder' },
      { path: '/Game/Blueprints', name: 'Blueprints', type: 'Folder' },
      { path: '/Game/Characters/Hero', name: 'Hero', type: 'SkeletalMesh', size: 2048000 },
      { path: '/Game/Characters/Enemy', name: 'Enemy', type: 'SkeletalMesh', size: 1536000 },
      { path: '/Game/Environment/Tree', name: 'Tree', type: 'StaticMesh', size: 512000 },
      { path: '/Game/Environment/Rock', name: 'Rock', type: 'StaticMesh', size: 256000 },
      { path: '/Game/Materials/M_Character', name: 'M_Character', type: 'Material', size: 128000 },
      { path: '/Game/Materials/M_Environment', name: 'M_Environment', type: 'Material', size: 96000 },
      { path: '/Game/Textures/T_Character_D', name: 'T_Character_D', type: 'Texture', size: 4096000 },
      { path: '/Game/Textures/T_Character_N', name: 'T_Character_N', type: 'Texture', size: 4096000 },
      { path: '/Game/Blueprints/BP_Character', name: 'BP_Character', type: 'Blueprint', size: 64000 },
      { path: '/Game/Blueprints/BP_GameMode', name: 'BP_GameMode', type: 'Blueprint', size: 32000 },
    ];

    mockAssets.forEach(asset => {
      this.assets.set(asset.path, asset);
    });
  }

  public async getAssets(path: string, type?: AssetType): Promise<Asset[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const assets = Array.from(this.assets.values()).filter(asset => {
          const assetDir = asset.path.substring(0, asset.path.lastIndexOf('/'));
          const matchesPath = assetDir === path || asset.path === path;
          const matchesType = !type || asset.type === type;
          return matchesPath && matchesType;
        });
        resolve(assets);
      }, 300);
    });
  }

  public async getAsset(path: string): Promise<Asset | null> {
    return this.assets.get(path) || null;
  }

  public async importAssets(files: File[], targetPath: string, options?: AssetImportOptions): Promise<Asset[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const imported: Asset[] = [];
        
        files.forEach(file => {
          const asset: Asset = {
            path: `${targetPath}/${file.name}`,
            name: file.name,
            type: this.getAssetTypeFromFile(file),
            size: file.size
          };
          
          this.assets.set(asset.path, asset);
          imported.push(asset);
        });

        this.eventBus.emit('unreal:assetsImported', { assets: imported });
        resolve(imported);
      }, 1000);
    });
  }

  public async exportAsset(asset: Asset): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.eventBus.emit('unreal:assetExported', { asset });
        resolve(true);
      }, 500);
    });
  }

  public async deleteAsset(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const deleted = this.assets.delete(path);
        if (deleted) {
          this.eventBus.emit('unreal:assetDeleted', { path });
        }
        resolve(deleted);
      }, 300);
    });
  }

  public async createFolder(parentPath: string, name: string): Promise<Asset> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const folder: Asset = {
          path: `${parentPath}/${name}`,
          name,
          type: 'Folder'
        };
        
        this.assets.set(folder.path, folder);
        this.eventBus.emit('unreal:folderCreated', { folder });
        resolve(folder);
      }, 300);
    });
  }

  public async renameAsset(path: string, newName: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const asset = this.assets.get(path);
        if (!asset) {
          resolve(false);
          return;
        }

        this.assets.delete(path);
        const newPath = path.substring(0, path.lastIndexOf('/')) + '/' + newName;
        asset.path = newPath;
        asset.name = newName;
        this.assets.set(newPath, asset);

        this.eventBus.emit('unreal:assetRenamed', { oldPath: path, newPath });
        resolve(true);
      }, 300);
    });
  }

  public async duplicateAsset(path: string): Promise<Asset | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const asset = this.assets.get(path);
        if (!asset) {
          resolve(null);
          return;
        }

        const duplicate: Asset = {
          ...asset,
          path: `${path}_Copy`,
          name: `${asset.name}_Copy`
        };

        this.assets.set(duplicate.path, duplicate);
        this.eventBus.emit('unreal:assetDuplicated', { original: asset, duplicate });
        resolve(duplicate);
      }, 500);
    });
  }

  public async showImportDialog(): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.fbx,.obj,.png,.jpg,.jpeg,.tga,.dds,.wav,.mp3,.ogg';
      
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        resolve(files);
      };

      input.click();
    });
  }

  private getAssetTypeFromFile(file: File): AssetType {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, AssetType> = {
      'fbx': 'StaticMesh',
      'obj': 'StaticMesh',
      'png': 'Texture',
      'jpg': 'Texture',
      'jpeg': 'Texture',
      'tga': 'Texture',
      'dds': 'Texture',
      'wav': 'Sound',
      'mp3': 'Sound',
      'ogg': 'Sound',
      'uasset': 'Blueprint'
    };

    return typeMap[ext || ''] || 'StaticMesh';
  }

  public async generateThumbnail(asset: Asset): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock thumbnail generation
        const thumbnail = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="%23fff" font-size="12">${asset.type}</text></svg>`;
        resolve(thumbnail);
      }, 500);
    });
  }

  public async getAssetMetadata(path: string): Promise<Record<string, any>> {
    const asset = this.assets.get(path);
    if (!asset) {
      return {};
    }

    return {
      vertices: asset.type === 'StaticMesh' || asset.type === 'SkeletalMesh' ? 10000 : undefined,
      triangles: asset.type === 'StaticMesh' || asset.type === 'SkeletalMesh' ? 5000 : undefined,
      materials: asset.type === 'StaticMesh' || asset.type === 'SkeletalMesh' ? 2 : undefined,
      resolution: asset.type === 'Texture' ? '2048x2048' : undefined,
      format: asset.type === 'Texture' ? 'PNG' : undefined,
      duration: asset.type === 'Sound' || asset.type === 'Animation' ? '5.2s' : undefined,
      ...asset.metadata
    };
  }

  public async searchAssets(query: string, type?: AssetType): Promise<Asset[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = Array.from(this.assets.values()).filter(asset => {
          const matchesQuery = asset.name.toLowerCase().includes(query.toLowerCase());
          const matchesType = !type || asset.type === type;
          return matchesQuery && matchesType;
        });
        resolve(results);
      }, 200);
    });
  }
}
