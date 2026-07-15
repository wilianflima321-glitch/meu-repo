import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReflectionLoop } from '@aethel/agents/reflection-loop'
import { WorldMemoryBank } from '@/lib/memory/world-memory-bank'

// ---------------------------------------------------------------------------
// In-Memory IndexedDB Mock (same setup to run WorldMemoryBank seamlessly)
// ---------------------------------------------------------------------------
class MockIDBRequest {
  result: any
  onsuccess: (() => void) | null = null
  onupgradeneeded: ((evt: any) => void) | null = null

  fireSuccess(result: any) {
    this.result = result
    if (this.onsuccess) this.onsuccess()
  }

  fireUpgrade(db: any) {
    if (this.onupgradeneeded) {
      this.onupgradeneeded({ target: { result: db } })
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
}

class MockIDBTransaction {
  oncomplete: (() => void) | null = null

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
  objectStoreNames = { contains: (name: string) => true }
  dbData = new Map<string, any[]>()

  transaction(storeNames: string | string[], mode: string) {
    return new MockIDBTransaction(storeNames, mode, this.dbData)
  }

  createObjectStore(name: string, options?: any) {
    return { createIndex: vi.fn() }
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
describe('ReflectionLoop', () => {
  const projectId = 'test-proj-123'
  let bank: WorldMemoryBank
  let loop: ReflectionLoop

  beforeEach(async () => {
    bank = await WorldMemoryBank.open(projectId)
    loop = new ReflectionLoop(projectId, bank, {
      coherenceThreshold: 0.75,
      intervalMs: 0, // manual triggers only
    })
  })

  it('generates an empty report if memory bank has no biomes/embeddings', async () => {
    const report = await loop.run()
    expect(report.totalAssetsScanned).toBe(0)
    expect(report.violations).toHaveLength(0)
    expect(report.overallCoherenceScore).toBe(1)
  })

  it('runs critique and identifies style drift violations', async () => {
    // 1. Set up a biome with centroid [1, 0, 0]
    await bank.upsertBiome({
      id: 'biome-forest',
      projectId,
      name: 'enchanted-forest',
      styleConstraints: {
        colourPalette: ['#1b4332'],
        dominantMaterials: ['wood'],
        forbiddenStyles: ['cyberpunk'],
        densityMultiplier: 1.0,
      },
      embeddingCentroid: [1.0, 0.0, 0.0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // 2. Add an asset close to centroid: similarity ~ 1.0
    await bank.upsertStyleEmbedding({
      id: 'asset-grass',
      projectId,
      assetName: 'Green Grass',
      prompt: 'green grass mesh',
      embedding: [1.0, 0.0, 0.0],
      tags: ['enchanted-forest'],
      qualityScore: 0.9,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    })

    // 3. Add an asset far from centroid: similarity ~ 0.0 (below 0.75 threshold)
    await bank.upsertStyleEmbedding({
      id: 'asset-neon',
      projectId,
      assetName: 'Neon Sign',
      prompt: 'pink glowing neon sign',
      embedding: [0.0, 1.0, 0.0],
      tags: ['enchanted-forest'],
      qualityScore: 0.9,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    })

    // 4. Run critique pass
    const report = await loop.run()
    expect(report.totalAssetsScanned).toBe(2)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0].assetId).toBe('asset-neon')
    expect(report.violations[0].suggestedAction).toBe('regenerate') // similarity 0 < 0.75 * 0.6
  })

  it('can check a single asset coherence before persistence', async () => {
    await bank.upsertBiome({
      id: 'biome-forest',
      projectId,
      name: 'enchanted-forest',
      styleConstraints: {
        colourPalette: ['#1b4332'],
        dominantMaterials: ['wood'],
        forbiddenStyles: ['cyberpunk'],
        densityMultiplier: 1.0,
      },
      embeddingCentroid: [1.0, 0.0, 0.0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const goodAsset = {
      id: 'asset-flower',
      projectId,
      assetName: 'Red Flower',
      prompt: 'red forest flower',
      embedding: [0.95, 0.05, 0.0],
      tags: ['enchanted-forest'],
      qualityScore: 0.85,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    }

    const badAsset = {
      id: 'asset-cyber',
      projectId,
      assetName: 'Cyber Console',
      prompt: 'metal cyber console',
      embedding: [0.1, 0.9, 0.0],
      tags: ['enchanted-forest'],
      qualityScore: 0.85,
      createdAt: Date.now(),
      modelUsed: 'meshy-v4',
    }

    const checkGood = await loop.checkAsset(goodAsset)
    expect(checkGood).toBeNull()

    const checkBad = await loop.checkAsset(badAsset)
    expect(checkBad).not.toBeNull()
    expect(checkBad!.suggestedAction).toBe('regenerate')
  })

  it('emits report event to active subscribers', async () => {
    let emitted = false
    loop.subscribe((report) => {
      emitted = true
      expect(report.projectId).toBe(projectId)
    })

    await loop.run()
    expect(emitted).toBe(true)
  })
})
