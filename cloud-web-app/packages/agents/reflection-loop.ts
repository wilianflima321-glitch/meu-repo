/**
 * reflection-loop.ts  — Sprint V31
 *
 * Background coherence critique agent.
 * Runs periodically (or on-demand) to:
 *   1. Fetch the project's style embeddings from WorldMemoryBank
 *   2. Compute pairwise coherence against the project's biome centroid
 *   3. Flag assets that deviate beyond the configured threshold
 *   4. Emit structured ReflectionReport events that the UI and other
 *      agents can consume to trigger re-generation or manual review
 *
 * This loop never modifies assets directly — it is read-only critique.
 * Writes (re-generation, deletion) are handled by the calling agent
 * or by the user acting on the report.
 */

import { WorldMemoryBank, type StyleEmbeddingRecord } from '../../web/lib/memory/world-memory-bank';
import { createComponentLogger } from '../../web/lib/observability/logger';

const log = createComponentLogger('reflection-loop');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CoherenceViolation {
  assetId: string;
  assetName: string;
  prompt: string;
  similarity: number;
  threshold: number;
  biomeName: string;
  suggestedAction: 'regenerate' | 'manual-review' | 'delete';
}

export interface ReflectionReport {
  projectId: string;
  runAt: number;
  totalAssetsScanned: number;
  violations: CoherenceViolation[];
  overallCoherenceScore: number; // 0–1: mean similarity across all assets
  durationMs: number;
}

export type ReflectionReportHandler = (report: ReflectionReport) => void;

export interface ReflectionLoopConfig {
  /** Minimum cosine similarity for an asset to be considered coherent. Default 0.72 */
  coherenceThreshold?: number;
  /** Interval in ms between automatic runs. 0 = manual only. Default 120_000 (2 min). */
  intervalMs?: number;
  /** How many assets to scan per batch (avoids blocking the main thread). Default 50. */
  batchSize?: number;
}

// ---------------------------------------------------------------------------
// Cosine similarity (duplicated from world-memory-bank to keep this module
// self-contained and avoid circular imports)
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
// ReflectionLoop
// ---------------------------------------------------------------------------

export class ReflectionLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private handlers: Set<ReflectionReportHandler> = new Set();
  private readonly threshold: number;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private isRunning = false;

  constructor(
    private readonly projectId: string,
    private readonly bank: WorldMemoryBank,
    config: ReflectionLoopConfig = {},
  ) {
    this.threshold = config.coherenceThreshold ?? 0.72;
    this.intervalMs = config.intervalMs ?? 120_000;
    this.batchSize = config.batchSize ?? 50;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.intervalId !== null || this.intervalMs === 0) return;
    this.intervalId = setInterval(() => {
      this.run().catch((err) => log.error('Reflection loop run failed', { err }));
    }, this.intervalMs);
    log.info('Reflection loop started', { intervalMs: this.intervalMs, threshold: this.threshold });
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    log.info('Reflection loop stopped');
  }

  subscribe(handler: ReflectionReportHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // ── Main critique pass ────────────────────────────────────────────────────

  async run(): Promise<ReflectionReport> {
    if (this.isRunning) {
      log.warn('Reflection loop already running — skipping overlapping run');
      return this.buildEmptyReport();
    }
    this.isRunning = true;
    const startMs = performance.now();

    try {
      const biomes = await this.bank.getBiomes();
      const embeddings = await this.bank.getStyleEmbeddings();

      if (embeddings.length === 0 || biomes.length === 0) {
        const report = this.buildEmptyReport();
        this.emit(report);
        return report;
      }

      const violations: CoherenceViolation[] = [];
      let similaritySum = 0;
      let scanned = 0;

      // Process in batches to yield to the event loop between chunks
      for (let offset = 0; offset < embeddings.length; offset += this.batchSize) {
        const batch = embeddings.slice(offset, offset + this.batchSize);

        for (const asset of batch) {
          // Find the closest biome for this asset
          const biome = await this.bank.matchBiome(asset.embedding);
          if (!biome) continue;

          const similarity = cosineSimilarity(asset.embedding, biome.embeddingCentroid);
          similaritySum += similarity;
          scanned++;

          if (similarity < this.threshold) {
            violations.push({
              assetId: asset.id,
              assetName: asset.assetName,
              prompt: asset.prompt,
              similarity,
              threshold: this.threshold,
              biomeName: biome.name,
              suggestedAction: similarity < this.threshold * 0.6 ? 'regenerate' : 'manual-review',
            });
          }
        }

        // Yield between batches
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      const report: ReflectionReport = {
        projectId: this.projectId,
        runAt: Date.now(),
        totalAssetsScanned: scanned,
        violations,
        overallCoherenceScore: scanned > 0 ? similaritySum / scanned : 1,
        durationMs: performance.now() - startMs,
      };

      log.info('Reflection loop completed', {
        scanned,
        violations: violations.length,
        coherence: report.overallCoherenceScore.toFixed(3),
      });

      this.emit(report);
      return report;
    } finally {
      this.isRunning = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private emit(report: ReflectionReport): void {
    this.handlers.forEach((h) => h(report));
  }

  private buildEmptyReport(): ReflectionReport {
    return {
      projectId: this.projectId,
      runAt: Date.now(),
      totalAssetsScanned: 0,
      violations: [],
      overallCoherenceScore: 1,
      durationMs: 0,
    };
  }

  /** Quick single-asset check without a full scan — useful before persisting a new asset. */
  async checkAsset(asset: StyleEmbeddingRecord): Promise<CoherenceViolation | null> {
    const biome = await this.bank.matchBiome(asset.embedding);
    if (!biome) return null;
    const similarity = cosineSimilarity(asset.embedding, biome.embeddingCentroid);
    if (similarity >= this.threshold) return null;
    return {
      assetId: asset.id,
      assetName: asset.assetName,
      prompt: asset.prompt,
      similarity,
      threshold: this.threshold,
      biomeName: biome.name,
      suggestedAction: similarity < this.threshold * 0.6 ? 'regenerate' : 'manual-review',
    };
  }
}
