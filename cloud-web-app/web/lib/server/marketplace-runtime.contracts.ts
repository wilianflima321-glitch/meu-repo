/** Contracts and source config for the extension marketplace runtime. */

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
  contributes?: Record<string, unknown>;
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

export interface MarketplaceConfig {
  name: string;
  searchUrl: string;
  downloadUrl: string;
  headers?: Record<string, string>;
}

export interface OpenVsxExtension {
  namespace: string;
  name: string;
  displayName?: string;
  version: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  files?: { icon?: string };
  repository?: string;
  license?: string;
  downloadCount?: number;
  averageRating?: number;
  reviewCount?: number;
  verified?: boolean;
  preview?: boolean;
  deprecated?: boolean;
  engines?: Extension['engines'];
  publishedDate?: string;
  lastUpdated?: string;
  timestamp?: string;
}

export interface OpenVsxSearchResponse {
  extensions?: OpenVsxExtension[];
  totalSize?: number;
}

export interface VsCodeStatistic {
  statisticName: string;
  value: number;
}

export interface VsCodeVersion {
  version?: string;
  properties?: Array<{ key: string; value: string }>;
  files?: Array<{ assetType: string; source: string }>;
}

export interface VsCodeExtension {
  extensionName: string;
  displayName?: string;
  shortDescription?: string;
  publisher: {
    publisherName: string;
    isDomainVerified?: boolean;
  };
  versions?: VsCodeVersion[];
  categories?: string[];
  tags?: string[];
  statistics?: VsCodeStatistic[];
  flags?: string[];
  publishedDate?: string;
  lastUpdated?: string;
}

export interface VsCodeResultMetadata {
  metadataType: string;
  metadataItems?: Array<{ count?: number }>;
}

export interface VsCodeSearchResponse {
  results?: Array<{
    extensions?: VsCodeExtension[];
    resultMetadata?: VsCodeResultMetadata[];
  }>;
}

export const OPEN_VSX: MarketplaceConfig = {
  name: 'Open VSX',
  searchUrl: 'https://open-vsx.org/api/-/search',
  downloadUrl: 'https://open-vsx.org/api',
};

export const VSCODE_MARKETPLACE: MarketplaceConfig = {
  name: 'VS Code Marketplace',
  searchUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
  downloadUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json;api-version=6.0-preview.1',
  },
};
