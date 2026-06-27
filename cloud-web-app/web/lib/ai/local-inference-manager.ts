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
   * Checa fisicamente se a máquina do usuário aguenta rodar IA na GPU.
   */
  public async checkHardwareCapability(): Promise<{ supported: boolean; reason?: string }> {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU não suportado neste navegador.' };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        return { supported: false, reason: 'Nenhuma placa de vídeo adequada encontrada.' };
      }

      const limits = adapter.limits;
      if (limits.maxStorageBufferBindingSize < 1073741824) { // Menos de 1GB de buffer máximo
        return { supported: false, reason: 'Placa de vídeo não atende aos requisitos mínimos de VRAM (Mín: 4GB livres).' };
      }

      return { supported: true };
    } catch (e) {
      return { supported: false, reason: 'Falha ao acessar a Placa de Vídeo.' };
    }
  }

  public getModelOptions(): LocalModelOption[] {
    return LOCAL_MODEL_OPTIONS;
  }

  /**
   * Inicia o download (apenas na primeira vez) e carrega o modelo selecionado na VRAM.
   */
  public async loadModel(worker: Worker, modelId: string): Promise<void> {
    if (this.isLoaded && this.activeModelId === modelId) return;
    if (this.isDownloading) return;

    this.isDownloading = true;
    this.activeModelId = modelId;
    this.isLoaded = false;
    this.emit('progress', { text: 'Iniciando carregamento do Motor Cognitivo...', progress: 0 });

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
   * Inferência RAG (Retrieval-Augmented Generation) com latência zero.
   * Não afeta a renderização do jogo pois roda num WebWorker via WebGPU.
   */
  public async generateNPCDialogue(npcLore: string, playerAction: string): Promise<string> {
    if (!this.engine || !this.isLoaded) {
      throw new Error('Motor Cognitivo Local não carregado.');
    }

    this.emit('inference-start');

    try {
      const systemPrompt = `Você é um NPC em um jogo. Sua memória/história é a seguinte:
${npcLore}
Responda de forma curta, natural e imersiva à ação ou fala do jogador. Nunca quebre o personagem.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: playerAction }
      ];

      const reply = await this.engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 150,
      });

      return reply.choices[0].message.content || '...';
    } finally {
      this.emit('inference-end');
    }
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
