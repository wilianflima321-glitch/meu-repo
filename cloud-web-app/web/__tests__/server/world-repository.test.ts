import { describe, expect, it, vi } from 'vitest'
import { WorldRepository } from '@/lib/persistence/world-repository'

// ---------------------------------------------------------------------------
// In-Memory Prisma Mock specifically supporting WorldRepository queries
// ---------------------------------------------------------------------------
class MockPrismaClient {
  worlds: any[] = []
  regions: any[] = []
  versions: any[] = []
  assets: any[] = []
  styleEmbeddings: any[] = []

  world = {
    create: async (args: any) => {
      const w = { id: `w-${this.worlds.length}`, ...args.data, createdAt: new Date(), updatedAt: new Date() }
      this.worlds.push(w)
      return w
    },
    findUnique: async (args: any) => {
      return this.worlds.find((w) => w.id === args.where.id) || null
    },
    findMany: async (args: any) => {
      return this.worlds.filter((w) => w.projectId === args.where.projectId && w.status !== 'archived')
    },
    update: async (args: any) => {
      const idx = this.worlds.findIndex((w) => w.id === args.where.id)
      if (idx !== -1) {
        this.worlds[idx] = { ...this.worlds[idx], ...args.data, updatedAt: new Date() }
        return this.worlds[idx]
      }
      throw new Error('Not found')
    }
  }

  worldRegion = {
    create: async (args: any) => {
      const r = { id: `r-${this.regions.length}`, ...args.data, createdAt: new Date(), updatedAt: new Date() }
      this.regions.push(r)
      return r
    },
    findUnique: async (args: any) => {
      return this.regions.find((r) => r.id === args.where.id) || null
    },
    findMany: async (args: any) => {
      // Return matching regions
      return this.regions.filter((r) => r.worldId === args.where.worldId)
    },
    update: async (args: any) => {
      const idx = this.regions.findIndex((r) => r.id === args.where.id)
      if (idx !== -1) {
        this.regions[idx] = { ...this.regions[idx], ...args.data, updatedAt: new Date() }
        return this.regions[idx]
      }
      throw new Error('Not found')
    }
  }

  worldVersion = {
    create: async (args: any) => {
      const v = { id: `v-${this.versions.length}`, ...args.data, createdAt: new Date() }
      this.versions.push(v)
      return v
    },
    findUnique: async (args: any) => {
      return this.versions.find((v) => v.id === args.where.id) || null
    },
    findMany: async (args: any) => {
      return this.versions.filter((v) => v.worldId === args.where.worldId)
    }
  }

  generatedAsset = {
    create: async (args: any) => {
      const a = { id: `a-${this.assets.length}`, ...args.data, createdAt: new Date(), updatedAt: new Date() }
      this.assets.push(a)
      return a
    },
    findUnique: async (args: any) => {
      return this.assets.find((a) => a.id === args.where.id) || null
    },
    findMany: async (args: any) => {
      return this.assets.filter((a) => a.worldId === args.where.worldId)
    },
    update: async (args: any) => {
      const idx = this.assets.findIndex((a) => a.id === args.where.id)
      if (idx !== -1) {
        this.assets[idx] = { ...this.assets[idx], ...args.data, updatedAt: new Date() }
        return this.assets[idx]
      }
      throw new Error('Not found')
    }
  }

  styleEmbedding = {
    create: async (args: any) => {
      const e = { id: `e-${this.styleEmbeddings.length}`, ...args.data, createdAt: new Date() }
      this.styleEmbeddings.push(e)
      return e
    },
    findFirst: async (args: any) => {
      return this.styleEmbeddings.find(
        (e) => e.projectId === args.where.projectId && e.assetId === args.where.assetId && e.tag === args.where.tag
      ) || null
    },
    findMany: async (args: any) => {
      return this.styleEmbeddings.filter((e) => e.projectId === args.where.projectId && e.tag === args.where.tag)
    },
    update: async (args: any) => {
      const idx = this.styleEmbeddings.findIndex((e) => e.id === args.where.id)
      if (idx !== -1) {
        this.styleEmbeddings[idx] = { ...this.styleEmbeddings[idx], ...args.data }
        return this.styleEmbeddings[idx]
      }
      throw new Error('Not found')
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WorldRepository', () => {
  it('can create and manage worlds', async () => {
    const db = new MockPrismaClient()
    const repo = new WorldRepository(db)

    const w = await repo.createWorld({
      projectId: 'p-1',
      name: 'Forest Level',
      description: 'Enchanted woods and paths',
      defaultBiome: 'forest',
      bounds: { minX: -100, minZ: -100, maxX: 100, maxZ: 100 }
    })

    expect(w.name).toBe('Forest Level')
    expect(db.worlds).toHaveLength(1)

    const fetched = await repo.getWorld(w.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('Forest Level')

    const list = await repo.listWorlds('p-1')
    expect(list).toHaveLength(1)

    await repo.archiveWorld(w.id)
    const activeList = await repo.listWorlds('p-1')
    expect(activeList).toHaveLength(0)
  })

  it('can stream regions by proximity to the observer', async () => {
    const db = new MockPrismaClient()
    const repo = new WorldRepository(db)

    const w = await repo.createWorld({ projectId: 'p-1', name: 'Proximity World' })

    // Create 3 regions at different coordinates
    // Region A: Near (center: 10, 10)
    await repo.createRegion({
      worldId: w.id,
      name: 'Region Near',
      bounds: { minX: 0, minZ: 0, maxX: 20, maxZ: 20 }
    })
    // Region B: Far (center: 100, 100)
    await repo.createRegion({
      worldId: w.id,
      name: 'Region Far',
      bounds: { minX: 90, minZ: 90, maxX: 110, maxZ: 110 }
    })

    const stream = repo.streamRegions(w.id, {
      origin: { x: 0, y: 0, z: 0 },
      loadRadius: 50
    })

    const results = []
    for await (const region of stream) {
      results.push(region)
    }

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Region Near')
  })

  it('can compute diffs when saving versions and replay them to reconstruct state', async () => {
    const db = new MockPrismaClient()
    const repo = new WorldRepository(db)

    const w = await repo.createWorld({ projectId: 'p-1', name: 'Version World' })

    // Create Version 0 (Snapshot)
    const v0 = await repo.createVersion({
      worldId: w.id,
      createdBy: 'user-1',
      label: 'Initial State',
      snapshotJson: {
        'entity-1': { type: 'tree', x: 10 },
        'entity-2': { type: 'rock', x: 20 }
      }
    })

    // Create Version 1 with changes (Computes JSON Patch)
    const v1 = await repo.createVersion({
      worldId: w.id,
      createdBy: 'user-1',
      label: 'Add block, move tree',
      parentId: v0.id,
      snapshotJson: {
        'entity-1': { type: 'tree', x: 15 }, // value changed
        'entity-2': { type: 'rock', x: 20 }, // unchanged
        'entity-3': { type: 'box', x: 0 }    // newly added
      }
    })

    expect(v1.diffPayload).not.toBeNull()
    const patch = JSON.parse(v1.diffPayload!)
    expect(patch).toContainEqual({ op: 'replace', path: '/entity-1', value: { type: 'tree', x: 15 } })
    expect(patch).toContainEqual({ op: 'add', path: '/entity-3', value: { type: 'box', x: 0 } })

    // Replay version 1 and confirm it matches the snapshot
    const replayed = await repo.replayVersion(v1.id)
    expect(replayed['entity-1']).toEqual({ type: 'tree', x: 15 })
    expect(replayed['entity-3']).toEqual({ type: 'box', x: 0 })
  })

  it('can manage generated assets and style embeddings', async () => {
    const db = new MockPrismaClient()
    const repo = new WorldRepository(db)

    const w = await repo.createWorld({ projectId: 'p-1', name: 'Asset World' })

    const asset = await repo.createAsset({
      worldId: w.id,
      name: 'Crystal Rock',
      assetType: 'mesh',
      prompt: 'glowing magic purple crystal rock',
      modelUsed: 'meshy-v4',
      createdBy: 'user-1',
      qualityScore: 0.92
    })

    expect(asset.moderationStatus).toBe('pending')

    await repo.setModerationStatus(asset.id, 'approved')
    const fetched = await repo.getAsset(asset.id)
    expect(fetched!.moderationStatus).toBe('approved')

    await repo.upsertStyleEmbedding({
      projectId: 'p-1',
      assetId: asset.id,
      tag: 'crystal',
      embedding: [0.1, 0.2, 0.3],
      prompt: 'glowing magic purple crystal rock',
      qualityScore: 0.92
    })

    const embeddings = await repo.getStyleEmbeddingsByTag('p-1', 'crystal')
    expect(embeddings).toHaveLength(1)
  })
})
