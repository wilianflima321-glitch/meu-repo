/**
 * GF-AI-001/002/003 fixture gates (Hard Gate #72, P4 prep).
 * Deterministic parallel-agent orchestration: slot isolation, bounded
 * contexts, dedup merge, collapse detector. All honesty flags stay false.
 */
import { describe, expect, it } from 'vitest';
import {
  GF_AI_TOKEN_CAP_PER_WORKER,
  GF_AI_WORKER_COUNT,
  buildGfAi001ParallelEvidence,
  buildGfAi002IsolationEvidence,
  buildGfAi003BoundaryEvidence,
  runGfAiFixtureProbe,
  runGfAiParallelFixture,
} from '@/lib/production/gf-ai-001-parallel-agents-fixture';

describe('GF-AI-001/002/003 parallel-agent fixtures', () => {
  it('GF-AI-001: 4 workers merge without context collapse, deterministically', () => {
    const { workers, mergedTokens, slotWrites, crossTalk } = runGfAiParallelFixture();
    const evidence = buildGfAi001ParallelEvidence(workers, mergedTokens);
    expect(workers.length).toBe(GF_AI_WORKER_COUNT);
    expect(evidence.collapseFree).toBe(true);
    expect(evidence.deterministic).toBe(true);
    expect(evidence.mergeTokenCount).toBeLessThanOrEqual(
      evidence.perWorkerTokens.reduce((a, b) => a + b, 0),
    );
    expect(slotWrites).toEqual({ 0: 1, 1: 1, 2: 1, 3: 1 });
    expect(crossTalk).toBe(false);
  });

  it('GF-AI-002: slot isolation — exactly one write per slot, full coverage', () => {
    const { workers, slotWrites } = runGfAiParallelFixture();
    const evidence = buildGfAi002IsolationEvidence(workers, slotWrites);
    expect(evidence.noSlotCollision).toBe(true);
    expect(evidence.coveragePass).toBe(true);
    expect(new Set(workers.map((w) => w.hash)).size).toBe(GF_AI_WORKER_COUNT);
  });

  it('GF-AI-003: every worker under its token cap, merged under aggregate cap', () => {
    const { workers, mergedTokens, crossTalk } = runGfAiParallelFixture();
    const evidence = buildGfAi003BoundaryEvidence(workers, mergedTokens, crossTalk);
    expect(evidence.allWorkersUnderCap).toBe(true);
    for (const w of workers) {
      expect(w.tokens).toBeLessThanOrEqual(GF_AI_TOKEN_CAP_PER_WORKER);
    }
    expect(evidence.mergedUnderAggregateCap).toBe(true);
    expect(evidence.crossTalkDetected).toBe(false);
    expect(evidence.boundaryPass).toBe(true);
  });

  it('collapse detector fails loudly when a worker cross-references another slot', () => {
    // Simulated product-merge corruption: worker 0 references slot 2 — the
    // detector must flag it, proving the guard is not theater.
    const { workers, mergedTokens } = runGfAiParallelFixture();
    const corrupted = workers.map((w) =>
      w.slot === 0 ? { ...w, fragment: `${w.fragment}:slot:2` } : w,
    );
    const crossTalk = corrupted.some((w) =>
      corrupted.some((other) => other.slot !== w.slot && w.fragment.includes(`slot:${other.slot}`)),
    );
    expect(crossTalk).toBe(true);
    const boundary = buildGfAi003BoundaryEvidence(corrupted, mergedTokens, crossTalk);
    expect(boundary.boundaryPass).toBe(false);
    expect(boundary.crossTalkDetected).toBe(true);
  });

  it('probe bundle stays honest: no AAA flags, no band pass', () => {
    const bundle = runGfAiFixtureProbe();
    expect(bundle.workforceAiAaaReady).toBe(false);
    expect(bundle.gfAiBandPassed).toBe(false);
    expect(bundle.marketingAllowed).toBe(false);
    expect(bundle.parallel.collapseFree).toBe(true);
    expect(bundle.isolation.noSlotCollision).toBe(true);
    expect(bundle.boundary.boundaryPass).toBe(true);
  });
});
