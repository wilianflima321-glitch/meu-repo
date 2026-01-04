/**
 * VECTOR PROCESSING ENGINE - Motor de Processamento Vetorial
 *
 * Sistema avançado para processamento vetorial incluindo:
 * - Conversão raster para vetor (vectorização)
 * - Otimização de paths vetoriais
 * - Interpolação vetorial para animação
 * - Morphing entre shapes
 * - Simplificação e suavização de curvas
 * - Análise e correção de geometria
 * - Embeddings vetoriais para AI
 */
/**
 * Ponto 2D/3D
 */
export interface Point {
    x: number;
    y: number;
    z?: number;
}
/**
 * Cor RGBA
 */
export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}
/**
 * Comando de path SVG
 */
export type PathCommandType = 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z';
export interface PathCommand {
    type: PathCommandType;
    points: Point[];
    absolute: boolean;
}
/**
 * Path vetorial completo
 */
export interface VectorPath {
    id: string;
    commands: PathCommand[];
    closed: boolean;
    fill?: Color | string;
    stroke?: Color | string;
    strokeWidth?: number;
    opacity?: number;
    transform?: Transform2D;
}
/**
 * Transformação 2D (matrix)
 */
export interface Transform2D {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
/**
 * Gradiente
 */
export interface Gradient {
    id: string;
    type: 'linear' | 'radial';
    stops: Array<{
        offset: number;
        color: Color;
    }>;
    angle?: number;
    cx?: number;
    cy?: number;
    r?: number;
}
/**
 * Shape vetorial (grupo de paths)
 */
export interface VectorShape {
    id: string;
    name: string;
    paths: VectorPath[];
    gradients?: Gradient[];
    boundingBox: BoundingBox2D;
    centroid: Point;
    metadata: Record<string, unknown>;
}
/**
 * Bounding box 2D
 */
export interface BoundingBox2D {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Imagem raster para vectorização
 */
export interface RasterImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    format: 'rgba' | 'rgb' | 'grayscale';
}
/**
 * Configuração de vectorização
 */
export interface VectorizationConfig {
    colorMode: 'color' | 'grayscale' | 'monochrome';
    colorCount: number;
    threshold: number;
    smoothing: number;
    simplifyTolerance: number;
    cornerThreshold: number;
    pathOptimization: boolean;
    removeBackground: boolean;
    backgroundColor?: Color;
    minPathLength: number;
    detectShapes: boolean;
}
/**
 * Resultado de vectorização
 */
export interface VectorizationResult {
    shapes: VectorShape[];
    colors: Color[];
    gradients: Gradient[];
    detectedShapes: DetectedGeometry[];
    statistics: {
        totalPaths: number;
        totalPoints: number;
        colorsUsed: number;
        processingTime: number;
        compressionRatio: number;
    };
    svgOutput: string;
}
/**
 * Geometria detectada
 */
export interface DetectedGeometry {
    type: 'circle' | 'ellipse' | 'rectangle' | 'polygon' | 'line' | 'arc';
    confidence: number;
    parameters: Record<string, number>;
    originalPath: string;
}
/**
 * Configuração de morphing
 */
export interface MorphConfig {
    steps: number;
    easing: EasingType;
    preserveCorners: boolean;
    matchingStrategy: 'nearest' | 'angular' | 'area';
}
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounceIn' | 'bounceOut' | 'elastic';
/**
 * Resultado de morphing
 */
export interface MorphResult {
    frames: VectorShape[];
    duration: number;
    keyframes: number[];
}
/**
 * Embedding vetorial (para AI)
 */
export interface VectorEmbedding {
    id: string;
    sourceId: string;
    dimensions: number;
    values: Float32Array;
    metadata: {
        shapeType: string;
        complexity: number;
        colorCount: number;
    };
}
export declare class VectorProcessingEngine {
    private readonly DEFAULT_CONFIG;
    /**
     * Converte imagem raster para vetor
     */
    vectorize(image: RasterImage, config?: Partial<VectorizationConfig>): Promise<VectorizationResult>;
    /**
     * Extrai paleta de cores dominantes
     */
    private extractColors;
    /**
     * K-means para clustering de cores
     */
    private kMeansColors;
    /**
     * Distância entre duas cores (Euclidiana no espaço RGB)
     */
    private colorDistance;
    /**
     * Quantiza imagem para paleta de cores
     */
    private quantizeImage;
    /**
     * Detecta contornos para cada cor
     */
    private detectContours;
    /**
     * Algoritmo Marching Squares para detecção de contornos
     */
    private marchingSquares;
    /**
     * Traça um contorno a partir de um ponto inicial
     */
    private traceContour;
    /**
     * Converte contornos para paths vetoriais
     */
    private contoursToPath;
    /**
     * Suaviza contorno usando média móvel
     */
    private smoothContour;
    /**
     * Simplifica path usando algoritmo Ramer-Douglas-Peucker
     */
    simplifyPath(points: Point[], tolerance: number): Point[];
    /**
     * Distância de ponto a linha
     */
    private pointToLineDistance;
    /**
     * Converte pontos para comandos de path
     */
    private pointsToCommands;
    /**
     * Detecta cantos em sequência de pontos
     */
    private detectCorners;
    /**
     * Ângulo entre três pontos
     */
    private angleBetweenPoints;
    /**
     * Ajusta curva Bezier cúbica a pontos
     */
    private fitBezier;
    /**
     * Otimiza paths (remove redundâncias, mescla similares)
     */
    private optimizePaths;
    /**
     * Calcula bounding box de um path
     */
    private calculateBoundingBox;
    /**
     * Agrupa paths em shapes
     */
    private groupPaths;
    /**
     * Calcula centróide de um path
     */
    private calculateCentroid;
    /**
     * Detecta geometrias conhecidas em shapes
     */
    private detectGeometries;
    /**
     * Detecta se path é um círculo
     */
    private detectCircle;
    /**
     * Detecta se path é um retângulo
     */
    private detectRectangle;
    /**
     * Detecta polígono regular
     */
    private detectPolygon;
    /**
     * Extrai pontos de canto de um path
     */
    private extractCornerPoints;
    /**
     * Cria morphing entre dois shapes
     */
    morph(shapeA: VectorShape, shapeB: VectorShape, config?: Partial<MorphConfig>): Promise<MorphResult>;
    /**
     * Normaliza número de pontos entre dois shapes
     */
    private normalizePointCount;
    /**
     * Subdivide pontos inserindo pontos intermediários
     */
    private subdividePoints;
    /**
     * Corresponde pontos entre dois conjuntos
     */
    private matchPoints;
    /**
     * Interpola entre dois conjuntos de pontos
     */
    private interpolatePoints;
    /**
     * Converte pontos de volta para shape
     */
    private pointsToShape;
    /**
     * Aplica função de easing
     */
    private applyEasing;
    /**
     * Gera embedding vetorial de um shape para uso em AI
     */
    generateEmbedding(shape: VectorShape, dimensions?: number): VectorEmbedding;
    /**
     * Calcula similaridade entre dois embeddings
     */
    embeddingSimilarity(a: VectorEmbedding, b: VectorEmbedding): number;
    /**
     * Classifica tipo de shape
     */
    private classifyShapeType;
    /**
     * Gera string SVG a partir de shapes
     */
    generateSVG(shapes: VectorShape[], width: number, height: number): string;
    /**
     * Converte path para elemento SVG
     */
    private pathToSVG;
    private generateId;
}
