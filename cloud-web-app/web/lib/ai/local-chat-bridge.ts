/**
 * Bridges `LocalInferenceManager` (WebLLM) into the main IDE AI Chat panel
 * (Missão Executiva 4 — O Motor de Inteligência Local).
 *
 * Hardware Defense: every path that could load/run the local model funnels
 * through `ensureLocalEngineReady()`, which re-checks
 * `localInferenceManager.checkHardwareCapability()` (deviceMemory + WebGPU)
 * before doing anything — including on a page you didn't just activate local
 * AI from, e.g. after a reload. Callers (see `useAIChatController`) treat any
 * `false`/thrown result as "use the cloud API", never as a hard error.
 */
'use client';

import { localInferenceManager } from './local-inference-manager';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('local-chat-bridge');

const ACTIVE_KEY = 'aethel:local-ai:active';
const MODEL_KEY = 'aethel:local-ai:model';

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** True once the user has successfully downloaded/activated a local model at least once (see `LocalAIModal`). */
export function isLocalAIActivated(): boolean {
  return safeLocalStorage()?.getItem(ACTIVE_KEY) === 'true';
}

export function setLocalAIActivated(active: boolean, modelId?: string): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (active) {
    storage.setItem(ACTIVE_KEY, 'true');
    if (modelId) storage.setItem(MODEL_KEY, modelId);
  } else {
    storage.removeItem(ACTIVE_KEY);
  }
}

function getActivatedModelId(): string {
  return safeLocalStorage()?.getItem(MODEL_KEY) || 'Llama-3-8B-Instruct-q4f32_1-MLC';
}

let loadPromise: Promise<boolean> | null = null;

/**
 * Ensures the WebLLM engine is loaded and ready for `chatCompletion` calls.
 * Returns `false` (never throws) whenever local inference should be skipped:
 * activation flag unset, hardware gate fails, or the engine fails to load —
 * every one of those is a legitimate "fall back to the cloud" outcome, not
 * an application error.
 */
export async function ensureLocalEngineReady(): Promise<boolean> {
  if (!isLocalAIActivated()) return false;

  const status = localInferenceManager.getStatus();
  if (status.isLoaded) return true;
  if (status.isDownloading) return false; // Don't stack concurrent loads; caller falls back to cloud for this turn.

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const hardware = await localInferenceManager.checkHardwareCapability();
    if (!hardware.supported) {
      log.warn('local-ai.hardware_gate_failed', { reason: hardware.reason });
      setLocalAIActivated(false);
      return false;
    }

    try {
      const worker = new Worker(new URL('./mlc-worker.ts', import.meta.url), { type: 'module' });
      await localInferenceManager.loadModel(worker, getActivatedModelId());
      return true;
    } catch (error) {
      log.error('local-ai.load_failed', error);
      return false;
    }
  })();

  const result = await loadPromise;
  loadPromise = null;
  return result;
}

export interface LocalChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Runs a chat completion entirely on-device. Callers must call
 * `ensureLocalEngineReady()` first and only invoke this when it resolved
 * `true` — this function throws on failure instead of silently falling back,
 * so the caller's existing cloud-path `catch` handles the fallback in one
 * place (see `useAIChatController.handleSendMessage`).
 */
export async function generateLocalChatReply(messages: LocalChatMessage[]): Promise<string> {
  return localInferenceManager.chatCompletion(messages, { temperature: 0.7, maxTokens: 1024 });
}
