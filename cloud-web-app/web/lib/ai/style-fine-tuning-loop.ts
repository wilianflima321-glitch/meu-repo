/**
 * style-fine-tuning-loop.ts
 *
 * Closed-loop pipeline to train localized LoRA weights on
 * generated style-selected asset feedback.
 *
 * Architecture:
 *  1. FeedbackCollector — records creator thumbs-up/thumbs-down on generated assets
 *  2. DatasetBuilder — assembles prompt-image pairs for fine-tuning
 *  3. LoRATrainingJob — submits a training job to the fine-tuning API
 *  4. ModelRegistry — tracks available LoRA checkpoints per project
 *  5. InferenceRouter — injects LoRA weights into generation requests
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { telemetry } from '@/lib/observability/telemetry';

const log = createComponentLogger('style.finetuning');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FeedbackSignal = 'positive' | 'negative' | 'neutral';

export interface AssetFeedback {
  assetId: string;
  projectId: string;
  prompt: string;
  imageUri: string;
  signal: FeedbackSignal;
  timestamp: string;
  styleEmbedding?: number[];
}

export interface LoRACheckpoint {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  status: 'pending' | 'training' | 'ready' | 'failed';
  weightUri?: string;
  trainingLoss?: number;
  datasetSize: number;
  triggerWord: string;
}

export interface TrainingJobConfig {
  projectId: string;
  baseModel: string;
  learningRate: number;
  steps: number;
  loraRank: number;
  loraAlpha: number;
  triggerWord: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback Collector
// ─────────────────────────────────────────────────────────────────────────────

class FeedbackCollector {
  private store = new Map<string, AssetFeedback[]>();

  record(feedback: AssetFeedback): void {
    const existing = this.store.get(feedback.projectId) ?? [];
    existing.push(feedback);
    this.store.set(feedback.projectId, existing);

    telemetry.counter('finetuning.feedback').add(1, {
      projectId: feedback.projectId,
      signal: feedback.signal,
    });

    log.debug('Feedback recorded', { assetId: feedback.assetId, signal: feedback.signal });
  }

  getPositiveSamples(projectId: string): AssetFeedback[] {
    return (this.store.get(projectId) ?? []).filter(f => f.signal === 'positive');
  }

  getNegativeSamples(projectId: string): AssetFeedback[] {
    return (this.store.get(projectId) ?? []).filter(f => f.signal === 'negative');
  }

  getDatasetSize(projectId: string): number {
    return (this.store.get(projectId) ?? []).filter(f => f.signal !== 'neutral').length;
  }

  clearProject(projectId: string): void {
    this.store.delete(projectId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface FineTuningDataset {
  projectId: string;
  positiveCount: number;
  negativeCount: number;
  examples: Array<{
    prompt: string;
    imageUri: string;
    weight: number;  // 1.0 for positive, -0.5 for negative (DPO-style)
  }>;
}

function buildDataset(
  positives: AssetFeedback[],
  negatives: AssetFeedback[],
  projectId: string,
  triggerWord: string
): FineTuningDataset {
  const examples = [
    ...positives.map(f => ({
      prompt: `${triggerWord} ${f.prompt}`,
      imageUri: f.imageUri,
      weight: 1.0,
    })),
    ...negatives.map(f => ({
      prompt: `${triggerWord} ${f.prompt}`,
      imageUri: f.imageUri,
      weight: -0.5,
    })),
  ];

  return { projectId, positiveCount: positives.length, negativeCount: negatives.length, examples };
}

// ─────────────────────────────────────────────────────────────────────────────
// LoRA Training Job Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

class LoRATrainingJobDispatcher {
  constructor(private apiUrl: string) {}

  async submitJob(
    dataset: FineTuningDataset,
    config: TrainingJobConfig,
    checkpointId: string
  ): Promise<void> {
    if (!this.apiUrl) {
      log.warn('No fine-tuning API URL configured — training skipped');
      return;
    }

    log.info('Submitting LoRA training job', {
      projectId: config.projectId,
      datasetSize: dataset.examples.length,
      checkpointId,
    });

    const res = await fetch(`${this.apiUrl}/lora/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset, config, checkpointId }),
    });

    if (!res.ok) {
      throw new Error(`Training API error: ${res.status} ${await res.text()}`);
    }

    telemetry.counter('finetuning.job_submitted').add(1, { projectId: config.projectId });
  }

  async pollJobStatus(checkpointId: string): Promise<'pending' | 'training' | 'ready' | 'failed'> {
    if (!this.apiUrl) return 'pending';

    const res = await fetch(`${this.apiUrl}/lora/status/${checkpointId}`);
    if (!res.ok) return 'failed';
    const data = await res.json() as { status: string };
    return (data.status as 'pending' | 'training' | 'ready' | 'failed') ?? 'pending';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Registry
// ─────────────────────────────────────────────────────────────────────────────

class LoRAModelRegistry {
  private checkpoints = new Map<string, LoRACheckpoint[]>(); // projectId → checkpoints

  register(checkpoint: LoRACheckpoint): void {
    const existing = this.checkpoints.get(checkpoint.projectId) ?? [];
    existing.push(checkpoint);
    this.checkpoints.set(checkpoint.projectId, existing);
  }

  getLatestReady(projectId: string): LoRACheckpoint | null {
    const all = (this.checkpoints.get(projectId) ?? [])
      .filter(c => c.status === 'ready')
      .sort((a, b) => b.version - a.version);
    return all[0] ?? null;
  }

  updateStatus(checkpointId: string, status: LoRACheckpoint['status'], weightUri?: string): void {
    for (const checkpoints of this.checkpoints.values()) {
      for (const cp of checkpoints) {
        if (cp.id === checkpointId) {
          cp.status = status;
          if (weightUri) cp.weightUri = weightUri;
          return;
        }
      }
    }
  }

  listCheckpoints(projectId: string): LoRACheckpoint[] {
    return this.checkpoints.get(projectId) ?? [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main StyleFineTuningLoop
// ─────────────────────────────────────────────────────────────────────────────

export class StyleFineTuningLoop {
  private feedbackCollector = new FeedbackCollector();
  private registry = new LoRAModelRegistry();
  private dispatcher: LoRATrainingJobDispatcher;

  /** Minimum positive samples required before triggering a training run */
  readonly minSamplesForTraining = 20;

  constructor(
    private apiUrl: string = process.env.FINE_TUNING_API_URL ?? '',
    private defaultConfig: Partial<TrainingJobConfig> = {}
  ) {
    this.dispatcher = new LoRATrainingJobDispatcher(apiUrl);
  }

  // ── Feedback ingestion ──────────────────────────────────────────────────

  recordFeedback(feedback: AssetFeedback): void {
    this.feedbackCollector.record(feedback);
    log.debug('Style feedback recorded', { assetId: feedback.assetId });
  }

  // ── Training trigger ────────────────────────────────────────────────────

  async maybeStartTraining(projectId: string, triggerWord = 'aethel_style'): Promise<LoRACheckpoint | null> {
    const positives = this.feedbackCollector.getPositiveSamples(projectId);
    const negatives = this.feedbackCollector.getNegativeSamples(projectId);

    if (positives.length < this.minSamplesForTraining) {
      log.info('Not enough positive samples for training', {
        projectId,
        positives: positives.length,
        required: this.minSamplesForTraining,
      });
      return null;
    }

    const existingCheckpoints = this.registry.listCheckpoints(projectId);
    const version = existingCheckpoints.length + 1;
    const checkpointId = `lora_${projectId}_v${version}`;

    const checkpoint: LoRACheckpoint = {
      id: checkpointId,
      projectId,
      version,
      createdAt: new Date().toISOString(),
      status: 'pending',
      datasetSize: positives.length + negatives.length,
      triggerWord,
    };

    this.registry.register(checkpoint);

    const dataset = buildDataset(positives, negatives, projectId, triggerWord);
    const config: TrainingJobConfig = {
      projectId,
      baseModel: this.defaultConfig.baseModel ?? 'sdxl-base-1.0',
      learningRate: this.defaultConfig.learningRate ?? 1e-4,
      steps: Math.min(1000, positives.length * 20),
      loraRank: this.defaultConfig.loraRank ?? 16,
      loraAlpha: this.defaultConfig.loraAlpha ?? 32,
      triggerWord,
    };

    try {
      checkpoint.status = 'training';
      await this.dispatcher.submitJob(dataset, config, checkpointId);
      log.info('LoRA training job submitted', { checkpointId, version });
    } catch (err) {
      checkpoint.status = 'failed';
      log.error('Training job submission failed', { checkpointId, err });
    }

    return checkpoint;
  }

  // ── Inference injection ─────────────────────────────────────────────────

  getLoRAWeightUri(projectId: string): string | null {
    const checkpoint = this.registry.getLatestReady(projectId);
    return checkpoint?.weightUri ?? null;
  }

  injectLoRAIntoPrompt(prompt: string, projectId: string): string {
    const checkpoint = this.registry.getLatestReady(projectId);
    if (!checkpoint) return prompt;
    return `${checkpoint.triggerWord} ${prompt}`;
  }

  // ── Status polling ──────────────────────────────────────────────────────

  async syncCheckpointStatuses(projectId: string): Promise<void> {
    for (const cp of this.registry.listCheckpoints(projectId)) {
      if (cp.status === 'training') {
        const status = await this.dispatcher.pollJobStatus(cp.id);
        this.registry.updateStatus(cp.id, status);
        if (status === 'ready') {
          log.info('LoRA checkpoint ready', { checkpointId: cp.id });
        }
      }
    }
  }

  listCheckpoints(projectId: string): LoRACheckpoint[] {
    return this.registry.listCheckpoints(projectId);
  }
}

export const styleFineTuningLoop = new StyleFineTuningLoop();
