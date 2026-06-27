/**
 * world-memory-bank.ts  — Sprint V31
 *
 * Persistent, queryable memory for AI world-building agents.
 * Stores style embeddings, biome definitions, asset genealogy, and narrative
 * state in the browser's IndexedDB so sessions survive page reloads and
 * agents can retrieve rich context without re-reading the full project each time.
 *
 * Data model:
 *   StyleEmbeddingRecord   — per-asset colour/geometry/material fingerprint
 *   AssetGenealogyRecord   — prompt → model → parameters → assetId lineage
 *   BiomeDefinitionRecord  — rule-based biome constraints (density, palette, etc.)
 *   NarrativeStateRecord   — faction lore, world events, player-visible lore
 *
 * Usage (client-only — wrap with if (typeof window !== 'undefined')):
 *   const bank = await WorldMemoryBank.open(projectId);
 *   await bank.upsertStyleEmbedding({ assetId, embedding, prompt, tags });
 *   const similar = await bank.findSimilarAssets(queryEmbedding, 10);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StyleEmbeddingRecord {
  id: string;          // assetId (stable key)
  projectId: string;
  assetName: string;
  prompt: string;
  embedding: number[]; // 128-d cosine-comparable vector
  tags: string[];      // biome, style, era, material family…
  qualityScore: number; // 0–1 from coherence validator
  createdAt: number;   // Date.now()
  modelUsed: string;
}

export interface AssetGenealogyRecord {
  id: string;
  projectId: string;
  assetId: string;
  parentAssetId: string | null; // null for root generations
  prompt: string;
  negativePrompt?: string;
  modelUsed: string;
  parameters: Record<string, unknown>; // temperature, steps, etc.
  durationMs: number;
  costCredits: number;
  createdAt: number;
}

export interface BiomeDefinitionRecord {
  id: string;
  projectId: string;
  name: string;        // 'dark-forest', 'cyberpunk-city', etc.
  styleConstraints: {
    colourPalette: string[];   // hex
    dominantMaterials: string[];
    forbiddenStyles: string[];
    densityMultiplier: number;
  };
  embeddingCentroid: number[]; // mean of all asset embeddings in this biome
  createdAt: number;
  updatedAt: number;
}

export interface NarrativeStateRecord {
  id: string;
  projectId: string;
  key: string;          // 'faction:iron_empire:status', 'world_event:plague:active'…
  value: unknown;       // arbitrary JSON
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Cosine similarity (used for nearest-neighbour style search)
// ---------------------------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// IDB helpers (tiny wrapper, no external dependency)
// ---------------------------------------------------------------------------
function openIDB(dbName: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result;
      const stores: Array<{ name: string; keyPath: string; indices: Array<[string, boolean]> }> = [
        { name: 'styleEmbeddings', keyPath: 'id', indices: [['projectId', false], ['createdAt', false]] },
        { name: 'assetGenealogy',  keyPath: 'id', indices: [['projectId', false], ['assetId', false]] },
        { name: 'biomeDefinitions', keyPath: 'id', indices: [['projectId', false]] },
        { name: 'narrativeState',   keyPath: 'id', indices: [['projectId', false], ['key', false]] },
      ];
      for (const { name, keyPath, indices } of stores) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath });
          for (const [idxName, unique] of indices) {
            store.createIndex(idxName, idxName, { unique });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut<T>(db: IDBDatabase, storeName: string, record: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    // IDBObjectStore.put accepts `any`; cast needed in strict TS
    // eslint-disable-next-line
    tx.objectStore(storeName).put(record as any);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function idbGetByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// WorldMemoryBank
// ---------------------------------------------------------------------------

const DB_NAME = 'aethel-world-memory';
const DB_VERSION = 1;

export class WorldMemoryBank {
  private constructor(private db: IDBDatabase, public readonly projectId: string) {}

  static async open(projectId: string): Promise<WorldMemoryBank> {
    const db = await openIDB(DB_NAME, DB_VERSION);
    return new WorldMemoryBank(db, projectId);
  }

  // ── Style Embeddings ──────────────────────────────────────────────────────

  async upsertStyleEmbedding(record: StyleEmbeddingRecord): Promise<void> {
    await idbPut(this.db, 'styleEmbeddings', record);
  }

  async getStyleEmbeddings(): Promise<StyleEmbeddingRecord[]> {
    return idbGetByIndex(this.db, 'styleEmbeddings', 'projectId', this.projectId);
  }

  /**
   * Nearest-neighbour cosine search: returns the top-k style embeddings
   * closest to the given query vector. O(n) over indexed records.
   */
  async findSimilarAssets(
    queryEmbedding: number[],
    topK: number = 5,
  ): Promise<Array<StyleEmbeddingRecord & { similarity: number }>> {
    const all = await this.getStyleEmbeddings();
    return all
      .map((r) => ({ ...r, similarity: cosineSimilarity(queryEmbedding, r.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async deleteStyleEmbedding(assetId: string): Promise<void> {
    await idbDelete(this.db, 'styleEmbeddings', assetId);
  }

  // ── Asset Genealogy ───────────────────────────────────────────────────────

  async recordGenealogy(record: AssetGenealogyRecord): Promise<void> {
    await idbPut(this.db, 'assetGenealogy', record);
  }

  async getGenealogyForAsset(assetId: string): Promise<AssetGenealogyRecord[]> {
    const all: AssetGenealogyRecord[] = await idbGetByIndex(
      this.db, 'assetGenealogy', 'projectId', this.projectId,
    );
    return all.filter((r) => r.assetId === assetId);
  }

  async getFullGenealogy(): Promise<AssetGenealogyRecord[]> {
    return idbGetByIndex(this.db, 'assetGenealogy', 'projectId', this.projectId);
  }

  // ── Biome Definitions ─────────────────────────────────────────────────────

  async upsertBiome(record: BiomeDefinitionRecord): Promise<void> {
    await idbPut(this.db, 'biomeDefinitions', record);
  }

  async getBiomes(): Promise<BiomeDefinitionRecord[]> {
    return idbGetByIndex(this.db, 'biomeDefinitions', 'projectId', this.projectId);
  }

  /** Find the biome whose embedding centroid is closest to the given vector. */
  async matchBiome(embedding: number[]): Promise<BiomeDefinitionRecord | null> {
    const biomes = await this.getBiomes();
    if (biomes.length === 0) return null;
    return biomes.reduce((best, b) => {
      const sim = cosineSimilarity(embedding, b.embeddingCentroid);
      const bestSim = cosineSimilarity(embedding, best.embeddingCentroid);
      return sim > bestSim ? b : best;
    });
  }

  // ── Narrative State ───────────────────────────────────────────────────────

  async setNarrativeState(key: string, value: unknown): Promise<void> {
    const record: NarrativeStateRecord = {
      id: `${this.projectId}::${key}`,
      projectId: this.projectId,
      key,
      value,
      updatedAt: Date.now(),
    };
    await idbPut(this.db, 'narrativeState', record);
  }

  async getNarrativeState(key: string): Promise<unknown> {
    const all: NarrativeStateRecord[] = await idbGetByIndex(
      this.db, 'narrativeState', 'key', key,
    );
    return all.find((r) => r.projectId === this.projectId)?.value ?? null;
  }

  async getAllNarrativeState(): Promise<NarrativeStateRecord[]> {
    return idbGetByIndex(this.db, 'narrativeState', 'projectId', this.projectId);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  /** Compute the running centroid of all style embeddings in a biome. */
  async recomputeBiomeCentroid(biomeName: string): Promise<number[]> {
    const all = await this.getStyleEmbeddings();
    const biomeAssets = all.filter((r) => r.tags.includes(biomeName));
    if (biomeAssets.length === 0) return [];
    const dim = biomeAssets[0].embedding.length;
    const centroid = new Array<number>(dim).fill(0);
    for (const asset of biomeAssets) {
      for (let i = 0; i < dim; i++) centroid[i] += asset.embedding[i];
    }
    return centroid.map((v) => v / biomeAssets.length);
  }

  close(): void {
    this.db.close();
  }
}
