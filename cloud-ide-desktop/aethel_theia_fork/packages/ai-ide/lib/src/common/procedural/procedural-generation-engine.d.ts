import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL PROCEDURAL GENERATION ENGINE
 * ============================================================================
 *
 * Sistema completo de geração procedural AAA:
 * - Terrain generation (heightmaps, erosion, biomes)
 * - Vegetation placement (forests, grass, flowers)
 * - Building/dungeon generation
 * - Road/river networks
 * - City generation
 * - Cave systems
 * - Asset variation (textures, meshes)
 * - Weather patterns
 * - AI-assisted generation (LLM prompts)
 */
export declare class NoiseGenerator {
    private permutation;
    private p;
    constructor(seed?: number);
    setSeed(seed: number): void;
    private fade;
    private lerp;
    private grad;
    perlin3D(x: number, y: number, z: number): number;
    fbm(x: number, y: number, z: number, octaves: number, persistence?: number, lacunarity?: number): number;
    ridgedNoise(x: number, y: number, z: number, octaves: number): number;
    voronoi2D(x: number, y: number): {
        distance: number;
        cellValue: number;
    };
    private hash2D;
}
export interface TerrainConfig {
    width: number;
    height: number;
    resolution: number;
    /** Noise settings */
    noiseScale: number;
    noiseOctaves: number;
    noisePersistence: number;
    noiseLacunarity: number;
    /** Height range */
    minHeight: number;
    maxHeight: number;
    /** Erosion */
    erosionIterations: number;
    erosionStrength: number;
    /** Biomes */
    biomes: BiomeConfig[];
    /** Seed */
    seed: number;
}
export interface BiomeConfig {
    name: string;
    minHeight: number;
    maxHeight: number;
    minMoisture: number;
    maxMoisture: number;
    minTemperature: number;
    maxTemperature: number;
    /** Textures */
    diffuseTexture: string;
    normalTexture: string;
    /** Vegetation */
    vegetationDensity: number;
    vegetationTypes: string[];
}
export interface TerrainData {
    heightmap: Float32Array;
    normalmap: Float32Array;
    moistureMap: Float32Array;
    temperatureMap: Float32Array;
    biomeMap: Uint8Array;
    width: number;
    height: number;
    resolution: number;
}
export declare class TerrainGenerator {
    private noise;
    constructor();
    generate(config: TerrainConfig): TerrainData;
    private generateBaseHeightmap;
    private applyHydraulicErosion;
    private generateMoistureMap;
    private generateTemperatureMap;
    private assignBiomes;
    private generateNormals;
}
export interface VegetationConfig {
    type: string;
    meshId: string;
    /** Placement rules */
    minSlope: number;
    maxSlope: number;
    minHeight: number;
    maxHeight: number;
    biomes: string[];
    /** Density */
    density: number;
    /** Variation */
    scaleMin: number;
    scaleMax: number;
    randomRotation: boolean;
    /** LOD distances */
    lodDistances: number[];
}
export interface VegetationInstance {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: number;
    scale: number;
    type: string;
}
export declare class VegetationGenerator {
    private noise;
    constructor();
    generate(terrain: TerrainData, biomes: BiomeConfig[], vegetationConfigs: VegetationConfig[], seed: number): VegetationInstance[];
}
export interface DungeonConfig {
    width: number;
    height: number;
    /** Room settings */
    minRoomSize: number;
    maxRoomSize: number;
    maxRooms: number;
    /** Corridor settings */
    corridorWidth: number;
    /** Special rooms */
    entranceCount: number;
    bossRoomCount: number;
    treasureRoomCount: number;
    /** Seed */
    seed: number;
}
export interface DungeonRoom {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'normal' | 'entrance' | 'boss' | 'treasure';
    connectedTo: number[];
}
export interface DungeonData {
    rooms: DungeonRoom[];
    corridors: {
        from: number;
        to: number;
        path: {
            x: number;
            y: number;
        }[];
    }[];
    grid: Uint8Array;
    width: number;
    height: number;
}
export declare class DungeonGenerator {
    generate(config: DungeonConfig): DungeonData;
    private generateRoomsBSP;
    private carveRoom;
    private generateCorridors;
    private roomDistance;
    private carveCorridor;
    private assignRoomTypes;
}
export interface RoadNetworkConfig {
    width: number;
    height: number;
    /** Main roads */
    mainRoadCount: number;
    mainRoadWidth: number;
    /** Secondary roads */
    secondaryRoadDensity: number;
    secondaryRoadWidth: number;
    /** Terrain following */
    maxSlope: number;
    /** Seed */
    seed: number;
}
export interface RoadSegment {
    start: {
        x: number;
        y: number;
    };
    end: {
        x: number;
        y: number;
    };
    width: number;
    type: 'main' | 'secondary' | 'path';
}
export declare class RoadNetworkGenerator {
    generate(config: RoadNetworkConfig, heightmap: Float32Array): RoadSegment[];
    private generateMainRoad;
    private generateSecondaryRoad;
}
export interface AIGenerationRequest {
    type: 'terrain' | 'dungeon' | 'city' | 'character' | 'item';
    prompt: string;
    style?: string;
    constraints?: Record<string, unknown>;
}
export declare class AIProceduralGenerator {
    private llmEndpoint;
    generate(request: AIGenerationRequest): Promise<unknown>;
    private buildSystemPrompt;
    private buildUserPrompt;
    private callLLM;
    private parseGenerationResult;
}
export declare class ProceduralGenerationEngine {
    private terrainGenerator;
    private vegetationGenerator;
    private dungeonGenerator;
    private roadGenerator;
    private aiGenerator;
    constructor(terrainGenerator?: TerrainGenerator, vegetationGenerator?: VegetationGenerator, dungeonGenerator?: DungeonGenerator, roadGenerator?: RoadNetworkGenerator, aiGenerator?: AIProceduralGenerator);
    private readonly onGenerationCompleteEmitter;
    readonly onGenerationComplete: Event<{
        type: string;
        data: unknown;
    }>;
    generateTerrain(config: TerrainConfig): Promise<TerrainData>;
    generateVegetation(terrain: TerrainData, biomes: BiomeConfig[], configs: VegetationConfig[], seed: number): Promise<VegetationInstance[]>;
    generateDungeon(config: DungeonConfig): Promise<DungeonData>;
    generateRoadNetwork(config: RoadNetworkConfig, heightmap: Float32Array): Promise<RoadSegment[]>;
    generateWithAI(request: AIGenerationRequest): Promise<unknown>;
    getStatistics(): ProceduralStats;
}
export interface ProceduralStats {
    terrainGenerator: boolean;
    vegetationGenerator: boolean;
    dungeonGenerator: boolean;
    roadGenerator: boolean;
    aiGenerator: boolean;
}
