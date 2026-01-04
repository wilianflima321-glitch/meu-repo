/**
 * TEXT/TYPOGRAPHY ENGINE - Motor de Tipografia Profissional
 *
 * Sistema completo para:
 * - Edição de texto avançada
 * - Suporte a fontes OpenType
 * - Kerning e tracking automático
 * - Text-on-path
 * - Text wrapping inteligente
 * - Hyphenation
 * - Multi-column layouts
 * - Rich text formatting
 */
export interface Point2D {
    x: number;
    y: number;
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
export interface FontFace {
    id: string;
    family: string;
    style: 'normal' | 'italic' | 'oblique';
    weight: number;
    stretch: FontStretch;
    source: string;
    metrics: FontMetrics;
    features: OpenTypeFeature[];
    glyphCache: Map<number, GlyphData>;
}
export type FontStretch = 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'normal' | 'semi-expanded' | 'expanded' | 'extra-expanded' | 'ultra-expanded';
export interface FontMetrics {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    lineGap: number;
    xHeight: number;
    capHeight: number;
    underlinePosition: number;
    underlineThickness: number;
}
export interface OpenTypeFeature {
    tag: string;
    name: string;
    enabled: boolean;
}
export interface GlyphData {
    codePoint: number;
    advanceWidth: number;
    leftSideBearing: number;
    path?: string;
    contours?: GlyphContour[];
}
export interface GlyphContour {
    points: Array<{
        x: number;
        y: number;
        onCurve: boolean;
    }>;
    closed: boolean;
}
export interface KerningPair {
    left: string;
    right: string;
    value: number;
}
export interface KerningTable {
    pairs: Map<string, number>;
}
export interface CharacterStyle {
    fontId?: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    fontStretch: FontStretch;
    fillColor: ColorRGBA;
    strokeColor?: ColorRGBA;
    strokeWidth?: number;
    tracking: number;
    baselineShift: number;
    underline?: TextDecoration;
    strikethrough?: TextDecoration;
    scaleX: number;
    scaleY: number;
    rotation?: number;
    openTypeFeatures: Record<string, boolean>;
    shadow?: TextShadow;
    outline?: TextOutline;
}
export interface TextDecoration {
    style: 'solid' | 'dashed' | 'dotted' | 'wavy';
    color?: ColorRGBA;
    thickness?: number;
    offset?: number;
}
export interface TextShadow {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: ColorRGBA;
}
export interface TextOutline {
    width: number;
    color: ColorRGBA;
    join: 'miter' | 'round' | 'bevel';
}
export interface ParagraphStyle {
    alignment: TextAlignment;
    justification?: JustificationMode;
    direction: 'ltr' | 'rtl';
    writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
    firstLineIndent: number;
    leftIndent: number;
    rightIndent: number;
    spaceBefore: number;
    spaceAfter: number;
    lineHeight: number | 'auto';
    lineHeightUnit: 'multiplier' | 'points' | 'pixels';
    tabStops: TabStop[];
    defaultTabWidth: number;
    listStyle?: ListStyle;
    hyphenation: HyphenationSettings;
    dropCap?: DropCapSettings;
    columns?: ColumnSettings;
}
export type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'justify-all';
export type JustificationMode = 'word-spacing' | 'letter-spacing' | 'both' | 'compress' | 'expand';
export interface TabStop {
    position: number;
    alignment: 'left' | 'center' | 'right' | 'decimal';
    leader?: string;
    decimalChar?: string;
}
export interface ListStyle {
    type: 'bullet' | 'numbered' | 'custom';
    marker?: string;
    numberFormat?: string;
    indent: number;
    markerSpacing: number;
}
export interface HyphenationSettings {
    enabled: boolean;
    language: string;
    minWordLength: number;
    minBeforeBreak: number;
    minAfterBreak: number;
    maxConsecutive: number;
    zone: number;
}
export interface DropCapSettings {
    lines: number;
    characters: number;
    style?: Partial<CharacterStyle>;
    outdent?: number;
}
export interface ColumnSettings {
    count: number;
    gap: number;
    rule?: {
        width: number;
        color: ColorRGBA;
        style: 'solid' | 'dashed' | 'dotted';
    };
    balance: boolean;
}
export interface TextDocument {
    id: string;
    content: TextContent;
    styles: {
        character: Map<string, CharacterStyle>;
        paragraph: Map<string, ParagraphStyle>;
    };
    defaultCharacterStyle: string;
    defaultParagraphStyle: string;
}
export interface TextContent {
    runs: TextRun[];
    totalLength: number;
}
export interface TextRun {
    text: string;
    characterStyleId?: string;
    characterOverrides?: Partial<CharacterStyle>;
    paragraphStyleId?: string;
    paragraphOverrides?: Partial<ParagraphStyle>;
}
export interface TextFrame {
    id: string;
    documentId: string;
    bounds: Rect;
    shape?: TextFrameShape;
    linkedFrameId?: string;
    overflowing: boolean;
    inset: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    verticalAlign: 'top' | 'center' | 'bottom' | 'justify';
    autoSize: 'none' | 'width' | 'height' | 'both';
    wrapExclusions?: WrapExclusion[];
    antialiasing: 'none' | 'grayscale' | 'subpixel';
    layoutCache?: TextLayout;
}
export type TextFrameShape = {
    type: 'rectangle';
} | {
    type: 'ellipse';
} | {
    type: 'polygon';
    points: Point2D[];
} | {
    type: 'path';
    pathData: string;
};
export interface WrapExclusion {
    bounds: Rect;
    offset: number;
    side: 'both' | 'left' | 'right';
}
export interface TextOnPath {
    id: string;
    documentId: string;
    pathData: string;
    pathPoints?: Point2D[];
    startOffset: number;
    alignment: 'baseline' | 'center' | 'top' | 'bottom';
    orientation: 'auto' | 'auto-reverse' | number;
    spacing: 'exact' | 'auto';
    antialiasing: 'none' | 'grayscale' | 'subpixel';
    layoutCache?: PathTextLayout;
}
export interface TextLayout {
    lines: LayoutLine[];
    bounds: Rect;
    overflow: boolean;
    columns?: LayoutColumn[];
}
export interface LayoutColumn {
    bounds: Rect;
    lines: LayoutLine[];
}
export interface LayoutLine {
    index: number;
    y: number;
    baseline: number;
    height: number;
    width: number;
    glyphs: LayoutGlyph[];
    wordSpacing: number;
    letterSpacing: number;
    hyphenated: boolean;
    ascender: number;
    descender: number;
}
export interface LayoutGlyph {
    codePoint: number;
    character: string;
    x: number;
    y: number;
    width: number;
    height: number;
    advanceWidth: number;
    fontId: string;
    fontSize: number;
    color: ColorRGBA;
    rotation?: number;
    scaleX: number;
    scaleY: number;
    runIndex: number;
    charIndex: number;
}
export interface PathTextLayout {
    glyphs: PathGlyph[];
    totalLength: number;
}
export interface PathGlyph extends LayoutGlyph {
    position: number;
    angle: number;
}
export declare class TextTypographyEngine {
    private fonts;
    private documents;
    private frames;
    private pathTexts;
    private hyphenationDictionaries;
    /**
     * Registra fonte
     */
    registerFont(font: FontFace): void;
    /**
     * Obtém fonte
     */
    getFont(fontId: string): FontFace | undefined;
    /**
     * Encontra fonte por família e estilo
     */
    findFont(family: string, weight?: number, style?: 'normal' | 'italic' | 'oblique'): FontFace | undefined;
    /**
     * Lista famílias de fonte disponíveis
     */
    listFontFamilies(): string[];
    /**
     * Cria documento de texto
     */
    createDocument(initialText?: string): TextDocument;
    /**
     * Cria estilo de caractere padrão
     */
    private createDefaultCharacterStyle;
    /**
     * Cria estilo de parágrafo padrão
     */
    private createDefaultParagraphStyle;
    /**
     * Insere texto
     */
    insertText(documentId: string, position: number, text: string): void;
    /**
     * Remove texto
     */
    deleteText(documentId: string, start: number, length: number): void;
    /**
     * Aplica estilo a range
     */
    applyCharacterStyle(documentId: string, start: number, length: number, style: Partial<CharacterStyle>): void;
    /**
     * Divide runs nas posições especificadas
     */
    private splitRunsAtPositions;
    /**
     * Cria text frame
     */
    createTextFrame(documentId: string, bounds: Rect): TextFrame;
    /**
     * Atualiza bounds do frame
     */
    updateFrameBounds(frameId: string, bounds: Rect): void;
    /**
     * Link frames para text threading
     */
    linkFrames(sourceFrameId: string, targetFrameId: string): void;
    /**
     * Cria text on path
     */
    createTextOnPath(documentId: string, pathData: string): TextOnPath;
    /**
     * Atualiza path
     */
    updatePath(textOnPathId: string, pathData: string): void;
    /**
     * Layout text frame
     */
    layoutFrame(frameId: string): TextLayout;
    /**
     * Layout text on path
     */
    layoutTextOnPath(textOnPathId: string): PathTextLayout;
    /**
     * Mede texto
     */
    measureText(text: string, style: Partial<CharacterStyle>): {
        width: number;
        height: number;
    };
    /**
     * Carrega dicionário de hyphenation
     */
    loadHyphenationDictionary(language: string, patterns: HyphenationPattern[]): void;
    /**
     * Encontra pontos de hyphenation
     */
    findHyphenationPoints(word: string, language: string): number[];
    private resolveCharacterStyle;
    private resolveParagraphStyle;
    private calculateLineHeight;
    private tokenize;
    private createGlyphs;
    private measureGlyphs;
    private finalizeLine;
    private applyVerticalAlignment;
    private getGlyphData;
    private getKerning;
    private discretizePath;
    private calculatePathLength;
    private getPointOnPath;
    private generateId;
}
interface HyphenationPattern {
    pattern: string;
    points: number[];
}
export {};
