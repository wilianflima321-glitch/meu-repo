import { billingAccumulator } from '../billing/redis-billing-accumulator';
import { prisma } from '../db';
import { logger } from '@/lib/observability/logger';

export interface AIRequestConfig {
  userId: string;
  projectId?: string;
  model: string;
  estimatedTokens: number;
  type: 'prompt' | 'completion' | 'embedding';
}

export interface AIProviderContext {
  apiKey: string;
  isCustomKey: boolean;
  onCompletion: (actualTokens: number) => Promise<void>;
}

export class AIProviderInterceptor {
  /**
   * Prepara o contexto de chamada da IA, verificando BYOK (Bring Your Own Key)
   * e configurando o hook de cobrança.
   */
  public static async prepareContext(config: AIRequestConfig): Promise<AIProviderContext> {
    // 1. Busca configurações do usuário para checar BYOK
    const userSettings = await prisma.user.findUnique({
      where: { id: config.userId },
      select: { byokKey: true }
    });

    let apiKey = process.env.OPENAI_API_KEY || '';
    let isCustomKey = false;

    // Se o usuário forneceu a própria chave, nós usamos ela e ISENTAMOS a cobrança
    if (userSettings?.byokKey) {
      try {
        const { decryptString } = await import('@/lib/server/crypto');
        apiKey = decryptString(userSettings.byokKey);
        isCustomKey = true;
      } catch (e) {
        logger.error('Failed to decrypt database BYOK key in interceptor', e);
      }
    }

    return {
      apiKey,
      isCustomKey,
      onCompletion: async (actualTokens: number) => {
        // Se foi BYOK, não cobramos absolutamente nada do Ledger interno.
        if (isCustomKey) return;

        // Se foi nossa chave corporativa, joga no Redis Stream!
        await billingAccumulator.consumeTokens({
          userId: config.userId,
          projectId: config.projectId,
          tokensUsed: actualTokens,
          type: config.type,
          model: config.model,
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}
