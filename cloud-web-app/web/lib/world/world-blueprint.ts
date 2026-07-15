/**
 * world-blueprint.ts  — Sprint V33
 *
 * Shared types for the Long-Horizon World Orchestrator.
 * A WorldBlueprint is the structured plan computed before any asset generation
 * begins — analogous to an architect's schematic before construction.
 */

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export interface GeographyRegion {
  id: string;
  name: string;
  type: 'continent' | 'island' | 'mountain_range' | 'ocean' | 'desert' | 'forest' | 'tundra';
  /** 2D boundary polygon in world coordinates [x, z][] */
  boundary: [number, number][];
  /** Elevation min/max in metres */
  elevationRange: [number, number];
  /** Primary biome ID (links to BiomeDefinition in WorldMemoryBank) */
  primaryBiome: string;
  subRegions: string[];
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export type FactionAlignment = 'lawful_good' | 'neutral' | 'chaotic_evil' | 'corporate' | 'tribal' | string;

export interface Faction {
  id: string;
  name: string;
  alignment: FactionAlignment;
  controlledRegions: string[];
  allies: string[];
  enemies: string[];
  /** Lore summary — stored in WorldMemoryBank NarrativeStateRecord */
  loreSummary: string;
  /** Technology tier 1..5 (influences available props/assets) */
  techTier: number;
  populationDensity: 'sparse' | 'moderate' | 'dense' | 'megacity';
}

// ---------------------------------------------------------------------------
// Quest Graph
// ---------------------------------------------------------------------------

export type QuestPhase = 'setup' | 'rising_action' | 'climax' | 'resolution';

export interface QuestNode {
  id: string;
  title: string;
  phase: QuestPhase;
  description: string;
  requiredFaction?: string;
  requiredRegion?: string;
  /** IDs of quests that must be completed before this one becomes available */
  prerequisites: string[];
  /** IDs of quests unlocked on completion */
  unlocks: string[];
  /** Asset/character generation hooks triggered at this quest node */
  assetHooks: string[];
}

export interface QuestGraph {
  worldId: string;
  quests: QuestNode[];
  mainQuestId: string;
}

// ---------------------------------------------------------------------------
// World Blueprint
// ---------------------------------------------------------------------------

export interface WorldBlueprint {
  id: string;
  worldName: string;
  theme: string;
  /** Orchestrator-generated narrative seed sentence */
  narrativeSeed: string;
  /** ISO 8601 timestamp when this blueprint was generated */
  generatedAt: string;
  geography: {
    worldRadius: number; // metres
    regions: GeographyRegion[];
  };
  factions: Faction[];
  questGraph: QuestGraph;
  /** Ordered list of asset-generation tasks the orchestrator will dispatch */
  generationQueue: GenerationTask[];
  /** Estimated total generation time in seconds */
  estimatedBuildTimeSec: number;
}

export interface GenerationTask {
  id: string;
  type: 'terrain' | 'biome_populate' | 'building' | 'character' | 'prop' | 'audio';
  regionId: string;
  prompt: string;
  priority: number;
  dependsOn: string[];
  status: 'queued' | 'running' | 'done' | 'failed';
}
