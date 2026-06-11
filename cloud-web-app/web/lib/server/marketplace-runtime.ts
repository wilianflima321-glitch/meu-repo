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
import { resolveWorkspaceRoot } from './workspace-path';

import { OPEN_VSX, VSCODE_MARKETPLACE } from './marketplace-runtime.contracts';
import { searchMarketplaceExtensions } from './marketplace-runtime-search';
import {
  downloadMarketplaceFile,
  extractMarketplaceVsix,
  findVsCodeMarketplaceAsset,
  isNewerMarketplaceVersion,
  loadMarketplaceManifest,
  parseVsCodeMarketplaceProperties,
} from './marketplace-runtime-utils';
import type { Extension, ExtensionManifest, ExtensionVersion, InstallResult, InstalledExtension, MarketplaceConfig, OpenVsxExtension, OpenVsxSearchResponse, SearchResult, VsCodeExtension, VsCodeResultMetadata, VsCodeSearchResponse, VsCodeStatistic } from './marketplace-runtime.contracts';

export type { Extension, ExtensionManifest, ExtensionVersion, InstallResult, InstalledExtension, SearchResult } from './marketplace-runtime.contracts';
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

  async search(query: string, options?: {
    category?: string;
    sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SearchResult> {
    return searchMarketplaceExtensions(this.marketplace, query, options);
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
      await downloadMarketplaceFile(downloadUrl, vsixPath);

      this.emit('installProgress', { extensionId, phase: 'extracting', progress: 50 });

      // Extract VSIX
      const installPath = path.join(this.extensionsPath, extensionId);
      await extractMarketplaceVsix(vsixPath, installPath);

      this.emit('installProgress', { extensionId, phase: 'loading', progress: 80 });

      // Load manifest
      const manifest = await loadMarketplaceManifest(installPath);

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

        if (details && isNewerMarketplaceVersion(details.version, extension.version)) {
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
          const manifest = await loadMarketplaceManifest(ext.installPath);

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
