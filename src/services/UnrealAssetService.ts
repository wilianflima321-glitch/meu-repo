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

  private providerNotConfiguredError(): Error {
    return new Error(
      'UNREAL_ASSET_PROVIDER_NOT_CONFIGURED: Este projeto ainda não possui integração real com assets do Unreal. '
      + 'Implemente um provider (ex.: Asset Registry/Editor bridge/backend) e conecte este serviço.'
    );
  }

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.assets = new Map();
    // real-or-fail: não inicializa assets mock
  }

  public static getInstance(): UnrealAssetService {
    if (!UnrealAssetService.instance) {
      UnrealAssetService.instance = new UnrealAssetService();
    }
    return UnrealAssetService.instance;
  }

  public async getAssets(path: string, type?: AssetType): Promise<Asset[]> {
    void path;
    void type;
    throw this.providerNotConfiguredError();
  }

  public async getAsset(path: string): Promise<Asset | null> {
    void path;
    throw this.providerNotConfiguredError();
  }

  public async importAssets(files: File[], targetPath: string, options?: AssetImportOptions): Promise<Asset[]> {
    void files;
    void targetPath;
    void options;
    throw this.providerNotConfiguredError();
  }

  public async exportAsset(asset: Asset): Promise<boolean> {
    void asset;
    throw this.providerNotConfiguredError();
  }

  public async deleteAsset(path: string): Promise<boolean> {
    void path;
    throw this.providerNotConfiguredError();
  }

  public async createFolder(parentPath: string, name: string): Promise<Asset> {
    void parentPath;
    void name;
    throw this.providerNotConfiguredError();
  }

  public async renameAsset(path: string, newName: string): Promise<boolean> {
    void path;
    void newName;
    throw this.providerNotConfiguredError();
  }

  public async duplicateAsset(path: string): Promise<Asset | null> {
    void path;
    throw this.providerNotConfiguredError();
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
    void asset;
    throw this.providerNotConfiguredError();
  }

  public async getAssetMetadata(path: string): Promise<Record<string, any>> {
    void path;
    throw this.providerNotConfiguredError();
  }

  public async searchAssets(query: string, type?: AssetType): Promise<Asset[]> {
    void query;
    void type;
    throw this.providerNotConfiguredError();
  }
}
