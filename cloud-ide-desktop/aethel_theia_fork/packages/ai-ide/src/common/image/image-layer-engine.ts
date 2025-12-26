import { injectable } from 'inversify';

/**
 * IMAGE LAYER ENGINE - Motor de Edição de Imagens
 * 
 * Sistema profissional de edição de imagens com:
 * - Sistema de layers completo
 * - Blend modes
 * - Masks e adjustment layers
 * - Filtros e efeitos
 * - Non-destructive editing
 * - Smart objects
 * - Histórico de ações
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export interface Point2D {
    x: number;
    y: number;
}

export interface Size2D {
    width: number;
    height: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ColorRGBA {
    r: number;      // 0-255
    g: number;      // 0-255
    b: number;      // 0-255
    a: number;      // 0-255
}

export interface ColorHSL {
    h: number;      // 0-360
    s: number;      // 0-100
    l: number;      // 0-100
}

export type ColorSpace = 'sRGB' | 'Adobe RGB' | 'ProPhoto RGB' | 'Display P3';
export type BitDepth = 8 | 16 | 32;

// ============================================================================
// DOCUMENTO
// ============================================================================

export interface ImageDocument {
    id: string;
    name: string;
    created: number;
    modified: number;
    
    // Dimensões
    width: number;
    height: number;
    resolution: number;             // DPI
    
    // Color
    colorSpace: ColorSpace;
    bitDepth: BitDepth;
    
    // Layers
    layers: Layer[];
    activeLayerId: string;
    
    // Groups
    groups: LayerGroup[];
    
    // Guides e grid
    guides: Guide[];
    gridEnabled: boolean;
    gridSize: number;
    snapToGrid: boolean;
    
    // Background
    backgroundColor?: ColorRGBA;
    transparentBackground: boolean;
    
    // Metadados
    metadata: ImageMetadata;
    
    // Histórico
    history: HistoryState[];
    historyIndex: number;
}

export interface ImageMetadata {
    title?: string;
    author?: string;
    copyright?: string;
    description?: string;
    keywords: string[];
    exif?: Record<string, unknown>;
}

export interface Guide {
    id: string;
    orientation: 'horizontal' | 'vertical';
    position: number;               // Em pixels
    color?: string;
}

// ============================================================================
// LAYERS
// ============================================================================

export type LayerType = 
    | 'raster'          // Pixel layer
    | 'vector'          // Shape layer
    | 'text'            // Text layer
    | 'adjustment'      // Adjustment layer
    | 'smart-object'    // Smart object
    | 'fill'            // Fill layer
    | 'group';          // Layer group

export type BlendMode = 
    | 'normal'
    | 'dissolve'
    // Darken
    | 'darken'
    | 'multiply'
    | 'color-burn'
    | 'linear-burn'
    | 'darker-color'
    // Lighten
    | 'lighten'
    | 'screen'
    | 'color-dodge'
    | 'linear-dodge'
    | 'lighter-color'
    // Contrast
    | 'overlay'
    | 'soft-light'
    | 'hard-light'
    | 'vivid-light'
    | 'linear-light'
    | 'pin-light'
    | 'hard-mix'
    // Inversion
    | 'difference'
    | 'exclusion'
    | 'subtract'
    | 'divide'
    // Component
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity';

/**
 * Layer base
 */
export interface LayerBase {
    id: string;
    name: string;
    type: LayerType;
    
    // Hierarquia
    parentId?: string;              // ID do grupo pai
    order: number;                  // Ordem no grupo
    
    // Visibilidade e estado
    visible: boolean;
    locked: boolean;
    opacity: number;                // 0-100
    blendMode: BlendMode;
    
    // Transformação
    transform: LayerTransform;
    
    // Máscara
    mask?: LayerMask;
    
    // Clipping
    clippingMask: boolean;          // Clipped to layer below
    
    // Efeitos
    effects: LayerEffect[];
    
    // Metadados
    tags: string[];
    color?: string;                 // Label color
}

export interface LayerTransform {
    position: Point2D;
    scale: Point2D;
    rotation: number;               // Degrees
    anchor: Point2D;                // Anchor point (0-1)
    skew?: Point2D;
    flip?: { horizontal: boolean; vertical: boolean };
}

/**
 * Layer de pixels (raster)
 */
export interface RasterLayer extends LayerBase {
    type: 'raster';
    pixels: ImageData;
    bounds: Rect;                   // Área ocupada na canvas
}

/**
 * Layer vetorial
 */
export interface VectorLayer extends LayerBase {
    type: 'vector';
    paths: VectorPath[];
    fill?: FillStyle;
    stroke?: StrokeStyle;
}

export interface VectorPath {
    id: string;
    closed: boolean;
    points: PathPoint[];
}

export interface PathPoint {
    anchor: Point2D;
    handleIn?: Point2D;             // Bezier handle
    handleOut?: Point2D;
    smooth: boolean;
}

export interface FillStyle {
    type: 'solid' | 'gradient' | 'pattern';
    color?: ColorRGBA;
    gradient?: GradientFill;
    pattern?: PatternFill;
}

export interface GradientFill {
    type: 'linear' | 'radial' | 'angular' | 'diamond';
    stops: Array<{ position: number; color: ColorRGBA }>;
    angle?: number;
    scale?: number;
    center?: Point2D;
}

export interface PatternFill {
    imageId: string;
    scale: number;
    rotation: number;
    offset: Point2D;
}

export interface StrokeStyle {
    color: ColorRGBA;
    width: number;
    alignment: 'inside' | 'center' | 'outside';
    cap: 'butt' | 'round' | 'square';
    join: 'miter' | 'round' | 'bevel';
    miterLimit?: number;
    dash?: number[];
}

/**
 * Layer de texto
 */
export interface TextLayer extends LayerBase {
    type: 'text';
    content: string;
    style: TextStyle;
    bounds: Rect;
    paragraphStyle?: ParagraphStyle;
}

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;             // 100-900
    fontStyle: 'normal' | 'italic';
    color: ColorRGBA;
    letterSpacing?: number;
    lineHeight?: number;
    textDecoration?: 'none' | 'underline' | 'strikethrough';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface ParagraphStyle {
    alignment: 'left' | 'center' | 'right' | 'justify';
    indent?: number;
    spaceBefore?: number;
    spaceAfter?: number;
}

/**
 * Adjustment layer
 */
export interface AdjustmentLayer extends LayerBase {
    type: 'adjustment';
    adjustmentType: AdjustmentType;
    parameters: Record<string, number | boolean | number[]>;
}

export type AdjustmentType = 
    | 'brightness-contrast'
    | 'levels'
    | 'curves'
    | 'exposure'
    | 'vibrance'
    | 'hue-saturation'
    | 'color-balance'
    | 'black-white'
    | 'photo-filter'
    | 'channel-mixer'
    | 'color-lookup'
    | 'invert'
    | 'posterize'
    | 'threshold'
    | 'gradient-map'
    | 'selective-color';

/**
 * Smart Object
 */
export interface SmartObjectLayer extends LayerBase {
    type: 'smart-object';
    sourceDocument?: ImageDocument;
    sourcePath?: string;
    linkedFile?: string;
    filters: SmartFilter[];
}

export interface SmartFilter {
    id: string;
    type: string;
    enabled: boolean;
    parameters: Record<string, unknown>;
    mask?: LayerMask;
}

/**
 * Fill layer
 */
export interface FillLayer extends LayerBase {
    type: 'fill';
    fillType: 'solid' | 'gradient' | 'pattern';
    fill: FillStyle;
}

/**
 * Layer group
 */
export interface LayerGroup extends LayerBase {
    type: 'group';
    children: string[];             // IDs dos layers filhos
    collapsed: boolean;
    passThrough: boolean;           // Pass-through blend mode
}

export type Layer = 
    | RasterLayer 
    | VectorLayer 
    | TextLayer 
    | AdjustmentLayer 
    | SmartObjectLayer 
    | FillLayer 
    | LayerGroup;

// ============================================================================
// MASKS
// ============================================================================

export interface LayerMask {
    id: string;
    type: 'raster' | 'vector';
    enabled: boolean;
    linked: boolean;                // Linked to layer
    inverted: boolean;
    density: number;                // 0-100
    feather: number;
    pixels?: ImageData;             // Para raster mask
    paths?: VectorPath[];           // Para vector mask
}

// ============================================================================
// EFEITOS
// ============================================================================

export type LayerEffectType = 
    | 'drop-shadow'
    | 'inner-shadow'
    | 'outer-glow'
    | 'inner-glow'
    | 'bevel-emboss'
    | 'satin'
    | 'color-overlay'
    | 'gradient-overlay'
    | 'pattern-overlay'
    | 'stroke';

export interface LayerEffect {
    id: string;
    type: LayerEffectType;
    enabled: boolean;
    parameters: LayerEffectParameters;
}

export interface LayerEffectParameters {
    // Common
    blendMode?: BlendMode;
    opacity?: number;
    
    // Shadow/Glow
    color?: ColorRGBA;
    angle?: number;
    distance?: number;
    spread?: number;
    size?: number;
    noise?: number;
    
    // Bevel
    style?: 'outer' | 'inner' | 'emboss' | 'pillow' | 'stroke';
    depth?: number;
    direction?: 'up' | 'down';
    softness?: number;
    highlightMode?: BlendMode;
    highlightColor?: ColorRGBA;
    highlightOpacity?: number;
    shadowMode?: BlendMode;
    shadowColor?: ColorRGBA;
    shadowOpacity?: number;
    
    // Overlay
    fill?: FillStyle;
    
    // Stroke
    strokePosition?: 'outside' | 'inside' | 'center';
    strokeWidth?: number;
}

// ============================================================================
// HISTÓRICO
// ============================================================================

export interface HistoryState {
    id: string;
    timestamp: number;
    name: string;
    snapshot: string;               // Serialized document state
}

// ============================================================================
// FILTROS
// ============================================================================

export type FilterType = 
    | 'blur-gaussian'
    | 'blur-motion'
    | 'blur-radial'
    | 'blur-surface'
    | 'sharpen'
    | 'sharpen-unsharp-mask'
    | 'noise-add'
    | 'noise-reduce'
    | 'distort-liquify'
    | 'distort-perspective'
    | 'stylize-emboss'
    | 'stylize-find-edges'
    | 'render-clouds'
    | 'render-difference-clouds';

export interface FilterConfig {
    type: FilterType;
    parameters: Record<string, unknown>;
}

// ============================================================================
// IMAGE LAYER ENGINE
// ============================================================================

@injectable()
export class ImageLayerEngine {
    private currentDocument: ImageDocument | null = null;
    private clipboard: Layer[] = [];

    // ========================================================================
    // GERENCIAMENTO DE DOCUMENTO
    // ========================================================================

    /**
     * Cria novo documento
     */
    createDocument(
        width: number,
        height: number,
        options: {
            name?: string;
            resolution?: number;
            colorSpace?: ColorSpace;
            bitDepth?: BitDepth;
            backgroundColor?: ColorRGBA;
            transparent?: boolean;
        } = {}
    ): ImageDocument {
        const doc: ImageDocument = {
            id: this.generateId(),
            name: options.name || 'Untitled',
            created: Date.now(),
            modified: Date.now(),
            width,
            height,
            resolution: options.resolution || 72,
            colorSpace: options.colorSpace || 'sRGB',
            bitDepth: options.bitDepth || 8,
            layers: [],
            activeLayerId: '',
            groups: [],
            guides: [],
            gridEnabled: false,
            gridSize: 10,
            snapToGrid: false,
            backgroundColor: options.backgroundColor,
            transparentBackground: options.transparent ?? true,
            metadata: { keywords: [] },
            history: [],
            historyIndex: -1,
        };

        // Criar layer de fundo
        const bgLayer = this.createRasterLayer('Background', doc.width, doc.height);
        if (options.backgroundColor) {
            this.fillLayer(bgLayer, options.backgroundColor);
        }
        doc.layers.push(bgLayer);
        doc.activeLayerId = bgLayer.id;

        this.currentDocument = doc;
        this.saveHistory('Create Document');

        return doc;
    }

    /**
     * Redimensiona documento
     */
    resizeCanvas(
        newWidth: number,
        newHeight: number,
        anchor: 'center' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right' = 'center'
    ): void {
        if (!this.currentDocument) return;

        const doc = this.currentDocument;
        const offsetX = this.calculateAnchorOffset(doc.width, newWidth, anchor, 'x');
        const offsetY = this.calculateAnchorOffset(doc.height, newHeight, anchor, 'y');

        // Atualizar dimensões
        doc.width = newWidth;
        doc.height = newHeight;

        // Mover layers
        for (const layer of doc.layers) {
            layer.transform.position.x += offsetX;
            layer.transform.position.y += offsetY;
        }

        this.saveHistory('Resize Canvas');
    }

    private calculateAnchorOffset(oldSize: number, newSize: number, anchor: string, axis: 'x' | 'y'): number {
        const diff = newSize - oldSize;
        
        const anchorMap: Record<string, { x: number; y: number }> = {
            'center': { x: diff / 2, y: diff / 2 },
            'top-left': { x: 0, y: 0 },
            'top': { x: diff / 2, y: 0 },
            'top-right': { x: diff, y: 0 },
            'left': { x: 0, y: diff / 2 },
            'right': { x: diff, y: diff / 2 },
            'bottom-left': { x: 0, y: diff },
            'bottom': { x: diff / 2, y: diff },
            'bottom-right': { x: diff, y: diff },
        };

        return anchorMap[anchor][axis];
    }

    // ========================================================================
    // OPERAÇÕES DE LAYER
    // ========================================================================

    /**
     * Cria raster layer
     */
    createRasterLayer(name: string, width?: number, height?: number): RasterLayer {
        const w = width ?? this.currentDocument?.width ?? 100;
        const h = height ?? this.currentDocument?.height ?? 100;

        const layer: RasterLayer = {
            id: this.generateId(),
            name,
            type: 'raster',
            parentId: undefined,
            order: this.currentDocument?.layers.length ?? 0,
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            transform: {
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                anchor: { x: 0.5, y: 0.5 },
            },
            clippingMask: false,
            effects: [],
            tags: [],
            pixels: this.createImageData(w, h),
            bounds: { x: 0, y: 0, width: w, height: h },
        };

        return layer;
    }

    /**
     * Cria text layer
     */
    createTextLayer(content: string, style?: Partial<TextStyle>): TextLayer {
        const defaultStyle: TextStyle = {
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 400,
            fontStyle: 'normal',
            color: { r: 0, g: 0, b: 0, a: 255 },
        };

        const layer: TextLayer = {
            id: this.generateId(),
            name: content.substring(0, 20) || 'Text Layer',
            type: 'text',
            order: this.currentDocument?.layers.length ?? 0,
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            transform: {
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                anchor: { x: 0, y: 0 },
            },
            clippingMask: false,
            effects: [],
            tags: [],
            content,
            style: { ...defaultStyle, ...style },
            bounds: { x: 0, y: 0, width: 100, height: 30 },
        };

        return layer;
    }

    /**
     * Cria adjustment layer
     */
    createAdjustmentLayer(
        name: string,
        adjustmentType: AdjustmentType,
        parameters?: Record<string, number | boolean | number[]>
    ): AdjustmentLayer {
        const defaultParams = this.getDefaultAdjustmentParams(adjustmentType);

        const layer: AdjustmentLayer = {
            id: this.generateId(),
            name,
            type: 'adjustment',
            order: this.currentDocument?.layers.length ?? 0,
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            transform: {
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                anchor: { x: 0.5, y: 0.5 },
            },
            clippingMask: false,
            effects: [],
            tags: [],
            adjustmentType,
            parameters: { ...defaultParams, ...parameters },
        };

        return layer;
    }

    /**
     * Adiciona layer ao documento
     */
    addLayer(layer: Layer, aboveActiveLayer: boolean = true): void {
        if (!this.currentDocument) return;

        const activeIndex = this.currentDocument.layers.findIndex(
            l => l.id === this.currentDocument!.activeLayerId
        );

        const insertIndex = aboveActiveLayer ? activeIndex + 1 : activeIndex;
        
        this.currentDocument.layers.splice(insertIndex, 0, layer);
        this.updateLayerOrder();
        this.currentDocument.activeLayerId = layer.id;
        this.saveHistory(`Add Layer: ${layer.name}`);
    }

    /**
     * Remove layer
     */
    removeLayer(layerId: string): void {
        if (!this.currentDocument) return;

        const index = this.currentDocument.layers.findIndex(l => l.id === layerId);
        if (index === -1) return;

        const layer = this.currentDocument.layers[index];
        this.currentDocument.layers.splice(index, 1);

        // Selecionar layer adjacente
        if (this.currentDocument.layers.length > 0) {
            const newIndex = Math.min(index, this.currentDocument.layers.length - 1);
            this.currentDocument.activeLayerId = this.currentDocument.layers[newIndex].id;
        }

        this.updateLayerOrder();
        this.saveHistory(`Delete Layer: ${layer.name}`);
    }

    /**
     * Duplica layer
     */
    duplicateLayer(layerId: string): Layer {
        const layer = this.findLayer(layerId);
        if (!layer) {
            throw new Error('Layer not found');
        }

        const duplicate = JSON.parse(JSON.stringify(layer)) as Layer;
        duplicate.id = this.generateId();
        duplicate.name = `${layer.name} copy`;

        this.addLayer(duplicate, true);
        return duplicate;
    }

    /**
     * Move layer na ordem
     */
    moveLayer(layerId: string, newIndex: number): void {
        if (!this.currentDocument) return;

        const currentIndex = this.currentDocument.layers.findIndex(l => l.id === layerId);
        if (currentIndex === -1) return;

        const [layer] = this.currentDocument.layers.splice(currentIndex, 1);
        this.currentDocument.layers.splice(newIndex, 0, layer);
        this.updateLayerOrder();
        this.saveHistory('Reorder Layers');
    }

    /**
     * Merge layers
     */
    mergeLayers(layerIds: string[]): RasterLayer {
        if (!this.currentDocument) {
            throw new Error('No document open');
        }

        const layers = layerIds
            .map(id => this.findLayer(id))
            .filter((l): l is Layer => l !== undefined)
            .sort((a, b) => a.order - b.order);

        if (layers.length < 2) {
            throw new Error('Need at least 2 layers to merge');
        }

        // Criar novo layer rasterizado
        const merged = this.createRasterLayer('Merged Layer');
        
        // Flatten layers no novo
        for (const layer of layers) {
            this.compositLayer(merged, layer);
        }

        // Remover layers originais
        for (const layer of layers) {
            this.removeLayer(layer.id);
        }

        this.addLayer(merged);
        this.saveHistory('Merge Layers');

        return merged;
    }

    /**
     * Flatten document (merge all)
     */
    flattenImage(): RasterLayer {
        if (!this.currentDocument) {
            throw new Error('No document open');
        }

        const allIds = this.currentDocument.layers.map(l => l.id);
        return this.mergeLayers(allIds);
    }

    // ========================================================================
    // TRANSFORMAÇÕES
    // ========================================================================

    /**
     * Aplica transformação a layer
     */
    transformLayer(
        layerId: string,
        transform: Partial<LayerTransform>
    ): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        Object.assign(layer.transform, transform);
        this.saveHistory(`Transform Layer: ${layer.name}`);
    }

    /**
     * Flip layer
     */
    flipLayer(layerId: string, direction: 'horizontal' | 'vertical'): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        layer.transform.flip = layer.transform.flip || { horizontal: false, vertical: false };
        
        if (direction === 'horizontal') {
            layer.transform.flip.horizontal = !layer.transform.flip.horizontal;
        } else {
            layer.transform.flip.vertical = !layer.transform.flip.vertical;
        }

        this.saveHistory(`Flip Layer ${direction}`);
    }

    /**
     * Rotate layer
     */
    rotateLayer(layerId: string, degrees: number): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        layer.transform.rotation = (layer.transform.rotation + degrees) % 360;
        this.saveHistory(`Rotate Layer: ${degrees}°`);
    }

    // ========================================================================
    // MASKS
    // ========================================================================

    /**
     * Adiciona máscara a layer
     */
    addMask(layerId: string, type: 'raster' | 'vector' = 'raster'): LayerMask {
        const layer = this.findLayer(layerId);
        if (!layer) {
            throw new Error('Layer not found');
        }

        const mask: LayerMask = {
            id: this.generateId(),
            type,
            enabled: true,
            linked: true,
            inverted: false,
            density: 100,
            feather: 0,
        };

        if (type === 'raster') {
            // Criar máscara branca (fully visible)
            mask.pixels = this.createImageData(
                this.currentDocument!.width,
                this.currentDocument!.height,
                { r: 255, g: 255, b: 255, a: 255 }
            );
        } else {
            mask.paths = [];
        }

        layer.mask = mask;
        this.saveHistory('Add Layer Mask');

        return mask;
    }

    /**
     * Remove máscara
     */
    removeMask(layerId: string): void {
        const layer = this.findLayer(layerId);
        if (!layer || !layer.mask) return;

        layer.mask = undefined;
        this.saveHistory('Delete Layer Mask');
    }

    /**
     * Aplica máscara (flatten para pixels)
     */
    applyMask(layerId: string): void {
        const layer = this.findLayer(layerId);
        if (!layer || !layer.mask) return;
        if (layer.type !== 'raster') return;

        // Aplicar máscara aos pixels
        this.applyMaskToPixels(layer as RasterLayer);
        layer.mask = undefined;
        this.saveHistory('Apply Layer Mask');
    }

    // ========================================================================
    // EFEITOS DE LAYER
    // ========================================================================

    /**
     * Adiciona efeito a layer
     */
    addEffect(layerId: string, effectType: LayerEffectType): LayerEffect {
        const layer = this.findLayer(layerId);
        if (!layer) {
            throw new Error('Layer not found');
        }

        const effect: LayerEffect = {
            id: this.generateId(),
            type: effectType,
            enabled: true,
            parameters: this.getDefaultEffectParams(effectType),
        };

        layer.effects.push(effect);
        this.saveHistory(`Add Effect: ${effectType}`);

        return effect;
    }

    /**
     * Remove efeito
     */
    removeEffect(layerId: string, effectId: string): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        layer.effects = layer.effects.filter(e => e.id !== effectId);
        this.saveHistory('Remove Effect');
    }

    /**
     * Atualiza parâmetros de efeito
     */
    updateEffect(
        layerId: string,
        effectId: string,
        parameters: Partial<LayerEffectParameters>
    ): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        const effect = layer.effects.find(e => e.id === effectId);
        if (!effect) return;

        Object.assign(effect.parameters, parameters);
        this.saveHistory('Update Effect');
    }

    // ========================================================================
    // BLEND MODES
    // ========================================================================

    /**
     * Define blend mode do layer
     */
    setBlendMode(layerId: string, mode: BlendMode): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        layer.blendMode = mode;
        this.saveHistory(`Set Blend Mode: ${mode}`);
    }

    /**
     * Define opacidade do layer
     */
    setOpacity(layerId: string, opacity: number): void {
        const layer = this.findLayer(layerId);
        if (!layer) return;

        layer.opacity = Math.max(0, Math.min(100, opacity));
        this.saveHistory(`Set Opacity: ${opacity}%`);
    }

    /**
     * Aplica blend entre dois pixels
     */
    blendPixel(bottom: ColorRGBA, top: ColorRGBA, mode: BlendMode, topOpacity: number): ColorRGBA {
        const opacity = topOpacity / 100;
        const b = this.normalizeColor(bottom);
        const t = this.normalizeColor(top);

        let result: { r: number; g: number; b: number };

        switch (mode) {
            case 'normal':
                result = t;
                break;

            case 'multiply':
                result = {
                    r: b.r * t.r,
                    g: b.g * t.g,
                    b: b.b * t.b,
                };
                break;

            case 'screen':
                result = {
                    r: 1 - (1 - b.r) * (1 - t.r),
                    g: 1 - (1 - b.g) * (1 - t.g),
                    b: 1 - (1 - b.b) * (1 - t.b),
                };
                break;

            case 'overlay':
                result = {
                    r: b.r < 0.5 ? 2 * b.r * t.r : 1 - 2 * (1 - b.r) * (1 - t.r),
                    g: b.g < 0.5 ? 2 * b.g * t.g : 1 - 2 * (1 - b.g) * (1 - t.g),
                    b: b.b < 0.5 ? 2 * b.b * t.b : 1 - 2 * (1 - b.b) * (1 - t.b),
                };
                break;

            case 'soft-light':
                result = {
                    r: this.softLightChannel(b.r, t.r),
                    g: this.softLightChannel(b.g, t.g),
                    b: this.softLightChannel(b.b, t.b),
                };
                break;

            case 'hard-light':
                result = {
                    r: t.r < 0.5 ? 2 * b.r * t.r : 1 - 2 * (1 - b.r) * (1 - t.r),
                    g: t.g < 0.5 ? 2 * b.g * t.g : 1 - 2 * (1 - b.g) * (1 - t.g),
                    b: t.b < 0.5 ? 2 * b.b * t.b : 1 - 2 * (1 - b.b) * (1 - t.b),
                };
                break;

            case 'darken':
                result = {
                    r: Math.min(b.r, t.r),
                    g: Math.min(b.g, t.g),
                    b: Math.min(b.b, t.b),
                };
                break;

            case 'lighten':
                result = {
                    r: Math.max(b.r, t.r),
                    g: Math.max(b.g, t.g),
                    b: Math.max(b.b, t.b),
                };
                break;

            case 'color-dodge':
                result = {
                    r: t.r === 1 ? 1 : Math.min(1, b.r / (1 - t.r)),
                    g: t.g === 1 ? 1 : Math.min(1, b.g / (1 - t.g)),
                    b: t.b === 1 ? 1 : Math.min(1, b.b / (1 - t.b)),
                };
                break;

            case 'color-burn':
                result = {
                    r: t.r === 0 ? 0 : Math.max(0, 1 - (1 - b.r) / t.r),
                    g: t.g === 0 ? 0 : Math.max(0, 1 - (1 - b.g) / t.g),
                    b: t.b === 0 ? 0 : Math.max(0, 1 - (1 - b.b) / t.b),
                };
                break;

            case 'difference':
                result = {
                    r: Math.abs(b.r - t.r),
                    g: Math.abs(b.g - t.g),
                    b: Math.abs(b.b - t.b),
                };
                break;

            case 'exclusion':
                result = {
                    r: b.r + t.r - 2 * b.r * t.r,
                    g: b.g + t.g - 2 * b.g * t.g,
                    b: b.b + t.b - 2 * b.b * t.b,
                };
                break;

            default:
                result = t;
        }

        // Blend with opacity
        const finalR = Math.round((b.r * (1 - opacity) + result.r * opacity) * 255);
        const finalG = Math.round((b.g * (1 - opacity) + result.g * opacity) * 255);
        const finalB = Math.round((b.b * (1 - opacity) + result.b * opacity) * 255);
        const finalA = Math.round(Math.min(255, bottom.a + top.a * opacity));

        return { r: finalR, g: finalG, b: finalB, a: finalA };
    }

    private softLightChannel(b: number, t: number): number {
        if (t < 0.5) {
            return b - (1 - 2 * t) * b * (1 - b);
        } else {
            const d = b <= 0.25 
                ? ((16 * b - 12) * b + 4) * b 
                : Math.sqrt(b);
            return b + (2 * t - 1) * (d - b);
        }
    }

    private normalizeColor(color: ColorRGBA): { r: number; g: number; b: number } {
        return {
            r: color.r / 255,
            g: color.g / 255,
            b: color.b / 255,
        };
    }

    // ========================================================================
    // FILTROS
    // ========================================================================

    /**
     * Aplica filtro a layer
     */
    applyFilter(layerId: string, filter: FilterConfig): void {
        const layer = this.findLayer(layerId);
        if (!layer || layer.type !== 'raster') return;

        const rasterLayer = layer as RasterLayer;

        switch (filter.type) {
            case 'blur-gaussian':
                this.applyGaussianBlur(rasterLayer, filter.parameters.radius as number);
                break;
            case 'sharpen':
                this.applySharpen(rasterLayer, filter.parameters.amount as number);
                break;
            // ... outros filtros
        }

        this.saveHistory(`Apply Filter: ${filter.type}`);
    }

    /**
     * Gaussian blur
     */
    private applyGaussianBlur(layer: RasterLayer, radius: number): void {
        const data = layer.pixels;
        const width = data.width;
        const height = data.height;
        
        // Criar kernel
        const kernel = this.createGaussianKernel(radius);
        const kSize = kernel.length;
        const kHalf = Math.floor(kSize / 2);

        const temp = new Uint8ClampedArray(data.data.length);

        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, sum = 0;

                for (let k = 0; k < kSize; k++) {
                    const px = Math.min(width - 1, Math.max(0, x + k - kHalf));
                    const idx = (y * width + px) * 4;
                    const w = kernel[k];

                    r += data.data[idx] * w;
                    g += data.data[idx + 1] * w;
                    b += data.data[idx + 2] * w;
                    a += data.data[idx + 3] * w;
                    sum += w;
                }

                const idx = (y * width + x) * 4;
                temp[idx] = r / sum;
                temp[idx + 1] = g / sum;
                temp[idx + 2] = b / sum;
                temp[idx + 3] = a / sum;
            }
        }

        // Vertical pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, sum = 0;

                for (let k = 0; k < kSize; k++) {
                    const py = Math.min(height - 1, Math.max(0, y + k - kHalf));
                    const idx = (py * width + x) * 4;
                    const w = kernel[k];

                    r += temp[idx] * w;
                    g += temp[idx + 1] * w;
                    b += temp[idx + 2] * w;
                    a += temp[idx + 3] * w;
                    sum += w;
                }

                const idx = (y * width + x) * 4;
                data.data[idx] = r / sum;
                data.data[idx + 1] = g / sum;
                data.data[idx + 2] = b / sum;
                data.data[idx + 3] = a / sum;
            }
        }
    }

    private createGaussianKernel(radius: number): number[] {
        const size = Math.ceil(radius * 2) + 1;
        const kernel: number[] = [];
        const sigma = radius / 3;

        for (let i = 0; i < size; i++) {
            const x = i - Math.floor(size / 2);
            kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
        }

        return kernel;
    }

    /**
     * Sharpen
     */
    private applySharpen(layer: RasterLayer, amount: number): void {
        const data = layer.pixels;
        const width = data.width;
        const height = data.height;
        const factor = amount / 100;

        // Unsharp mask kernel
        const kernel = [
            0, -1 * factor, 0,
            -1 * factor, 1 + 4 * factor, -1 * factor,
            0, -1 * factor, 0,
        ];

        this.convolve(data, kernel, 3);
    }

    /**
     * Convolução genérica
     */
    private convolve(data: ImageData, kernel: number[], size: number): void {
        const half = Math.floor(size / 2);
        const temp = new Uint8ClampedArray(data.data.length);

        for (let y = 0; y < data.height; y++) {
            for (let x = 0; x < data.width; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = 0; ky < size; ky++) {
                    for (let kx = 0; kx < size; kx++) {
                        const px = Math.min(data.width - 1, Math.max(0, x + kx - half));
                        const py = Math.min(data.height - 1, Math.max(0, y + ky - half));
                        const idx = (py * data.width + px) * 4;
                        const w = kernel[ky * size + kx];

                        r += data.data[idx] * w;
                        g += data.data[idx + 1] * w;
                        b += data.data[idx + 2] * w;
                    }
                }

                const idx = (y * data.width + x) * 4;
                temp[idx] = Math.max(0, Math.min(255, r));
                temp[idx + 1] = Math.max(0, Math.min(255, g));
                temp[idx + 2] = Math.max(0, Math.min(255, b));
                temp[idx + 3] = data.data[idx + 3];
            }
        }

        data.data.set(temp);
    }

    // ========================================================================
    // AJUSTES
    // ========================================================================

    /**
     * Ajusta brilho e contraste
     */
    adjustBrightnessContrast(layerId: string, brightness: number, contrast: number): void {
        const layer = this.findLayer(layerId);
        if (!layer || layer.type !== 'raster') return;

        const data = (layer as RasterLayer).pixels;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.data.length; i += 4) {
            // Brightness
            data.data[i] = Math.max(0, Math.min(255, data.data[i] + brightness));
            data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + brightness));
            data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + brightness));

            // Contrast
            data.data[i] = Math.max(0, Math.min(255, factor * (data.data[i] - 128) + 128));
            data.data[i + 1] = Math.max(0, Math.min(255, factor * (data.data[i + 1] - 128) + 128));
            data.data[i + 2] = Math.max(0, Math.min(255, factor * (data.data[i + 2] - 128) + 128));
        }

        this.saveHistory('Brightness/Contrast');
    }

    /**
     * Ajusta hue/saturation
     */
    adjustHueSaturation(layerId: string, hue: number, saturation: number, lightness: number): void {
        const layer = this.findLayer(layerId);
        if (!layer || layer.type !== 'raster') return;

        const data = (layer as RasterLayer).pixels;

        for (let i = 0; i < data.data.length; i += 4) {
            const hsl = this.rgbToHsl(data.data[i], data.data[i + 1], data.data[i + 2]);
            
            hsl.h = (hsl.h + hue + 360) % 360;
            hsl.s = Math.max(0, Math.min(100, hsl.s + saturation));
            hsl.l = Math.max(0, Math.min(100, hsl.l + lightness));

            const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            data.data[i] = rgb.r;
            data.data[i + 1] = rgb.g;
            data.data[i + 2] = rgb.b;
        }

        this.saveHistory('Hue/Saturation');
    }

    /**
     * Levels
     */
    adjustLevels(
        layerId: string,
        inputBlack: number,
        inputWhite: number,
        gamma: number,
        outputBlack: number,
        outputWhite: number
    ): void {
        const layer = this.findLayer(layerId);
        if (!layer || layer.type !== 'raster') return;

        const data = (layer as RasterLayer).pixels;
        const inputRange = inputWhite - inputBlack;
        const outputRange = outputWhite - outputBlack;

        for (let i = 0; i < data.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let value = data.data[i + c];
                
                // Input levels
                value = Math.max(0, Math.min(255, (value - inputBlack) * 255 / inputRange));
                
                // Gamma
                value = Math.pow(value / 255, gamma) * 255;
                
                // Output levels
                value = outputBlack + value * outputRange / 255;
                
                data.data[i + c] = Math.max(0, Math.min(255, Math.round(value)));
            }
        }

        this.saveHistory('Levels');
    }

    // ========================================================================
    // HISTÓRICO
    // ========================================================================

    /**
     * Salva estado no histórico
     */
    private saveHistory(name: string): void {
        if (!this.currentDocument) return;

        // Remover estados futuros se estivermos no meio do histórico
        if (this.currentDocument.historyIndex < this.currentDocument.history.length - 1) {
            this.currentDocument.history = this.currentDocument.history.slice(0, this.currentDocument.historyIndex + 1);
        }

        const state: HistoryState = {
            id: this.generateId(),
            timestamp: Date.now(),
            name,
            snapshot: JSON.stringify(this.currentDocument),
        };

        this.currentDocument.history.push(state);
        this.currentDocument.historyIndex = this.currentDocument.history.length - 1;
        this.currentDocument.modified = Date.now();

        // Limitar histórico
        if (this.currentDocument.history.length > 100) {
            this.currentDocument.history.shift();
            this.currentDocument.historyIndex--;
        }
    }

    /**
     * Desfaz última ação
     */
    undo(): boolean {
        if (!this.currentDocument || this.currentDocument.historyIndex <= 0) {
            return false;
        }

        this.currentDocument.historyIndex--;
        const state = this.currentDocument.history[this.currentDocument.historyIndex];
        this.restoreState(state);
        return true;
    }

    /**
     * Refaz ação desfeita
     */
    redo(): boolean {
        if (!this.currentDocument || 
            this.currentDocument.historyIndex >= this.currentDocument.history.length - 1) {
            return false;
        }

        this.currentDocument.historyIndex++;
        const state = this.currentDocument.history[this.currentDocument.historyIndex];
        this.restoreState(state);
        return true;
    }

    private restoreState(state: HistoryState): void {
        const restored = JSON.parse(state.snapshot) as ImageDocument;
        // Preservar histórico atual
        restored.history = this.currentDocument!.history;
        restored.historyIndex = this.currentDocument!.historyIndex;
        this.currentDocument = restored;
    }

    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================

    private createImageData(width: number, height: number, fill?: ColorRGBA): ImageData {
        const data = new ImageData(width, height);
        
        if (fill) {
            for (let i = 0; i < data.data.length; i += 4) {
                data.data[i] = fill.r;
                data.data[i + 1] = fill.g;
                data.data[i + 2] = fill.b;
                data.data[i + 3] = fill.a;
            }
        }

        return data;
    }

    private fillLayer(layer: RasterLayer, color: ColorRGBA): void {
        for (let i = 0; i < layer.pixels.data.length; i += 4) {
            layer.pixels.data[i] = color.r;
            layer.pixels.data[i + 1] = color.g;
            layer.pixels.data[i + 2] = color.b;
            layer.pixels.data[i + 3] = color.a;
        }
    }

    private findLayer(layerId: string): Layer | undefined {
        return this.currentDocument?.layers.find(l => l.id === layerId);
    }

    private updateLayerOrder(): void {
        if (!this.currentDocument) return;
        this.currentDocument.layers.forEach((layer, index) => {
            layer.order = index;
        });
    }

    private compositLayer(target: RasterLayer, source: Layer): void {
        // Placeholder - implementação completa faria composição real
    }

    private applyMaskToPixels(layer: RasterLayer): void {
        if (!layer.mask || layer.mask.type !== 'raster' || !layer.mask.pixels) return;

        const mask = layer.mask.pixels;
        const pixels = layer.pixels;

        for (let i = 0; i < pixels.data.length; i += 4) {
            const maskValue = layer.mask.inverted 
                ? 255 - mask.data[i] 
                : mask.data[i];
            
            pixels.data[i + 3] = Math.round(pixels.data[i + 3] * maskValue / 255);
        }
    }

    private getDefaultAdjustmentParams(type: AdjustmentType): Record<string, number | boolean | number[]> {
        const defaults: Record<AdjustmentType, Record<string, number | boolean | number[]>> = {
            'brightness-contrast': { brightness: 0, contrast: 0 },
            'levels': { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
            'curves': { points: [0, 0, 255, 255] },
            'exposure': { exposure: 0, offset: 0, gamma: 1 },
            'vibrance': { vibrance: 0, saturation: 0 },
            'hue-saturation': { hue: 0, saturation: 0, lightness: 0 },
            'color-balance': { shadowR: 0, shadowG: 0, shadowB: 0, midR: 0, midG: 0, midB: 0, highR: 0, highG: 0, highB: 0 },
            'black-white': { reds: 40, yellows: 60, greens: 40, cyans: 60, blues: 20, magentas: 80 },
            'photo-filter': { density: 25 },
            'channel-mixer': { redR: 100, redG: 0, redB: 0, greenR: 0, greenG: 100, greenB: 0, blueR: 0, blueG: 0, blueB: 100 },
            'color-lookup': {},
            'invert': {},
            'posterize': { levels: 4 },
            'threshold': { level: 128 },
            'gradient-map': {},
            'selective-color': { relative: true },
        };

        return defaults[type] || {};
    }

    private getDefaultEffectParams(type: LayerEffectType): LayerEffectParameters {
        const defaults: Record<LayerEffectType, LayerEffectParameters> = {
            'drop-shadow': {
                blendMode: 'multiply',
                color: { r: 0, g: 0, b: 0, a: 191 },
                opacity: 75,
                angle: 120,
                distance: 5,
                spread: 0,
                size: 5,
            },
            'inner-shadow': {
                blendMode: 'multiply',
                color: { r: 0, g: 0, b: 0, a: 191 },
                opacity: 75,
                angle: 120,
                distance: 5,
                size: 5,
            },
            'outer-glow': {
                blendMode: 'screen',
                color: { r: 255, g: 255, b: 190, a: 255 },
                opacity: 75,
                spread: 0,
                size: 5,
            },
            'inner-glow': {
                blendMode: 'screen',
                color: { r: 255, g: 255, b: 190, a: 255 },
                opacity: 75,
                size: 5,
            },
            'bevel-emboss': {
                style: 'inner',
                depth: 100,
                direction: 'up',
                size: 5,
                softness: 0,
                angle: 120,
            },
            'satin': {
                blendMode: 'multiply',
                color: { r: 0, g: 0, b: 0, a: 128 },
                opacity: 50,
                angle: 19,
                distance: 11,
                size: 14,
            },
            'color-overlay': {
                blendMode: 'normal',
                color: { r: 255, g: 0, b: 0, a: 255 },
                opacity: 100,
            },
            'gradient-overlay': {
                blendMode: 'normal',
                opacity: 100,
            },
            'pattern-overlay': {
                blendMode: 'normal',
                opacity: 100,
            },
            'stroke': {
                strokePosition: 'outside',
                strokeWidth: 3,
                blendMode: 'normal',
                opacity: 100,
                color: { r: 0, g: 0, b: 0, a: 255 },
            },
        };

        return defaults[type] || {};
    }

    private rgbToHsl(r: number, g: number, b: number): ColorHSL {
        r /= 255; g /= 255; b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        if (max === min) {
            return { h: 0, s: 0, l: l * 100 };
        }

        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        let h: number;
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            default: h = ((r - g) / d + 4) / 6; break;
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
        h /= 360; s /= 100; l /= 100;

        if (s === 0) {
            const v = Math.round(l * 255);
            return { r: v, g: v, b: v };
        }

        const hue2rgb = (p: number, q: number, t: number): number => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        return {
            r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
            g: Math.round(hue2rgb(p, q, h) * 255),
            b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
        };
    }

    private generateId(): string {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
