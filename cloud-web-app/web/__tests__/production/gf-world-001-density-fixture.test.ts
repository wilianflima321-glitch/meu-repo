/**
 * GF-WORLD-001/002/003 fixture gates (Hard Gate #72, P3 prep).
 * Deterministic population: same seed ⇒ same placement, organic spacing,
 * biome variation, foliage/LOD histograms and AO grounding. All honesty
 * flags stay false — these fixtures prove the pipeline is not empty.
 */
import { describe, expect, it } from 'vitest';
import {
  GF_WORLD_SPACING_MIN,
  GF_WORLD_TARGET_INSTANCES,
  buildGfWorld001DensityEvidence,
  buildGfWorld002FoliageEvidence,
  buildGfWorld003AoEvidence,
  buildGfWorldPopulation,
  runGfWorldFixtureProbe,
} from '@/lib/production/gf-world-001-density-fixture';

describe('GF-WORLD-001/002/003 density fixtures', () => {
  it('population is deterministic and reaches the target instance count', () => {
    const a = buildGfWorldPopulation(0xa3e17001);
    const b = buildGfWorldPopulation(0xa3e17001);
    expect(a.instances.length).toBe(GF_WORLD_TARGET_INSTANCES);
    expect(b.instances.length).toBe(GF_WORLD_TARGET_INSTANCES);
    expect(a.attempts).toBe(b.attempts);
    for (let i = 0; i < a.instances.length; i += 1) {
      expect(a.instances[i]).toEqual(b.instances[i]);
    }
    // A different seed must produce a different population.
    const c = buildGfWorldPopulation(0xdeadbeef);
    expect(c.instances[0]).not.toEqual(a.instances[0]);
  });

  it('GF-WORLD-001: organic spacing holds — no pile-ups, not an empty PCG', () => {
    const { instances, attempts } = buildGfWorldPopulation();
    const evidence = buildGfWorld001DensityEvidence(instances, attempts, 0xa3e17001);
    expect(evidence.instanceCount).toBe(GF_WORLD_TARGET_INSTANCES);
    expect(evidence.organicSpacingPass).toBe(true);
    expect(evidence.minPairwiseSpacing).toBeGreaterThanOrEqual(GF_WORLD_SPACING_MIN * 0.9);
    expect(evidence.densityPerM2).toBeGreaterThan(0.5);
    // All three biomes populated (biome variation, not a single-biome fill).
    expect(evidence.perBiomeCounts.forest).toBeGreaterThan(0);
    expect(evidence.perBiomeCounts.desert).toBeGreaterThan(0);
    expect(evidence.perBiomeCounts.alpine).toBeGreaterThan(0);
  });

  it('GF-WORLD-002: kind variance and LOD tiers are exercised', () => {
    const { instances } = buildGfWorldPopulation();
    const evidence = buildGfWorld002FoliageEvidence(instances);
    expect(evidence.biomeKindVariationPass).toBe(true);
    expect(evidence.kindHistogram.trunk + evidence.kindHistogram.rock + evidence.kindHistogram.foliage).toBe(
      GF_WORLD_TARGET_INSTANCES,
    );
    expect(evidence.lodTierHistogram[0] + evidence.lodTierHistogram[1] + evidence.lodTierHistogram[2]).toBe(
      GF_WORLD_TARGET_INSTANCES,
    );
  });

  it('GF-WORLD-003: AO grounding — no AO-less floating instances', () => {
    const { instances } = buildGfWorldPopulation();
    const evidence = buildGfWorld003AoEvidence(instances);
    expect(evidence.aoRangePass).toBe(true);
    expect(evidence.aoMin).toBeGreaterThan(0);
    expect(evidence.aoMax).toBeLessThanOrEqual(1);
    expect(evidence.groundedRatio).toBeGreaterThan(0.5);
  });

  it('probe bundle stays honest: no AAA flags, no band pass', () => {
    const bundle = runGfWorldFixtureProbe();
    expect(bundle.worldForgeAaaReady).toBe(false);
    expect(bundle.gfWorldBandPassed).toBe(false);
    expect(bundle.marketingAllowed).toBe(false);
    expect(bundle.density.instanceCount).toBe(GF_WORLD_TARGET_INSTANCES);
    expect(bundle.foliage.biomeKindVariationPass).toBe(true);
    expect(bundle.ao.aoRangePass).toBe(true);
  });
});
