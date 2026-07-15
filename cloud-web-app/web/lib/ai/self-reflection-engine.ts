/**
 * AI SELF-REFLECTION ENGINE (the "critic")
 *
 * Acts as a verification layer over the generative AI. Before a proposed change
 * is applied to a project (game/film), this engine checks whether the change is
 * logically, physically, and narratively consistent, and whether it meets the
 * quality bar.
 *
 * Honesty contract: this critic must never rubber-stamp. When it cannot actually
 * verify a change (no AI provider configured, or the verifier returns an
 * unparseable response), it FAILS CLOSED — the action is reported as unverified
 * and not approved — instead of returning a fake `passed: true`.
 */

import { aiService } from '../ai-service';
import { parseRepairedJson } from './json-repair';

import { getModelRobustnessProfile } from './model-robustness-profiles'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('ai/self-reflection-engine')

export interface ProposedAction {
  type: 'create_code' | 'create_asset' | 'modify_story' | 'delete_file';
  content: unknown;
  reasoning: string;
}

export interface ProjectReflectionContext {
  worldRules?: unknown;
  timeline?: unknown;
  [key: string]: unknown;
}

export interface ReflectionResult {
  approved: boolean;
  critique: string[];
  suggestions: string[];
  confidenceScore: number; // 0.0 to 1.0
}

interface CheckOutcome {
  passed: boolean;
  issues: string[];
  suggestions: string[];
  score: number;
}

export class SelfReflectionEngine {

  /**
   * The "moment of doubt": the critic stops and asks whether the proposed
   * action actually makes sense before it is applied.
   */
  async reflectOnAction(action: ProposedAction, projectContext: ProjectReflectionContext): Promise<ReflectionResult> {
    log.info(`[SelfReflection] Reviewing action: ${action.type}`);

    if (aiService.getAvailableProviders().length === 0) {
      return {
        approved: false,
        critique: ['Reflection could not run: no AI provider is configured. The action is unverified.'],
        suggestions: ['Configure an AI provider to enable self-reflection before applying changes.'],
        confidenceScore: 0,
      };
    }

    const physicsCheck = await this.checkPhysicsAndLogic(action, projectContext);
    if (!physicsCheck.passed) {
      return {
        approved: false,
        critique: ['World logic / physics violation detected.', ...physicsCheck.issues],
        suggestions: physicsCheck.suggestions,
        confidenceScore: Math.min(0.3, physicsCheck.score),
      };
    }

    const continuityCheck = await this.checkContinuity(action, projectContext);
    if (!continuityCheck.passed) {
      return {
        approved: false,
        critique: ['Temporal / narrative continuity error.', ...continuityCheck.issues],
        suggestions: continuityCheck.suggestions,
        confidenceScore: Math.min(0.4, continuityCheck.score),
      };
    }

    const qualityCheck = await this.checkQualityStandards(action);
    return {
      approved: qualityCheck.passed,
      critique: qualityCheck.issues,
      suggestions: qualityCheck.suggestions,
      confidenceScore: qualityCheck.score,
    };
  }

  /**
   * Run a single JSON-structured verification through the LLM. Fails closed
   * (passed=false) when the model is unavailable or returns an unparseable
   * answer, so an unverifiable action is never silently approved.
   */
  private async runJsonCheck(systemPrompt: string, userPrompt: string, label: string): Promise<CheckOutcome> {
    try {
      const response = await aiService.query(userPrompt, undefined, {
        systemPrompt,
        temperature: 0,
        maxTokens: 700,
      });
      
      const record = await parseRepairedJson<Record<string, unknown>>(response.content, 'CheckOutcome: { passed: boolean, issues: string[], suggestions: string[], score: number }');
      
      if (typeof record.passed !== 'boolean') {
        throw new Error('Missing boolean "passed" field');
      }

      const toStringArray = (value: unknown): string[] =>
        Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
      const score =
        typeof record.score === 'number' && record.score >= 0 && record.score <= 1
          ? record.score
          : record.passed
            ? 0.8
            : 0.3;
      return {
        passed: record.passed,
        issues: toStringArray(record.issues),
        suggestions: toStringArray(record.suggestions),
        score,
      };
    } catch (error) {
      log.error(`[SelfReflection] ${label} failed`, error instanceof Error ? error : undefined);
      return {
        passed: false,
        issues: [`${label}: reflection call failed; action is unverified.`],
        suggestions: ['Retry the reflection or review the change manually.'],
        score: 0,
      };
    }
  }

  private async checkPhysicsAndLogic(action: ProposedAction, context: ProjectReflectionContext): Promise<CheckOutcome> {
    const systemPrompt =
      'You are the World Logic Validator. Decide whether a proposed change breaks the project\'s established physical or logical rules. ' +
      'Respond ONLY with JSON: { "passed": boolean, "issues": string[], "suggestions": string[], "score": number }.';
    const userPrompt = [
      `World rules: ${JSON.stringify(context.worldRules ?? 'Standard reality')}`,
      `Proposed action: ${JSON.stringify(action)}`,
      'Does this action break any established physical or logical rule?',
    ].join('\n');
    return this.runJsonCheck(systemPrompt, userPrompt, 'physics-logic');
  }

  private async checkContinuity(action: ProposedAction, context: ProjectReflectionContext): Promise<CheckOutcome> {
    const systemPrompt =
      'You are the Continuity Validator. Decide whether a proposed change contradicts established timeline or narrative facts. ' +
      'Respond ONLY with JSON: { "passed": boolean, "issues": string[], "suggestions": string[], "score": number }.';
    const userPrompt = [
      `Timeline / established facts: ${JSON.stringify(context.timeline ?? 'None provided')}`,
      `Proposed action: ${JSON.stringify(action)}`,
      'Does this action contradict anything already established?',
    ].join('\n');
    return this.runJsonCheck(systemPrompt, userPrompt, 'continuity');
  }

  private async checkQualityStandards(action: ProposedAction): Promise<CheckOutcome> {
    const systemPrompt =
      'You are the Quality Validator. Judge whether the proposed change meets professional quality standards (correctness, best practices, no fake/placeholder output). ' +
      'Respond ONLY with JSON: { "passed": boolean, "issues": string[], "suggestions": string[], "score": number }.';
    const userPrompt = `Proposed action: ${JSON.stringify(action)}\nDoes it meet professional quality standards?`;
    return this.runJsonCheck(systemPrompt, userPrompt, 'quality');
  }
}

export const selfReflection = new SelfReflectionEngine();
