import { injectable } from 'inversify';

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

// ============================================================================
// TIPOS DE ASSET
// ============================================================================

export type AssetType = 
    | 'image'
    | 'texture'
    | 'audio'
    | 'video'
    | 'font'
    | 'model'
    | 'material'
    | 'animation'
    | 'scene'
    | 'prefab'
    | 'script'
    | 'shader'
    | 'document'
    | 'data'
    | 'config';

export type AssetState = 
    | 'unloaded'
    | 'loading'
    | 'loaded'
    | 'error'
    | 'modified';

// ============================================================================
// ASSET BASE
// ============================================================================

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    
    // Localização
    path: string;
    url?: string;
    
    // Estado
    state: AssetState;
    loaded: boolean;
    
    // Metadados
    metadata: AssetMetadata;
    
    // Versão
    version: number;
    hash?: string;
    
    // Dependências
    dependencies: string[];             // IDs de outros assets
    dependents: string[];               // IDs que dependem deste
    
    // Timestamps
    created: number;
    modified: number;
    lastAccessed: number;
    
    // Dados (quando carregado)
    data?: unknown;
    
    // Cache info
    cacheSize?: number;
    cachePriority: number;              // Maior = mais importante
    
    // Import settings
    importSettings?: ImportSettings;
}

export interface AssetMetadata {
    // Informações gerais
    title?: string;
    description?: string;
    author?: string;
    tags: string[];
    
    // Dimensões (para imagens/vídeos)
    width?: number;
    height?: number;
    duration?: number;
    
    // Formato
    format?: string;
    mimeType?: string;
    encoding?: string;
    
    // Tamanho
    fileSize: number;
    compressedSize?: number;
    
    // Preview
    thumbnailId?: string;
    previewId?: string;
    
    // Custom
    custom: Record<string, unknown>;
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

export interface ImportSettings {
    // Comum
    generateThumbnail: boolean;
    generatePreview: boolean;
    
    // Imagens
    image?: ImageImportSettings;
    
    // Áudio
    audio?: AudioImportSettings;
    
    // Modelos 3D
    model?: ModelImportSettings;
    
    // Fontes
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

// ============================================================================
// ASSET BUNDLE
// ============================================================================

export interface AssetBundle {
    id: string;
    name: string;
    
    // Assets incluídos
    assetIds: string[];
    
    // Compressão
    compression: 'none' | 'lz4' | 'lzma' | 'gzip';
    
    // Tamanho
    uncompressedSize: number;
    compressedSize: number;
    
    // Versão
    version: number;
    
    // Estado
    loaded: boolean;
    
    // Dados comprimidos
    data?: ArrayBuffer;
}

// ============================================================================
// IMPORTER/EXPORTER INTERFACE
// ============================================================================

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

// ============================================================================
// CACHE CONFIG
// ============================================================================

export interface CacheConfig {
    // Limites de memória
    maxMemoryMB: number;
    lowMemoryThreshold: number;         // Percentual para começar limpeza
    
    // Políticas
    evictionPolicy: 'lru' | 'lfu' | 'priority' | 'size';
    
    // Persistência
    persistToDisk: boolean;
    diskCachePath?: string;
    maxDiskMB?: number;
    
    // Preload
    preloadPatterns?: string[];
    
    // Compressão em memória
    compressInMemory: boolean;
    compressionThreshold: number;       // Tamanho mínimo para comprimir
}

// ============================================================================
// ASSET QUERY
// ============================================================================

export interface AssetQuery {
    type?: AssetType | AssetType[];
    tags?: string[];
    path?: string;                      // Pattern glob
    name?: string;                      // Pattern
    state?: AssetState;
    modifiedAfter?: number;
    modifiedBefore?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'modified' | 'created' | 'size' | 'type';
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ASSET MANAGER
// ============================================================================

@injectable()
export class AssetManager {
    private assets: Map<string, Asset> = new Map();
    private bundles: Map<string, AssetBundle> = new Map();
    private importers: Map<string, AssetImporter> = new Map();
    private exporters: Map<string, AssetExporter> = new Map();
    private cache: Map<string, unknown> = new Map();
    private loadingPromises: Map<string, Promise<Asset>> = new Map();
    private cacheConfig: CacheConfig;
    private usedMemory: number = 0;
    private listeners: Map<string, Set<(event: AssetEvent) => void>> = new Map();

    constructor() {
        this.cacheConfig = this.getDefaultCacheConfig();
        this.registerBuiltInImporters();
        this.registerBuiltInExporters();
    }

    // ========================================================================
    // REGISTRATION
    // ========================================================================

    /**
     * Registra asset
     */
    register(asset: Asset): void {
        this.assets.set(asset.id, asset);
        this.emit('registered', { assetId: asset.id, asset });
    }

    /**
     * Remove asset do registro
     */
    unregister(assetId: string): void {
        const asset = this.assets.get(assetId);
        if (!asset) return;

        // Atualizar dependentes
        for (const depId of asset.dependencies) {
            const dep = this.assets.get(depId);
            if (dep) {
                dep.dependents = dep.dependents.filter(id => id !== assetId);
            }
        }

        // Remover do cache
        this.uncache(assetId);

        this.assets.delete(assetId);
        this.emit('unregistered', { assetId });
    }

    /**
     * Registra importer
     */
    registerImporter(name: string, importer: AssetImporter): void {
        this.importers.set(name, importer);
    }

    /**
     * Registra exporter
     */
    registerExporter(name: string, exporter: AssetExporter): void {
        this.exporters.set(name, exporter);
    }

    // ========================================================================
    // IMPORT
    // ========================================================================

    /**
     * Importa asset de arquivo
     */
    async import(
        source: File | ArrayBuffer | string,
        options: {
            path?: string;
            name?: string;
            settings?: ImportSettings;
            importerName?: string;
        } = {}
    ): Promise<ImportResult> {
        // Encontrar importer apropriado
        const importer = options.importerName 
            ? this.importers.get(options.importerName)
            : this.findImporter(source);

        if (!importer) {
            return {
                success: false,
                error: 'No suitable importer found',
                warnings: [],
            };
        }

        try {
            const settings = {
                ...importer.getDefaultSettings(),
                ...options.settings,
            };

            const result = await importer.import(source, settings);

            if (result.success && result.asset) {
                // Configurar path e nome
                if (options.path) {
                    result.asset.path = options.path;
                }
                if (options.name) {
                    result.asset.name = options.name;
                }

                // Registrar
                this.register(result.asset);

                // Processar dependências
                if (result.dependencies) {
                    result.asset.dependencies = result.dependencies;
                    for (const depId of result.dependencies) {
                        const dep = this.assets.get(depId);
                        if (dep && !dep.dependents.includes(result.asset.id)) {
                            dep.dependents.push(result.asset.id);
                        }
                    }
                }

                this.emit('imported', { assetId: result.asset.id, asset: result.asset });
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Import failed',
                warnings: [],
            };
        }
    }

    /**
     * Encontra importer para fonte
     */
    private findImporter(source: File | ArrayBuffer | string): AssetImporter | undefined {
        for (const importer of this.importers.values()) {
            if (importer.canImport(source as File | string)) {
                return importer;
            }
        }
        return undefined;
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    /**
     * Exporta asset
     */
    async export(
        assetId: string,
        format: string,
        settings?: ExportSettings
    ): Promise<ExportResult> {
        const asset = this.assets.get(assetId);
        if (!asset) {
            return {
                success: false,
                error: 'Asset not found',
            };
        }

        // Garantir que está carregado
        if (!asset.loaded) {
            await this.load(assetId);
        }

        // Encontrar exporter
        const exporter = this.findExporter(asset, format);
        if (!exporter) {
            return {
                success: false,
                error: `No exporter found for format: ${format}`,
            };
        }

        try {
            const exportSettings = settings || exporter.getDefaultSettings(format);
            const result = await exporter.export(asset, exportSettings);

            if (result.success) {
                this.emit('exported', { assetId, format });
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Export failed',
            };
        }
    }

    private findExporter(asset: Asset, format: string): AssetExporter | undefined {
        for (const exporter of this.exporters.values()) {
            if (exporter.canExport(asset, format)) {
                return exporter;
            }
        }
        return undefined;
    }

    // ========================================================================
    // LOAD/UNLOAD
    // ========================================================================

    /**
     * Carrega asset
     */
    async load(assetId: string): Promise<Asset> {
        const asset = this.assets.get(assetId);
        if (!asset) {
            throw new Error(`Asset not found: ${assetId}`);
        }

        // Já carregado?
        if (asset.loaded && asset.data !== undefined) {
            asset.lastAccessed = Date.now();
            return asset;
        }

        // Já carregando?
        const existingPromise = this.loadingPromises.get(assetId);
        if (existingPromise) {
            return existingPromise;
        }

        // Iniciar carregamento
        const loadPromise = this.performLoad(asset);
        this.loadingPromises.set(assetId, loadPromise);

        try {
            await loadPromise;
            return asset;
        } finally {
            this.loadingPromises.delete(assetId);
        }
    }

    private async performLoad(asset: Asset): Promise<Asset> {
        asset.state = 'loading';
        this.emit('loading', { assetId: asset.id });

        try {
            // Carregar dependências primeiro
            for (const depId of asset.dependencies) {
                await this.load(depId);
            }

            // Carregar dados do asset
            const data = await this.loadAssetData(asset);
            
            asset.data = data;
            asset.loaded = true;
            asset.state = 'loaded';
            asset.lastAccessed = Date.now();

            // Calcular tamanho em cache
            asset.cacheSize = this.estimateSize(data);
            this.usedMemory += asset.cacheSize;

            // Cache
            this.cache.set(asset.id, data);

            // Verificar limite de memória
            this.checkMemoryLimit();

            this.emit('loaded', { assetId: asset.id, asset });
            return asset;
        } catch (error) {
            asset.state = 'error';
            this.emit('error', { assetId: asset.id, error });
            throw error;
        }
    }

    private async loadAssetData(asset: Asset): Promise<unknown> {
        // Carregar de URL ou path
        if (asset.url) {
            const response = await fetch(asset.url);
            
            switch (asset.type) {
                case 'image':
                case 'texture':
                    return response.blob().then(blob => createImageBitmap(blob));
                case 'audio':
                    return response.arrayBuffer();
                case 'data':
                case 'config':
                    return response.json();
                default:
                    return response.arrayBuffer();
            }
        }

        // real-or-fail: carregamento local requer File System Access API (browser)
        // ou integração nativa/electron. Não retornamos null fingindo carregar.
        throw new Error('NOT_IMPLEMENTED: loadAssetData sem asset.url requer integração com file system (FS Access / native bridge).');
    }

    /**
     * Descarrega asset
     */
    unload(assetId: string): void {
        const asset = this.assets.get(assetId);
        if (!asset || !asset.loaded) return;

        // Verificar se tem dependentes carregados
        const loadedDependents = asset.dependents.filter(id => {
            const dep = this.assets.get(id);
            return dep?.loaded;
        });

        if (loadedDependents.length > 0) {
            console.warn(`Asset ${assetId} has loaded dependents, cannot unload`);
            return;
        }

        // Liberar dados
        if (asset.cacheSize) {
            this.usedMemory -= asset.cacheSize;
        }

        asset.data = undefined;
        asset.loaded = false;
        asset.state = 'unloaded';
        asset.cacheSize = undefined;

        this.cache.delete(assetId);
        this.emit('unloaded', { assetId });
    }

    /**
     * Preload de assets
     */
    async preload(assetIds: string[]): Promise<void> {
        const promises = assetIds.map(id => this.load(id).catch(() => null));
        await Promise.all(promises);
    }

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    /**
     * Configura cache
     */
    configureCacheConfig(config: Partial<CacheConfig>): void {
        this.cacheConfig = { ...this.cacheConfig, ...config };
    }

    /**
     * Remove asset do cache
     */
    uncache(assetId: string): void {
        const asset = this.assets.get(assetId);
        if (asset && asset.cacheSize) {
            this.usedMemory -= asset.cacheSize;
            asset.cacheSize = undefined;
        }
        this.cache.delete(assetId);
    }

    /**
     * Limpa cache completamente
     */
    clearCache(): void {
        for (const [id, _] of this.cache) {
            this.uncache(id);
        }
        this.usedMemory = 0;
    }

    /**
     * Verifica limite de memória
     */
    private checkMemoryLimit(): void {
        const maxBytes = this.cacheConfig.maxMemoryMB * 1024 * 1024;
        const threshold = maxBytes * this.cacheConfig.lowMemoryThreshold;

        if (this.usedMemory > threshold) {
            this.evictCache(this.usedMemory - threshold * 0.8);
        }
    }

    /**
     * Evicta assets do cache
     */
    private evictCache(bytesToFree: number): void {
        // Ordenar assets por política de eviction
        const loadedAssets = Array.from(this.assets.values())
            .filter(a => a.loaded && a.cacheSize)
            .sort((a, b) => this.getEvictionScore(a) - this.getEvictionScore(b));

        let freedBytes = 0;
        for (const asset of loadedAssets) {
            if (freedBytes >= bytesToFree) break;

            // Não evictar assets com dependentes carregados
            const hasLoadedDependents = asset.dependents.some(id => {
                const dep = this.assets.get(id);
                return dep?.loaded;
            });

            if (!hasLoadedDependents) {
                freedBytes += asset.cacheSize || 0;
                this.unload(asset.id);
            }
        }
    }

    private getEvictionScore(asset: Asset): number {
        switch (this.cacheConfig.evictionPolicy) {
            case 'lru':
                return asset.lastAccessed;
            case 'lfu':
                // Placeholder - implementar contagem de acessos
                return asset.lastAccessed;
            case 'priority':
                return -asset.cachePriority;
            case 'size':
                return -(asset.cacheSize || 0);
            default:
                return asset.lastAccessed;
        }
    }

    private estimateSize(data: unknown): number {
        if (data === null || data === undefined) return 0;
        
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        
        if (data instanceof ImageBitmap) {
            return data.width * data.height * 4;
        }

        if (typeof data === 'string') {
            return data.length * 2;
        }

        if (typeof data === 'object') {
            return JSON.stringify(data).length * 2;
        }

        return 8;
    }

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Busca assets
     */
    query(query: AssetQuery): Asset[] {
        let results = Array.from(this.assets.values());

        // Filtrar por tipo
        if (query.type) {
            const types = Array.isArray(query.type) ? query.type : [query.type];
            results = results.filter(a => types.includes(a.type));
        }

        // Filtrar por tags
        if (query.tags && query.tags.length > 0) {
            results = results.filter(a => 
                query.tags!.every(tag => a.metadata.tags.includes(tag))
            );
        }

        // Filtrar por path (glob pattern simples)
        if (query.path) {
            const pattern = new RegExp(
                '^' + query.path.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
            );
            results = results.filter(a => pattern.test(a.path));
        }

        // Filtrar por nome
        if (query.name) {
            const pattern = new RegExp(query.name, 'i');
            results = results.filter(a => pattern.test(a.name));
        }

        // Filtrar por estado
        if (query.state) {
            results = results.filter(a => a.state === query.state);
        }

        // Filtrar por data de modificação
        if (query.modifiedAfter) {
            results = results.filter(a => a.modified > query.modifiedAfter!);
        }
        if (query.modifiedBefore) {
            results = results.filter(a => a.modified < query.modifiedBefore!);
        }

        // Ordenar
        if (query.sortBy) {
            const order = query.sortOrder === 'desc' ? -1 : 1;
            results.sort((a, b) => {
                let va: number | string, vb: number | string;
                
                switch (query.sortBy) {
                    case 'name':
                        va = a.name.toLowerCase();
                        vb = b.name.toLowerCase();
                        break;
                    case 'modified':
                        va = a.modified;
                        vb = b.modified;
                        break;
                    case 'created':
                        va = a.created;
                        vb = b.created;
                        break;
                    case 'size':
                        va = a.metadata.fileSize;
                        vb = b.metadata.fileSize;
                        break;
                    case 'type':
                        va = a.type;
                        vb = b.type;
                        break;
                    default:
                        return 0;
                }

                if (va < vb) return -order;
                if (va > vb) return order;
                return 0;
            });
        }

        // Paginar
        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }

        return results;
    }

    /**
     * Obtém asset por ID
     */
    get(assetId: string): Asset | undefined {
        return this.assets.get(assetId);
    }

    /**
     * Obtém asset por path
     */
    getByPath(path: string): Asset | undefined {
        for (const asset of this.assets.values()) {
            if (asset.path === path) {
                return asset;
            }
        }
        return undefined;
    }

    /**
     * Lista todos os assets
     */
    getAll(): Asset[] {
        return Array.from(this.assets.values());
    }

    // ========================================================================
    // DEPENDENCIES
    // ========================================================================

    /**
     * Obtém dependências de um asset (recursivo)
     */
    getDependencies(assetId: string, recursive: boolean = true): Asset[] {
        const asset = this.assets.get(assetId);
        if (!asset) return [];

        const deps: Asset[] = [];
        const visited = new Set<string>();

        const collect = (id: string) => {
            const a = this.assets.get(id);
            if (!a || visited.has(id)) return;
            
            visited.add(id);
            deps.push(a);

            if (recursive) {
                for (const depId of a.dependencies) {
                    collect(depId);
                }
            }
        };

        for (const depId of asset.dependencies) {
            collect(depId);
        }

        return deps;
    }

    /**
     * Obtém dependentes de um asset (recursivo)
     */
    getDependents(assetId: string, recursive: boolean = true): Asset[] {
        const asset = this.assets.get(assetId);
        if (!asset) return [];

        const deps: Asset[] = [];
        const visited = new Set<string>();

        const collect = (id: string) => {
            const a = this.assets.get(id);
            if (!a || visited.has(id)) return;
            
            visited.add(id);
            deps.push(a);

            if (recursive) {
                for (const depId of a.dependents) {
                    collect(depId);
                }
            }
        };

        for (const depId of asset.dependents) {
            collect(depId);
        }

        return deps;
    }

    // ========================================================================
    // BUNDLES
    // ========================================================================

    /**
     * Cria bundle de assets
     */
    async createBundle(
        name: string,
        assetIds: string[],
        compression: 'none' | 'lz4' | 'lzma' | 'gzip' = 'lz4'
    ): Promise<AssetBundle> {
        const bundle: AssetBundle = {
            id: this.generateId(),
            name,
            assetIds: [],
            compression,
            uncompressedSize: 0,
            compressedSize: 0,
            version: 1,
            loaded: false,
        };

        // Coletar assets e dependências
        const allAssetIds = new Set<string>();
        for (const id of assetIds) {
            allAssetIds.add(id);
            const deps = this.getDependencies(id, true);
            for (const dep of deps) {
                allAssetIds.add(dep.id);
            }
        }

        bundle.assetIds = Array.from(allAssetIds);

        // Serializar assets
        const serialized = await this.serializeAssets(bundle.assetIds);
        bundle.uncompressedSize = serialized.byteLength;

        // Comprimir
        bundle.data = await this.compress(serialized, compression);
        bundle.compressedSize = bundle.data.byteLength;

        this.bundles.set(bundle.id, bundle);
        return bundle;
    }

    /**
     * Carrega bundle
     */
    async loadBundle(bundleId: string): Promise<void> {
        const bundle = this.bundles.get(bundleId);
        if (!bundle || !bundle.data) {
            throw new Error(`Bundle not found: ${bundleId}`);
        }

        // Descomprimir
        const data = await this.decompress(bundle.data, bundle.compression);

        // Deserializar assets
        await this.deserializeAssets(data);

        bundle.loaded = true;
        this.emit('bundleLoaded', { bundleId });
    }

    private async serializeAssets(assetIds: string[]): Promise<ArrayBuffer> {
        const assets = assetIds.map(id => this.assets.get(id)).filter(Boolean);
        const json = JSON.stringify(assets);
        const encoder = new TextEncoder();
        return encoder.encode(json).buffer;
    }

    private async deserializeAssets(data: ArrayBuffer): Promise<void> {
        const decoder = new TextDecoder();
        const json = decoder.decode(data);
        const assets = JSON.parse(json) as Asset[];

        for (const asset of assets) {
            if (!this.assets.has(asset.id)) {
                this.register(asset);
            }
        }
    }

    private async compress(data: ArrayBuffer, method: string): Promise<ArrayBuffer> {
        // Placeholder - implementação real usaria biblioteca de compressão
        return data;
    }

    private async decompress(data: ArrayBuffer, method: string): Promise<ArrayBuffer> {
        // Placeholder
        return data;
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    /**
     * Adiciona listener de eventos
     */
    on(event: string, callback: (event: AssetEvent) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Remove listener
     */
    off(event: string, callback: (event: AssetEvent) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: AssetEvent): void {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private generateId(): string {
        return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getDefaultCacheConfig(): CacheConfig {
        return {
            maxMemoryMB: 512,
            lowMemoryThreshold: 0.8,
            evictionPolicy: 'lru',
            persistToDisk: false,
            compressInMemory: false,
            compressionThreshold: 1024 * 1024,
        };
    }

    /**
     * Cria asset base
     */
    createAsset(
        name: string,
        type: AssetType,
        path: string,
        options: Partial<Asset> = {}
    ): Asset {
        return {
            id: this.generateId(),
            name,
            type,
            path,
            state: 'unloaded',
            loaded: false,
            metadata: {
                tags: [],
                fileSize: 0,
                custom: {},
                ...options.metadata,
            },
            version: 1,
            dependencies: [],
            dependents: [],
            created: Date.now(),
            modified: Date.now(),
            lastAccessed: Date.now(),
            cachePriority: 1,
            ...options,
        };
    }

    /**
     * Obtém estatísticas de uso
     */
    getStats(): AssetManagerStats {
        const assets = Array.from(this.assets.values());
        const loaded = assets.filter(a => a.loaded);

        return {
            totalAssets: assets.length,
            loadedAssets: loaded.length,
            usedMemoryMB: this.usedMemory / (1024 * 1024),
            maxMemoryMB: this.cacheConfig.maxMemoryMB,
            bundleCount: this.bundles.size,
            importerCount: this.importers.size,
            exporterCount: this.exporters.size,
            byType: this.countByType(assets),
            byState: this.countByState(assets),
        };
    }

    private countByType(assets: Asset[]): Record<AssetType, number> {
        const counts: Partial<Record<AssetType, number>> = {};
        for (const asset of assets) {
            counts[asset.type] = (counts[asset.type] || 0) + 1;
        }
        return counts as Record<AssetType, number>;
    }

    private countByState(assets: Asset[]): Record<AssetState, number> {
        const counts: Partial<Record<AssetState, number>> = {};
        for (const asset of assets) {
            counts[asset.state] = (counts[asset.state] || 0) + 1;
        }
        return counts as Record<AssetState, number>;
    }

    // ========================================================================
    // BUILT-IN IMPORTERS/EXPORTERS
    // ========================================================================

    private registerBuiltInImporters(): void {
        // Image importer
        this.registerImporter('image', {
            supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'],
            supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
            
            canImport(file: File | string): boolean {
                if (typeof file === 'string') {
                    return this.supportedExtensions.some(ext => file.toLowerCase().endsWith(ext));
                }
                return this.supportedMimeTypes.includes(file.type);
            },

            async import(source: File | ArrayBuffer | string, settings?: ImportSettings): Promise<ImportResult> {
                try {
                    let blob: Blob;
                    
                    if (source instanceof File) {
                        blob = source;
                    } else if (source instanceof ArrayBuffer) {
                        blob = new Blob([source]);
                    } else {
                        const response = await fetch(source);
                        blob = await response.blob();
                    }

                    const bitmap = await createImageBitmap(blob);

                    const asset: Asset = {
                        id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: source instanceof File ? source.name : 'Imported Image',
                        type: 'image',
                        path: source instanceof File ? source.name : (typeof source === 'string' ? source : ''),
                        state: 'loaded',
                        loaded: true,
                        metadata: {
                            width: bitmap.width,
                            height: bitmap.height,
                            fileSize: blob.size,
                            mimeType: blob.type,
                            tags: [],
                            custom: {},
                        },
                        version: 1,
                        dependencies: [],
                        dependents: [],
                        created: Date.now(),
                        modified: Date.now(),
                        lastAccessed: Date.now(),
                        cachePriority: 1,
                        data: bitmap,
                    };

                    return { success: true, asset, warnings: [] };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to import image',
                        warnings: [],
                    };
                }
            },

            getDefaultSettings(): ImportSettings {
                return {
                    generateThumbnail: true,
                    generatePreview: false,
                    image: {
                        generateMipmaps: true,
                        sRGB: true,
                        alphaMode: 'straight',
                    },
                };
            },
        });

        // Audio importer
        this.registerImporter('audio', {
            supportedExtensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'],
            supportedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a'],
            
            canImport(file: File | string): boolean {
                if (typeof file === 'string') {
                    return this.supportedExtensions.some(ext => file.toLowerCase().endsWith(ext));
                }
                return this.supportedMimeTypes.includes(file.type);
            },

            async import(source: File | ArrayBuffer | string, settings?: ImportSettings): Promise<ImportResult> {
                try {
                    let arrayBuffer: ArrayBuffer;
                    let name = 'Imported Audio';
                    let mimeType = 'audio/mpeg';
                    let fileSize = 0;

                    if (source instanceof File) {
                        arrayBuffer = await source.arrayBuffer();
                        name = source.name;
                        mimeType = source.type;
                        fileSize = source.size;
                    } else if (source instanceof ArrayBuffer) {
                        arrayBuffer = source;
                        fileSize = source.byteLength;
                    } else {
                        const response = await fetch(source);
                        arrayBuffer = await response.arrayBuffer();
                        fileSize = arrayBuffer.byteLength;
                    }

                    const asset: Asset = {
                        id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name,
                        type: 'audio',
                        path: source instanceof File ? source.name : (typeof source === 'string' ? source : ''),
                        state: 'loaded',
                        loaded: true,
                        metadata: {
                            fileSize,
                            mimeType,
                            tags: [],
                            custom: {},
                        },
                        version: 1,
                        dependencies: [],
                        dependents: [],
                        created: Date.now(),
                        modified: Date.now(),
                        lastAccessed: Date.now(),
                        cachePriority: 1,
                        data: arrayBuffer,
                    };

                    return { success: true, asset, warnings: [] };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to import audio',
                        warnings: [],
                    };
                }
            },

            getDefaultSettings(): ImportSettings {
                return {
                    generateThumbnail: false,
                    generatePreview: true,
                    audio: {
                        normalize: false,
                    },
                };
            },
        });
    }

    private registerBuiltInExporters(): void {
        // Placeholder para exporters
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

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
