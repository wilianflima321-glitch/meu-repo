import { injectable } from 'inversify';

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

// ============================================================================
// TIPOS BASE
// ============================================================================

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

// ============================================================================
// FONT SYSTEM
// ============================================================================

export interface FontFace {
    id: string;
    family: string;
    style: 'normal' | 'italic' | 'oblique';
    weight: number;                    // 100-900
    stretch: FontStretch;
    source: string;                    // URL ou embedded data
    
    // Métricas
    metrics: FontMetrics;
    
    // OpenType features
    features: OpenTypeFeature[];
    
    // Glyph data (lazy loaded)
    glyphCache: Map<number, GlyphData>;
}

export type FontStretch = 
    | 'ultra-condensed'
    | 'extra-condensed'
    | 'condensed'
    | 'semi-condensed'
    | 'normal'
    | 'semi-expanded'
    | 'expanded'
    | 'extra-expanded'
    | 'ultra-expanded';

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
    tag: string;                       // e.g., 'liga', 'kern', 'smcp'
    name: string;
    enabled: boolean;
}

export interface GlyphData {
    codePoint: number;
    advanceWidth: number;
    leftSideBearing: number;
    path?: string;                     // SVG path data
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

// ============================================================================
// KERNING
// ============================================================================

export interface KerningPair {
    left: string;
    right: string;
    value: number;
}

export interface KerningTable {
    pairs: Map<string, number>;        // "left,right" -> kerning value
}

// ============================================================================
// TEXT STYLE
// ============================================================================

export interface CharacterStyle {
    // Font
    fontId?: string;
    fontFamily: string;
    fontSize: number;                  // Em pontos
    fontWeight: number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    fontStretch: FontStretch;
    
    // Color
    fillColor: ColorRGBA;
    strokeColor?: ColorRGBA;
    strokeWidth?: number;
    
    // Spacing
    tracking: number;                  // Letter spacing em 1/1000 em
    baselineShift: number;
    
    // Decoration
    underline?: TextDecoration;
    strikethrough?: TextDecoration;
    
    // Transforms
    scaleX: number;
    scaleY: number;
    rotation?: number;
    
    // OpenType features
    openTypeFeatures: Record<string, boolean>;
    
    // Effects
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

// ============================================================================
// PARAGRAPH STYLE
// ============================================================================

export interface ParagraphStyle {
    // Alignment
    alignment: TextAlignment;
    justification?: JustificationMode;
    
    // Direction
    direction: 'ltr' | 'rtl';
    writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
    
    // Indentation
    firstLineIndent: number;
    leftIndent: number;
    rightIndent: number;
    
    // Spacing
    spaceBefore: number;
    spaceAfter: number;
    lineHeight: number | 'auto';
    lineHeightUnit: 'multiplier' | 'points' | 'pixels';
    
    // Tabs
    tabStops: TabStop[];
    defaultTabWidth: number;
    
    // Lists
    listStyle?: ListStyle;
    
    // Hyphenation
    hyphenation: HyphenationSettings;
    
    // Drop cap
    dropCap?: DropCapSettings;
    
    // Columns
    columns?: ColumnSettings;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'justify-all';

export type JustificationMode = 
    | 'word-spacing'
    | 'letter-spacing'
    | 'both'
    | 'compress'
    | 'expand';

export interface TabStop {
    position: number;
    alignment: 'left' | 'center' | 'right' | 'decimal';
    leader?: string;
    decimalChar?: string;
}

export interface ListStyle {
    type: 'bullet' | 'numbered' | 'custom';
    marker?: string;
    numberFormat?: string;             // e.g., "1.", "a)", "i."
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

// ============================================================================
// TEXT DOCUMENT
// ============================================================================

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

// ============================================================================
// TEXT FRAME
// ============================================================================

export interface TextFrame {
    id: string;
    documentId: string;
    
    // Geometry
    bounds: Rect;
    shape?: TextFrameShape;
    
    // Flow
    linkedFrameId?: string;            // Para text threading
    overflowing: boolean;
    
    // Inset
    inset: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    
    // Vertical alignment
    verticalAlign: 'top' | 'center' | 'bottom' | 'justify';
    
    // Auto-size
    autoSize: 'none' | 'width' | 'height' | 'both';
    
    // Wrap exclusions
    wrapExclusions?: WrapExclusion[];
    
    // Rendering
    antialiasing: 'none' | 'grayscale' | 'subpixel';
    
    // Layout cache
    layoutCache?: TextLayout;
}

export type TextFrameShape = 
    | { type: 'rectangle' }
    | { type: 'ellipse' }
    | { type: 'polygon'; points: Point2D[] }
    | { type: 'path'; pathData: string };

export interface WrapExclusion {
    bounds: Rect;
    offset: number;
    side: 'both' | 'left' | 'right';
}

// ============================================================================
// TEXT ON PATH
// ============================================================================

export interface TextOnPath {
    id: string;
    documentId: string;
    
    // Path definition
    pathData: string;                  // SVG path
    pathPoints?: Point2D[];            // Discretized points
    
    // Positioning
    startOffset: number;               // 0-1 percentage
    alignment: 'baseline' | 'center' | 'top' | 'bottom';
    orientation: 'auto' | 'auto-reverse' | number;
    
    // Spacing
    spacing: 'exact' | 'auto';
    
    // Rendering
    antialiasing: 'none' | 'grayscale' | 'subpixel';
    
    // Layout
    layoutCache?: PathTextLayout;
}

// ============================================================================
// TEXT LAYOUT
// ============================================================================

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
    
    // Para justificação
    wordSpacing: number;
    letterSpacing: number;
    
    // Hyphenation
    hyphenated: boolean;
    
    // Metrics
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
    
    // Style info
    fontId: string;
    fontSize: number;
    color: ColorRGBA;
    
    // Transform
    rotation?: number;
    scaleX: number;
    scaleY: number;
    
    // Source reference
    runIndex: number;
    charIndex: number;
}

export interface PathTextLayout {
    glyphs: PathGlyph[];
    totalLength: number;
}

export interface PathGlyph extends LayoutGlyph {
    position: number;                  // Position along path (0-1)
    angle: number;                     // Rotation at position
}

// ============================================================================
// TEXT TYPOGRAPHY ENGINE
// ============================================================================

@injectable()
export class TextTypographyEngine {
    private fonts: Map<string, FontFace> = new Map();
    private documents: Map<string, TextDocument> = new Map();
    private frames: Map<string, TextFrame> = new Map();
    private pathTexts: Map<string, TextOnPath> = new Map();
    private hyphenationDictionaries: Map<string, HyphenationDictionary> = new Map();

    // ========================================================================
    // FONT MANAGEMENT
    // ========================================================================

    /**
     * Registra fonte
     */
    registerFont(font: FontFace): void {
        this.fonts.set(font.id, font);
    }

    /**
     * Obtém fonte
     */
    getFont(fontId: string): FontFace | undefined {
        return this.fonts.get(fontId);
    }

    /**
     * Encontra fonte por família e estilo
     */
    findFont(
        family: string,
        weight: number = 400,
        style: 'normal' | 'italic' | 'oblique' = 'normal'
    ): FontFace | undefined {
        let bestMatch: FontFace | undefined;
        let bestScore = -Infinity;
        
        // Normalize oblique to italic for matching
        const normalizedStyle = style === 'oblique' ? 'italic' : style;

        for (const font of this.fonts.values()) {
            if (font.family !== family) continue;

            let score = 0;

            // Peso - preferir exato, depois mais próximo
            const weightDiff = Math.abs(font.weight - weight);
            score -= weightDiff;

            // Estilo - preferir exato
            if (font.style === normalizedStyle) {
                score += 100;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = font;
            }
        }

        return bestMatch;
    }

    /**
     * Lista famílias de fonte disponíveis
     */
    listFontFamilies(): string[] {
        const families = new Set<string>();
        for (const font of this.fonts.values()) {
            families.add(font.family);
        }
        return Array.from(families).sort();
    }

    // ========================================================================
    // DOCUMENT CREATION
    // ========================================================================

    /**
     * Cria documento de texto
     */
    createDocument(initialText: string = ''): TextDocument {
        const defaultCharStyle = this.createDefaultCharacterStyle();
        const defaultParaStyle = this.createDefaultParagraphStyle();

        const doc: TextDocument = {
            id: this.generateId(),
            content: {
                runs: initialText ? [{
                    text: initialText,
                    characterStyleId: 'default',
                    paragraphStyleId: 'default',
                }] : [],
                totalLength: initialText.length,
            },
            styles: {
                character: new Map([['default', defaultCharStyle]]),
                paragraph: new Map([['default', defaultParaStyle]]),
            },
            defaultCharacterStyle: 'default',
            defaultParagraphStyle: 'default',
        };

        this.documents.set(doc.id, doc);
        return doc;
    }

    /**
     * Cria estilo de caractere padrão
     */
    private createDefaultCharacterStyle(): CharacterStyle {
        return {
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 400,
            fontStyle: 'normal',
            fontStretch: 'normal',
            fillColor: { r: 0, g: 0, b: 0, a: 255 },
            tracking: 0,
            baselineShift: 0,
            scaleX: 1,
            scaleY: 1,
            openTypeFeatures: {},
        };
    }

    /**
     * Cria estilo de parágrafo padrão
     */
    private createDefaultParagraphStyle(): ParagraphStyle {
        return {
            alignment: 'left',
            direction: 'ltr',
            writingMode: 'horizontal-tb',
            firstLineIndent: 0,
            leftIndent: 0,
            rightIndent: 0,
            spaceBefore: 0,
            spaceAfter: 0,
            lineHeight: 1.2,
            lineHeightUnit: 'multiplier',
            tabStops: [],
            defaultTabWidth: 48,
            hyphenation: {
                enabled: false,
                language: 'en-US',
                minWordLength: 5,
                minBeforeBreak: 2,
                minAfterBreak: 2,
                maxConsecutive: 3,
                zone: 36,
            },
        };
    }

    // ========================================================================
    // TEXT EDITING
    // ========================================================================

    /**
     * Insere texto
     */
    insertText(documentId: string, position: number, text: string): void {
        const doc = this.documents.get(documentId);
        if (!doc) return;

        // Encontrar run e posição
        let currentPos = 0;
        for (let i = 0; i < doc.content.runs.length; i++) {
            const run = doc.content.runs[i];
            const runEnd = currentPos + run.text.length;

            if (position >= currentPos && position <= runEnd) {
                const localPos = position - currentPos;
                
                // Inserir no meio do run
                run.text = run.text.slice(0, localPos) + text + run.text.slice(localPos);
                doc.content.totalLength += text.length;
                return;
            }

            currentPos = runEnd;
        }

        // Se não encontrou, adicionar no final
        if (doc.content.runs.length > 0) {
            doc.content.runs[doc.content.runs.length - 1].text += text;
        } else {
            doc.content.runs.push({
                text,
                characterStyleId: doc.defaultCharacterStyle,
                paragraphStyleId: doc.defaultParagraphStyle,
            });
        }
        doc.content.totalLength += text.length;
    }

    /**
     * Remove texto
     */
    deleteText(documentId: string, start: number, length: number): void {
        const doc = this.documents.get(documentId);
        if (!doc) return;

        let currentPos = 0;
        let remaining = length;
        const runsToRemove: number[] = [];

        for (let i = 0; i < doc.content.runs.length && remaining > 0; i++) {
            const run = doc.content.runs[i];
            const runEnd = currentPos + run.text.length;

            if (start < runEnd && currentPos < start + length) {
                const deleteStart = Math.max(0, start - currentPos);
                const deleteEnd = Math.min(run.text.length, start + length - currentPos);
                const deleteLength = deleteEnd - deleteStart;

                run.text = run.text.slice(0, deleteStart) + run.text.slice(deleteEnd);
                remaining -= deleteLength;

                if (run.text.length === 0) {
                    runsToRemove.push(i);
                }
            }

            currentPos = runEnd;
        }

        // Remover runs vazios
        for (let i = runsToRemove.length - 1; i >= 0; i--) {
            doc.content.runs.splice(runsToRemove[i], 1);
        }

        doc.content.totalLength -= length - remaining;
    }

    /**
     * Aplica estilo a range
     */
    applyCharacterStyle(
        documentId: string,
        start: number,
        length: number,
        style: Partial<CharacterStyle>
    ): void {
        const doc = this.documents.get(documentId);
        if (!doc) return;

        // Dividir runs se necessário e aplicar estilo
        this.splitRunsAtPositions(doc, [start, start + length]);
        
        let currentPos = 0;
        for (const run of doc.content.runs) {
            const runEnd = currentPos + run.text.length;

            if (start < runEnd && currentPos < start + length) {
                run.characterOverrides = {
                    ...run.characterOverrides,
                    ...style,
                };
            }

            currentPos = runEnd;
        }
    }

    /**
     * Divide runs nas posições especificadas
     */
    private splitRunsAtPositions(doc: TextDocument, positions: number[]): void {
        const sortedPositions = [...new Set(positions)].sort((a, b) => a - b);
        
        let currentPos = 0;
        const newRuns: TextRun[] = [];

        for (const run of doc.content.runs) {
            const runEnd = currentPos + run.text.length;
            let lastSplit = 0;

            for (const pos of sortedPositions) {
                if (pos > currentPos && pos < runEnd) {
                    const localPos = pos - currentPos;
                    
                    // Criar run para a parte antes da posição
                    if (localPos > lastSplit) {
                        newRuns.push({
                            ...run,
                            text: run.text.slice(lastSplit, localPos),
                        });
                    }
                    lastSplit = localPos;
                }
            }

            // Adicionar resto do run
            if (lastSplit < run.text.length) {
                newRuns.push({
                    ...run,
                    text: run.text.slice(lastSplit),
                });
            }

            currentPos = runEnd;
        }

        doc.content.runs = newRuns;
    }

    // ========================================================================
    // TEXT FRAME
    // ========================================================================

    /**
     * Cria text frame
     */
    createTextFrame(documentId: string, bounds: Rect): TextFrame {
        const frame: TextFrame = {
            id: this.generateId(),
            documentId,
            bounds,
            overflowing: false,
            inset: { top: 0, right: 0, bottom: 0, left: 0 },
            verticalAlign: 'top',
            autoSize: 'none',
            antialiasing: 'subpixel',
        };

        this.frames.set(frame.id, frame);
        return frame;
    }

    /**
     * Atualiza bounds do frame
     */
    updateFrameBounds(frameId: string, bounds: Rect): void {
        const frame = this.frames.get(frameId);
        if (frame) {
            frame.bounds = bounds;
            frame.layoutCache = undefined;  // Invalidar cache
        }
    }

    /**
     * Link frames para text threading
     */
    linkFrames(sourceFrameId: string, targetFrameId: string): void {
        const source = this.frames.get(sourceFrameId);
        const target = this.frames.get(targetFrameId);
        
        if (source && target && source.documentId === target.documentId) {
            source.linkedFrameId = targetFrameId;
        }
    }

    // ========================================================================
    // TEXT ON PATH
    // ========================================================================

    /**
     * Cria text on path
     */
    createTextOnPath(documentId: string, pathData: string): TextOnPath {
        const textOnPath: TextOnPath = {
            id: this.generateId(),
            documentId,
            pathData,
            startOffset: 0,
            alignment: 'baseline',
            orientation: 'auto',
            spacing: 'auto',
            antialiasing: 'subpixel',
        };

        this.pathTexts.set(textOnPath.id, textOnPath);
        return textOnPath;
    }

    /**
     * Atualiza path
     */
    updatePath(textOnPathId: string, pathData: string): void {
        const textOnPath = this.pathTexts.get(textOnPathId);
        if (textOnPath) {
            textOnPath.pathData = pathData;
            textOnPath.pathPoints = this.discretizePath(pathData);
            textOnPath.layoutCache = undefined;
        }
    }

    // ========================================================================
    // LAYOUT ENGINE
    // ========================================================================

    /**
     * Layout text frame
     */
    layoutFrame(frameId: string): TextLayout {
        const frame = this.frames.get(frameId);
        if (!frame) {
            throw new Error('Frame not found');
        }

        const doc = this.documents.get(frame.documentId);
        if (!doc) {
            throw new Error('Document not found');
        }

        const layout: TextLayout = {
            lines: [],
            bounds: { ...frame.bounds },
            overflow: false,
        };

        const availableWidth = frame.bounds.width - frame.inset.left - frame.inset.right;
        const availableHeight = frame.bounds.height - frame.inset.top - frame.inset.bottom;

        let y = frame.inset.top;
        let runIndex = 0;
        let charIndex = 0;

        // Processar texto
        for (const run of doc.content.runs) {
            const charStyle = this.resolveCharacterStyle(doc, run);
            const paraStyle = this.resolveParagraphStyle(doc, run);
            const font = this.findFont(charStyle.fontFamily, charStyle.fontWeight, charStyle.fontStyle);
            
            if (!font) continue;

            const fontSize = charStyle.fontSize;
            const lineHeight = this.calculateLineHeight(paraStyle, font, fontSize);

            // Quebrar em palavras
            const words = this.tokenize(run.text);
            let lineGlyphs: LayoutGlyph[] = [];
            let lineWidth = 0;

            for (const word of words) {
                const wordGlyphs = this.createGlyphs(word, charStyle, font, runIndex, charIndex);
                const wordWidth = this.measureGlyphs(wordGlyphs);

                // Verificar se cabe na linha
                if (lineWidth + wordWidth > availableWidth && lineGlyphs.length > 0) {
                    // Finalizar linha atual
                    const line = this.finalizeLine(lineGlyphs, y, lineHeight, paraStyle, font, fontSize);
                    layout.lines.push(line);
                    
                    y += lineHeight;
                    lineGlyphs = [];
                    lineWidth = 0;

                    // Verificar overflow
                    if (y + lineHeight > frame.bounds.height - frame.inset.bottom) {
                        layout.overflow = true;
                        break;
                    }
                }

                // Adicionar glyphs à linha
                for (const glyph of wordGlyphs) {
                    glyph.x = frame.inset.left + lineWidth + (glyph.x || 0);
                    lineGlyphs.push(glyph);
                }
                lineWidth += wordWidth;

                charIndex += word.length;
            }

            // Finalizar última linha do run
            if (lineGlyphs.length > 0) {
                const line = this.finalizeLine(lineGlyphs, y, lineHeight, paraStyle, font, fontSize);
                layout.lines.push(line);
            }

            runIndex++;
        }

        // Aplicar alinhamento vertical
        this.applyVerticalAlignment(layout, frame, availableHeight);

        frame.layoutCache = layout;
        frame.overflowing = layout.overflow;

        return layout;
    }

    /**
     * Layout text on path
     */
    layoutTextOnPath(textOnPathId: string): PathTextLayout {
        const textOnPath = this.pathTexts.get(textOnPathId);
        if (!textOnPath) {
            throw new Error('TextOnPath not found');
        }

        const doc = this.documents.get(textOnPath.documentId);
        if (!doc) {
            throw new Error('Document not found');
        }

        // Discretizar path se necessário
        if (!textOnPath.pathPoints) {
            textOnPath.pathPoints = this.discretizePath(textOnPath.pathData);
        }

        const pathLength = this.calculatePathLength(textOnPath.pathPoints);
        const layout: PathTextLayout = {
            glyphs: [],
            totalLength: pathLength,
        };

        let position = textOnPath.startOffset * pathLength;
        let runIndex = 0;
        let charIndex = 0;

        for (const run of doc.content.runs) {
            const charStyle = this.resolveCharacterStyle(doc, run);
            const font = this.findFont(charStyle.fontFamily, charStyle.fontWeight, charStyle.fontStyle);
            
            if (!font) continue;

            for (const char of run.text) {
                const glyphData = this.getGlyphData(font, char.codePointAt(0) || 0);
                if (!glyphData) continue;

                // Calcular posição e rotação no path
                const { point, angle } = this.getPointOnPath(
                    textOnPath.pathPoints!,
                    position / pathLength
                );

                const pathGlyph: PathGlyph = {
                    codePoint: char.codePointAt(0) || 0,
                    character: char,
                    x: point.x,
                    y: point.y,
                    width: glyphData.advanceWidth * charStyle.fontSize / font.metrics.unitsPerEm,
                    height: charStyle.fontSize,
                    advanceWidth: glyphData.advanceWidth * charStyle.fontSize / font.metrics.unitsPerEm,
                    fontId: font.id,
                    fontSize: charStyle.fontSize,
                    color: charStyle.fillColor,
                    scaleX: charStyle.scaleX,
                    scaleY: charStyle.scaleY,
                    runIndex,
                    charIndex,
                    position: position / pathLength,
                    angle: textOnPath.orientation === 'auto' ? angle : 
                           textOnPath.orientation === 'auto-reverse' ? angle + 180 :
                           textOnPath.orientation as number,
                };

                layout.glyphs.push(pathGlyph);
                position += pathGlyph.advanceWidth + (charStyle.tracking / 1000 * charStyle.fontSize);
                charIndex++;
            }

            runIndex++;
        }

        textOnPath.layoutCache = layout;
        return layout;
    }

    // ========================================================================
    // MEASUREMENT
    // ========================================================================

    /**
     * Mede texto
     */
    measureText(text: string, style: Partial<CharacterStyle>): { width: number; height: number } {
        const fullStyle: CharacterStyle = {
            ...this.createDefaultCharacterStyle(),
            ...style,
        };

        const font = this.findFont(fullStyle.fontFamily, fullStyle.fontWeight, fullStyle.fontStyle);
        if (!font) {
            return { width: text.length * fullStyle.fontSize * 0.6, height: fullStyle.fontSize };
        }

        let width = 0;
        let prevCodePoint: number | null = null;

        for (const char of text) {
            const codePoint = char.codePointAt(0) || 0;
            const glyphData = this.getGlyphData(font, codePoint);
            
            if (glyphData) {
                // Adicionar kerning
                if (prevCodePoint !== null) {
                    width += this.getKerning(font, prevCodePoint, codePoint) * fullStyle.fontSize / font.metrics.unitsPerEm;
                }

                width += glyphData.advanceWidth * fullStyle.fontSize / font.metrics.unitsPerEm;
                width += fullStyle.tracking / 1000 * fullStyle.fontSize;
            }

            prevCodePoint = codePoint;
        }

        const height = fullStyle.fontSize * (font.metrics.ascender - font.metrics.descender) / font.metrics.unitsPerEm;

        return { width, height };
    }

    // ========================================================================
    // HYPHENATION
    // ========================================================================

    /**
     * Carrega dicionário de hyphenation
     */
    loadHyphenationDictionary(language: string, patterns: HyphenationPattern[]): void {
        const dict: HyphenationDictionary = {
            language,
            patterns: new Map(patterns.map(p => [p.pattern, p.points])),
        };
        this.hyphenationDictionaries.set(language, dict);
    }

    /**
     * Encontra pontos de hyphenation
     */
    findHyphenationPoints(word: string, language: string): number[] {
        const dict = this.hyphenationDictionaries.get(language);
        if (!dict) return [];

        const points: number[] = [];
        const wordLower = word.toLowerCase();
        const wordWithBoundary = `.${wordLower}.`;

        // Aplicar padrões (algoritmo de Liang)
        const values = new Array(wordWithBoundary.length + 1).fill(0);

        for (let i = 0; i < wordWithBoundary.length; i++) {
            for (let len = 1; len <= wordWithBoundary.length - i; len++) {
                const pattern = wordWithBoundary.slice(i, i + len);
                const patternPoints = dict.patterns.get(pattern);

                if (patternPoints) {
                    for (let j = 0; j < patternPoints.length; j++) {
                        values[i + j] = Math.max(values[i + j], patternPoints[j]);
                    }
                }
            }
        }

        // Encontrar pontos ímpares (onde pode quebrar)
        for (let i = 2; i < values.length - 2; i++) {
            if (values[i] % 2 === 1) {
                points.push(i - 1);  // Ajustar para índice do word original
            }
        }

        return points;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private resolveCharacterStyle(doc: TextDocument, run: TextRun): CharacterStyle {
        const baseStyle = doc.styles.character.get(run.characterStyleId || doc.defaultCharacterStyle);
        return {
            ...this.createDefaultCharacterStyle(),
            ...baseStyle,
            ...run.characterOverrides,
        };
    }

    private resolveParagraphStyle(doc: TextDocument, run: TextRun): ParagraphStyle {
        const baseStyle = doc.styles.paragraph.get(run.paragraphStyleId || doc.defaultParagraphStyle);
        return {
            ...this.createDefaultParagraphStyle(),
            ...baseStyle,
            ...run.paragraphOverrides,
        };
    }

    private calculateLineHeight(style: ParagraphStyle, font: FontFace, fontSize: number): number {
        if (style.lineHeight === 'auto') {
            return fontSize * 1.2;
        }

        switch (style.lineHeightUnit) {
            case 'multiplier':
                return fontSize * (style.lineHeight as number);
            case 'points':
            case 'pixels':
                return style.lineHeight as number;
            default:
                return fontSize * 1.2;
        }
    }

    private tokenize(text: string): string[] {
        // Dividir por espaços mantendo os espaços
        return text.split(/(\s+)/).filter(t => t.length > 0);
    }

    private createGlyphs(
        text: string,
        style: CharacterStyle,
        font: FontFace,
        runIndex: number,
        startCharIndex: number
    ): LayoutGlyph[] {
        const glyphs: LayoutGlyph[] = [];
        let x = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const codePoint = char.codePointAt(0) || 0;
            const glyphData = this.getGlyphData(font, codePoint);

            if (!glyphData) continue;

            const width = glyphData.advanceWidth * style.fontSize / font.metrics.unitsPerEm;

            glyphs.push({
                codePoint,
                character: char,
                x,
                y: 0,
                width,
                height: style.fontSize,
                advanceWidth: width,
                fontId: font.id,
                fontSize: style.fontSize,
                color: style.fillColor,
                scaleX: style.scaleX,
                scaleY: style.scaleY,
                runIndex,
                charIndex: startCharIndex + i,
            });

            x += width + (style.tracking / 1000 * style.fontSize);
        }

        return glyphs;
    }

    private measureGlyphs(glyphs: LayoutGlyph[]): number {
        if (glyphs.length === 0) return 0;
        const last = glyphs[glyphs.length - 1];
        return last.x + last.advanceWidth;
    }

    private finalizeLine(
        glyphs: LayoutGlyph[],
        y: number,
        height: number,
        style: ParagraphStyle,
        font: FontFace,
        fontSize: number
    ): LayoutLine {
        const ascender = font.metrics.ascender * fontSize / font.metrics.unitsPerEm;
        const descender = font.metrics.descender * fontSize / font.metrics.unitsPerEm;
        const width = this.measureGlyphs(glyphs);

        // Atualizar Y dos glyphs
        const baseline = y + ascender;
        for (const glyph of glyphs) {
            glyph.y = baseline;
        }

        return {
            index: 0,
            y,
            baseline,
            height,
            width,
            glyphs,
            wordSpacing: 0,
            letterSpacing: 0,
            hyphenated: false,
            ascender,
            descender,
        };
    }

    private applyVerticalAlignment(layout: TextLayout, frame: TextFrame, availableHeight: number): void {
        if (layout.lines.length === 0) return;

        const contentHeight = layout.lines.reduce((sum, line) => sum + line.height, 0);
        let offset = 0;

        switch (frame.verticalAlign) {
            case 'center':
                offset = (availableHeight - contentHeight) / 2;
                break;
            case 'bottom':
                offset = availableHeight - contentHeight;
                break;
            case 'justify':
                // Distribuir linhas igualmente
                if (layout.lines.length > 1) {
                    const gap = (availableHeight - contentHeight) / (layout.lines.length - 1);
                    for (let i = 0; i < layout.lines.length; i++) {
                        layout.lines[i].y += i * gap;
                        for (const glyph of layout.lines[i].glyphs) {
                            glyph.y += i * gap;
                        }
                    }
                }
                return;
        }

        // Aplicar offset
        for (const line of layout.lines) {
            line.y += offset;
            line.baseline += offset;
            for (const glyph of line.glyphs) {
                glyph.y += offset;
            }
        }
    }

    private getGlyphData(font: FontFace, codePoint: number): GlyphData | undefined {
        // Verificar cache
        if (font.glyphCache.has(codePoint)) {
            return font.glyphCache.get(codePoint);
        }

        // Fallback: glyph genérico
        const fallback: GlyphData = {
            codePoint,
            advanceWidth: font.metrics.unitsPerEm * 0.6,
            leftSideBearing: 0,
        };

        font.glyphCache.set(codePoint, fallback);
        return fallback;
    }

    private getKerning(font: FontFace, left: number, right: number): number {
        // Placeholder - implementação real usaria tabela de kerning
        return 0;
    }

    private discretizePath(pathData: string): Point2D[] {
        // Simplified path discretization
        const points: Point2D[] = [];
        const step = 5;  // Número de pontos por segmento

        // Parse básico de comandos SVG
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        let current: Point2D = { x: 0, y: 0 };

        for (const cmd of commands) {
            const type = cmd[0].toUpperCase();
            const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

            switch (type) {
                case 'M':
                    current = { x: values[0], y: values[1] };
                    points.push({ ...current });
                    break;
                case 'L':
                    const end: Point2D = { x: values[0], y: values[1] };
                    for (let i = 1; i <= step; i++) {
                        const t = i / step;
                        points.push({
                            x: current.x + (end.x - current.x) * t,
                            y: current.y + (end.y - current.y) * t,
                        });
                    }
                    current = end;
                    break;
                // Mais comandos seriam implementados aqui
            }
        }

        return points;
    }

    private calculatePathLength(points: Point2D[]): number {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    private getPointOnPath(points: Point2D[], t: number): { point: Point2D; angle: number } {
        if (points.length < 2) {
            return { point: points[0] || { x: 0, y: 0 }, angle: 0 };
        }

        const totalLength = this.calculatePathLength(points);
        const targetLength = t * totalLength;

        let accLength = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const segLength = Math.sqrt(dx * dx + dy * dy);

            if (accLength + segLength >= targetLength) {
                const localT = (targetLength - accLength) / segLength;
                const point = {
                    x: points[i - 1].x + dx * localT,
                    y: points[i - 1].y + dy * localT,
                };
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                return { point, angle };
            }

            accLength += segLength;
        }

        // Retornar último ponto
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI;
        return { point: last, angle };
    }

    private generateId(): string {
        return `txt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// TIPOS ADICIONAIS
// ============================================================================

interface HyphenationDictionary {
    language: string;
    patterns: Map<string, number[]>;
}

interface HyphenationPattern {
    pattern: string;
    points: number[];
}
