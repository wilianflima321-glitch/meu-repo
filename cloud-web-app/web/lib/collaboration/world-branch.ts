/**
 * world-branch.ts  — Sprint V32
 *
 * Git-style world branching and merge conflict resolution for Aethel Studio.
 *
 * Architecture:
 *   WorldBranchManager
 *     .createBranch()   — fork a World at a given WorldVersion
 *     .computeDiff()    — JSON Patch diff between two scene snapshots
 *     .merge()          — 3-way merge (base, ours, theirs)
 *     .resolveConflict()— accept ours / theirs for a single conflicted key
 *
 * Scene snapshots are plain JSON objects keyed by entity/asset ID.
 * The diff format is RFC 6902 JSON Patch so it is compact and auditable.
 *
 * Merge strategy:
 *   - Non-overlapping changes: auto-accepted (add from theirs, add from ours)
 *   - Overlapping same value:  silently deduplicated
 *   - Overlapping different:   marked as ConflictRecord for manual resolution
 */

// eslint-disable-next-line
type AnyPrisma = any;
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('world-branch');

// ---------------------------------------------------------------------------
// JSON Patch (RFC 6902 subset)
// ---------------------------------------------------------------------------

export type PatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown };

export function diffScenes(
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): PatchOp[] {
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

export function applyPatch(
  base: Record<string, unknown>,
  patch: PatchOp[],
): Record<string, unknown> {
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
// Merge types
// ---------------------------------------------------------------------------

export interface ConflictRecord {
  /** Path in the scene JSON (e.g. "/entity-abc123/position") */
  path: string;
  baseValue: unknown;
  ourValue: unknown;
  theirValue: unknown;
}

export interface MergeResult {
  /** Merged scene (conflicts excluded until resolved) */
  scene: Record<string, unknown>;
  conflicts: ConflictRecord[];
  autoMergedCount: number;
  conflictCount: number;
}

// ---------------------------------------------------------------------------
// 3-way merge
// ---------------------------------------------------------------------------

export function mergeScenes(
  base: Record<string, unknown>,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
): MergeResult {
  const merged: Record<string, unknown> = { ...base };
  const conflicts: ConflictRecord[] = [];
  let autoMergedCount = 0;

  const ourPatch = diffScenes(base, ours);
  const theirPatch = diffScenes(base, theirs);

  const ourPaths = new Map<string, PatchOp>(ourPatch.map((op) => [op.path, op]));
  const theirPaths = new Map<string, PatchOp>(theirPatch.map((op) => [op.path, op]));

  const allPaths = new Set([...ourPaths.keys(), ...theirPaths.keys()]);

  for (const path of allPaths) {
    const key = path.slice(1);
    const ourOp = ourPaths.get(path);
    const theirOp = theirPaths.get(path);

    if (ourOp && !theirOp) {
      // Only we changed it — auto-accept ours
      applyOpToRecord(merged, ourOp, key);
      autoMergedCount++;
    } else if (!ourOp && theirOp) {
      // Only they changed it — auto-accept theirs
      applyOpToRecord(merged, theirOp, key);
      autoMergedCount++;
    } else if (ourOp && theirOp) {
      // Both changed it
      const ourVal = ourOp.op !== 'remove' ? (ourOp as { value: unknown }).value : undefined;
      const theirVal = theirOp.op !== 'remove' ? (theirOp as { value: unknown }).value : undefined;

      if (JSON.stringify(ourVal) === JSON.stringify(theirVal)) {
        // Same change — auto-accept (idempotent)
        applyOpToRecord(merged, ourOp, key);
        autoMergedCount++;
      } else {
        // True conflict — exclude from merged scene; require manual resolution
        conflicts.push({
          path,
          baseValue: base[key],
          ourValue: ourVal,
          theirValue: theirVal,
        });
      }
    }
  }

  return {
    scene: merged,
    conflicts,
    autoMergedCount,
    conflictCount: conflicts.length,
  };
}

function applyOpToRecord(
  record: Record<string, unknown>,
  op: PatchOp,
  key: string,
): void {
  if (op.op === 'remove') {
    delete record[key];
  } else {
    record[key] = (op as { value: unknown }).value;
  }
}

/** Resolve a single conflict by choosing 'ours' or 'theirs'. */
export function resolveConflict(
  mergeResult: MergeResult,
  path: string,
  resolution: 'ours' | 'theirs',
): MergeResult {
  const conflict = mergeResult.conflicts.find((c) => c.path === path);
  if (!conflict) return mergeResult;

  const key = path.slice(1);
  const value = resolution === 'ours' ? conflict.ourValue : conflict.theirValue;

  const updatedScene = { ...mergeResult.scene };
  if (value === undefined) {
    delete updatedScene[key];
  } else {
    updatedScene[key] = value;
  }

  return {
    ...mergeResult,
    scene: updatedScene,
    conflicts: mergeResult.conflicts.filter((c) => c.path !== path),
    conflictCount: mergeResult.conflictCount - 1,
  };
}

// ---------------------------------------------------------------------------
// WorldBranchManager
// ---------------------------------------------------------------------------

export interface BranchCreateInput {
  worldId: string;
  name: string;
  description?: string;
  baseVersionId?: string;
  createdBy: string;
}

export interface MergeInput {
  branchId: string;
  baseScene: Record<string, unknown>;
  ourScene: Record<string, unknown>;
  theirScene: Record<string, unknown>;
  mergedBy: string;
}

export class WorldBranchManager {
  // db typed as `any` until `prisma generate` runs after schema migration
  constructor(private readonly db: AnyPrisma) {}

  async createBranch(input: BranchCreateInput) {
    const branch = await this.db.worldBranch.create({
      data: {
        worldId: input.worldId,
        name: input.name,
        description: input.description ?? null,
        baseVersionId: input.baseVersionId ?? null,
        createdBy: input.createdBy,
        status: 'open',
      },
    });
    log.info('World branch created', { branchId: branch.id, name: input.name });
    return branch;
  }

  async listBranches(worldId: string) {
    return this.db.worldBranch.findMany({
      where: { worldId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Compute a JSON diff between two scene snapshots and store it as the branch merge summary. */
  async computeAndStoreDiff(
    branchId: string,
    baseScene: Record<string, unknown>,
    currentScene: Record<string, unknown>,
  ): Promise<PatchOp[]> {
    const patch = diffScenes(baseScene, currentScene);
    await this.db.worldBranch.update({
      where: { id: branchId },
      data: { mergeSummary: patch as unknown as import('@prisma/client').Prisma.InputJsonValue },
    });
    return patch;
  }

  /** Perform a 3-way merge and, if clean, mark the branch as merged. */
  async mergeBranch(input: MergeInput): Promise<MergeResult> {
    const result = mergeScenes(input.baseScene, input.ourScene, input.theirScene);

    const updateData: Record<string, unknown> = {
      mergeSummary: {
        autoMergedCount: result.autoMergedCount,
        conflictCount: result.conflictCount,
        conflicts: result.conflicts,
      },
    };

    if (result.conflictCount === 0) {
      updateData.status = 'merged';
      updateData.mergedBy = input.mergedBy;
      updateData.mergedAt = new Date();
    }

    // eslint-disable-next-line
    await this.db.worldBranch.update({ where: { id: input.branchId }, data: updateData as any });

    log.info('Branch merge computed', {
      branchId: input.branchId,
      autoMerged: result.autoMergedCount,
      conflicts: result.conflictCount,
    });

    return result;
  }

  async abandonBranch(branchId: string): Promise<void> {
    await this.db.worldBranch.update({
      where: { id: branchId },
      data: { status: 'abandoned' },
    });
  }
}
