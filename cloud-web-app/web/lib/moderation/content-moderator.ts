/**
 * content-moderator.ts  — Sprint V33
 *
 * AI-powered content moderation for Aethel Engine.
 *
 * Responsibilities:
 *   - Text prompt safety scoring (blocks harmful generation requests)
 *   - 3D mesh thumbnail visual safety scoring
 *   - DMCA flag pipeline for marketplace assets
 *   - GDPR Right-to-be-Forgotten cascade (prompts + embeddings)
 *
 * Architecture:
 *   - Text classification uses a local keyword/pattern blocklist as a
 *     first-pass filter, then dispatches to the AI safety endpoint.
 *   - Visual scoring calls /api/ai/vision-moderate with a base64 thumbnail.
 *   - Results are stored in GeneratedAsset.moderationStatus.
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { telemetry } from '@/lib/observability/telemetry';

const log = createComponentLogger('content-moderator');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModerationStatus = 'approved' | 'flagged' | 'rejected' | 'pending' | 'manual_review';

export type ModerationCategory =
  | 'safe'
  | 'violence'
  | 'adult_content'
  | 'hate_speech'
  | 'copyright'
  | 'pii'
  | 'self_harm'
  | 'dangerous_content';

export interface ModerationResult {
  status: ModerationStatus;
  score: number;               // 0..1 (0=safe, 1=definitely harmful)
  categories: Partial<Record<ModerationCategory, number>>;
  reason?: string;
  assetId?: string;
  reviewedAt: string;
  requiresManualReview: boolean;
}

export interface DMCAFlag {
  assetId: string;
  reporterId: string;
  claimDescription: string;
  flaggedAt: string;
  status: 'pending' | 'upheld' | 'dismissed';
  originalWorkUrl?: string;
}

export interface GDPRDeletionRequest {
  userId: string;
  requestedAt: string;
  /** Types of data to delete */
  scope: Array<'prompts' | 'embeddings' | 'generated_assets' | 'account'>;
}

// ---------------------------------------------------------------------------
// Text safety: keyword blocklist first pass
// ---------------------------------------------------------------------------

const BLOCKLIST_PATTERNS = [
  /child.*?nude|nude.*?child|CSAM/i,
  /instructions.*?(bomb|weapon|poison|explosive)/i,
  /how.*?to.*?(make|build|create).*?(weapon|explosive|drug)/i,
  /doxx|personal.*?information.*?leak/i,
];

const FLAGGED_PATTERNS = [
  /gore|graphic.*?violence|torture/i,
  /explicit.*?sex|pornograph/i,
  /hate.*?speech|racist|nazi/i,
];

function textFirstPass(prompt: string): {
  blocked: boolean;
  flagged: boolean;
  category: ModerationCategory | null;
} {
  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(prompt)) return { blocked: true, flagged: true, category: 'dangerous_content' };
  }
  for (const pattern of FLAGGED_PATTERNS) {
    if (pattern.test(prompt)) {
      const cat: ModerationCategory =
        /sex|porn/i.test(prompt) ? 'adult_content' :
        /hate|racist|nazi/i.test(prompt) ? 'hate_speech' :
        'violence';
      return { blocked: false, flagged: true, category: cat };
    }
  }
  return { blocked: false, flagged: false, category: null };
}

// ---------------------------------------------------------------------------
// ContentModerator
// ---------------------------------------------------------------------------

export interface ModeratorConfig {
  /** Score threshold above which content is auto-rejected */
  autoRejectThreshold: number;
  /** Score threshold for manual review queue */
  manualReviewThreshold: number;
  /** Whether to call the AI vision endpoint for visual scoring */
  enableVisualScoring: boolean;
  /** AI moderation endpoint (null = local-only) */
  aiEndpoint: string | null;
}

export const DEFAULT_MODERATOR_CONFIG: ModeratorConfig = {
  autoRejectThreshold: 0.85,
  manualReviewThreshold: 0.5,
  enableVisualScoring: false,
  aiEndpoint: process.env.MODERATION_API_URL ?? null,
};

export class ContentModerator {
  private dmcaFlags = new Map<string, DMCAFlag>();
  private gdprQueue: GDPRDeletionRequest[] = [];

  constructor(private config: ModeratorConfig = DEFAULT_MODERATOR_CONFIG) {}

  // ── Text moderation ───────────────────────────────────────────────────────

  async moderatePrompt(prompt: string, assetId?: string): Promise<ModerationResult> {
    const span = telemetry.startSpan('moderation.text', { promptLength: prompt.length });

    try {
      const firstPass = textFirstPass(prompt);

      if (firstPass.blocked) {
        span.end('ok');
        return this.buildResult('rejected', 0.99, { [firstPass.category!]: 0.99 }, 'Blocked by safety policy', assetId);
      }

      let score = firstPass.flagged ? 0.6 : 0.0;
      const categories: Partial<Record<ModerationCategory, number>> = {};
      if (firstPass.category) categories[firstPass.category] = score;

      // AI endpoint call for deeper classification
      if (this.config.aiEndpoint) {
        try {
          const res = await fetch(`${this.config.aiEndpoint}/moderate/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: prompt }),
          });
          if (res.ok) {
            const data = await res.json() as { score: number; categories: Record<string, number> };
            score = Math.max(score, data.score);
            Object.assign(categories, data.categories);
          }
        } catch (e) {
          log.warn('AI moderation endpoint failed, using local result only', { error: String(e) });
        }
      }

      const status = this.scoreToStatus(score);
      telemetry.counter('moderation.text').add(1, { status });
      span.end('ok');
      return this.buildResult(status, score, categories, undefined, assetId);

    } catch (err) {
      span.end('error', err instanceof Error ? err : undefined);
      throw err;
    }
  }

  // ── Visual moderation (thumbnail scoring) ─────────────────────────────────

  async moderateThumbnail(thumbnailBase64: string, assetId?: string): Promise<ModerationResult> {
    if (!this.config.enableVisualScoring || !this.config.aiEndpoint) {
      return this.buildResult('pending', 0, {}, 'Visual scoring disabled', assetId);
    }

    const span = telemetry.startSpan('moderation.visual', { assetId });

    try {
      const res = await fetch(`${this.config.aiEndpoint}/moderate/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: thumbnailBase64 }),
      });

      if (!res.ok) throw new Error(`Vision API error: ${res.status}`);

      const data = await res.json() as { score: number; categories: Record<string, number> };
      const status = this.scoreToStatus(data.score);

      telemetry.counter('moderation.visual').add(1, { status });
      span.end('ok');
      return this.buildResult(status, data.score, data.categories as Partial<Record<ModerationCategory, number>>, undefined, assetId);

    } catch (err) {
      span.end('error', err instanceof Error ? err : undefined);
      return this.buildResult('manual_review', 0.5, {}, 'Visual scoring failed — queued for manual review', assetId);
    }
  }

  // ── DMCA pipeline ─────────────────────────────────────────────────────────

  flagForDMCA(assetId: string, reporterId: string, claim: string, originalWorkUrl?: string): DMCAFlag {
    const flag: DMCAFlag = {
      assetId,
      reporterId,
      claimDescription: claim,
      flaggedAt: new Date().toISOString(),
      status: 'pending',
      originalWorkUrl,
    };
    this.dmcaFlags.set(assetId, flag);

    telemetry.counter('dmca.flagged').add(1, { assetId });
    log.info('Asset flagged for DMCA', { assetId, reporterId });
    return flag;
  }

  resolveDMCA(assetId: string, upheld: boolean): DMCAFlag | null {
    const flag = this.dmcaFlags.get(assetId);
    if (!flag) return null;
    flag.status = upheld ? 'upheld' : 'dismissed';
    telemetry.counter('dmca.resolved').add(1, { assetId, upheld: String(upheld) });
    return flag;
  }

  getDMCAFlag(assetId: string): DMCAFlag | undefined {
    return this.dmcaFlags.get(assetId);
  }

  // ── GDPR Right-to-be-Forgotten ────────────────────────────────────────────

  /**
   * Queue a GDPR deletion request.
   * The caller is responsible for cascading deletes to:
   *   - WorldMemoryBank (style embeddings, prompts)
   *   - GeneratedAsset table (prompts, style hashes)
   *   - FileStorage (generated meshes and textures)
   */
  requestGDPRDeletion(userId: string, scope: GDPRDeletionRequest['scope']): GDPRDeletionRequest {
    const req: GDPRDeletionRequest = {
      userId,
      requestedAt: new Date().toISOString(),
      scope,
    };
    this.gdprQueue.push(req);
    telemetry.counter('gdpr.deletion_request').add(1, { userId, scope: scope.join(',') });
    log.info('GDPR deletion queued', { userId, scope });
    return req;
  }

  getPendingGDPRRequests(): GDPRDeletionRequest[] {
    return [...this.gdprQueue];
  }

  acknowledgeGDPRDeletion(userId: string): void {
    const idx = this.gdprQueue.findIndex((r) => r.userId === userId);
    if (idx >= 0) this.gdprQueue.splice(idx, 1);
    log.info('GDPR deletion acknowledged', { userId });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private scoreToStatus(score: number): ModerationStatus {
    if (score >= this.config.autoRejectThreshold) return 'rejected';
    if (score >= this.config.manualReviewThreshold) return 'manual_review';
    return 'approved';
  }

  private buildResult(
    status: ModerationStatus,
    score: number,
    categories: Partial<Record<ModerationCategory, number>>,
    reason?: string,
    assetId?: string,
  ): ModerationResult {
    return {
      status,
      score,
      categories: { safe: Math.max(0, 1 - score), ...categories },
      reason,
      assetId,
      reviewedAt: new Date().toISOString(),
      requiresManualReview: status === 'manual_review',
    };
  }
}

export const contentModerator = new ContentModerator();

// ---------------------------------------------------------------------------
// Legacy sync helper (used by GenerationInspector.tsx)
// ---------------------------------------------------------------------------

export interface SyncSafetyEval {
  status: ModerationStatus;
  score: number;
}

/** Fast synchronous prompt safety check for UI display */
export function evaluateAssetSafety(prompt: string, qualityScore: number): SyncSafetyEval {
  const { blocked, flagged } = textFirstPass(prompt);
  if (blocked) return { status: 'rejected', score: 0.99 };
  if (flagged) return { status: 'flagged', score: 0.65 };
  if (qualityScore < 0.3) return { status: 'manual_review', score: 0.5 };
  return { status: 'approved', score: 0.05 };
}
