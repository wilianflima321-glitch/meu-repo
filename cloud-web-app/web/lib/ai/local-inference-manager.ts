// @aethel-heavy-async-boundary
import { CreateWebWorkerMLCEngine, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { EventEmitter } from 'events';

export interface LocalModelOption {
  id: string;
  name: string;
  size: string;
  vram: string;
  description: string;
}

export const LOCAL_MODEL_OPTIONS: LocalModelOption[] = [
  {
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Mini',
    size: '~2.2 GB',
    vram: '~2.0 GB',
    description: 'Ultra-light model for fast responses on integrated GPUs.'
  },
  {
    id: 'Llama-3-8B-Instruct-q4f16_1-MLC',
    name: 'Llama 3 8B Balanced',
    size: '~4.0 GB',
    vram: '~4.0 GB',
    description: 'Balanced performance and accuracy for standard GPUs.'
  },
  {
    id: 'Llama-3-8B-Instruct-q4f32_1-MLC',
    name: 'Llama 3 8B HQ',
    size: '~4.5 GB',
    vram: '~4.5 GB',
    description: 'High-precision Llama-3 model for high-end gaming GPUs.'
  }
];

export class LocalInferenceManager extends EventEmitter {
  private engine: WebWorkerMLCEngine | null = null;
  private isLoaded = false;
  private isDownloading = false;
  private activeModelId: string | null = null;

  /**
   * Physically probes whether the user's machine can run local inference on the GPU.
   *
   * Hardware Defense (Severe Risk Warning — Golden Rule for WebLLM): this is
   * called BEFORE any model download/load is attempted, anywhere in the app.
   * Two independent gates, checked cheapest-first:
   *   1. `navigator.deviceMemory` — system RAM estimate. Below 8GB, refuse
   *      outright: even if WebGPU reports a usable adapter, a low-RAM
   *      machine downloading a multi-GB model and keeping it resident tends
   *      to thrash into swap or crash the tab (Chrome kills the renderer on
   *      OOM, not just the WASM heap). `deviceMemory` is coarse (buckets:
   *      0.25/0.5/1/2/4/8) and unavailable on Safari/Firefox — treated as
   *      "unknown, don't block" rather than "fail", so browsers without the
   *      API fall through to the WebGPU/VRAM check instead of being
   *      permanently locked out.
   *   2. WebGPU adapter + `maxStorageBufferBindingSize` — existing VRAM proxy.
   * Any caller that skips this check and downloads a model directly is a bug.
   */
  public async checkHardwareCapability(): Promise<{ supported: boolean; reason?: string }> {
    const deviceMemoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof deviceMemoryGb === 'number' && deviceMemoryGb < 8) {
      return {
        supported: false,
        reason: `This device reports ${deviceMemoryGb}GB of RAM — local AI needs at least 8GB. Using the cloud API instead.`,
      };
    }

    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU is not supported in this browser.' };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        return { supported: false, reason: 'No suitable GPU adapter was found.' };
      }

      const limits = adapter.limits;
      if (limits.maxStorageBufferBindingSize < 1073741824) { // Less than 1GB max buffer binding
        return { supported: false, reason: 'GPU does not meet the minimum VRAM requirement (min: 4GB free).' };
      }

      return { supported: true };
    } catch (e) {
      return { supported: false, reason: 'Failed to access the GPU.' };
    }
  }

  public getModelOptions(): LocalModelOption[] {
    return LOCAL_MODEL_OPTIONS;
  }

  /**
   * Triggers the (first-time only) download and loads the selected model into VRAM.
   */
  public async loadModel(worker: Worker, modelId: string): Promise<void> {
    if (this.isLoaded && this.activeModelId === modelId) return;
    if (this.isDownloading) return;

    this.isDownloading = true;
    this.activeModelId = modelId;
    this.isLoaded = false;
    this.emit('progress', { text: 'Starting local inference engine download...', progress: 0 });

    try {
      this.engine = await CreateWebWorkerMLCEngine(
        worker,
        modelId,
        {
          initProgressCallback: (progress: any) => {
            this.emit('progress', { 
              text: progress.text, 
              progress: Math.round(progress.progress * 100) 
            });
          }
        }
      );

      this.isLoaded = true;
      this.emit('ready');
    } catch (error) {
      this.activeModelId = null;
      this.emit('error', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Generic local chat completion — the shared primitive behind both NPC
   * dialogue and the IDE's AI Chat panel (Missão Executiva 4). Runs entirely
   * inside a WebWorker via WebGPU, so it never blocks the render/main thread.
   */
  public async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    if (!this.engine || !this.isLoaded) {
      throw new Error('Local inference engine is not loaded.');
    }

    this.emit('inference-start');
    try {
      const reply = await this.engine.chat.completions.create({
        messages: messages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      });

      return reply.choices[0].message.content || '';
    } finally {
      this.emit('inference-end');
    }
  }

  /**
   * Zero-latency local chat inference for gameplay use cases (e.g. NPC dialogue).
   * Runs entirely inside a WebWorker via WebGPU, so it never blocks the render thread.
   */
  public async generateNPCDialogue(npcLore: string, playerAction: string): Promise<string> {
    const systemPrompt = `You are an NPC in a game. Your background/lore is as follows:
${npcLore}
Respond briefly, naturally, and immersively to the player's action or line. Never break character.`;

    const reply = await this.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: playerAction },
      ],
      { temperature: 0.7, maxTokens: 150 }
    );
    return reply || '...';
  }

  public getStatus() {
    return {
      isLoaded: this.isLoaded,
      isDownloading: this.isDownloading,
      activeModelId: this.activeModelId
    };
  }

  public dispose(): void {
    if (this.engine) {
      this.engine = null;
    }
    this.isLoaded = false;
    this.isDownloading = false;
    this.activeModelId = null;
  }
}

export const localInferenceManager = new LocalInferenceManager();
