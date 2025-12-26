import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

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

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

export class NoiseGenerator {
    private permutation: Uint8Array;
    private p: Uint8Array;
    
    constructor(seed: number = 0) {
        this.permutation = new Uint8Array(256);
        this.p = new Uint8Array(512);
        this.setSeed(seed);
    }
    
    setSeed(seed: number): void {
        // Initialize permutation table
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        
        // Shuffle using seed
        let n = seed;
        for (let i = 255; i > 0; i--) {
            n = (n * 1103515245 + 12345) >>> 0;
            const j = n % (i + 1);
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        // Duplicate for overflow
        for (let i = 0; i < 512; i++) {
            this.p[i] = this.permutation[i & 255];
        }
    }
    
    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }
    
    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    perlin3D(x: number, y: number, z: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        return this.lerp(w,
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
            ),
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
            )
        );
    }
    
    fbm(x: number, y: number, z: number, octaves: number, persistence: number = 0.5, lacunarity: number = 2.0): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.perlin3D(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return total / maxValue;
    }
    
    ridgedNoise(x: number, y: number, z: number, octaves: number): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let prev = 1;
        
        for (let i = 0; i < octaves; i++) {
            const n = Math.abs(this.perlin3D(x * frequency, y * frequency, z * frequency));
            const value = (1 - n) * (1 - n) * prev;
            total += value * amplitude;
            prev = n;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return total;
    }
    
    voronoi2D(x: number, y: number): { distance: number; cellValue: number } {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        let minDist = Infinity;
        let cellValue = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = xi + dx;
                const cy = yi + dy;
                
                // Random point in cell
                const hash = this.hash2D(cx, cy);
                const px = cx + (hash & 255) / 255;
                const py = cy + ((hash >> 8) & 255) / 255;
                
                const dist = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
                
                if (dist < minDist) {
                    minDist = dist;
                    cellValue = hash / 65535;
                }
            }
        }
        
        return { distance: minDist, cellValue };
    }
    
    private hash2D(x: number, y: number): number {
        let h = x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return h ^ (h >> 16);
    }
}

// ============================================================================
// TERRAIN GENERATION
// ============================================================================

export interface TerrainConfig {
    width: number;
    height: number;
    resolution: number; // vertices per unit
    
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

@injectable()
export class TerrainGenerator {
    private noise: NoiseGenerator;
    
    constructor() {
        this.noise = new NoiseGenerator();
    }
    
    generate(config: TerrainConfig): TerrainData {
        this.noise.setSeed(config.seed);
        
        const size = config.width * config.resolution * config.height * config.resolution;
        const w = config.width * config.resolution;
        const h = config.height * config.resolution;
        
        // Generate base heightmap
        const heightmap = new Float32Array(size);
        this.generateBaseHeightmap(heightmap, w, h, config);
        
        // Apply erosion
        if (config.erosionIterations > 0) {
            this.applyHydraulicErosion(heightmap, w, h, config.erosionIterations, config.erosionStrength);
        }
        
        // Generate moisture and temperature
        const moistureMap = this.generateMoistureMap(w, h, config.seed);
        const temperatureMap = this.generateTemperatureMap(heightmap, w, h);
        
        // Determine biomes
        const biomeMap = this.assignBiomes(heightmap, moistureMap, temperatureMap, w, h, config.biomes);
        
        // Generate normals
        const normalmap = this.generateNormals(heightmap, w, h);
        
        return {
            heightmap,
            normalmap,
            moistureMap,
            temperatureMap,
            biomeMap,
            width: w,
            height: h,
            resolution: config.resolution,
        };
    }
    
    private generateBaseHeightmap(
        heightmap: Float32Array,
        width: number,
        height: number,
        config: TerrainConfig
    ): void {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = x / width * config.noiseScale;
                const ny = y / height * config.noiseScale;
                
                // Base continental noise
                let h = this.noise.fbm(nx, ny, 0, config.noiseOctaves, config.noisePersistence, config.noiseLacunarity);
                
                // Add ridged noise for mountains
                const ridged = this.noise.ridgedNoise(nx * 2, ny * 2, 0, 4) * 0.5;
                h = h * 0.7 + ridged * 0.3;
                
                // Normalize to height range
                h = (h + 1) / 2; // 0-1
                h = config.minHeight + h * (config.maxHeight - config.minHeight);
                
                heightmap[y * width + x] = h;
            }
        }
    }
    
    private applyHydraulicErosion(
        heightmap: Float32Array,
        width: number,
        height: number,
        iterations: number,
        strength: number
    ): void {
        const inertia = 0.05;
        const capacity = 4;
        const deposition = 0.3;
        const erosion = 0.3;
        const evaporation = 0.01;
        const minSlope = 0.01;
        const maxDropletLifetime = 30;
        
        for (let i = 0; i < iterations; i++) {
            // Random starting position
            let posX = Math.random() * (width - 1);
            let posY = Math.random() * (height - 1);
            let dirX = 0;
            let dirY = 0;
            let speed = 1;
            let water = 1;
            let sediment = 0;
            
            for (let lifetime = 0; lifetime < maxDropletLifetime; lifetime++) {
                const cellX = Math.floor(posX);
                const cellY = Math.floor(posY);
                const cellOffsetX = posX - cellX;
                const cellOffsetY = posY - cellY;
                
                // Calculate height and gradient
                const heightNW = heightmap[cellY * width + cellX];
                const heightNE = heightmap[cellY * width + cellX + 1];
                const heightSW = heightmap[(cellY + 1) * width + cellX];
                const heightSE = heightmap[(cellY + 1) * width + cellX + 1];
                
                const gradX = (heightNE - heightNW) * (1 - cellOffsetY) + (heightSE - heightSW) * cellOffsetY;
                const gradY = (heightSW - heightNW) * (1 - cellOffsetX) + (heightSE - heightNE) * cellOffsetX;
                
                // Update direction with inertia
                dirX = dirX * inertia - gradX * (1 - inertia);
                dirY = dirY * inertia - gradY * (1 - inertia);
                
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                if (len !== 0) {
                    dirX /= len;
                    dirY /= len;
                }
                
                // Move droplet
                posX += dirX;
                posY += dirY;
                
                // Check bounds
                if (posX < 0 || posX >= width - 1 || posY < 0 || posY >= height - 1) break;
                
                // Calculate height difference
                const newCellX = Math.floor(posX);
                const newCellY = Math.floor(posY);
                const newHeight = heightmap[newCellY * width + newCellX];
                const deltaHeight = newHeight - heightNW;
                
                // Calculate sediment capacity
                const sedimentCapacity = Math.max(-deltaHeight, minSlope) * speed * water * capacity;
                
                if (sediment > sedimentCapacity || deltaHeight > 0) {
                    // Deposit sediment
                    const amountToDeposit = deltaHeight > 0 
                        ? Math.min(deltaHeight, sediment) 
                        : (sediment - sedimentCapacity) * deposition;
                    
                    sediment -= amountToDeposit;
                    heightmap[cellY * width + cellX] += amountToDeposit * strength;
                } else {
                    // Erode terrain
                    const amountToErode = Math.min((sedimentCapacity - sediment) * erosion, -deltaHeight);
                    heightmap[cellY * width + cellX] -= amountToErode * strength;
                    sediment += amountToErode;
                }
                
                // Update speed and water
                speed = Math.sqrt(speed * speed + deltaHeight);
                water *= (1 - evaporation);
            }
        }
    }
    
    private generateMoistureMap(width: number, height: number, seed: number): Float32Array {
        const map = new Float32Array(width * height);
        const moistureNoise = new NoiseGenerator(seed + 1000);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = x / width * 4;
                const ny = y / height * 4;
                
                let moisture = moistureNoise.fbm(nx, ny, 0, 4, 0.5, 2);
                moisture = (moisture + 1) / 2; // 0-1
                
                map[y * width + x] = moisture;
            }
        }
        
        return map;
    }
    
    private generateTemperatureMap(heightmap: Float32Array, width: number, height: number): Float32Array {
        const map = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Base temperature from latitude (y position)
                let temp = 1 - Math.abs((y / height) - 0.5) * 2;
                
                // Reduce temperature at higher altitudes
                const h = heightmap[y * width + x];
                temp -= h * 0.01; // Lapse rate
                
                map[y * width + x] = Math.max(0, Math.min(1, temp));
            }
        }
        
        return map;
    }
    
    private assignBiomes(
        heightmap: Float32Array,
        moistureMap: Float32Array,
        temperatureMap: Float32Array,
        width: number,
        height: number,
        biomes: BiomeConfig[]
    ): Uint8Array {
        const map = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const h = heightmap[idx];
                const moisture = moistureMap[idx];
                const temp = temperatureMap[idx];
                
                // Find matching biome
                let biomeIndex = 0;
                for (let i = 0; i < biomes.length; i++) {
                    const biome = biomes[i];
                    if (h >= biome.minHeight && h <= biome.maxHeight &&
                        moisture >= biome.minMoisture && moisture <= biome.maxMoisture &&
                        temp >= biome.minTemperature && temp <= biome.maxTemperature) {
                        biomeIndex = i;
                        break;
                    }
                }
                
                map[idx] = biomeIndex;
            }
        }
        
        return map;
    }
    
    private generateNormals(heightmap: Float32Array, width: number, height: number): Float32Array {
        const normals = new Float32Array(width * height * 3);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 3;
                
                // Get neighboring heights
                const left = x > 0 ? heightmap[y * width + x - 1] : heightmap[y * width + x];
                const right = x < width - 1 ? heightmap[y * width + x + 1] : heightmap[y * width + x];
                const down = y > 0 ? heightmap[(y - 1) * width + x] : heightmap[y * width + x];
                const up = y < height - 1 ? heightmap[(y + 1) * width + x] : heightmap[y * width + x];
                
                // Calculate normal
                const nx = left - right;
                const ny = 2;
                const nz = down - up;
                
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                normals[idx] = nx / len;
                normals[idx + 1] = ny / len;
                normals[idx + 2] = nz / len;
            }
        }
        
        return normals;
    }
}

// ============================================================================
// VEGETATION PLACEMENT
// ============================================================================

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
    density: number; // instances per unit area
    
    /** Variation */
    scaleMin: number;
    scaleMax: number;
    randomRotation: boolean;
    
    /** LOD distances */
    lodDistances: number[];
}

export interface VegetationInstance {
    position: { x: number; y: number; z: number };
    rotation: number;
    scale: number;
    type: string;
}

@injectable()
export class VegetationGenerator {
    private noise: NoiseGenerator;
    
    constructor() {
        this.noise = new NoiseGenerator();
    }
    
    generate(
        terrain: TerrainData,
        biomes: BiomeConfig[],
        vegetationConfigs: VegetationConfig[],
        seed: number
    ): VegetationInstance[] {
        this.noise.setSeed(seed);
        const instances: VegetationInstance[] = [];
        
        for (const config of vegetationConfigs) {
            // Calculate number of instances
            const totalArea = terrain.width * terrain.height / (terrain.resolution * terrain.resolution);
            const instanceCount = Math.floor(totalArea * config.density);
            
            for (let i = 0; i < instanceCount; i++) {
                // Random position
                const x = Math.random() * terrain.width;
                const z = Math.random() * terrain.height;
                
                // Get terrain info at this position
                const idx = Math.floor(z) * terrain.width + Math.floor(x);
                const height = terrain.heightmap[idx];
                const biomeIndex = terrain.biomeMap[idx];
                const biomeName = biomes[biomeIndex]?.name || '';
                
                // Calculate slope from normals
                const nx = terrain.normalmap[idx * 3];
                const ny = terrain.normalmap[idx * 3 + 1];
                const slope = Math.acos(ny) * 180 / Math.PI;
                
                // Check placement rules
                if (height < config.minHeight || height > config.maxHeight) continue;
                if (slope < config.minSlope || slope > config.maxSlope) continue;
                if (config.biomes.length > 0 && !config.biomes.includes(biomeName)) continue;
                
                // Additional noise-based variation
                const noiseValue = this.noise.perlin3D(x * 0.1, z * 0.1, seed);
                if (noiseValue < 0) continue;
                
                // Create instance
                instances.push({
                    position: { x, y: height, z },
                    rotation: config.randomRotation ? Math.random() * Math.PI * 2 : 0,
                    scale: config.scaleMin + Math.random() * (config.scaleMax - config.scaleMin),
                    type: config.type,
                });
            }
        }
        
        return instances;
    }
}

// ============================================================================
// DUNGEON/BUILDING GENERATION
// ============================================================================

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
    corridors: { from: number; to: number; path: { x: number; y: number }[] }[];
    grid: Uint8Array; // 0 = wall, 1 = floor, 2 = door
    width: number;
    height: number;
}

@injectable()
export class DungeonGenerator {
    generate(config: DungeonConfig): DungeonData {
        const grid = new Uint8Array(config.width * config.height);
        const rooms: DungeonRoom[] = [];
        
        // Generate rooms using BSP
        this.generateRoomsBSP(rooms, config);
        
        // Carve rooms into grid
        for (const room of rooms) {
            this.carveRoom(grid, config.width, room);
        }
        
        // Generate corridors
        const corridors = this.generateCorridors(rooms, grid, config);
        
        // Assign special room types
        this.assignRoomTypes(rooms, config);
        
        return {
            rooms,
            corridors,
            grid,
            width: config.width,
            height: config.height,
        };
    }
    
    private generateRoomsBSP(rooms: DungeonRoom[], config: DungeonConfig): void {
        interface BSPNode {
            x: number;
            y: number;
            width: number;
            height: number;
            left?: BSPNode;
            right?: BSPNode;
            room?: DungeonRoom;
        }
        
        const root: BSPNode = {
            x: 1,
            y: 1,
            width: config.width - 2,
            height: config.height - 2,
        };
        
        const split = (node: BSPNode, depth: number): void => {
            if (depth >= 6 || rooms.length >= config.maxRooms) return;
            
            const canSplitH = node.width >= config.minRoomSize * 2 + 4;
            const canSplitV = node.height >= config.minRoomSize * 2 + 4;
            
            if (!canSplitH && !canSplitV) {
                // Create room
                const roomWidth = Math.min(
                    config.maxRoomSize,
                    Math.max(config.minRoomSize, Math.floor(Math.random() * (node.width - 2)) + config.minRoomSize)
                );
                const roomHeight = Math.min(
                    config.maxRoomSize,
                    Math.max(config.minRoomSize, Math.floor(Math.random() * (node.height - 2)) + config.minRoomSize)
                );
                
                const roomX = node.x + Math.floor(Math.random() * (node.width - roomWidth));
                const roomY = node.y + Math.floor(Math.random() * (node.height - roomHeight));
                
                node.room = {
                    id: rooms.length,
                    x: roomX,
                    y: roomY,
                    width: roomWidth,
                    height: roomHeight,
                    type: 'normal',
                    connectedTo: [],
                };
                rooms.push(node.room);
                return;
            }
            
            const splitH = canSplitH && (!canSplitV || Math.random() > 0.5);
            
            if (splitH) {
                const splitX = node.x + Math.floor(node.width * (0.4 + Math.random() * 0.2));
                node.left = { x: node.x, y: node.y, width: splitX - node.x, height: node.height };
                node.right = { x: splitX, y: node.y, width: node.x + node.width - splitX, height: node.height };
            } else {
                const splitY = node.y + Math.floor(node.height * (0.4 + Math.random() * 0.2));
                node.left = { x: node.x, y: node.y, width: node.width, height: splitY - node.y };
                node.right = { x: node.x, y: splitY, width: node.width, height: node.y + node.height - splitY };
            }
            
            split(node.left, depth + 1);
            split(node.right, depth + 1);
        };
        
        split(root, 0);
    }
    
    private carveRoom(grid: Uint8Array, gridWidth: number, room: DungeonRoom): void {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                grid[y * gridWidth + x] = 1; // floor
            }
        }
    }
    
    private generateCorridors(
        rooms: DungeonRoom[],
        grid: Uint8Array,
        config: DungeonConfig
    ): { from: number; to: number; path: { x: number; y: number }[] }[] {
        const corridors: { from: number; to: number; path: { x: number; y: number }[] }[] = [];
        
        // Connect rooms using minimum spanning tree approach
        const connected = new Set<number>([0]);
        const unconnected = new Set(rooms.map((_, i) => i).filter(i => i !== 0));
        
        while (unconnected.size > 0) {
            let minDist = Infinity;
            let bestFrom = -1;
            let bestTo = -1;
            
            for (const from of connected) {
                for (const to of unconnected) {
                    const dist = this.roomDistance(rooms[from], rooms[to]);
                    if (dist < minDist) {
                        minDist = dist;
                        bestFrom = from;
                        bestTo = to;
                    }
                }
            }
            
            if (bestFrom >= 0 && bestTo >= 0) {
                const path = this.carveCorridor(grid, config.width, rooms[bestFrom], rooms[bestTo], config.corridorWidth);
                corridors.push({ from: bestFrom, to: bestTo, path });
                
                rooms[bestFrom].connectedTo.push(bestTo);
                rooms[bestTo].connectedTo.push(bestFrom);
                
                connected.add(bestTo);
                unconnected.delete(bestTo);
            }
        }
        
        return corridors;
    }
    
    private roomDistance(a: DungeonRoom, b: DungeonRoom): number {
        const ax = a.x + a.width / 2;
        const ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
    }
    
    private carveCorridor(
        grid: Uint8Array,
        gridWidth: number,
        roomA: DungeonRoom,
        roomB: DungeonRoom,
        width: number
    ): { x: number; y: number }[] {
        const path: { x: number; y: number }[] = [];
        
        let x1 = Math.floor(roomA.x + roomA.width / 2);
        let y1 = Math.floor(roomA.y + roomA.height / 2);
        const x2 = Math.floor(roomB.x + roomB.width / 2);
        const y2 = Math.floor(roomB.y + roomB.height / 2);
        
        // L-shaped corridor
        while (x1 !== x2) {
            for (let w = 0; w < width; w++) {
                grid[y1 * gridWidth + x1 + w] = 1;
            }
            path.push({ x: x1, y: y1 });
            x1 += x1 < x2 ? 1 : -1;
        }
        
        while (y1 !== y2) {
            for (let w = 0; w < width; w++) {
                grid[(y1 + w) * gridWidth + x1] = 1;
            }
            path.push({ x: x1, y: y1 });
            y1 += y1 < y2 ? 1 : -1;
        }
        
        return path;
    }
    
    private assignRoomTypes(rooms: DungeonRoom[], config: DungeonConfig): void {
        // Find rooms farthest from center for boss rooms
        const center = {
            x: rooms.reduce((sum, r) => sum + r.x, 0) / rooms.length,
            y: rooms.reduce((sum, r) => sum + r.y, 0) / rooms.length,
        };
        
        const sorted = [...rooms].sort((a, b) => {
            const distA = Math.sqrt((a.x - center.x) ** 2 + (a.y - center.y) ** 2);
            const distB = Math.sqrt((b.x - center.x) ** 2 + (b.y - center.y) ** 2);
            return distB - distA;
        });
        
        // Assign types
        let bossCount = 0;
        let treasureCount = 0;
        let entranceCount = 0;
        
        for (const room of sorted) {
            if (bossCount < config.bossRoomCount) {
                room.type = 'boss';
                bossCount++;
            } else if (treasureCount < config.treasureRoomCount) {
                room.type = 'treasure';
                treasureCount++;
            } else if (entranceCount < config.entranceCount && room.connectedTo.length === 1) {
                room.type = 'entrance';
                entranceCount++;
            }
        }
    }
}

// ============================================================================
// ROAD NETWORK GENERATION
// ============================================================================

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
    start: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    type: 'main' | 'secondary' | 'path';
}

@injectable()
export class RoadNetworkGenerator {
    generate(config: RoadNetworkConfig, heightmap: Float32Array): RoadSegment[] {
        const roads: RoadSegment[] = [];
        
        // Generate main roads
        for (let i = 0; i < config.mainRoadCount; i++) {
            const road = this.generateMainRoad(config, heightmap, roads);
            if (road) roads.push(...road);
        }
        
        // Generate secondary roads connecting to main roads
        const secondaryCount = Math.floor(config.width * config.height * config.secondaryRoadDensity / 10000);
        for (let i = 0; i < secondaryCount; i++) {
            const road = this.generateSecondaryRoad(config, heightmap, roads);
            if (road) roads.push(road);
        }
        
        return roads;
    }
    
    private generateMainRoad(
        config: RoadNetworkConfig,
        heightmap: Float32Array,
        existingRoads: RoadSegment[]
    ): RoadSegment[] | null {
        // Start from edge
        const segments: RoadSegment[] = [];
        
        let x = Math.random() < 0.5 ? 0 : config.width;
        let y = Math.random() * config.height;
        
        const targetX = x === 0 ? config.width : 0;
        const targetY = Math.random() * config.height;
        
        while (Math.abs(x - targetX) > 10 || Math.abs(y - targetY) > 10) {
            const dirX = targetX - x;
            const dirY = targetY - y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            
            const stepX = (dirX / len) * 20 + (Math.random() - 0.5) * 10;
            const stepY = (dirY / len) * 20 + (Math.random() - 0.5) * 10;
            
            const newX = Math.max(0, Math.min(config.width, x + stepX));
            const newY = Math.max(0, Math.min(config.height, y + stepY));
            
            segments.push({
                start: { x, y },
                end: { x: newX, y: newY },
                width: config.mainRoadWidth,
                type: 'main',
            });
            
            x = newX;
            y = newY;
        }
        
        return segments.length > 0 ? segments : null;
    }
    
    private generateSecondaryRoad(
        config: RoadNetworkConfig,
        heightmap: Float32Array,
        existingRoads: RoadSegment[]
    ): RoadSegment | null {
        if (existingRoads.length === 0) return null;
        
        // Connect two random main road points
        const roadA = existingRoads[Math.floor(Math.random() * existingRoads.length)];
        const roadB = existingRoads[Math.floor(Math.random() * existingRoads.length)];
        
        if (roadA === roadB) return null;
        
        return {
            start: { ...roadA.end },
            end: { ...roadB.start },
            width: config.secondaryRoadWidth,
            type: 'secondary',
        };
    }
}

// ============================================================================
// AI-ASSISTED PROCEDURAL GENERATION
// ============================================================================

export interface AIGenerationRequest {
    type: 'terrain' | 'dungeon' | 'city' | 'character' | 'item';
    prompt: string;
    style?: string;
    constraints?: Record<string, unknown>;
}

@injectable()
export class AIProceduralGenerator {
    private llmEndpoint = '/api/ai/llm';
    
    async generate(request: AIGenerationRequest): Promise<unknown> {
        const systemPrompt = this.buildSystemPrompt(request.type);
        const userPrompt = this.buildUserPrompt(request);
        
        const response = await this.callLLM(systemPrompt, userPrompt);
        
        return this.parseGenerationResult(request.type, response);
    }
    
    private buildSystemPrompt(type: string): string {
        switch (type) {
            case 'terrain':
                return `You are a terrain generation AI. Generate terrain configuration as JSON with fields: noiseScale, octaves, minHeight, maxHeight, biomes (array of biome objects).`;
            case 'dungeon':
                return `You are a dungeon design AI. Generate dungeon configuration as JSON with fields: theme, roomCount, corridorStyle, specialRooms, traps, treasures.`;
            case 'city':
                return `You are an urban planning AI. Generate city layout as JSON with fields: districts, roads, buildings, landmarks, population.`;
            default:
                return `You are a procedural generation AI. Generate configuration as JSON.`;
        }
    }
    
    private buildUserPrompt(request: AIGenerationRequest): string {
        let prompt = request.prompt;
        if (request.style) {
            prompt += `\nStyle: ${request.style}`;
        }
        if (request.constraints) {
            prompt += `\nConstraints: ${JSON.stringify(request.constraints)}`;
        }
        return prompt;
    }
    
    private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
        const response = await fetch(this.llmEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userPrompt }),
        });
        
        const data = await response.json();
        return data.response;
    }
    
    private parseGenerationResult(type: string, response: string): unknown {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Failed to parse AI generation result:', e);
        }
        return {};
    }
}

// ============================================================================
// MAIN PROCEDURAL ENGINE
// ============================================================================

@injectable()
export class ProceduralGenerationEngine {
    constructor(
        private terrainGenerator: TerrainGenerator = new TerrainGenerator(),
        private vegetationGenerator: VegetationGenerator = new VegetationGenerator(),
        private dungeonGenerator: DungeonGenerator = new DungeonGenerator(),
        private roadGenerator: RoadNetworkGenerator = new RoadNetworkGenerator(),
        private aiGenerator: AIProceduralGenerator = new AIProceduralGenerator(),
    ) {}
    
    private readonly onGenerationCompleteEmitter = new Emitter<{ type: string; data: unknown }>();
    readonly onGenerationComplete = this.onGenerationCompleteEmitter.event;
    
    async generateTerrain(config: TerrainConfig): Promise<TerrainData> {
        const terrain = this.terrainGenerator.generate(config);
        this.onGenerationCompleteEmitter.fire({ type: 'terrain', data: terrain });
        return terrain;
    }
    
    async generateVegetation(
        terrain: TerrainData,
        biomes: BiomeConfig[],
        configs: VegetationConfig[],
        seed: number
    ): Promise<VegetationInstance[]> {
        const vegetation = this.vegetationGenerator.generate(terrain, biomes, configs, seed);
        this.onGenerationCompleteEmitter.fire({ type: 'vegetation', data: vegetation });
        return vegetation;
    }
    
    async generateDungeon(config: DungeonConfig): Promise<DungeonData> {
        const dungeon = this.dungeonGenerator.generate(config);
        this.onGenerationCompleteEmitter.fire({ type: 'dungeon', data: dungeon });
        return dungeon;
    }
    
    async generateRoadNetwork(config: RoadNetworkConfig, heightmap: Float32Array): Promise<RoadSegment[]> {
        const roads = this.roadGenerator.generate(config, heightmap);
        this.onGenerationCompleteEmitter.fire({ type: 'roads', data: roads });
        return roads;
    }
    
    async generateWithAI(request: AIGenerationRequest): Promise<unknown> {
        const result = await this.aiGenerator.generate(request);
        this.onGenerationCompleteEmitter.fire({ type: `ai_${request.type}`, data: result });
        return result;
    }
    
    getStatistics(): ProceduralStats {
        return {
            terrainGenerator: true,
            vegetationGenerator: true,
            dungeonGenerator: true,
            roadGenerator: true,
            aiGenerator: true,
        };
    }
}

export interface ProceduralStats {
    terrainGenerator: boolean;
    vegetationGenerator: boolean;
    dungeonGenerator: boolean;
    roadGenerator: boolean;
    aiGenerator: boolean;
}
