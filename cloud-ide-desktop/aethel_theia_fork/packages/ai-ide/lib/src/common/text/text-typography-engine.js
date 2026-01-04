"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextTypographyEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// TEXT TYPOGRAPHY ENGINE
// ============================================================================
let TextTypographyEngine = class TextTypographyEngine {
    constructor() {
        this.fonts = new Map();
        this.documents = new Map();
        this.frames = new Map();
        this.pathTexts = new Map();
        this.hyphenationDictionaries = new Map();
    }
    // ========================================================================
    // FONT MANAGEMENT
    // ========================================================================
    /**
     * Registra fonte
     */
    registerFont(font) {
        this.fonts.set(font.id, font);
    }
    /**
     * Obtém fonte
     */
    getFont(fontId) {
        return this.fonts.get(fontId);
    }
    /**
     * Encontra fonte por família e estilo
     */
    findFont(family, weight = 400, style = 'normal') {
        let bestMatch;
        let bestScore = -Infinity;
        // Normalize oblique to italic for matching
        const normalizedStyle = style === 'oblique' ? 'italic' : style;
        for (const font of this.fonts.values()) {
            if (font.family !== family)
                continue;
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
    listFontFamilies() {
        const families = new Set();
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
    createDocument(initialText = '') {
        const defaultCharStyle = this.createDefaultCharacterStyle();
        const defaultParaStyle = this.createDefaultParagraphStyle();
        const doc = {
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
    createDefaultCharacterStyle() {
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
    createDefaultParagraphStyle() {
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
    insertText(documentId, position, text) {
        const doc = this.documents.get(documentId);
        if (!doc)
            return;
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
        }
        else {
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
    deleteText(documentId, start, length) {
        const doc = this.documents.get(documentId);
        if (!doc)
            return;
        let currentPos = 0;
        let remaining = length;
        const runsToRemove = [];
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
    applyCharacterStyle(documentId, start, length, style) {
        const doc = this.documents.get(documentId);
        if (!doc)
            return;
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
    splitRunsAtPositions(doc, positions) {
        const sortedPositions = [...new Set(positions)].sort((a, b) => a - b);
        let currentPos = 0;
        const newRuns = [];
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
    createTextFrame(documentId, bounds) {
        const frame = {
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
    updateFrameBounds(frameId, bounds) {
        const frame = this.frames.get(frameId);
        if (frame) {
            frame.bounds = bounds;
            frame.layoutCache = undefined; // Invalidar cache
        }
    }
    /**
     * Link frames para text threading
     */
    linkFrames(sourceFrameId, targetFrameId) {
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
    createTextOnPath(documentId, pathData) {
        const textOnPath = {
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
    updatePath(textOnPathId, pathData) {
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
    layoutFrame(frameId) {
        const frame = this.frames.get(frameId);
        if (!frame) {
            throw new Error('Frame not found');
        }
        const doc = this.documents.get(frame.documentId);
        if (!doc) {
            throw new Error('Document not found');
        }
        const layout = {
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
            if (!font)
                continue;
            const fontSize = charStyle.fontSize;
            const lineHeight = this.calculateLineHeight(paraStyle, font, fontSize);
            // Quebrar em palavras
            const words = this.tokenize(run.text);
            let lineGlyphs = [];
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
    layoutTextOnPath(textOnPathId) {
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
        const layout = {
            glyphs: [],
            totalLength: pathLength,
        };
        let position = textOnPath.startOffset * pathLength;
        let runIndex = 0;
        let charIndex = 0;
        for (const run of doc.content.runs) {
            const charStyle = this.resolveCharacterStyle(doc, run);
            const font = this.findFont(charStyle.fontFamily, charStyle.fontWeight, charStyle.fontStyle);
            if (!font)
                continue;
            for (const char of run.text) {
                const glyphData = this.getGlyphData(font, char.codePointAt(0) || 0);
                if (!glyphData)
                    continue;
                // Calcular posição e rotação no path
                const { point, angle } = this.getPointOnPath(textOnPath.pathPoints, position / pathLength);
                const pathGlyph = {
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
                            textOnPath.orientation,
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
    measureText(text, style) {
        const fullStyle = {
            ...this.createDefaultCharacterStyle(),
            ...style,
        };
        const font = this.findFont(fullStyle.fontFamily, fullStyle.fontWeight, fullStyle.fontStyle);
        if (!font) {
            return { width: text.length * fullStyle.fontSize * 0.6, height: fullStyle.fontSize };
        }
        let width = 0;
        let prevCodePoint = null;
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
    loadHyphenationDictionary(language, patterns) {
        const dict = {
            language,
            patterns: new Map(patterns.map(p => [p.pattern, p.points])),
        };
        this.hyphenationDictionaries.set(language, dict);
    }
    /**
     * Encontra pontos de hyphenation
     */
    findHyphenationPoints(word, language) {
        const dict = this.hyphenationDictionaries.get(language);
        if (!dict)
            return [];
        const points = [];
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
                points.push(i - 1); // Ajustar para índice do word original
            }
        }
        return points;
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    resolveCharacterStyle(doc, run) {
        const baseStyle = doc.styles.character.get(run.characterStyleId || doc.defaultCharacterStyle);
        return {
            ...this.createDefaultCharacterStyle(),
            ...baseStyle,
            ...run.characterOverrides,
        };
    }
    resolveParagraphStyle(doc, run) {
        const baseStyle = doc.styles.paragraph.get(run.paragraphStyleId || doc.defaultParagraphStyle);
        return {
            ...this.createDefaultParagraphStyle(),
            ...baseStyle,
            ...run.paragraphOverrides,
        };
    }
    calculateLineHeight(style, font, fontSize) {
        if (style.lineHeight === 'auto') {
            return fontSize * 1.2;
        }
        switch (style.lineHeightUnit) {
            case 'multiplier':
                return fontSize * style.lineHeight;
            case 'points':
            case 'pixels':
                return style.lineHeight;
            default:
                return fontSize * 1.2;
        }
    }
    tokenize(text) {
        // Dividir por espaços mantendo os espaços
        return text.split(/(\s+)/).filter(t => t.length > 0);
    }
    createGlyphs(text, style, font, runIndex, startCharIndex) {
        const glyphs = [];
        let x = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const codePoint = char.codePointAt(0) || 0;
            const glyphData = this.getGlyphData(font, codePoint);
            if (!glyphData)
                continue;
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
    measureGlyphs(glyphs) {
        if (glyphs.length === 0)
            return 0;
        const last = glyphs[glyphs.length - 1];
        return last.x + last.advanceWidth;
    }
    finalizeLine(glyphs, y, height, style, font, fontSize) {
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
    applyVerticalAlignment(layout, frame, availableHeight) {
        if (layout.lines.length === 0)
            return;
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
    getGlyphData(font, codePoint) {
        // Verificar cache
        if (font.glyphCache.has(codePoint)) {
            return font.glyphCache.get(codePoint);
        }
        // Fallback: glyph genérico
        const fallback = {
            codePoint,
            advanceWidth: font.metrics.unitsPerEm * 0.6,
            leftSideBearing: 0,
        };
        font.glyphCache.set(codePoint, fallback);
        return fallback;
    }
    getKerning(font, left, right) {
        // Placeholder - implementação real usaria tabela de kerning
        return 0;
    }
    discretizePath(pathData) {
        // Simplified path discretization
        const points = [];
        const step = 5; // Número de pontos por segmento
        // Parse básico de comandos SVG
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        let current = { x: 0, y: 0 };
        for (const cmd of commands) {
            const type = cmd[0].toUpperCase();
            const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
            switch (type) {
                case 'M':
                    current = { x: values[0], y: values[1] };
                    points.push({ ...current });
                    break;
                case 'L':
                    const end = { x: values[0], y: values[1] };
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
    calculatePathLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }
    getPointOnPath(points, t) {
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
    generateId() {
        return `txt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.TextTypographyEngine = TextTypographyEngine;
exports.TextTypographyEngine = TextTypographyEngine = __decorate([
    (0, inversify_1.injectable)()
], TextTypographyEngine);
