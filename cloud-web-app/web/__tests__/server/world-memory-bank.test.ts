import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorldMemoryBank } from '@/lib/memory/world-memory-bank'

// ---------------------------------------------------------------------------
// In-Memory IndexedDB Mock for Node Test Environment
// ---------------------------------------------------------------------------
class MockIDBRequest {
  result: any
  error: any = null
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
  onupgradeneeded: ((evt: any) => void) | null = null

  fireSuccess(result: any) {
    this.result = result
    if (this.onsuccess) this.onsuccess()
  }

  fireUpgrade(db: any) {
    if (this.onupgradeneeded) {
      this.onupgradeneeded({
        target: { result: db }
      })
    }
  }
}

class MockIDBIndex {
  constructor(private storeData: any[], private indexName: string) {}

  getAll(value: any) {
    const req = new MockIDBRequest()
    setTimeout(() => {
      const filtered = this.storeData.filter((item) => item[this.indexName] === value)
      req.fireSuccess(filtered)
    }, 0)
    return req
  }
}

class MockIDBObjectStore {
  constructor(private storeName: string, private dbData: Map<string, any[]>) {}

  get data() {
    if (!this.dbData.has(this.storeName)) {
      this.dbData.set(this.storeName, [])
    }
    return this.dbData.get(this.storeName)!
  }

  put(record: any) {
    const req = new MockIDBRequest()
    setTimeout(() => {
      const idx = this.data.findIndex((item) => item.id === record.id)
      if (idx !== -1) {
        this.data[idx] = record
      } else {
        this.data.push(record)
      }
      req.fireSuccess(record.id)
    }, 0)
    return req
  }

  getAll() {
    const req = new MockIDBRequest()
    setTimeout(() => {
      req.fireSuccess([...this.data])
    }, 0)
    return req
  }

  index(indexName: string) {
    return new MockIDBIndex(this.data, indexName)
  }

  delete(key: any) {
    const req = new MockIDBRequest()
    setTimeout(() => {
      const idx = this.data.findIndex((item) => item.id === key)
      if (idx !== -1) {
        this.data.splice(idx, 1)
      }
      req.fireSuccess(undefined)
    }, 0)
    return req
  }
}

class MockIDBTransaction {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(private storeNames: string | string[], private mode: string, private dbData: Map<string, any[]>) {
    setTimeout(() => {
      if (this.oncomplete) this.oncomplete()
    }, 5)
  }

  objectStore(name: string) {
    return new MockIDBObjectStore(name, this.dbData)
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    contains: (name: string) => true
  }
  dbData = new Map<string, any[]>()

  transaction(storeNames: string | string[], mode: string) {
    return new MockIDBTransaction(storeNames, mode, this.dbData)
  }

  createObjectStore(name: string, options?: any) {
    return {
      createIndex: vi.fn()
    }
  }

  close() {}
}

const mockIndexedDB = {
  open: (name: string, version: number) => {
    const req = new MockIDBRequest()
    const db = new MockIDBDatabase()
    setTimeout(() => {
      req.fireUpgrade(db)
      req.fireSuccess(db)
    }, 0)
    return req
  }
}

// Inject global mock
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WorldMemoryBank', () => {
  const projectId = 'test-proj-123'
  let bank: WorldMemoryBank

  beforeEach(async () => {
    bank = await WorldMemoryBank.open(projectId)
  })

  it('can upsert and retrieve style embeddings', async () => {
    const record = {
      id: 'asset-1',
      projectId,
      assetName: 'Grass Mesh',
      prompt: 'stylized cartoon green grass mesh',
      embedding: [0.1, 0.2, 0.8, -0.3],
      tags: ['nature', 'grass', 'stylized'],
      qualityScore: 0.95,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    }

    await bank.upsertStyleEmbedding(record)
    const list = await bank.getStyleEmbeddings()
    expect(list).toHaveLength(1)
    expect(list[0].assetName).toBe('Grass Mesh')
  })

  it('can perform cosine similarity search for similar assets', async () => {
    const grass = {
      id: 'asset-grass',
      projectId,
      assetName: 'Grass Mesh',
      prompt: 'stylized cartoon green grass mesh',
      embedding: [1.0, 0.0, 0.0],
      tags: ['nature', 'grass'],
      qualityScore: 0.95,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    }

    const rock = {
      id: 'asset-rock',
      projectId,
      assetName: 'Rock Mesh',
      prompt: 'grey jagged boulder rock',
      embedding: [0.0, 1.0, 0.0],
      tags: ['nature', 'rock'],
      qualityScore: 0.85,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    }

    await bank.upsertStyleEmbedding(grass)
    await bank.upsertStyleEmbedding(rock)

    // Search query aligned closer to grass (1.0, 0.1, 0.0)
    const results = await bank.findSimilarAssets([0.9, 0.1, 0.0], 2)
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('asset-grass')
    expect(results[0].similarity).toBeGreaterThan(0.9)
    expect(results[1].id).toBe('asset-rock')
  })

  it('can record and retrieve asset genealogy', async () => {
    const genealogy = {
      id: 'gen-1',
      projectId,
      assetId: 'asset-grass',
      parentAssetId: null,
      prompt: 'stylized cartoon green grass mesh',
      modelUsed: 'meshy-v4',
      parameters: { steps: 30, temp: 0.7 },
      durationMs: 12000,
      costCredits: 1.5,
      createdAt: Date.now(),
    }

    await bank.recordGenealogy(genealogy)
    const history = await bank.getGenealogyForAsset('asset-grass')
    expect(history).toHaveLength(1)
    expect(history[0].id).toBe('gen-1')
  })

  it('can upsert biomes and match embedding centroids', async () => {
    const forestBiome = {
      id: 'biome-forest',
      projectId,
      name: 'enchanted-forest',
      styleConstraints: {
        colourPalette: ['#1b4332', '#081c15'],
        dominantMaterials: ['wood', 'leaves'],
        forbiddenStyles: ['cyberpunk'],
        densityMultiplier: 1.2,
      },
      embeddingCentroid: [1.0, 0.0, 0.0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await bank.upsertBiome(forestBiome)
    const matched = await bank.matchBiome([0.95, 0.05, 0.0])
    expect(matched).not.toBeNull()
    expect(matched!.name).toBe('enchanted-forest')
  })

  it('can manage narrative states', async () => {
    await bank.setNarrativeState('world_event:boss_spawned', { boss: 'Dragon', active: true })
    const state = await bank.getNarrativeState('world_event:boss_spawned') as { boss: string }
    expect(state).not.toBeNull()
    expect(state.boss).toBe('Dragon')
  })
})
