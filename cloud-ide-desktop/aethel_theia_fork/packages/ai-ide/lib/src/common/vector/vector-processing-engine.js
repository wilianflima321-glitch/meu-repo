"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorProcessingEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// VECTOR PROCESSING ENGINE
// ============================================================================
let VectorProcessingEngine = class VectorProcessingEngine {
    constructor() {
        this.DEFAULT_CONFIG = {
            colorMode: 'color',
            colorCount: 16,
            threshold: 128,
            smoothing: 0.5,
            simplifyTolerance: 1,
            cornerThreshold: 60,
            pathOptimization: true,
            removeBackground: true,
            minPathLength: 3,
            detectShapes: true,
        };
    }
    // ========================================================================
    // VECTORIZAÇÃO (Raster → Vetor)
    // ========================================================================
    /**
     * Converte imagem raster para vetor
     */
    async vectorize(image, config = {}) {
        const startTime = Date.now();
        const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
        // 1. Extrair paleta de cores
        const colors = this.extractColors(image, fullConfig.colorCount);
        // 2. Quantizar imagem para paleta
        const quantized = this.quantizeImage(image, colors);
        // 3. Detectar contornos por cor
        const contours = this.detectContours(quantized, colors);
        // 4. Converter contornos para paths
        const paths = this.contoursToPath(contours, fullConfig);
        // 5. Otimizar paths
        const optimizedPaths = fullConfig.pathOptimization
            ? this.optimizePaths(paths, fullConfig)
            : paths;
        // 6. Agrupar em shapes
        const shapes = this.groupPaths(optimizedPaths);
        // 7. Detectar geometrias conhecidas
        const detectedShapes = fullConfig.detectShapes
            ? this.detectGeometries(shapes)
            : [];
        // 8. Gerar SVG
        const svgOutput = this.generateSVG(shapes, image.width, image.height);
        // 9. Calcular estatísticas
        const totalPoints = shapes.reduce((sum, shape) => sum + shape.paths.reduce((s, p) => s + p.commands.reduce((ps, c) => ps + c.points.length, 0), 0), 0);
        const originalSize = image.width * image.height * 4;
        const svgSize = new TextEncoder().encode(svgOutput).length;
        return {
            shapes,
            colors,
            gradients: [],
            detectedShapes,
            statistics: {
                totalPaths: shapes.reduce((sum, s) => sum + s.paths.length, 0),
                totalPoints,
                colorsUsed: colors.length,
                processingTime: Date.now() - startTime,
                compressionRatio: originalSize / svgSize,
            },
            svgOutput,
        };
    }
    /**
     * Extrai paleta de cores dominantes
     */
    extractColors(image, count) {
        // Implementação usando k-means simplificado
        const pixels = [];
        // Amostrar pixels
        const sampleRate = Math.max(1, Math.floor((image.width * image.height) / 10000));
        for (let i = 0; i < image.data.length; i += 4 * sampleRate) {
            pixels.push({
                r: image.data[i],
                g: image.data[i + 1],
                b: image.data[i + 2],
                a: image.data[i + 3] / 255,
            });
        }
        // K-means clustering
        return this.kMeansColors(pixels, count);
    }
    /**
     * K-means para clustering de cores
     */
    kMeansColors(pixels, k, iterations = 10) {
        if (pixels.length === 0)
            return [];
        // Inicializar centroids aleatoriamente
        let centroids = [];
        for (let i = 0; i < k; i++) {
            centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
        }
        for (let iter = 0; iter < iterations; iter++) {
            // Atribuir pixels aos clusters
            const clusters = Array.from({ length: k }, () => []);
            for (const pixel of pixels) {
                let minDist = Infinity;
                let closestCluster = 0;
                for (let i = 0; i < k; i++) {
                    const dist = this.colorDistance(pixel, centroids[i]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestCluster = i;
                    }
                }
                clusters[closestCluster].push(pixel);
            }
            // Atualizar centroids
            centroids = clusters.map((cluster, i) => {
                if (cluster.length === 0)
                    return centroids[i];
                const sum = cluster.reduce((acc, c) => ({
                    r: acc.r + c.r,
                    g: acc.g + c.g,
                    b: acc.b + c.b,
                    a: acc.a + c.a,
                }), { r: 0, g: 0, b: 0, a: 0 });
                return {
                    r: Math.round(sum.r / cluster.length),
                    g: Math.round(sum.g / cluster.length),
                    b: Math.round(sum.b / cluster.length),
                    a: sum.a / cluster.length,
                };
            });
        }
        return centroids;
    }
    /**
     * Distância entre duas cores (Euclidiana no espaço RGB)
     */
    colorDistance(a, b) {
        return Math.sqrt(Math.pow(a.r - b.r, 2) +
            Math.pow(a.g - b.g, 2) +
            Math.pow(a.b - b.b, 2));
    }
    /**
     * Quantiza imagem para paleta de cores
     */
    quantizeImage(image, palette) {
        const result = new Uint8Array(image.width * image.height);
        for (let i = 0; i < image.data.length; i += 4) {
            const pixel = {
                r: image.data[i],
                g: image.data[i + 1],
                b: image.data[i + 2],
                a: image.data[i + 3] / 255,
            };
            // Encontrar cor mais próxima na paleta
            let minDist = Infinity;
            let colorIndex = 0;
            for (let j = 0; j < palette.length; j++) {
                const dist = this.colorDistance(pixel, palette[j]);
                if (dist < minDist) {
                    minDist = dist;
                    colorIndex = j;
                }
            }
            result[i / 4] = colorIndex;
        }
        return result;
    }
    /**
     * Detecta contornos para cada cor
     */
    detectContours(quantized, colors) {
        const contours = new Map();
        // Para cada cor, encontrar contornos
        for (let colorIdx = 0; colorIdx < colors.length; colorIdx++) {
            const colorContours = this.marchingSquares(quantized, colorIdx);
            if (colorContours.length > 0) {
                contours.set(colorIdx, colorContours);
            }
        }
        return contours;
    }
    /**
     * Algoritmo Marching Squares para detecção de contornos
     */
    marchingSquares(data, targetColor) {
        // Implementação simplificada
        const contours = [];
        const width = Math.sqrt(data.length);
        const height = width;
        const visited = new Set();
        // Encontrar pontos de borda
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const idx = y * width + x;
                const key = `${x},${y}`;
                if (visited.has(key))
                    continue;
                if (data[idx] !== targetColor)
                    continue;
                // Verificar se é borda
                const isEdge = x === 0 || y === 0 ||
                    x === width - 2 || y === height - 2 ||
                    data[idx - 1] !== targetColor ||
                    data[idx + 1] !== targetColor ||
                    data[idx - width] !== targetColor ||
                    data[idx + width] !== targetColor;
                if (isEdge) {
                    const contour = this.traceContour(data, width, height, x, y, targetColor, visited);
                    if (contour.length >= 3) {
                        contours.push(contour);
                    }
                }
            }
        }
        return contours;
    }
    /**
     * Traça um contorno a partir de um ponto inicial
     */
    traceContour(data, width, height, startX, startY, targetColor, visited) {
        const contour = [];
        const directions = [
            { dx: 1, dy: 0 },
            { dx: 1, dy: 1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: -1, dy: -1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: -1 },
        ];
        let x = startX;
        let y = startY;
        let dirIndex = 0;
        do {
            const key = `${x},${y}`;
            if (!visited.has(key)) {
                contour.push({ x, y });
                visited.add(key);
            }
            // Procurar próximo ponto de borda
            let found = false;
            for (let i = 0; i < 8; i++) {
                const tryDir = (dirIndex + i) % 8;
                const nx = x + directions[tryDir].dx;
                const ny = y + directions[tryDir].dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (data[nIdx] === targetColor && !visited.has(`${nx},${ny}`)) {
                        x = nx;
                        y = ny;
                        dirIndex = (tryDir + 5) % 8; // Ajustar direção
                        found = true;
                        break;
                    }
                }
            }
            if (!found)
                break;
        } while (x !== startX || y !== startY);
        return contour;
    }
    /**
     * Converte contornos para paths vetoriais
     */
    contoursToPath(contours, config) {
        const paths = [];
        for (const [colorIdx, colorContours] of contours) {
            for (const contour of colorContours) {
                if (contour.length < config.minPathLength)
                    continue;
                // Suavizar contorno
                const smoothed = this.smoothContour(contour, config.smoothing);
                // Simplificar
                const simplified = this.simplifyPath(smoothed, config.simplifyTolerance);
                // Converter para comandos de path
                const commands = this.pointsToCommands(simplified, config.cornerThreshold);
                paths.push({
                    id: this.generateId(),
                    commands,
                    closed: true,
                    fill: `palette_${colorIdx}`,
                });
            }
        }
        return paths;
    }
    /**
     * Suaviza contorno usando média móvel
     */
    smoothContour(points, amount) {
        if (amount === 0 || points.length < 3)
            return points;
        const windowSize = Math.max(3, Math.floor(points.length * amount * 0.1));
        const smoothed = [];
        for (let i = 0; i < points.length; i++) {
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            for (let j = -windowSize; j <= windowSize; j++) {
                const idx = (i + j + points.length) % points.length;
                sumX += points[idx].x;
                sumY += points[idx].y;
                count++;
            }
            smoothed.push({
                x: sumX / count,
                y: sumY / count,
            });
        }
        return smoothed;
    }
    // ========================================================================
    // SIMPLIFICAÇÃO E OTIMIZAÇÃO
    // ========================================================================
    /**
     * Simplifica path usando algoritmo Ramer-Douglas-Peucker
     */
    simplifyPath(points, tolerance) {
        if (points.length <= 2)
            return points;
        // Encontrar ponto mais distante da linha entre primeiro e último
        let maxDist = 0;
        let maxIndex = 0;
        const first = points[0];
        const last = points[points.length - 1];
        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.pointToLineDistance(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }
        // Se distância máxima maior que tolerância, dividir recursivamente
        if (maxDist > tolerance) {
            const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPath(points.slice(maxIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        }
        // Senão, retornar apenas primeiro e último
        return [first, last];
    }
    /**
     * Distância de ponto a linha
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        if (dx === 0 && dy === 0) {
            return Math.sqrt(Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2));
        }
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestX = lineStart.x + clampedT * dx;
        const closestY = lineStart.y + clampedT * dy;
        return Math.sqrt(Math.pow(point.x - closestX, 2) +
            Math.pow(point.y - closestY, 2));
    }
    /**
     * Converte pontos para comandos de path
     */
    pointsToCommands(points, cornerThreshold) {
        if (points.length === 0)
            return [];
        const commands = [];
        const corners = this.detectCorners(points, cornerThreshold);
        // Move para primeiro ponto
        commands.push({
            type: 'M',
            points: [points[0]],
            absolute: true,
        });
        // Processar segmentos entre cantos
        let lastCorner = 0;
        for (const corner of [...corners, points.length - 1]) {
            const segment = points.slice(lastCorner, corner + 1);
            if (segment.length <= 2) {
                // Linha reta
                commands.push({
                    type: 'L',
                    points: [segment[segment.length - 1]],
                    absolute: true,
                });
            }
            else {
                // Curva Bezier
                const bezier = this.fitBezier(segment);
                commands.push({
                    type: 'C',
                    points: bezier,
                    absolute: true,
                });
            }
            lastCorner = corner;
        }
        // Fechar path
        commands.push({
            type: 'Z',
            points: [],
            absolute: true,
        });
        return commands;
    }
    /**
     * Detecta cantos em sequência de pontos
     */
    detectCorners(points, threshold) {
        const corners = [];
        const thresholdRad = threshold * Math.PI / 180;
        for (let i = 1; i < points.length - 1; i++) {
            const angle = this.angleBetweenPoints(points[i - 1], points[i], points[i + 1]);
            if (Math.abs(Math.PI - angle) > thresholdRad) {
                corners.push(i);
            }
        }
        return corners;
    }
    /**
     * Ângulo entre três pontos
     */
    angleBetweenPoints(a, b, c) {
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const cross = ab.x * cb.y - ab.y * cb.x;
        return Math.atan2(cross, dot);
    }
    /**
     * Ajusta curva Bezier cúbica a pontos
     */
    fitBezier(points) {
        if (points.length < 2)
            return points;
        if (points.length === 2)
            return [points[0], points[0], points[1], points[1]];
        const first = points[0];
        const last = points[points.length - 1];
        // Pontos de controle simples (1/3 e 2/3 do caminho)
        const ctrl1 = points[Math.floor(points.length / 3)];
        const ctrl2 = points[Math.floor(points.length * 2 / 3)];
        return [ctrl1, ctrl2, last];
    }
    /**
     * Otimiza paths (remove redundâncias, mescla similares)
     */
    optimizePaths(paths, config) {
        return paths.filter(path => {
            // Remover paths muito pequenos
            const bb = this.calculateBoundingBox(path);
            return bb.width >= 2 && bb.height >= 2;
        });
    }
    /**
     * Calcula bounding box de um path
     */
    calculateBoundingBox(path) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const cmd of path.commands) {
            for (const pt of cmd.points) {
                minX = Math.min(minX, pt.x);
                minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x);
                maxY = Math.max(maxY, pt.y);
            }
        }
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    /**
     * Agrupa paths em shapes
     */
    groupPaths(paths) {
        // Por enquanto, cada path é um shape
        return paths.map(path => ({
            id: this.generateId(),
            name: `shape_${path.id}`,
            paths: [path],
            boundingBox: this.calculateBoundingBox(path),
            centroid: this.calculateCentroid(path),
            metadata: {},
        }));
    }
    /**
     * Calcula centróide de um path
     */
    calculateCentroid(path) {
        let sumX = 0, sumY = 0, count = 0;
        for (const cmd of path.commands) {
            for (const pt of cmd.points) {
                sumX += pt.x;
                sumY += pt.y;
                count++;
            }
        }
        return {
            x: count > 0 ? sumX / count : 0,
            y: count > 0 ? sumY / count : 0,
        };
    }
    // ========================================================================
    // DETECÇÃO DE GEOMETRIAS
    // ========================================================================
    /**
     * Detecta geometrias conhecidas em shapes
     */
    detectGeometries(shapes) {
        const detected = [];
        for (const shape of shapes) {
            for (const path of shape.paths) {
                // Tentar detectar círculo
                const circle = this.detectCircle(path);
                if (circle) {
                    detected.push(circle);
                    continue;
                }
                // Tentar detectar retângulo
                const rect = this.detectRectangle(path);
                if (rect) {
                    detected.push(rect);
                    continue;
                }
                // Tentar detectar polígono regular
                const polygon = this.detectPolygon(path);
                if (polygon) {
                    detected.push(polygon);
                }
            }
        }
        return detected;
    }
    /**
     * Detecta se path é um círculo
     */
    detectCircle(path) {
        const bb = this.calculateBoundingBox(path);
        const aspectRatio = bb.width / bb.height;
        // Deve ser aproximadamente quadrado
        if (Math.abs(1 - aspectRatio) > 0.1)
            return null;
        const centroid = this.calculateCentroid(path);
        const expectedRadius = bb.width / 2;
        // Verificar se todos os pontos estão aproximadamente na mesma distância do centro
        let totalVariance = 0;
        let pointCount = 0;
        for (const cmd of path.commands) {
            for (const pt of cmd.points) {
                const dist = Math.sqrt(Math.pow(pt.x - centroid.x, 2) +
                    Math.pow(pt.y - centroid.y, 2));
                totalVariance += Math.pow(dist - expectedRadius, 2);
                pointCount++;
            }
        }
        const variance = pointCount > 0 ? totalVariance / pointCount : Infinity;
        const normalizedVariance = variance / (expectedRadius * expectedRadius);
        if (normalizedVariance < 0.05) {
            return {
                type: 'circle',
                confidence: 1 - normalizedVariance * 10,
                parameters: {
                    cx: centroid.x,
                    cy: centroid.y,
                    r: expectedRadius,
                },
                originalPath: path.id,
            };
        }
        return null;
    }
    /**
     * Detecta se path é um retângulo
     */
    detectRectangle(path) {
        // Contar cantos (deve ter exatamente 4)
        const corners = this.extractCornerPoints(path);
        if (corners.length !== 4)
            return null;
        // Verificar ângulos retos
        const angles = [];
        for (let i = 0; i < 4; i++) {
            const a = corners[(i - 1 + 4) % 4];
            const b = corners[i];
            const c = corners[(i + 1) % 4];
            angles.push(Math.abs(this.angleBetweenPoints(a, b, c)));
        }
        const isRectangle = angles.every(a => Math.abs(a - Math.PI / 2) < 0.1);
        if (isRectangle) {
            const bb = this.calculateBoundingBox(path);
            return {
                type: 'rectangle',
                confidence: 0.9,
                parameters: {
                    x: bb.x,
                    y: bb.y,
                    width: bb.width,
                    height: bb.height,
                },
                originalPath: path.id,
            };
        }
        return null;
    }
    /**
     * Detecta polígono regular
     */
    detectPolygon(path) {
        const corners = this.extractCornerPoints(path);
        if (corners.length < 3 || corners.length > 12)
            return null;
        // Verificar se lados têm comprimentos similares
        const sideLengths = [];
        for (let i = 0; i < corners.length; i++) {
            const a = corners[i];
            const b = corners[(i + 1) % corners.length];
            sideLengths.push(Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)));
        }
        const avgLength = sideLengths.reduce((a, b) => a + b, 0) / sideLengths.length;
        const variance = sideLengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / sideLengths.length;
        const normalizedVariance = variance / (avgLength * avgLength);
        if (normalizedVariance < 0.1) {
            return {
                type: 'polygon',
                confidence: 1 - normalizedVariance * 5,
                parameters: {
                    sides: corners.length,
                    avgSideLength: avgLength,
                },
                originalPath: path.id,
            };
        }
        return null;
    }
    /**
     * Extrai pontos de canto de um path
     */
    extractCornerPoints(path) {
        const points = [];
        for (const cmd of path.commands) {
            if (cmd.type !== 'Z' && cmd.points.length > 0) {
                points.push(cmd.points[cmd.points.length - 1]);
            }
        }
        return points;
    }
    // ========================================================================
    // MORPHING E INTERPOLAÇÃO
    // ========================================================================
    /**
     * Cria morphing entre dois shapes
     */
    async morph(shapeA, shapeB, config = {}) {
        const fullConfig = {
            steps: 10,
            easing: 'easeInOut',
            preserveCorners: true,
            matchingStrategy: 'nearest',
            ...config,
        };
        // Normalizar número de pontos entre shapes
        const { pointsA, pointsB } = this.normalizePointCount(shapeA, shapeB);
        // Corresponder pontos
        const { mappedA, mappedB } = this.matchPoints(pointsA, pointsB, fullConfig.matchingStrategy);
        // Gerar frames intermediários
        const frames = [];
        for (let i = 0; i <= fullConfig.steps; i++) {
            const t = i / fullConfig.steps;
            const easedT = this.applyEasing(t, fullConfig.easing);
            const interpolatedPoints = this.interpolatePoints(mappedA, mappedB, easedT);
            const frame = this.pointsToShape(interpolatedPoints, shapeA, shapeB, easedT);
            frames.push(frame);
        }
        return {
            frames,
            duration: fullConfig.steps * (1000 / 30), // Assumindo 30fps
            keyframes: [0, Math.floor(fullConfig.steps / 2), fullConfig.steps],
        };
    }
    /**
     * Normaliza número de pontos entre dois shapes
     */
    normalizePointCount(shapeA, shapeB) {
        const extractPoints = (shape) => {
            const points = [];
            for (const path of shape.paths) {
                for (const cmd of path.commands) {
                    points.push(...cmd.points);
                }
            }
            return points;
        };
        let pointsA = extractPoints(shapeA);
        let pointsB = extractPoints(shapeB);
        // Equalizar número de pontos por interpolação
        while (pointsA.length < pointsB.length) {
            pointsA = this.subdividePoints(pointsA);
        }
        while (pointsB.length < pointsA.length) {
            pointsB = this.subdividePoints(pointsB);
        }
        return { pointsA, pointsB };
    }
    /**
     * Subdivide pontos inserindo pontos intermediários
     */
    subdividePoints(points) {
        const result = [];
        for (let i = 0; i < points.length; i++) {
            result.push(points[i]);
            if (result.length < points.length * 2 - 1) {
                const next = points[(i + 1) % points.length];
                result.push({
                    x: (points[i].x + next.x) / 2,
                    y: (points[i].y + next.y) / 2,
                });
            }
        }
        return result;
    }
    /**
     * Corresponde pontos entre dois conjuntos
     */
    matchPoints(pointsA, pointsB, strategy) {
        if (strategy === 'nearest') {
            // Rotacionar B para minimizar distância total
            let bestRotation = 0;
            let minDistance = Infinity;
            for (let r = 0; r < pointsB.length; r++) {
                let totalDist = 0;
                for (let i = 0; i < pointsA.length; i++) {
                    const bIdx = (i + r) % pointsB.length;
                    totalDist += Math.sqrt(Math.pow(pointsA[i].x - pointsB[bIdx].x, 2) +
                        Math.pow(pointsA[i].y - pointsB[bIdx].y, 2));
                }
                if (totalDist < minDistance) {
                    minDistance = totalDist;
                    bestRotation = r;
                }
            }
            const mappedB = [
                ...pointsB.slice(bestRotation),
                ...pointsB.slice(0, bestRotation),
            ];
            return { mappedA: pointsA, mappedB };
        }
        // Fallback para correspondência simples
        return { mappedA: pointsA, mappedB: pointsB };
    }
    /**
     * Interpola entre dois conjuntos de pontos
     */
    interpolatePoints(pointsA, pointsB, t) {
        return pointsA.map((a, i) => ({
            x: a.x + (pointsB[i].x - a.x) * t,
            y: a.y + (pointsB[i].y - a.y) * t,
        }));
    }
    /**
     * Converte pontos de volta para shape
     */
    pointsToShape(points, shapeA, shapeB, t) {
        const commands = [
            { type: 'M', points: [points[0]], absolute: true },
        ];
        for (let i = 1; i < points.length; i++) {
            commands.push({
                type: 'L',
                points: [points[i]],
                absolute: true,
            });
        }
        commands.push({ type: 'Z', points: [], absolute: true });
        // Interpolar cores
        const fillA = typeof shapeA.paths[0]?.fill === 'object' ? shapeA.paths[0].fill : null;
        const fillB = typeof shapeB.paths[0]?.fill === 'object' ? shapeB.paths[0].fill : null;
        let fill;
        if (fillA && fillB) {
            fill = {
                r: Math.round(fillA.r + (fillB.r - fillA.r) * t),
                g: Math.round(fillA.g + (fillB.g - fillA.g) * t),
                b: Math.round(fillA.b + (fillB.b - fillA.b) * t),
                a: fillA.a + (fillB.a - fillA.a) * t,
            };
        }
        const path = {
            id: this.generateId(),
            commands,
            closed: true,
            fill,
        };
        const bb = this.calculateBoundingBox(path);
        return {
            id: this.generateId(),
            name: `morph_${t.toFixed(2)}`,
            paths: [path],
            boundingBox: bb,
            centroid: this.calculateCentroid(path),
            metadata: { morphProgress: t },
        };
    }
    /**
     * Aplica função de easing
     */
    applyEasing(t, type) {
        switch (type) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return 1 - (1 - t) * (1 - t);
            case 'easeInOut':
                return t < 0.5
                    ? 2 * t * t
                    : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case 'bounceOut':
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                }
                else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                }
                else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                }
                else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            case 'bounceIn':
                return 1 - this.applyEasing(1 - t, 'bounceOut');
            case 'elastic':
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1
                    : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
            default:
                return t;
        }
    }
    // ========================================================================
    // EMBEDDINGS VETORIAIS (PARA AI)
    // ========================================================================
    /**
     * Gera embedding vetorial de um shape para uso em AI
     */
    generateEmbedding(shape, dimensions = 128) {
        const values = new Float32Array(dimensions);
        // Características geométricas
        const bb = shape.boundingBox;
        values[0] = bb.width / 1000; // Largura normalizada
        values[1] = bb.height / 1000; // Altura normalizada
        values[2] = bb.width / bb.height; // Aspect ratio
        // Centróide normalizado
        values[3] = shape.centroid.x / 1000;
        values[4] = shape.centroid.y / 1000;
        // Complexidade
        const totalPoints = shape.paths.reduce((sum, p) => sum + p.commands.reduce((s, c) => s + c.points.length, 0), 0);
        values[5] = Math.min(totalPoints / 1000, 1);
        // Número de paths
        values[6] = Math.min(shape.paths.length / 100, 1);
        // Tipos de comandos (distribuição)
        const cmdCounts = new Map();
        for (const path of shape.paths) {
            for (const cmd of path.commands) {
                cmdCounts.set(cmd.type, (cmdCounts.get(cmd.type) || 0) + 1);
            }
        }
        const cmdTypes = ['M', 'L', 'C', 'Q', 'A', 'Z'];
        cmdTypes.forEach((type, i) => {
            values[7 + i] = (cmdCounts.get(type) || 0) / Math.max(totalPoints, 1);
        });
        // Preencher resto com características derivadas
        for (let i = 13; i < dimensions; i++) {
            // Hash de características combinadas
            values[i] = Math.sin(values[i % 13] * (i + 1)) * 0.5 + 0.5;
        }
        return {
            id: this.generateId(),
            sourceId: shape.id,
            dimensions,
            values,
            metadata: {
                shapeType: this.classifyShapeType(shape),
                complexity: totalPoints,
                colorCount: new Set(shape.paths.map(p => JSON.stringify(p.fill))).size,
            },
        };
    }
    /**
     * Calcula similaridade entre dois embeddings
     */
    embeddingSimilarity(a, b) {
        if (a.dimensions !== b.dimensions) {
            throw new Error('Embeddings must have same dimensions');
        }
        // Similaridade de cosseno
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.dimensions; i++) {
            dotProduct += a.values[i] * b.values[i];
            normA += a.values[i] * a.values[i];
            normB += b.values[i] * b.values[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Classifica tipo de shape
     */
    classifyShapeType(shape) {
        const bb = shape.boundingBox;
        const aspectRatio = bb.width / bb.height;
        if (Math.abs(1 - aspectRatio) < 0.1) {
            return 'square-ish';
        }
        else if (aspectRatio > 2) {
            return 'wide';
        }
        else if (aspectRatio < 0.5) {
            return 'tall';
        }
        return 'irregular';
    }
    // ========================================================================
    // GERAÇÃO SVG
    // ========================================================================
    /**
     * Gera string SVG a partir de shapes
     */
    generateSVG(shapes, width, height) {
        const pathsStr = shapes.map(shape => shape.paths.map(path => this.pathToSVG(path)).join('\n')).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${pathsStr}
</svg>`;
    }
    /**
     * Converte path para elemento SVG
     */
    pathToSVG(path) {
        const d = path.commands.map(cmd => {
            switch (cmd.type) {
                case 'M':
                    return `M ${cmd.points[0].x} ${cmd.points[0].y}`;
                case 'L':
                    return `L ${cmd.points[0].x} ${cmd.points[0].y}`;
                case 'C':
                    return `C ${cmd.points.map(p => `${p.x} ${p.y}`).join(' ')}`;
                case 'Q':
                    return `Q ${cmd.points.map(p => `${p.x} ${p.y}`).join(' ')}`;
                case 'Z':
                    return 'Z';
                default:
                    return '';
            }
        }).join(' ');
        const fill = typeof path.fill === 'object'
            ? `rgb(${path.fill.r},${path.fill.g},${path.fill.b})`
            : path.fill || 'none';
        const stroke = typeof path.stroke === 'object'
            ? `rgb(${path.stroke.r},${path.stroke.g},${path.stroke.b})`
            : path.stroke || 'none';
        return `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${path.strokeWidth || 0}"/>`;
    }
    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================
    generateId() {
        return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.VectorProcessingEngine = VectorProcessingEngine;
exports.VectorProcessingEngine = VectorProcessingEngine = __decorate([
    (0, inversify_1.injectable)()
], VectorProcessingEngine);
