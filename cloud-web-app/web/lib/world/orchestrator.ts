/**
 * orchestrator.ts  — Sprint V33
 *
 * Long-Horizon World Orchestrator — the "director" of the Aethel Engine.
 *
 * Responsibilities:
 *   1. Accept a high-level world description prompt from the user
 *   2. Break it into a structured WorldBlueprint (geography → factions → quests)
 *   3. Build a dependency-ordered GenerationTask queue
 *   4. Dispatch tasks to the AI generation sub-systems in parallel, respecting
 *      budget limits and dependencies
 *   5. Persist progress to WorldMemoryBank and WorldRepository
 *   6. Emit events for UI reactivity (progress HUD, debug inspector)
 *
 * Multi-agent design:
 *   - GeographyAgent: plans biomes, elevation maps, coastlines
 *   - FactionAgent:   designs factions, territories, diplomacy
 *   - QuestAgent:     builds quest graph from faction conflicts + geography
 *   - AssetAgent:     converts blueprint nodes into GenerationTask queue items
 */

import type { WorldBlueprint, GenerationTask, GeographyRegion, Faction, QuestNode } from './world-blueprint';
import type { WorldMemoryBank } from '@/lib/memory/world-memory-bank';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('world-orchestrator');

// ---------------------------------------------------------------------------
// Orchestrator configuration
// ---------------------------------------------------------------------------

export interface OrchestratorConfig {
  /** Maximum tasks running concurrently */
  parallelism: number;
  /** World radius in metres */
  worldRadius: number;
  /** Target number of biome regions */
  regionCount: number;
  /** Target number of factions */
  factionCount: number;
  /** Token budget per AI agent call */
  tokenBudget: number;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  parallelism: 4,
  worldRadius: 10_000,
  regionCount: 8,
  factionCount: 4,
  tokenBudget: 2048,
};

// ---------------------------------------------------------------------------
// Orchestrator events
// ---------------------------------------------------------------------------

export type OrchestratorEventType =
  | 'blueprint_ready'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'world_ready';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  worldId: string;
  taskId?: string;
  progress?: number; // 0..1
  error?: string;
}

type OrchestratorListener = (event: OrchestratorEvent) => void;

// ---------------------------------------------------------------------------
// WorldOrchestrator
// ---------------------------------------------------------------------------

export class WorldOrchestrator {
  private listeners = new Set<OrchestratorListener>();
  private activeWorlds = new Map<string, WorldBlueprint>();
  private runningTasks = new Map<string, Promise<void>>();

  constructor(
    private config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG,
    private memoryBank?: WorldMemoryBank,
  ) {}

  on(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: OrchestratorEvent): void {
    for (const l of this.listeners) l(event);
  }

  // ── Entry point ────────────────────────────────────────────────────────────

  /**
   * Full pipeline: text prompt → WorldBlueprint → asset generation.
   * Returns the blueprint immediately; generation continues asynchronously.
   */
  async planWorld(prompt: string): Promise<WorldBlueprint> {
    const worldId = `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    log.info('Planning world', { worldId, prompt: prompt.slice(0, 80) });

    const blueprint = await this.generateBlueprint(worldId, prompt);
    this.activeWorlds.set(worldId, blueprint);
    this.emit({ type: 'blueprint_ready', worldId });

    // Start async generation pipeline (non-blocking)
    this.runGenerationQueue(blueprint).catch((err) => {
      log.error('Generation pipeline failed', { worldId, err });
    });

    return blueprint;
  }

  // ── Blueprint generation agents ────────────────────────────────────────────

  private async generateBlueprint(worldId: string, prompt: string): Promise<WorldBlueprint> {
    const theme = this.extractTheme(prompt);
    const regions = this.geographyAgent(prompt, worldId);
    const factions = this.factionAgent(prompt, regions);
    const questGraph = this.questAgent(worldId, factions, regions);
    const queue = this.assetAgent(regions, factions);

    const blueprint: WorldBlueprint = {
      id: worldId,
      worldName: this.extractWorldName(prompt),
      theme,
      narrativeSeed: `In the world of ${this.extractWorldName(prompt)}, ${theme.toLowerCase()} forces shape the destiny of its inhabitants.`,
      generatedAt: new Date().toISOString(),
      geography: { worldRadius: this.config.worldRadius, regions },
      factions,
      questGraph: { worldId, quests: questGraph, mainQuestId: questGraph[0]?.id ?? '' },
      generationQueue: queue,
      estimatedBuildTimeSec: queue.length * 3,
    };

    // Persist narrative state to WorldMemoryBank
    if (this.memoryBank) {
      await this.memoryBank.setNarrativeState('blueprint_summary', {
        worldId,
        narrativeSeed: blueprint.narrativeSeed,
      });
    }

    return blueprint;
  }

  private geographyAgent(prompt: string, worldId: string): GeographyRegion[] {
    const lower = prompt.toLowerCase();
    const biomes: Array<GeographyRegion['type']> = ['forest', 'mountain_range', 'desert', 'ocean'];
    if (lower.includes('arctic') || lower.includes('frozen')) biomes.unshift('tundra');
    if (lower.includes('island') || lower.includes('archipelago')) biomes.unshift('island');

    return Array.from({ length: Math.min(this.config.regionCount, biomes.length) }, (_, i) => {
      const angle = (i / this.config.regionCount) * Math.PI * 2;
      const r = this.config.worldRadius * 0.4;
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;
      const size = this.config.worldRadius * 0.2;
      return {
        id: `region-${worldId}-${i}`,
        name: `${biomes[i % biomes.length]}_${i}`,
        type: biomes[i % biomes.length],
        boundary: [
          [cx - size, cz - size], [cx + size, cz - size],
          [cx + size, cz + size], [cx - size, cz + size],
        ],
        elevationRange: biomes[i % biomes.length] === 'mountain_range' ? [1000, 4000] : [0, 500],
        primaryBiome: biomes[i % biomes.length],
        subRegions: [],
      };
    });
  }

  private factionAgent(prompt: string, regions: GeographyRegion[]): Faction[] {
    const themes = ['empire', 'rebel_guild', 'ancient_order', 'merchant_league'];
    const alignments: Faction['alignment'][] = ['lawful_good', 'neutral', 'chaotic_evil', 'corporate'];

    return Array.from({ length: this.config.factionCount }, (_, i) => ({
      id: `faction-${i}`,
      name: themes[i % themes.length],
      alignment: alignments[i % alignments.length],
      controlledRegions: [regions[i % regions.length]?.id ?? ''],
      allies: i > 0 ? [`faction-${i - 1}`] : [],
      enemies: i < this.config.factionCount - 1 ? [`faction-${i + 1}`] : [],
      loreSummary: `The ${themes[i % themes.length]} controls the ${regions[i % regions.length]?.name ?? 'unknown'} region.`,
      techTier: (i % 5) + 1,
      populationDensity: i === 0 ? 'megacity' : i === 1 ? 'dense' : 'moderate',
    }));
  }

  private questAgent(worldId: string, factions: Faction[], regions: GeographyRegion[]): QuestNode[] {
    return [
      {
        id: `quest-${worldId}-main`,
        title: 'The Awakening',
        phase: 'setup',
        description: `Uncover why the ${factions[0]?.name ?? 'empire'} has sealed the ${regions[0]?.name ?? 'northern'} border.`,
        requiredFaction: factions[0]?.id,
        requiredRegion: regions[0]?.id,
        prerequisites: [],
        unlocks: [`quest-${worldId}-act2`],
        assetHooks: ['generate-fortress', 'generate-rebel-camp'],
      },
      {
        id: `quest-${worldId}-act2`,
        title: 'Alliance of Shadows',
        phase: 'rising_action',
        description: `Broker peace between ${factions[1]?.name ?? 'the guild'} and ${factions[2]?.name ?? 'the order'}.`,
        requiredFaction: factions[1]?.id,
        prerequisites: [`quest-${worldId}-main`],
        unlocks: [`quest-${worldId}-climax`],
        assetHooks: ['generate-guild-hall', 'generate-temple'],
      },
      {
        id: `quest-${worldId}-climax`,
        title: 'The Final Reckoning',
        phase: 'climax',
        description: `Confront the ${factions[factions.length - 1]?.name ?? 'dark lord'} at the heart of their stronghold.`,
        requiredRegion: regions[regions.length - 1]?.id,
        prerequisites: [`quest-${worldId}-act2`],
        unlocks: [],
        assetHooks: ['generate-boss-arena', 'generate-artifact'],
      },
    ];
  }

  private assetAgent(regions: GeographyRegion[], factions: Faction[]): GenerationTask[] {
    const tasks: GenerationTask[] = [];
    let priority = 0;

    for (const region of regions) {
      tasks.push({
        id: `task-terrain-${region.id}`,
        type: 'terrain',
        regionId: region.id,
        prompt: `Generate ${region.type} terrain for ${region.name}, elevation ${region.elevationRange[0]}–${region.elevationRange[1]}m`,
        priority: priority++,
        dependsOn: [],
        status: 'queued',
      });
      tasks.push({
        id: `task-biome-${region.id}`,
        type: 'biome_populate',
        regionId: region.id,
        prompt: `Populate ${region.primaryBiome} biome in ${region.name} with appropriate flora and props`,
        priority: priority++,
        dependsOn: [`task-terrain-${region.id}`],
        status: 'queued',
      });
    }

    for (const faction of factions) {
      for (const regionId of faction.controlledRegions) {
        tasks.push({
          id: `task-building-${faction.id}-${regionId}`,
          type: 'building',
          regionId,
          prompt: `Generate ${faction.name} architecture in ${faction.alignment} style, tech tier ${faction.techTier}`,
          priority: priority++,
          dependsOn: [`task-terrain-${regionId}`, `task-biome-${regionId}`],
          status: 'queued',
        });
      }
    }

    return tasks.sort((a, b) => a.priority - b.priority);
  }

  // ── Execution engine ────────────────────────────────────────────────────────

  private async runGenerationQueue(blueprint: WorldBlueprint): Promise<void> {
    const total = blueprint.generationQueue.length;
    let completed = 0;

    const runTask = async (task: GenerationTask): Promise<void> => {
      task.status = 'running';
      this.emit({ type: 'task_started', worldId: blueprint.id, taskId: task.id });
      try {
        // In production: dispatch to /api/ai/generate-asset, /api/ai/generate-terrain, etc.
        await new Promise<void>((resolve) => setTimeout(resolve, 100)); // simulated generation
        task.status = 'done';
        completed++;
        this.emit({
          type: 'task_completed',
          worldId: blueprint.id,
          taskId: task.id,
          progress: completed / total,
        });
      } catch (err) {
        task.status = 'failed';
        this.emit({ type: 'task_failed', worldId: blueprint.id, taskId: task.id, error: String(err) });
      }
    };

    // Topological BFS with parallelism cap
    const completed_ids = new Set<string>();
    const pending = [...blueprint.generationQueue];

    while (pending.length > 0 || this.runningTasks.size > 0) {
      // Drain any finished tasks
      for (const [id, promise] of this.runningTasks) {
        const task = blueprint.generationQueue.find((t) => t.id === id);
        if (task?.status === 'done' || task?.status === 'failed') {
          completed_ids.add(id);
          this.runningTasks.delete(id);
        }
      }

      // Start eligible tasks up to parallelism limit
      while (this.runningTasks.size < this.config.parallelism && pending.length > 0) {
        const idx = pending.findIndex(
          (t) => t.status === 'queued' && t.dependsOn.every((d) => completed_ids.has(d)),
        );
        if (idx < 0) break;
        const task = pending.splice(idx, 1)[0];
        const p = runTask(task);
        this.runningTasks.set(task.id, p);
      }

      if (this.runningTasks.size === 0 && pending.every((t) => t.status !== 'queued')) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }

    this.emit({ type: 'world_ready', worldId: blueprint.id, progress: 1 });
    log.info('World generation complete', { worldId: blueprint.id, tasks: total });
  }

  private extractTheme(prompt: string): string {
    if (prompt.toLowerCase().includes('sci-fi') || prompt.toLowerCase().includes('space')) return 'Sci-Fi';
    if (prompt.toLowerCase().includes('fantasy') || prompt.toLowerCase().includes('magic')) return 'Fantasy';
    if (prompt.toLowerCase().includes('horror') || prompt.toLowerCase().includes('dark')) return 'Dark Horror';
    if (prompt.toLowerCase().includes('western') || prompt.toLowerCase().includes('cowboy')) return 'Western';
    return 'Adventure';
  }

  private extractWorldName(prompt: string): string {
    const match = prompt.match(/(?:called|named|world of)\s+["']?([A-Z][a-zA-Z\s]{2,30})["']?/i);
    return match?.[1]?.trim() ?? 'Aetherion';
  }

  getBlueprint(worldId: string): WorldBlueprint | undefined {
    return this.activeWorlds.get(worldId);
  }

  getProgress(worldId: string): number {
    const bp = this.activeWorlds.get(worldId);
    if (!bp) return 0;
    const done = bp.generationQueue.filter((t) => t.status === 'done').length;
    return done / Math.max(bp.generationQueue.length, 1);
  }
}
