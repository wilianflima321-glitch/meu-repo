/**
 * Engine Asset Pipeline - split runtime modules.
 *
 * Asset loaders, cache, manager, manifest, and importer are split so Studio
 * asset flows can lazy-load heavy browser/Three.js loader code safely.
 */

import type { AssetBundle, AssetMetadata } from './types';

export interface AssetManifest {
  version: string;
  baseUrl: string;
  assets: AssetMetadata[];
  bundles: AssetBundle[];
}

export class AssetManifestLoader {
  private manifest: AssetManifest | null = null;

  async load(url: string): Promise<AssetManifest> {
    const response = await fetch(url);
    this.manifest = await response.json() as AssetManifest;
    return this.manifest;
  }

  getAssetPath(name: string): string | undefined {
    if (!this.manifest) return undefined;
    
    const asset = this.manifest.assets.find(a => a.name === name);
    return asset ? `${this.manifest.baseUrl}/${asset.path}` : undefined;
  }

  getBundle(name: string): AssetBundle | undefined {
    return this.manifest?.bundles.find(b => b.name === name);
  }

  getAllAssets(): AssetMetadata[] {
    return this.manifest?.assets ?? [];
  }
}

// ============================================================================
// Asset Importer (for editor)
// ============================================================================
