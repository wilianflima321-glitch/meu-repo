import { describe, expect, it } from 'vitest'
import {
  diffScenes,
  applyPatch,
  mergeScenes,
  resolveConflict,
  WorldBranchManager,
  type PatchOp
} from '@/lib/collaboration/world-branch'

// ---------------------------------------------------------------------------
// In-Memory Prisma Mock for WorldBranchManager
// ---------------------------------------------------------------------------
class MockPrismaClient {
  branches: any[] = []

  worldBranch = {
    create: async (args: any) => {
      const b = {
        id: `branch-${this.branches.length}`,
        ...args.data,
        mergeSummary: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.branches.push(b)
      return b
    },
    findMany: async (args: any) => {
      return this.branches.filter((b) => b.worldId === args.where.worldId)
    },
    update: async (args: any) => {
      const idx = this.branches.findIndex((b) => b.id === args.where.id)
      if (idx !== -1) {
        this.branches[idx] = { ...this.branches[idx], ...args.data, updatedAt: new Date() }
        return this.branches[idx]
      }
      throw new Error('Branch not found')
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('World Branching & 3-Way Merge', () => {
  describe('Scene Diff & Patch Application', () => {
    it('computes correct patches for added, modified, and removed entities', () => {
      const base = {
        'entity-1': { type: 'tree', x: 0 },
        'entity-2': { type: 'rock', x: 10 }
      }

      const next = {
        'entity-1': { type: 'tree', x: 5 },  // modified
        'entity-3': { type: 'house', x: 20 } // added
        // entity-2 removed
      }

      const patch = diffScenes(base, next)
      expect(patch).toHaveLength(3)

      const applied = applyPatch(base, patch)
      expect(applied).toEqual(next)
    })
  })

  describe('3-Way Merge Logic', () => {
    it('auto-merges non-overlapping changes', () => {
      const base = {
        'entity-1': { type: 'tree', x: 0 },
        'entity-2': { type: 'rock', x: 10 }
      }

      // Ours: Move entity-1
      const ours = {
        'entity-1': { type: 'tree', x: 5 },
        'entity-2': { type: 'rock', x: 10 }
      }

      // Theirs: Delete entity-2, add entity-3
      const theirs = {
        'entity-1': { type: 'tree', x: 0 },
        'entity-3': { type: 'house', x: 20 }
      }

      const result = mergeScenes(base, ours, theirs)
      expect(result.conflictCount).toBe(0)
      expect(result.autoMergedCount).toBe(3) // 1 modify (ours), 1 delete (theirs), 1 add (theirs)

      expect(result.scene['entity-1']).toEqual({ type: 'tree', x: 5 })
      expect(result.scene['entity-2']).toBeUndefined()
      expect(result.scene['entity-3']).toEqual({ type: 'house', x: 20 })
    })

    it('flags true conflicts when overlapping changes have different values', () => {
      const base = {
        'entity-1': { type: 'tree', x: 0 }
      }

      const ours = {
        'entity-1': { type: 'tree', x: 10 } // We move to x:10
      }

      const theirs = {
        'entity-1': { type: 'tree', x: 20 } // They move to x:20
      }

      const result = mergeScenes(base, ours, theirs)
      expect(result.conflictCount).toBe(1)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].path).toBe('/entity-1')
      expect(result.conflicts[0].ourValue).toEqual({ type: 'tree', x: 10 })
      expect(result.conflicts[0].theirValue).toEqual({ type: 'tree', x: 20 })
    })

    it('can resolve conflicts by choosing ours or theirs', () => {
      const base = { 'entity-1': { type: 'tree', x: 0 } }
      const ours = { 'entity-1': { type: 'tree', x: 10 } }
      const theirs = { 'entity-1': { type: 'tree', x: 20 } }

      const mergeResult = mergeScenes(base, ours, theirs)

      // Resolve choosing 'ours'
      const resolvedOurs = resolveConflict(mergeResult, '/entity-1', 'ours')
      expect(resolvedOurs.conflictCount).toBe(0)
      expect(resolvedOurs.scene['entity-1']).toEqual({ type: 'tree', x: 10 })

      // Resolve choosing 'theirs'
      const resolvedTheirs = resolveConflict(mergeResult, '/entity-1', 'theirs')
      expect(resolvedTheirs.conflictCount).toBe(0)
      expect(resolvedTheirs.scene['entity-1']).toEqual({ type: 'tree', x: 20 })
    })
  })

  describe('WorldBranchManager DB Operations', () => {
    it('creates branches, stores diff patches, and completes merges', async () => {
      const db = new MockPrismaClient()
      const manager = new WorldBranchManager(db)

      const branch = await manager.createBranch({
        worldId: 'world-1',
        name: 'feat/crystal-cave',
        createdBy: 'user-1'
      })

      expect(branch.name).toBe('feat/crystal-cave')
      expect(db.branches).toHaveLength(1)

      const base = { 'e-1': { x: 0 } }
      const curr = { 'e-1': { x: 10 } }

      const patch = await manager.computeAndStoreDiff(branch.id, base, curr)
      expect(patch).toHaveLength(1)
      expect(db.branches[0].mergeSummary).not.toBeNull()

      // Merge the branch
      const mergeInput = {
        branchId: branch.id,
        baseScene: base,
        ourScene: curr,
        theirScene: base, // no changes on master
        mergedBy: 'user-1'
      }

      const result = await manager.mergeBranch(mergeInput)
      expect(result.conflictCount).toBe(0)
      expect(db.branches[0].status).toBe('merged')
    })
  })
})
