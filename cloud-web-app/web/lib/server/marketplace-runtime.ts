/**
 * Aethel Extension Marketplace Runtime
 * 
 * Sistema de marketplace para extensões com download,
 * instalação, atualização e verificação.
 * 
 * Features:
 * - Busca de extensões (Open VSX / VS Code Marketplace)
 * - Download e instalação de VSIX
 * - Verificação de assinatura
 * - Gerenciamento de versões
 * - Cache de metadata
 * - Ratings e reviews
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { resolveWorkspaceRoot } from './workspace-path';

// ============================================================================
// TYPES
// ============================================================================

export interface Extension {
  id: string;                    // publisher.name
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  categories: string[];
  tags: string[];
  icon?: string;
  repository?: string;
  license?: string;
  
  // Stats
  downloadCount: number;
  rating: number;
  ratingCount: number;
  
  // Flags
  verified: boolean;
  preview: boolean;
  deprecated: boolean;
  
  // Requirements
  engines: {
    vscode?: string;
    aethel?: string;
  };
  dependencies?: string[];
  extensionPack?: string[];
  
  // Dates
  publishedAt: Date;
  updatedAt: Date;
}

export interface ExtensionVersion {
  version: string;
  targetPlatform?: string;
  assetUri: string;
  fallbackAssetUri?: string;
  files: ExtensionFile[];
  properties: Record<string, string>;
}

export interface ExtensionFile {
  assetType: string;
  source: string;
}

export interface InstalledExtension extends Extension {
  installPath: string;
  installedAt: Date;
  enabled: boolean;
  isBuiltIn: boolean;
  manifest: ExtensionManifest;
}

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  publisher: string;
  engines: Record<string, string>;
  categories?: string[];
  keywords?: string[];
  activationEvents?: string[];
  main?: string;
  browser?: string;
  contributes?: Record<string, any>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface SearchResult {
  extensions: Extension[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface InstallResult {
  success: boolean;
  extension?: InstalledExtension;
  error?: string;
}

// ============================================================================
// MARKETPLACE SOURCES
// ============================================================================

interface MarketplaceConfig {
  name: string;
  searchUrl: string;
  downloadUrl: string;
  headers?: Record<string, string>;
}

const OPEN_VSX: MarketplaceConfig = {
  name: 'Open VSX',
  searchUrl: 'https://open-vsx.org/api/-/search',
  downloadUrl: 'https://open-vsx.org/api',
};

const VSCODE_MARKETPLACE: MarketplaceConfig = {
  name: 'VS Code Marketplace',
  searchUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
  downloadUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json;api-version=6.0-preview.1',
  },
};

// ============================================================================
// EXTENSION MARKETPLACE RUNTIME
// ============================================================================

export class ExtensionMarketplaceRuntime extends EventEmitter {
  private extensionsPath: string;
  private cacheDir: string;
  private installedExtensions: Map<string, InstalledExtension> = new Map();
  private marketplace: MarketplaceConfig = OPEN_VSX;
  
  constructor(options?: { extensionsPath?: string; cacheDir?: string; marketplace?: 'openvsx' | 'vscode' }) {
    super();
    
    this.extensionsPath = options?.extensionsPath || path.join(process.cwd(), '.aethel', 'extensions');
    this.cacheDir = options?.cacheDir || path.join(process.cwd(), '.aethel', 'cache', 'extensions');
    
    if (options?.marketplace === 'vscode') {
      this.marketplace = VSCODE_MARKETPLACE;
    }
  }
  
  /**
   * Inicializa o marketplace e carrega extensões instaladas
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.extensionsPath, { recursive: true });
    await fs.mkdir(this.cacheDir, { recursive: true });
    await this.loadInstalledExtensions();
  }
  
  // ==========================================================================
  // SEARCH
  // ==========================================================================
  
  /**
   * Busca extensões no marketplace
   */
  async search(query: string, options?: {
    category?: string;
    sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SearchResult> {
    const {
      category,
      sortBy = 'relevance',
      pageSize = 20,
      pageNumber = 1,
    } = options || {};
    
    if (this.marketplace.name === 'Open VSX') {
      return this.searchOpenVSX(query, category, sortBy, pageSize, pageNumber);
    } else {
      return this.searchVSCodeMarketplace(query, category, sortBy, pageSize, pageNumber);
    }
  }
  
  private async searchOpenVSX(
    query: string,
    category: string | undefined,
    sortBy: string,
    pageSize: number,
    pageNumber: number
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      query,
      size: pageSize.toString(),
      offset: ((pageNumber - 1) * pageSize).toString(),
      sortBy: sortBy === 'downloads' ? 'downloadCount' : sortBy === 'rating' ? 'averageRating' : sortBy,
      sortOrder: 'desc',
    });
    
    if (category) {
      params.set('category', category);
    }
    
    const response = await fetch(`${this.marketplace.searchUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const extensions: Extension[] = (data.extensions || []).map((ext: any) => ({
      id: `${ext.namespace}.${ext.name}`,
      name: ext.name,
      displayName: ext.displayName || ext.name,
      publisher: ext.namespace,
      version: ext.version,
      description: ext.description || '',
      categories: ext.categories || [],
      tags: ext.tags || [],
      icon: ext.files?.icon,
      repository: ext.repository,
      license: ext.license,
      downloadCount: ext.downloadCount || 0,
      rating: ext.averageRating || 0,
      ratingCount: ext.reviewCount || 0,
      verified: ext.verified || false,
      preview: ext.preview || false,
      deprecated: ext.deprecated || false,
      engines: ext.engines || {},
      publishedAt: new Date(ext.publishedDate || ext.timestamp),
      updatedAt: new Date(ext.lastUpdated || ext.timestamp),
    }));
    
    return {
      extensions,
      totalCount: data.totalSize || extensions.length,
      pageNumber,
      pageSize,
    };
  }
  
  private async searchVSCodeMarketplace(
    query: string,
    category: string | undefined,
    sortBy: string,
    pageSize: number,
    pageNumber: number
  ): Promise<SearchResult> {
    // VS Code Marketplace uses a different API format
    const body = {
      filters: [{
        criteria: [
          { filterType: 8, value: 'Microsoft.VisualStudio.Code' },
          { filterType: 10, value: query },
          ...(category ? [{ filterType: 5, value: category }] : []),
        ],
        pageNumber,
        pageSize,
        sortBy: sortBy === 'downloads' ? 4 : sortBy === 'rating' ? 12 : sortBy === 'updated' ? 1 : 0,
        sortOrder: 2,
      }],
      assetTypes: [],
      flags: 914,
    };
    
    const response = await fetch(this.marketplace.searchUrl, {
      method: 'POST',
      headers: this.marketplace.headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const results = data.results?.[0];
    
    const extensions: Extension[] = (results?.extensions || []).map((ext: any) => {
      const latestVersion = ext.versions?.[0];
      const properties = this.parseProperties(latestVersion?.properties || []);
      
      return {
        id: `${ext.publisher.publisherName}.${ext.extensionName}`,
        name: ext.extensionName,
        displayName: ext.displayName,
        publisher: ext.publisher.publisherName,
        version: latestVersion?.version || '0.0.0',
        description: ext.shortDescription || '',
        categories: ext.categories || [],
        tags: ext.tags || [],
        icon: this.findAsset(latestVersion?.files, 'Microsoft.VisualStudio.Services.Icons.Default'),
        repository: properties['Microsoft.VisualStudio.Services.Links.Source'],
        downloadCount: ext.statistics?.find((s: any) => s.statisticName === 'install')?.value || 0,
        rating: ext.statistics?.find((s: any) => s.statisticName === 'averagerating')?.value || 0,
        ratingCount: ext.statistics?.find((s: any) => s.statisticName === 'ratingcount')?.value || 0,
        verified: ext.publisher.isDomainVerified || false,
        preview: ext.flags?.includes('preview') || false,
        deprecated: ext.flags?.includes('deprecated') || false,
        engines: { vscode: properties['Microsoft.VisualStudio.Code.Engine'] },
        publishedAt: new Date(ext.publishedDate),
        updatedAt: new Date(ext.lastUpdated),
      };
    });
    
    return {
      extensions,
      totalCount: results?.resultMetadata?.find((m: any) => m.metadataType === 'ResultCount')?.metadataItems?.[0]?.count || extensions.length,
      pageNumber,
      pageSize,
    };
  }
  
  // ==========================================================================
  // DETAILS
  // ==========================================================================
  
  /**
   * Obtém detalhes de uma extensão
   */
  async getExtensionDetails(extensionId: string): Promise<Extension | null> {
    const [publisher, name] = extensionId.split('.');
    
    if (this.marketplace.name === 'Open VSX') {
      const response = await fetch(`${this.marketplace.downloadUrl}/${publisher}/${name}`);
      
      if (!response.ok) {
        return null;
      }
      
      const ext = await response.json();
      
      return {
        id: extensionId,
        name: ext.name,
        displayName: ext.displayName || ext.name,
        publisher: ext.namespace,
        version: ext.version,
        description: ext.description || '',
        categories: ext.categories || [],
        tags: ext.tags || [],
        icon: ext.files?.icon,
        repository: ext.repository,
        license: ext.license,
        downloadCount: ext.downloadCount || 0,
        rating: ext.averageRating || 0,
        ratingCount: ext.reviewCount || 0,
        verified: ext.verified || false,
        preview: ext.preview || false,
        deprecated: ext.deprecated || false,
        engines: ext.engines || {},
        dependencies: ext.dependencies,
        extensionPack: ext.extensionPack,
        publishedAt: new Date(ext.publishedDate || ext.timestamp),
        updatedAt: new Date(ext.lastUpdated || ext.timestamp),
      };
    }
    
    return null;
  }
  
  /**
   * Obtém versões disponíveis
   */
  async getExtensionVersions(extensionId: string): Promise<ExtensionVersion[]> {
    const [publisher, name] = extensionId.split('.');
    
    if (this.marketplace.name === 'Open VSX') {
      const response = await fetch(`${this.marketplace.downloadUrl}/${publisher}/${name}/versions`);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      return Object.entries(data.versions || {}).map(([version, url]) => ({
        version,
        assetUri: url as string,
        files: [],
        properties: {},
      }));
    }
    
    return [];
  }
  
  // ==========================================================================
  // INSTALLATION
  // ==========================================================================
  
  /**
   * Instala uma extensão
   */
  async install(extensionId: string, version?: string): Promise<InstallResult> {
    const [publisher, name] = extensionId.split('.');
    
    this.emit('installStart', { extensionId, version });
    
    try {
      // Get download URL
      let downloadUrl: string;
      
      if (this.marketplace.name === 'Open VSX') {
        downloadUrl = version
          ? `${this.marketplace.downloadUrl}/${publisher}/${name}/${version}/file/${name}-${version}.vsix`
          : `${this.marketplace.downloadUrl}/${publisher}/${name}/file/${name}.vsix`;
      } else {
        // VS Code Marketplace format
        const v = version || 'latest';
        downloadUrl = `${this.marketplace.downloadUrl}/${publisher}/vsextensions/${name}/${v}/vspackage`;
      }
      
      this.emit('installProgress', { extensionId, phase: 'downloading', progress: 0 });
      
      // Download VSIX
      const vsixPath = path.join(this.cacheDir, `${extensionId}-${version || 'latest'}.vsix`);
      await this.downloadFile(downloadUrl, vsixPath);
      
      this.emit('installProgress', { extensionId, phase: 'extracting', progress: 50 });
      
      // Extract VSIX
      const installPath = path.join(this.extensionsPath, extensionId);
      await this.extractVsix(vsixPath, installPath);
      
      this.emit('installProgress', { extensionId, phase: 'loading', progress: 80 });
      
      // Load manifest
      const manifest = await this.loadManifest(installPath);
      
      // Create installed extension record
      const installed: InstalledExtension = {
        id: extensionId,
        name,
        displayName: manifest.displayName || name,
        publisher,
        version: manifest.version,
        description: manifest.description || '',
        categories: manifest.categories || [],
        tags: manifest.keywords || [],
        downloadCount: 0,
        rating: 0,
        ratingCount: 0,
        verified: false,
        preview: false,
        deprecated: false,
        engines: manifest.engines || {},
        publishedAt: new Date(),
        updatedAt: new Date(),
        installPath,
        installedAt: new Date(),
        enabled: true,
        isBuiltIn: false,
        manifest,
      };
      
      this.installedExtensions.set(extensionId, installed);
      
      // Save installed extensions list
      await this.saveInstalledList();
      
      this.emit('installComplete', { extensionId, extension: installed });
      
      return { success: true, extension: installed };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Installation failed';
      this.emit('installFailed', { extensionId, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
  
  /**
   * Desinstala uma extensão
   */
  async uninstall(extensionId: string): Promise<boolean> {
    const extension = this.installedExtensions.get(extensionId);
    
    if (!extension) {
      return false;
    }
    
    if (extension.isBuiltIn) {
      throw new Error('Cannot uninstall built-in extension');
    }
    
    try {
      // Remove files
      await fs.rm(extension.installPath, { recursive: true, force: true });
      
      // Remove from list
      this.installedExtensions.delete(extensionId);
      await this.saveInstalledList();
      
      this.emit('uninstalled', { extensionId });
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Atualiza uma extensão
   */
  async update(extensionId: string, targetVersion?: string): Promise<InstallResult> {
    const current = this.installedExtensions.get(extensionId);
    
    if (!current) {
      return { success: false, error: 'Extension not installed' };
    }
    
    // Backup current
    const backupPath = `${current.installPath}.bak`;
    await fs.cp(current.installPath, backupPath, { recursive: true });
    
    try {
      // Uninstall current
      await fs.rm(current.installPath, { recursive: true, force: true });
      
      // Install new version
      const result = await this.install(extensionId, targetVersion);
      
      // Remove backup on success
      if (result.success) {
        await fs.rm(backupPath, { recursive: true, force: true });
      }
      
      return result;
      
    } catch (error) {
      // Restore backup on failure
      await fs.rename(backupPath, current.installPath);
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }
  
  // ==========================================================================
  // MANAGEMENT
  // ==========================================================================
  
  /**
   * Obtém extensões instaladas
   */
  getInstalledExtensions(): InstalledExtension[] {
    return Array.from(this.installedExtensions.values());
  }
  
  /**
   * Verifica se extensão está instalada
   */
  isInstalled(extensionId: string): boolean {
    return this.installedExtensions.has(extensionId);
  }
  
  /**
   * Obtém extensão instalada
   */
  getInstalledExtension(extensionId: string): InstalledExtension | undefined {
    return this.installedExtensions.get(extensionId);
  }
  
  /**
   * Habilita/desabilita extensão
   */
  async setEnabled(extensionId: string, enabled: boolean): Promise<boolean> {
    const extension = this.installedExtensions.get(extensionId);
    
    if (!extension) {
      return false;
    }
    
    extension.enabled = enabled;
    await this.saveInstalledList();
    
    this.emit('enabledChanged', { extensionId, enabled });
    return true;
  }
  
  /**
   * Verifica atualizações disponíveis
   */
  async checkForUpdates(): Promise<Array<{ extension: InstalledExtension; latestVersion: string }>> {
    const updates: Array<{ extension: InstalledExtension; latestVersion: string }> = [];
    
    for (const extension of this.installedExtensions.values()) {
      if (extension.isBuiltIn) continue;
      
      try {
        const details = await this.getExtensionDetails(extension.id);
        
        if (details && this.isNewerVersion(details.version, extension.version)) {
          updates.push({ extension, latestVersion: details.version });
        }
      } catch {
        // Ignore errors for individual extensions
      }
    }
    
    return updates;
  }
  
  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================
  
  private async loadInstalledExtensions(): Promise<void> {
    try {
      const listPath = path.join(this.extensionsPath, 'extensions.json');
      const content = await fs.readFile(listPath, 'utf-8');
      const list = JSON.parse(content);
      
      for (const ext of list) {
        try {
          const manifest = await this.loadManifest(ext.installPath);
          
          this.installedExtensions.set(ext.id, {
            ...ext,
            manifest,
            installedAt: new Date(ext.installedAt),
            publishedAt: new Date(ext.publishedAt),
            updatedAt: new Date(ext.updatedAt),
          });
        } catch {
          // Extension directory missing, skip
        }
      }
    } catch {
      // No extensions list yet
    }
  }
  
  private async saveInstalledList(): Promise<void> {
    const list = Array.from(this.installedExtensions.values()).map(ext => ({
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName,
      publisher: ext.publisher,
      version: ext.version,
      installPath: ext.installPath,
      installedAt: ext.installedAt,
      enabled: ext.enabled,
      isBuiltIn: ext.isBuiltIn,
      publishedAt: ext.publishedAt,
      updatedAt: ext.updatedAt,
    }));
    
    const listPath = path.join(this.extensionsPath, 'extensions.json');
    await fs.writeFile(listPath, JSON.stringify(list, null, 2));
  }
  
  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('No response body');
    }
    
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    
    const fileStream = createWriteStream(destPath);
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
    }
    
    fileStream.end();
    
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', () => resolve());
      fileStream.on('error', reject);
    });
  }
  
  private async extractVsix(vsixPath: string, destPath: string): Promise<void> {
    // VSIX is a ZIP file - adm-zip uses CommonJS export = syntax
    const AdmZipModule = await import('adm-zip');
    const AdmZip = (AdmZipModule as any).default || AdmZipModule;
    
    const zip = new AdmZip(vsixPath);
    
    await fs.mkdir(destPath, { recursive: true });
    
    // Extract extension folder (inside ZIP)
    for (const entry of zip.getEntries()) {
      if (entry.entryName.startsWith('extension/')) {
        const relativePath = entry.entryName.replace('extension/', '');
        
        if (!relativePath) continue;
        
        const fullPath = path.join(destPath, relativePath);
        
        if (entry.isDirectory) {
          await fs.mkdir(fullPath, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, entry.getData());
        }
      }
    }
  }
  
  private async loadManifest(extensionPath: string): Promise<ExtensionManifest> {
    const manifestPath = path.join(extensionPath, 'package.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }
  
  private parseProperties(properties: Array<{ key: string; value: string }>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const prop of properties) {
      result[prop.key] = prop.value;
    }
    return result;
  }
  
  private findAsset(files: Array<{ assetType: string; source: string }> | undefined, assetType: string): string | undefined {
    return files?.find(f => f.assetType === assetType)?.source;
  }
  
  private isNewerVersion(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    
    return false;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let marketplaceRuntime: ExtensionMarketplaceRuntime | null = null;

export function getMarketplaceRuntime(): ExtensionMarketplaceRuntime {
  if (!marketplaceRuntime) {
    marketplaceRuntime = new ExtensionMarketplaceRuntime();
  }
  return marketplaceRuntime;
}

export { ExtensionMarketplaceRuntime as default };
