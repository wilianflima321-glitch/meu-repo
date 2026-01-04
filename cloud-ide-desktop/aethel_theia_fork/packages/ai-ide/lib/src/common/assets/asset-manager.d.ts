/**
 * ASSET MANAGER - Gerenciador Central de Assets
 *
 * Sistema unificado para:
 * - Importação e exportação de assets
 * - Cache e lazy loading
 * - Versionamento de assets
 * - Dependency tracking
 * - Hot reloading
 * - Formato universal
 */
export type AssetType = 'image' | 'texture' | 'audio' | 'video' | 'font' | 'model' | 'material' | 'animation' | 'scene' | 'prefab' | 'script' | 'shader' | 'document' | 'data' | 'config';
export type AssetState = 'unloaded' | 'loading' | 'loaded' | 'error' | 'modified';
export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    path: string;
    url?: string;
    state: AssetState;
    loaded: boolean;
    metadata: AssetMetadata;
    version: number;
    hash?: string;
    dependencies: string[];
    dependents: string[];
    created: number;
    modified: number;
    lastAccessed: number;
    data?: unknown;
    cacheSize?: number;
    cachePriority: number;
    importSettings?: ImportSettings;
}
export interface AssetMetadata {
    title?: string;
    description?: string;
    author?: string;
    tags: string[];
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    mimeType?: string;
    encoding?: string;
    fileSize: number;
    compressedSize?: number;
    thumbnailId?: string;
    previewId?: string;
    custom: Record<string, unknown>;
}
export interface ImportSettings {
    generateThumbnail: boolean;
    generatePreview: boolean;
    image?: ImageImportSettings;
    audio?: AudioImportSettings;
    model?: ModelImportSettings;
    font?: FontImportSettings;
}
export interface ImageImportSettings {
    maxSize?: number;
    format?: 'original' | 'png' | 'jpeg' | 'webp';
    quality?: number;
    generateMipmaps: boolean;
    sRGB: boolean;
    alphaMode: 'straight' | 'premultiplied' | 'none';
    compression?: 'none' | 'bc1' | 'bc3' | 'bc7' | 'etc2' | 'astc';
}
export interface AudioImportSettings {
    format?: 'original' | 'wav' | 'mp3' | 'ogg' | 'aac';
    sampleRate?: number;
    channels?: 'mono' | 'stereo' | 'original';
    bitrate?: number;
    normalize: boolean;
}
export interface ModelImportSettings {
    scale: number;
    importMaterials: boolean;
    importAnimations: boolean;
    generateColliders: boolean;
    optimizeMesh: boolean;
    calculateNormals: 'import' | 'calculate' | 'none';
    calculateTangents: boolean;
    weldVertices: boolean;
    weldThreshold: number;
}
export interface FontImportSettings {
    characters?: string;
    fontSize: number;
    padding: number;
    renderMode: 'bitmap' | 'sdf' | 'msdf';
    includeKerning: boolean;
}
export interface ExportSettings {
    format: string;
    options: Record<string, unknown>;
}
export interface AssetBundle {
    id: string;
    name: string;
    assetIds: string[];
    compression: 'none' | 'lz4' | 'lzma' | 'gzip';
    uncompressedSize: number;
    compressedSize: number;
    version: number;
    loaded: boolean;
    data?: ArrayBuffer;
}
export interface AssetImporter {
    supportedExtensions: string[];
    supportedMimeTypes: string[];
    canImport(file: File | string): boolean;
    import(source: File | ArrayBuffer | string, settings?: ImportSettings): Promise<ImportResult>;
    getDefaultSettings(): ImportSettings;
}
export interface ImportResult {
    success: boolean;
    asset?: Asset;
    error?: string;
    warnings: string[];
    dependencies?: string[];
}
export interface AssetExporter {
    supportedFormats: string[];
    canExport(asset: Asset, format: string): boolean;
    export(asset: Asset, settings: ExportSettings): Promise<ExportResult>;
    getDefaultSettings(format: string): ExportSettings;
}
export interface ExportResult {
    success: boolean;
    data?: ArrayBuffer;
    mimeType?: string;
    filename?: string;
    error?: string;
}
export interface CacheConfig {
    maxMemoryMB: number;
    lowMemoryThreshold: number;
    evictionPolicy: 'lru' | 'lfu' | 'priority' | 'size';
    persistToDisk: boolean;
    diskCachePath?: string;
    maxDiskMB?: number;
    preloadPatterns?: string[];
    compressInMemory: boolean;
    compressionThreshold: number;
}
export interface AssetQuery {
    type?: AssetType | AssetType[];
    tags?: string[];
    path?: string;
    name?: string;
    state?: AssetState;
    modifiedAfter?: number;
    modifiedBefore?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'modified' | 'created' | 'size' | 'type';
    sortOrder?: 'asc' | 'desc';
}
export declare class AssetManager {
    private assets;
    private bundles;
    private importers;
    private exporters;
    private cache;
    private loadingPromises;
    private cacheConfig;
    private usedMemory;
    private listeners;
    constructor();
    /**
     * Registra asset
     */
    register(asset: Asset): void;
    /**
     * Remove asset do registro
     */
    unregister(assetId: string): void;
    /**
     * Registra importer
     */
    registerImporter(name: string, importer: AssetImporter): void;
    /**
     * Registra exporter
     */
    registerExporter(name: string, exporter: AssetExporter): void;
    /**
     * Importa asset de arquivo
     */
    import(source: File | ArrayBuffer | string, options?: {
        path?: string;
        name?: string;
        settings?: ImportSettings;
        importerName?: string;
    }): Promise<ImportResult>;
    /**
     * Encontra importer para fonte
     */
    private findImporter;
    /**
     * Exporta asset
     */
    export(assetId: string, format: string, settings?: ExportSettings): Promise<ExportResult>;
    private findExporter;
    /**
     * Carrega asset
     */
    load(assetId: string): Promise<Asset>;
    private performLoad;
    private loadAssetData;
    /**
     * Descarrega asset
     */
    unload(assetId: string): void;
    /**
     * Preload de assets
     */
    preload(assetIds: string[]): Promise<void>;
    /**
     * Configura cache
     */
    configureCacheConfig(config: Partial<CacheConfig>): void;
    /**
     * Remove asset do cache
     */
    uncache(assetId: string): void;
    /**
     * Limpa cache completamente
     */
    clearCache(): void;
    /**
     * Verifica limite de memória
     */
    private checkMemoryLimit;
    /**
     * Evicta assets do cache
     */
    private evictCache;
    private getEvictionScore;
    private estimateSize;
    /**
     * Busca assets
     */
    query(query: AssetQuery): Asset[];
    /**
     * Obtém asset por ID
     */
    get(assetId: string): Asset | undefined;
    /**
     * Obtém asset por path
     */
    getByPath(path: string): Asset | undefined;
    /**
     * Lista todos os assets
     */
    getAll(): Asset[];
    /**
     * Obtém dependências de um asset (recursivo)
     */
    getDependencies(assetId: string, recursive?: boolean): Asset[];
    /**
     * Obtém dependentes de um asset (recursivo)
     */
    getDependents(assetId: string, recursive?: boolean): Asset[];
    /**
     * Cria bundle de assets
     */
    createBundle(name: string, assetIds: string[], compression?: 'none' | 'lz4' | 'lzma' | 'gzip'): Promise<AssetBundle>;
    /**
     * Carrega bundle
     */
    loadBundle(bundleId: string): Promise<void>;
    private serializeAssets;
    private deserializeAssets;
    private compress;
    private decompress;
    /**
     * Adiciona listener de eventos
     */
    on(event: string, callback: (event: AssetEvent) => void): void;
    /**
     * Remove listener
     */
    off(event: string, callback: (event: AssetEvent) => void): void;
    private emit;
    private generateId;
    private getDefaultCacheConfig;
    /**
     * Cria asset base
     */
    createAsset(name: string, type: AssetType, path: string, options?: Partial<Asset>): Asset;
    /**
     * Obtém estatísticas de uso
     */
    getStats(): AssetManagerStats;
    private countByType;
    private countByState;
    private registerBuiltInImporters;
    private registerBuiltInExporters;
}
export interface AssetEvent {
    assetId?: string;
    asset?: Asset;
    bundleId?: string;
    error?: unknown;
    format?: string;
}
export interface AssetManagerStats {
    totalAssets: number;
    loadedAssets: number;
    usedMemoryMB: number;
    maxMemoryMB: number;
    bundleCount: number;
    importerCount: number;
    exporterCount: number;
    byType: Record<AssetType, number>;
    byState: Record<AssetState, number>;
}
