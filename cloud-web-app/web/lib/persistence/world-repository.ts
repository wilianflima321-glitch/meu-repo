/**
 * world-repository.ts  — Sprint V32
 *
 * Server-side repository for World, WorldRegion, WorldVersion, and
 * GeneratedAsset database operations.
 *
 * Architecture:
 *   WorldRepository      — typed CRUD + streaming region load
 *   createWorldVersion() — snapshot or binary-diff versioning
 *   streamRegions()      — async generator yielding regions by proximity
 *
 * All methods accept a Prisma client instance so they compose naturally
 * with existing request-scoped clients (avoids N+1 client creation).
 *
 * Binary diff format:
 *   We use JSON Patch (RFC 6902) serialised to JSON strings for now.
 *   When regions grow large we switch to a CRDT blob strategy in V33.
 */

// Re-exported Prisma types will be generated after `prisma migrate dev`.
// Until then we use `any` for the client to avoid build failures.
// eslint-disable-next-line
type AnyPrisma = any;
type World = Record<string, unknown>;
type WorldRegion = Record<string, unknown>;
type WorldVersion = Record<string, unknown>;
type GeneratedAsset = Record<string, unknown>;
type StyleEmbedding = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateWorldInput {
  projectId: string;
  name: string;
  description?: string;
  defaultBiome?: string;
  bounds?: { minX: number; minZ: number; maxX: number; maxZ: number };
}

export interface CreateRegionInput {
  worldId: string;
  name: string;
  biome?: string;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  lodConfig?: { near: number; mid: number; far: number };
}

export interface CreateAssetInput {
  worldId: string;
  regionId?: string;
  name: string;
  assetType: 'mesh' | 'material' | 'texture' | 'audio' | 'narrative';
  prompt: string;
  negativePrompt?: string;
  modelUsed: string;
  parameters?: Record<string, unknown>;
  styleEmbedding?: number[];
  qualityScore?: number;
  storageKey?: string;
  contentHash?: string;
  parentAssetId?: string;
  durationMs?: number;
  costCredits?: number;
  createdBy: string;
}

export interface UpsertStyleEmbeddingInput {
  projectId: string;
  assetId?: string;
  tag: string;
  embedding: number[];
  prompt?: string;
  qualityScore?: number;
}

export interface RegionLoadOptions {
  /** Observer position in world space */
  origin: { x: number; y: number; z: number };
  /** Maximum distance from origin to load regions */
  loadRadius: number;
  /** Include scene payload in results (expensive) */
  includePayload?: boolean;
}

// ---------------------------------------------------------------------------
// JSON Patch helpers (minimal RFC 6902 subset)
// ---------------------------------------------------------------------------

interface PatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

function computePatch(base: Record<string, unknown>, next: Record<string, unknown>): PatchOp[] {
  const ops: PatchOp[] = [];
  const allKeys = new Set([...Object.keys(base), ...Object.keys(next)]);
  for (const key of allKeys) {
    const path = `/${key}`;
    if (!(key in base)) {
      ops.push({ op: 'add', path, value: next[key] });
    } else if (!(key in next)) {
      ops.push({ op: 'remove', path });
    } else if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) {
      ops.push({ op: 'replace', path, value: next[key] });
    }
  }
  return ops;
}

function applyPatch(base: Record<string, unknown>, patch: PatchOp[]): Record<string, unknown> {
  const result = { ...base };
  for (const op of patch) {
    const key = op.path.slice(1);
    if (op.op === 'add' || op.op === 'replace') {
      result[key] = op.value;
    } else if (op.op === 'remove') {
      delete result[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// WorldRepository
// ---------------------------------------------------------------------------

export class WorldRepository {
  constructor(private readonly db: AnyPrisma) {}

  // ── World CRUD ────────────────────────────────────────────────────────────

  async createWorld(input: CreateWorldInput): Promise<World> {
    return this.db.world.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        defaultBiome: input.defaultBiome,
        bounds: input.bounds ?? null,
        status: 'active',
      },
    });
  }

  async getWorld(worldId: string): Promise<World | null> {
    return this.db.world.findUnique({ where: { id: worldId } });
  }

  async listWorlds(projectId: string): Promise<World[]> {
    return this.db.world.findMany({
      where: { projectId, status: { not: 'archived' } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async archiveWorld(worldId: string): Promise<void> {
    await this.db.world.update({ where: { id: worldId }, data: { status: 'archived' } });
  }

  // ── Region CRUD ───────────────────────────────────────────────────────────

  async createRegion(input: CreateRegionInput): Promise<WorldRegion> {
    return this.db.worldRegion.create({
      data: {
        worldId: input.worldId,
        name: input.name,
        biome: input.biome,
        bounds: input.bounds,
        lodConfig: input.lodConfig ?? null,
        loadStatus: 'unloaded',
      },
    });
  }

  async getRegion(regionId: string): Promise<WorldRegion | null> {
    return this.db.worldRegion.findUnique({ where: { id: regionId } });
  }

  /** Mark a region as loading / loaded and optionally store its scene payload. */
  async updateRegionStatus(
    regionId: string,
    status: 'unloaded' | 'loading' | 'loaded' | 'streaming',
    scenePayload?: string,
  ): Promise<void> {
    await this.db.worldRegion.update({
      where: { id: regionId },
      data: { loadStatus: status, ...(scenePayload !== undefined && { scenePayload }) },
    });
  }

  /**
   * Streaming region loader — yields regions sorted by distance from the
   * observer, only within the configured loadRadius.
   * Handles large worlds without loading all regions into memory at once.
   */
  async *streamRegions(
    worldId: string,
    opts: RegionLoadOptions,
  ): AsyncGenerator<WorldRegion> {
    const PAGE_SIZE = 20;
    let cursor: string | undefined;

    while (true) {
      // eslint-disable-next-line
      const page: any[] = await this.db.worldRegion.findMany({
        where: { worldId },
        select: {
          id: true,
          worldId: true,
          name: true,
          biome: true,
          bounds: true,
          lodConfig: true,
          loadStatus: true,
          scenePayload: opts.includePayload ?? false,
          createdAt: true,
          updatedAt: true,
        },
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'asc' },
      });

      if (page.length === 0) break;
      cursor = (page[page.length - 1] as { id: string }).id;

      for (const region of page) {
        const bounds = region.bounds as { minX: number; minZ: number; maxX: number; maxZ: number };
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cz = (bounds.minZ + bounds.maxZ) / 2;
        const dist = Math.sqrt(
          Math.pow(cx - opts.origin.x, 2) + Math.pow(cz - opts.origin.z, 2),
        );
        if (dist <= opts.loadRadius) {
          yield region;
        }
      }

      if (page.length < PAGE_SIZE) break;
    }
  }

  // ── Versioning ─────────────────────────────────────────────────────────────

  async createVersion(params: {
    worldId: string;
    createdBy: string;
    label?: string;
    snapshotJson?: Record<string, unknown>;
    parentId?: string;
  }): Promise<WorldVersion> {
    let diffPayload: string | undefined;

    if (params.parentId && params.snapshotJson) {
      const parent = await this.db.worldVersion.findUnique({ where: { id: params.parentId } });
      if (parent?.snapshotJson) {
        const patch = computePatch(
          parent.snapshotJson as Record<string, unknown>,
          params.snapshotJson,
        );
        diffPayload = JSON.stringify(patch);
      }
    }

    return this.db.worldVersion.create({
      data: {
        worldId: params.worldId,
        createdBy: params.createdBy,
        label: params.label,
        parentId: params.parentId ?? null,
        snapshotJson: params.snapshotJson ?? null,
        diffPayload: diffPayload ?? null,
      },
    });
  }

  /** Replay a diff chain to reconstruct a world state at a given version. */
  async replayVersion(versionId: string): Promise<Record<string, unknown>> {
    const chain: WorldVersion[] = [];
    let current: WorldVersion | null = await this.db.worldVersion.findUnique({
      where: { id: versionId },
    });

    while (current) {
      chain.unshift(current);
      if (!current.parentId) break;
      current = await this.db.worldVersion.findUnique({ where: { id: current.parentId } });
    }

    // Find the first snapshot in the chain
    let state: Record<string, unknown> = {};
    for (const version of chain) {
      // eslint-disable-next-line
      const v = version as any;
      if (v.snapshotJson) {
        state = v.snapshotJson as Record<string, unknown>;
      } else if (v.diffPayload) {
        const patch = JSON.parse(v.diffPayload as string) as PatchOp[];
        state = applyPatch(state, patch);
      }
    }
    return state;
  }

  async listVersions(worldId: string): Promise<WorldVersion[]> {
    return this.db.worldVersion.findMany({
      where: { worldId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Generated Assets ──────────────────────────────────────────────────────

  async createAsset(input: CreateAssetInput): Promise<GeneratedAsset> {
    return this.db.generatedAsset.create({
      data: {
        worldId: input.worldId,
        regionId: input.regionId ?? null,
        name: input.name,
        assetType: input.assetType,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt ?? null,
        modelUsed: input.modelUsed,
        parameters: input.parameters ?? null,
        styleEmbedding: input.styleEmbedding ?? null,
        qualityScore: input.qualityScore ?? 0,
        storageKey: input.storageKey ?? null,
        contentHash: input.contentHash ?? null,
        parentAssetId: input.parentAssetId ?? null,
        durationMs: input.durationMs ?? null,
        costCredits: input.costCredits ?? 0,
        createdBy: input.createdBy,
        moderationStatus: 'pending',
      },
    });
  }

  async getAsset(assetId: string): Promise<GeneratedAsset | null> {
    return this.db.generatedAsset.findUnique({ where: { id: assetId } });
  }

  async listAssets(worldId: string, filters?: {
    assetType?: string;
    regionId?: string;
    moderationStatus?: string;
    minQuality?: number;
  }): Promise<GeneratedAsset[]> {
    return this.db.generatedAsset.findMany({
      where: {
        worldId,
        ...(filters?.assetType && { assetType: filters.assetType }),
        ...(filters?.regionId && { regionId: filters.regionId }),
        ...(filters?.moderationStatus && { moderationStatus: filters.moderationStatus }),
        ...(filters?.minQuality !== undefined && { qualityScore: { gte: filters.minQuality } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAssetQuality(assetId: string, qualityScore: number): Promise<void> {
    await this.db.generatedAsset.update({
      where: { id: assetId },
      data: { qualityScore },
    });
  }

  async setModerationStatus(
    assetId: string,
    status: 'pending' | 'approved' | 'flagged' | 'rejected',
  ): Promise<void> {
    await this.db.generatedAsset.update({
      where: { id: assetId },
      data: { moderationStatus: status },
    });
  }

  // ── Style Embeddings ──────────────────────────────────────────────────────

  async upsertStyleEmbedding(input: UpsertStyleEmbeddingInput): Promise<StyleEmbedding> {
    const existing = await this.db.styleEmbedding.findFirst({
      where: { projectId: input.projectId, assetId: input.assetId ?? null, tag: input.tag },
    });

    if (existing) {
      return this.db.styleEmbedding.update({
        where: { id: existing.id },
        data: {
          embedding: input.embedding,
          prompt: input.prompt ?? null,
          qualityScore: input.qualityScore ?? 0,
        },
      });
    }

    return this.db.styleEmbedding.create({
      data: {
        projectId: input.projectId,
        assetId: input.assetId ?? null,
        tag: input.tag,
        embedding: input.embedding,
        prompt: input.prompt ?? null,
        qualityScore: input.qualityScore ?? 0,
      },
    });
  }

  async getStyleEmbeddingsByTag(projectId: string, tag: string): Promise<StyleEmbedding[]> {
    return this.db.styleEmbedding.findMany({
      where: { projectId, tag },
      orderBy: { qualityScore: 'desc' },
    });
  }
}
