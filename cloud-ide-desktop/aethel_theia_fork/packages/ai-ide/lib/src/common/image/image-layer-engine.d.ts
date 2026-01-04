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
    r: number;
    g: number;
    b: number;
    a: number;
}
export interface ColorHSL {
    h: number;
    s: number;
    l: number;
}
export type ColorSpace = 'sRGB' | 'Adobe RGB' | 'ProPhoto RGB' | 'Display P3';
export type BitDepth = 8 | 16 | 32;
export interface ImageDocument {
    id: string;
    name: string;
    created: number;
    modified: number;
    width: number;
    height: number;
    resolution: number;
    colorSpace: ColorSpace;
    bitDepth: BitDepth;
    layers: Layer[];
    activeLayerId: string;
    groups: LayerGroup[];
    guides: Guide[];
    gridEnabled: boolean;
    gridSize: number;
    snapToGrid: boolean;
    backgroundColor?: ColorRGBA;
    transparentBackground: boolean;
    metadata: ImageMetadata;
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
    position: number;
    color?: string;
}
export type LayerType = 'raster' | 'vector' | 'text' | 'adjustment' | 'smart-object' | 'fill' | 'group';
export type BlendMode = 'normal' | 'dissolve' | 'darken' | 'multiply' | 'color-burn' | 'linear-burn' | 'darker-color' | 'lighten' | 'screen' | 'color-dodge' | 'linear-dodge' | 'lighter-color' | 'overlay' | 'soft-light' | 'hard-light' | 'vivid-light' | 'linear-light' | 'pin-light' | 'hard-mix' | 'difference' | 'exclusion' | 'subtract' | 'divide' | 'hue' | 'saturation' | 'color' | 'luminosity';
/**
 * Layer base
 */
export interface LayerBase {
    id: string;
    name: string;
    type: LayerType;
    parentId?: string;
    order: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: BlendMode;
    transform: LayerTransform;
    mask?: LayerMask;
    clippingMask: boolean;
    effects: LayerEffect[];
    tags: string[];
    color?: string;
}
export interface LayerTransform {
    position: Point2D;
    scale: Point2D;
    rotation: number;
    anchor: Point2D;
    skew?: Point2D;
    flip?: {
        horizontal: boolean;
        vertical: boolean;
    };
}
/**
 * Layer de pixels (raster)
 */
export interface RasterLayer extends LayerBase {
    type: 'raster';
    pixels: ImageData;
    bounds: Rect;
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
    handleIn?: Point2D;
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
    stops: Array<{
        position: number;
        color: ColorRGBA;
    }>;
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
    fontWeight: number;
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
export type AdjustmentType = 'brightness-contrast' | 'levels' | 'curves' | 'exposure' | 'vibrance' | 'hue-saturation' | 'color-balance' | 'black-white' | 'photo-filter' | 'channel-mixer' | 'color-lookup' | 'invert' | 'posterize' | 'threshold' | 'gradient-map' | 'selective-color';
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
    children: string[];
    collapsed: boolean;
    passThrough: boolean;
}
export type Layer = RasterLayer | VectorLayer | TextLayer | AdjustmentLayer | SmartObjectLayer | FillLayer | LayerGroup;
export interface LayerMask {
    id: string;
    type: 'raster' | 'vector';
    enabled: boolean;
    linked: boolean;
    inverted: boolean;
    density: number;
    feather: number;
    pixels?: ImageData;
    paths?: VectorPath[];
}
export type LayerEffectType = 'drop-shadow' | 'inner-shadow' | 'outer-glow' | 'inner-glow' | 'bevel-emboss' | 'satin' | 'color-overlay' | 'gradient-overlay' | 'pattern-overlay' | 'stroke';
export interface LayerEffect {
    id: string;
    type: LayerEffectType;
    enabled: boolean;
    parameters: LayerEffectParameters;
}
export interface LayerEffectParameters {
    blendMode?: BlendMode;
    opacity?: number;
    color?: ColorRGBA;
    angle?: number;
    distance?: number;
    spread?: number;
    size?: number;
    noise?: number;
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
    fill?: FillStyle;
    strokePosition?: 'outside' | 'inside' | 'center';
    strokeWidth?: number;
}
export interface HistoryState {
    id: string;
    timestamp: number;
    name: string;
    snapshot: string;
}
export type FilterType = 'blur-gaussian' | 'blur-motion' | 'blur-radial' | 'blur-surface' | 'sharpen' | 'sharpen-unsharp-mask' | 'noise-add' | 'noise-reduce' | 'distort-liquify' | 'distort-perspective' | 'stylize-emboss' | 'stylize-find-edges' | 'render-clouds' | 'render-difference-clouds';
export interface FilterConfig {
    type: FilterType;
    parameters: Record<string, unknown>;
}
export declare class ImageLayerEngine {
    private currentDocument;
    private clipboard;
    /**
     * Cria novo documento
     */
    createDocument(width: number, height: number, options?: {
        name?: string;
        resolution?: number;
        colorSpace?: ColorSpace;
        bitDepth?: BitDepth;
        backgroundColor?: ColorRGBA;
        transparent?: boolean;
    }): ImageDocument;
    /**
     * Redimensiona documento
     */
    resizeCanvas(newWidth: number, newHeight: number, anchor?: 'center' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'): void;
    private calculateAnchorOffset;
    /**
     * Cria raster layer
     */
    createRasterLayer(name: string, width?: number, height?: number): RasterLayer;
    /**
     * Cria text layer
     */
    createTextLayer(content: string, style?: Partial<TextStyle>): TextLayer;
    /**
     * Cria adjustment layer
     */
    createAdjustmentLayer(name: string, adjustmentType: AdjustmentType, parameters?: Record<string, number | boolean | number[]>): AdjustmentLayer;
    /**
     * Adiciona layer ao documento
     */
    addLayer(layer: Layer, aboveActiveLayer?: boolean): void;
    /**
     * Remove layer
     */
    removeLayer(layerId: string): void;
    /**
     * Duplica layer
     */
    duplicateLayer(layerId: string): Layer;
    /**
     * Move layer na ordem
     */
    moveLayer(layerId: string, newIndex: number): void;
    /**
     * Merge layers
     */
    mergeLayers(layerIds: string[]): RasterLayer;
    /**
     * Flatten document (merge all)
     */
    flattenImage(): RasterLayer;
    /**
     * Aplica transformação a layer
     */
    transformLayer(layerId: string, transform: Partial<LayerTransform>): void;
    /**
     * Flip layer
     */
    flipLayer(layerId: string, direction: 'horizontal' | 'vertical'): void;
    /**
     * Rotate layer
     */
    rotateLayer(layerId: string, degrees: number): void;
    /**
     * Adiciona máscara a layer
     */
    addMask(layerId: string, type?: 'raster' | 'vector'): LayerMask;
    /**
     * Remove máscara
     */
    removeMask(layerId: string): void;
    /**
     * Aplica máscara (flatten para pixels)
     */
    applyMask(layerId: string): void;
    /**
     * Adiciona efeito a layer
     */
    addEffect(layerId: string, effectType: LayerEffectType): LayerEffect;
    /**
     * Remove efeito
     */
    removeEffect(layerId: string, effectId: string): void;
    /**
     * Atualiza parâmetros de efeito
     */
    updateEffect(layerId: string, effectId: string, parameters: Partial<LayerEffectParameters>): void;
    /**
     * Define blend mode do layer
     */
    setBlendMode(layerId: string, mode: BlendMode): void;
    /**
     * Define opacidade do layer
     */
    setOpacity(layerId: string, opacity: number): void;
    /**
     * Aplica blend entre dois pixels
     */
    blendPixel(bottom: ColorRGBA, top: ColorRGBA, mode: BlendMode, topOpacity: number): ColorRGBA;
    private softLightChannel;
    private normalizeColor;
    /**
     * Aplica filtro a layer
     */
    applyFilter(layerId: string, filter: FilterConfig): void;
    /**
     * Gaussian blur
     */
    private applyGaussianBlur;
    private createGaussianKernel;
    /**
     * Sharpen
     */
    private applySharpen;
    /**
     * Convolução genérica
     */
    private convolve;
    /**
     * Ajusta brilho e contraste
     */
    adjustBrightnessContrast(layerId: string, brightness: number, contrast: number): void;
    /**
     * Ajusta hue/saturation
     */
    adjustHueSaturation(layerId: string, hue: number, saturation: number, lightness: number): void;
    /**
     * Levels
     */
    adjustLevels(layerId: string, inputBlack: number, inputWhite: number, gamma: number, outputBlack: number, outputWhite: number): void;
    /**
     * Salva estado no histórico
     */
    private saveHistory;
    /**
     * Desfaz última ação
     */
    undo(): boolean;
    /**
     * Refaz ação desfeita
     */
    redo(): boolean;
    private restoreState;
    private createImageData;
    private fillLayer;
    private findLayer;
    private updateLayerOrder;
    private compositLayer;
    private applyMaskToPixels;
    private getDefaultAdjustmentParams;
    private getDefaultEffectParams;
    private rgbToHsl;
    private hslToRgb;
    private generateId;
}
