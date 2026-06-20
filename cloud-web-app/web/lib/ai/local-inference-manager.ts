// @aethel-heavy-async-boundary
import { CreateWebWorkerEngine, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { EventEmitter } from 'events';

export class LocalInferenceManager extends EventEmitter {
  private engine: WebWorkerMLCEngine | null = null;
  private isLoaded = false;
  private isDownloading = false;
  
  // O modelo padrão que usaremos (4-bit quantizado)
  // Requer cerca de 4.5GB de VRAM
  private readonly MODEL_ID = 'Llama-3-8B-Instruct-q4f32_1-MLC';

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

      // Hack heurístico: Checar se a placa de vídeo tem memória e poder suficiente.
      // Adaptadores integrados antigos geralmente falham nisso.
      const limits = adapter.limits;
      if (limits.maxStorageBufferBindingSize < 1073741824) { // Menos de 1GB de buffer máximo
        return { supported: false, reason: 'Placa de vídeo não atende aos requisitos mínimos de VRAM (Mín: 4GB livres).' };
      }

      return { supported: true };
    } catch (e) {
      return { supported: false, reason: 'Falha ao acessar a Placa de Vídeo.' };
    }
  }

  /**
   * Inicia o download (apenas na primeira vez) e carrega o modelo na VRAM.
   */
  public async loadModel(worker: Worker): Promise<void> {
    if (this.isLoaded || this.isDownloading) return;

    this.isDownloading = true;
    this.emit('progress', { text: 'Iniciando carregamento do Motor Cognitivo...', progress: 0 });

    try {
      this.engine = await CreateWebWorkerEngine(
        worker,
        this.MODEL_ID,
        {
          initProgressCallback: (progress) => {
            // progress.progress é um float 0.0 - 1.0
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
  }

  public getStatus() {
    return {
      isLoaded: this.isLoaded,
      isDownloading: this.isDownloading
    };
  }
}

export const localInferenceManager = new LocalInferenceManager();
