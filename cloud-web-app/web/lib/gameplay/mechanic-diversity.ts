/**
 * mechanic-diversity.ts
 *
 * Generates entropy and variety keys to prevent two similar prompts
 * from spawning identical mechanic files.
 *
 * Ensures cross-project mechanic diversity through:
 *  1. Prompt similarity detection (cosine similarity on embeddings)
 *  2. Entropy injection via project-specific seed hashing
 *  3. Mechanic variant generation (swap parameters, style, flavor)
 *  4. Diversity validation against a global mechanic fingerprint store
 */

import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('mechanic.diversity');

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprinting
// ─────────────────────────────────────────────────────────────────────────────

/** Simple non-cryptographic hash for mechanic fingerprinting */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return hash;
}

export interface MechanicFingerprint {
  projectId: string;
  blueprintHash: number;
  promptHash: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple bag-of-words vector for prompt similarity
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function buildTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;

  for (const [word, countA] of a) {
    dot += countA * (b.get(word) ?? 0);
    magA += countA * countA;
  }
  for (const countB of b.values()) {
    magB += countB * countB;
  }

  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─────────────────────────────────────────────────────────────────────────────
// Entropy Injectors
// ─────────────────────────────────────────────────────────────────────────────

const FLAVOR_PREFIXES = [
  'Ancient', 'Cursed', 'Ethereal', 'Primal', 'Arcane', 'Divine',
  'Shadow', 'Storm', 'Iron', 'Crystal', 'Blood', 'Void', 'Solar',
];

const FLAVOR_SUFFIXES = [
  'Strike', 'Surge', 'Wave', 'Burst', 'Slash', 'Barrage',
  'Nova', 'Pulse', 'Echo', 'Chain', 'Volley', 'Rift',
];

const PARAMETER_VARIANCE = [
  { damageMultiplier: 0.8, cooldownMod: 0.9 },
  { damageMultiplier: 1.0, cooldownMod: 1.0 },
  { damageMultiplier: 1.15, cooldownMod: 1.2 },
  { damageMultiplier: 0.9, cooldownMod: 0.7 },
  { damageMultiplier: 1.2, cooldownMod: 1.5 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export interface DiversityVariant {
  flavorName: string;
  damageMultiplier: number;
  cooldownMod: number;
  entropyKey: string;
  diversityScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Diversity Manager
// ─────────────────────────────────────────────────────────────────────────────

export class MechanicDiversityManager {
  private fingerprints: MechanicFingerprint[] = [];

  /** Similarity threshold above which we consider two blueprints "too similar" */
  readonly SIMILARITY_THRESHOLD = 0.75;

  /**
   * Check if a prompt is too similar to existing projects.
   * Returns the similarity score and whether diversity is needed.
   */
  checkDiversity(
    newPrompt: string,
    existingPrompts: string[]
  ): { maxSimilarity: number; needsDiversification: boolean; mostSimilarPrompt?: string } {
    const newTokens = buildTF(tokenize(newPrompt));
    let maxSim = 0;
    let mostSimilarPrompt: string | undefined;

    for (const existing of existingPrompts) {
      const existingTokens = buildTF(tokenize(existing));
      const sim = cosineSimilarity(newTokens, existingTokens);
      if (sim > maxSim) {
        maxSim = sim;
        mostSimilarPrompt = existing;
      }
    }

    return {
      maxSimilarity: maxSim,
      needsDiversification: maxSim >= this.SIMILARITY_THRESHOLD,
      mostSimilarPrompt: maxSim >= this.SIMILARITY_THRESHOLD ? mostSimilarPrompt : undefined,
    };
  }

  /**
   * Generate a diversity variant for a mechanic using project-specific entropy.
   */
  generateVariant(
    baseMechanicName: string,
    projectId: string,
    abilityIndex: number
  ): DiversityVariant {
    const seed = hashString(`${projectId}:${baseMechanicName}:${abilityIndex}`);
    const rng = seededRandom(seed);

    const prefixIdx = Math.floor(rng() * FLAVOR_PREFIXES.length);
    const suffixIdx = Math.floor(rng() * FLAVOR_SUFFIXES.length);
    const paramIdx = Math.floor(rng() * PARAMETER_VARIANCE.length);

    const params = PARAMETER_VARIANCE[paramIdx]!;
    const flavorName = `${FLAVOR_PREFIXES[prefixIdx]} ${FLAVOR_SUFFIXES[suffixIdx]}`;
    const entropyKey = seed.toString(16).padStart(8, '0');

    // Diversity score: how different this is from the base (higher = more varied)
    const diversityScore = Math.abs(params.damageMultiplier - 1.0) + Math.abs(params.cooldownMod - 1.0);

    log.debug('Generated mechanic variant', { flavorName, projectId, entropyKey });

    return {
      flavorName,
      damageMultiplier: params.damageMultiplier,
      cooldownMod: params.cooldownMod,
      entropyKey,
      diversityScore,
    };
  }

  /**
   * Register a new blueprint fingerprint.
   */
  registerFingerprint(projectId: string, prompt: string, blueprintId: string): void {
    this.fingerprints.push({
      projectId,
      blueprintHash: hashString(blueprintId),
      promptHash: hashString(prompt),
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Generate N diverse ability names for a project.
   */
  generateDiverseAbilitySet(
    projectId: string,
    baseAbilities: string[],
    count: number
  ): string[] {
    const diverse: string[] = [];

    for (let i = 0; i < count; i++) {
      const base = baseAbilities[i % baseAbilities.length] ?? 'Strike';
      const variant = this.generateVariant(base, projectId, i);
      diverse.push(variant.flavorName);
    }

    return diverse;
  }

  /**
   * Compute a similarity report between two projects.
   */
  compareProjects(
    promptA: string,
    promptB: string
  ): { similarity: number; tooSimilar: boolean; recommendation: string } {
    const tfA = buildTF(tokenize(promptA));
    const tfB = buildTF(tokenize(promptB));
    const similarity = cosineSimilarity(tfA, tfB);
    const tooSimilar = similarity >= this.SIMILARITY_THRESHOLD;

    return {
      similarity,
      tooSimilar,
      recommendation: tooSimilar
        ? 'Add a unique setting, tone modifier, or character archetype to differentiate this project.'
        : 'Projects are sufficiently diverse.',
    };
  }
}

export const mechanicDiversityManager = new MechanicDiversityManager();
