/**
 * UNIFIED RENDER PIPELINE - Pipeline de Renderização Unificado
 *
 * Sistema centralizado de renderização para:
 * - Composição de múltiplas camadas/elementos
 * - Render queue e batching
 * - Post-processing unificado
 * - Export em múltiplos formatos
 * - GPU acceleration ready
 * - Cache e otimizações
 */
export interface Vector2 {
    x: number;
    y: number;
}
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface ColorRGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Matrix3x3 {
    elements: Float32Array;
}
export interface Matrix4x4 {
    elements: Float32Array;
}
export interface RenderTarget {
    id: string;
    name: string;
    width: number;
    height: number;
    format: PixelFormat;
    colorSpace: ColorSpace;
    bitDepth: BitDepth;
    colorBuffer?: ArrayBuffer;
    depthBuffer?: Float32Array;
    stencilBuffer?: Uint8Array;
    samples: number;
    clearColor: ColorRGBA;
    clearDepth: number;
    clearStencil: number;
    mipmaps: boolean;
    metadata: Record<string, unknown>;
}
export type PixelFormat = 'rgba8' | 'rgba16f' | 'rgba32f' | 'rgb8' | 'rgb16f' | 'rgb32f' | 'rg8' | 'rg16f' | 'rg32f' | 'r8' | 'r16f' | 'r32f' | 'depth16' | 'depth24' | 'depth32f' | 'depth24-stencil8';
export type ColorSpace = 'sRGB' | 'linear' | 'Adobe RGB' | 'Display P3' | 'Rec. 709' | 'Rec. 2020';
export type BitDepth = 8 | 10 | 12 | 16 | 32;
export type RenderCommandType = 'clear' | 'draw-mesh' | 'draw-sprite' | 'draw-text' | 'draw-vector' | 'draw-particles' | 'draw-image' | 'composite' | 'blit' | 'post-process' | 'set-render-target' | 'set-viewport' | 'set-scissor' | 'set-blend-mode' | 'push-state' | 'pop-state';
export interface RenderCommand {
    type: RenderCommandType;
    priority: number;
    layer: number;
    sortKey: number;
    data: RenderCommandData;
}
export type RenderCommandData = ClearCommandData | DrawMeshCommandData | DrawSpriteCommandData | DrawTextCommandData | DrawVectorCommandData | DrawImageCommandData | CompositeCommandData | BlitCommandData | PostProcessCommandData | SetRenderTargetData | SetViewportData | SetBlendModeData | Record<string, never>;
export interface ClearCommandData {
    color?: boolean;
    depth?: boolean;
    stencil?: boolean;
    clearColor?: ColorRGBA;
    clearDepth?: number;
    clearStencil?: number;
}
export interface DrawMeshCommandData {
    geometryId: string;
    materialId: string;
    transform: Matrix4x4;
    instanceCount?: number;
    instanceData?: Float32Array;
}
export interface DrawSpriteCommandData {
    textureId: string;
    sourceRect: Rect;
    destRect: Rect;
    color: ColorRGBA;
    rotation?: number;
    pivot?: Vector2;
    flipX?: boolean;
    flipY?: boolean;
}
export interface DrawTextCommandData {
    layoutId: string;
    position: Vector2;
    scale: number;
    color?: ColorRGBA;
}
export interface DrawVectorCommandData {
    pathData: string;
    fill?: VectorFill;
    stroke?: VectorStroke;
    transform?: Matrix3x3;
}
export interface VectorFill {
    type: 'solid' | 'gradient' | 'pattern';
    color?: ColorRGBA;
    gradient?: GradientDef;
    patternId?: string;
}
export interface VectorStroke {
    color: ColorRGBA;
    width: number;
    lineCap: 'butt' | 'round' | 'square';
    lineJoin: 'miter' | 'round' | 'bevel';
    miterLimit?: number;
    dashArray?: number[];
    dashOffset?: number;
}
export interface GradientDef {
    type: 'linear' | 'radial';
    stops: Array<{
        offset: number;
        color: ColorRGBA;
    }>;
    start?: Vector2;
    end?: Vector2;
    center?: Vector2;
    radius?: number;
}
export interface DrawImageCommandData {
    imageId: string;
    sourceRect?: Rect;
    destRect: Rect;
    opacity: number;
    blendMode: BlendMode;
}
export interface CompositeCommandData {
    sourceTargetId: string;
    destTargetId: string;
    blendMode: BlendMode;
    opacity: number;
    mask?: MaskData;
}
export interface MaskData {
    type: 'texture' | 'alpha' | 'luminance';
    textureId?: string;
    inverted: boolean;
}
export interface BlitCommandData {
    sourceTargetId: string;
    sourceRect?: Rect;
    destRect: Rect;
    filter: 'nearest' | 'linear' | 'cubic';
}
export interface PostProcessCommandData {
    effectType: PostProcessEffectType;
    parameters: Record<string, unknown>;
    inputTargetId: string;
    outputTargetId: string;
}
export interface SetRenderTargetData {
    targetId: string;
}
export interface SetViewportData {
    viewport: Rect;
}
export interface SetBlendModeData {
    mode: BlendMode;
}
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity' | 'additive' | 'subtractive';
export type PostProcessEffectType = 'bloom' | 'blur' | 'sharpen' | 'chromatic-aberration' | 'vignette' | 'color-grading' | 'tone-mapping' | 'anti-aliasing' | 'ambient-occlusion' | 'depth-of-field' | 'motion-blur' | 'film-grain' | 'lens-distortion' | 'custom';
export interface RenderQueue {
    commands: RenderCommand[];
    sorted: boolean;
}
export interface RenderPass {
    id: string;
    name: string;
    enabled: boolean;
    renderTargetId: string;
    clearFlags: {
        color: boolean;
        depth: boolean;
        stencil: boolean;
    };
    viewport?: Rect;
    sortMode: 'none' | 'front-to-back' | 'back-to-front' | 'by-material';
    layerMask: number;
    queue: RenderQueue;
}
export interface RenderState {
    blendEnabled: boolean;
    blendMode: BlendMode;
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';
    stencilTest: boolean;
    stencilFunc: 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';
    stencilRef: number;
    stencilMask: number;
    stencilFail: StencilOp;
    stencilZFail: StencilOp;
    stencilZPass: StencilOp;
    cullFace: 'none' | 'front' | 'back';
    frontFace: 'cw' | 'ccw';
    scissorTest: boolean;
    scissorRect?: Rect;
    colorMask: {
        r: boolean;
        g: boolean;
        b: boolean;
        a: boolean;
    };
}
export type StencilOp = 'keep' | 'zero' | 'replace' | 'incr' | 'incr-wrap' | 'decr' | 'decr-wrap' | 'invert';
export interface ExportOptions {
    format: ExportFormat;
    quality: number;
    width?: number;
    height?: number;
    scale?: number;
    colorSpace: ColorSpace;
    bitDepth: BitDepth;
    includeMetadata: boolean;
    metadata?: ExportMetadata;
    png?: PNGExportOptions;
    jpeg?: JPEGExportOptions;
    webp?: WebPExportOptions;
    tiff?: TIFFExportOptions;
    exr?: EXRExportOptions;
    video?: VideoExportOptions;
}
export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'tiff' | 'exr' | 'hdr' | 'psd' | 'pdf' | 'svg' | 'mp4' | 'webm' | 'mov' | 'gif';
export interface ExportMetadata {
    title?: string;
    author?: string;
    copyright?: string;
    description?: string;
    keywords?: string[];
    software?: string;
    creationDate?: string;
    customFields?: Record<string, string>;
}
export interface PNGExportOptions {
    compression: number;
    interlaced: boolean;
    transparent: boolean;
}
export interface JPEGExportOptions {
    progressive: boolean;
    optimizeCoding: boolean;
    chromaSubsampling: '4:4:4' | '4:2:2' | '4:2:0';
}
export interface WebPExportOptions {
    lossless: boolean;
    nearLossless: boolean;
    sharpYUV: boolean;
}
export interface TIFFExportOptions {
    compression: 'none' | 'lzw' | 'zip' | 'jpeg';
    layers: boolean;
}
export interface EXRExportOptions {
    compression: 'none' | 'rle' | 'zip' | 'piz' | 'pxr24' | 'b44' | 'dwaa' | 'dwab';
    halfFloat: boolean;
}
export interface VideoExportOptions {
    codec: 'h264' | 'h265' | 'vp9' | 'av1' | 'prores';
    container: 'mp4' | 'webm' | 'mov' | 'mkv';
    fps: number;
    bitrate?: number;
    crf?: number;
    keyframeInterval?: number;
    audioCodec?: 'aac' | 'opus' | 'mp3';
    audioBitrate?: number;
}
export declare class UnifiedRenderPipeline {
    private targets;
    private passes;
    private stateStack;
    private currentState;
    private renderCache;
    constructor();
    /**
     * Cria render target
     */
    createRenderTarget(width: number, height: number, options?: Partial<RenderTarget>): RenderTarget;
    /**
     * Redimensiona render target
     */
    resizeRenderTarget(targetId: string, width: number, height: number): void;
    /**
     * Remove render target
     */
    destroyRenderTarget(targetId: string): void;
    private allocateColorBuffer;
    private getBytesPerPixel;
    private needsDepthBuffer;
    /**
     * Cria render pass
     */
    createRenderPass(name: string, targetId: string): RenderPass;
    /**
     * Remove render pass
     */
    removeRenderPass(passId: string): void;
    /**
     * Reordena passes
     */
    reorderPasses(passIds: string[]): void;
    /**
     * Enfileira comando
     */
    enqueueCommand(passId: string, command: RenderCommand): void;
    /**
     * Cria comando de clear
     */
    createClearCommand(options: ClearCommandData): RenderCommand;
    /**
     * Cria comando de draw image
     */
    createDrawImageCommand(imageId: string, destRect: Rect, options?: Partial<DrawImageCommandData>): RenderCommand;
    /**
     * Cria comando de composite
     */
    createCompositeCommand(sourceTargetId: string, destTargetId: string, blendMode: BlendMode, opacity: number): RenderCommand;
    /**
     * Cria comando de post-process
     */
    createPostProcessCommand(effectType: PostProcessEffectType, inputTargetId: string, outputTargetId: string, parameters?: Record<string, unknown>): RenderCommand;
    /**
     * Executa pipeline completo
     */
    render(): void;
    /**
     * Executa um pass
     */
    private executePass;
    /**
     * Executa comando individual
     */
    private executeCommand;
    /**
     * Limpa render target
     */
    private executeClear;
    /**
     * Desenha imagem
     */
    private executeDrawImage;
    /**
     * Desenha sprite
     */
    private executeDrawSprite;
    /**
     * Desenha vetor
     */
    private executeDrawVector;
    /**
     * Composite layers
     */
    private executeComposite;
    /**
     * Blit entre targets
     */
    private executeBlit;
    /**
     * Aplica post-process
     */
    private executePostProcess;
    private applyBloom;
    private applyBlur;
    private applySharpen;
    private applyVignette;
    private applyColorGrading;
    private applyToneMapping;
    /**
     * Exporta render target
     */
    exportTarget(targetId: string, options: ExportOptions): Promise<ArrayBuffer>;
    private resampleBuffer;
    private encodePNG;
    private encodeJPEG;
    private encodeWebP;
    private encodeRaw;
    private blendPixel;
    private gaussianBlur;
    private createGaussianKernel;
    private convolve1D;
    private convolve;
    private sortQueue;
    private computeSortKey;
    private createDefaultState;
    private generateId;
    /**
     * Salva estado atual
     */
    pushState(): void;
    /**
     * Restaura estado anterior
     */
    popState(): void;
    /**
     * Obtém render target
     */
    getRenderTarget(targetId: string): RenderTarget | undefined;
    /**
     * Lista todos os targets
     */
    getAllTargets(): RenderTarget[];
}
