import { Redis } from 'ioredis';

const BILLING_STREAM_KEY = 'aethel:billing:tokens_stream';

export interface TokenUsageEvent {
  userId: string;
  projectId?: string;
  tokensUsed: number;
  type: 'prompt' | 'completion' | 'embedding';
  model: string;
  timestamp: string;
}

export class RedisBillingAccumulator {
  private redis: Redis;

  constructor() {
    // Inicializa a conexão com o Redis usando a mesma URL do cache/queue
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Registra assincronamente o consumo de tokens de um usuário.
   * Não trava (lock) nenhuma linha no banco de dados.
   */
  public async consumeTokens(event: TokenUsageEvent): Promise<void> {
    // 1. Armazenamos o evento num Redis Stream (XADD)
    // O '*' significa que o Redis vai auto-gerar o ID do evento
    await this.redis.xadd(
      BILLING_STREAM_KEY,
      '*',
      'userId', event.userId,
      'projectId', event.projectId || '',
      'tokensUsed', event.tokensUsed.toString(),
      'type', event.type,
      'model', event.model,
      'timestamp', event.timestamp
    );

    // 2. Além do Stream, mantemos um hash de saldo instantâneo 'em memória'
    // para que a UI saiba do gasto na mesma hora (antes do worker sincronizar no Postgres).
    const cacheKey = `aethel:billing:balance:${event.userId}`;
    await this.redis.hincrby(cacheKey, 'tokens_used_uncommitted', event.tokensUsed);
  }

  /**
   * Obtém o consumo não-comitado de um usuário
   * para combinar com o saldo oficial que vem do PostgreSQL.
   */
  public async getUncommittedUsage(userId: string): Promise<number> {
    const cacheKey = `aethel:billing:balance:${userId}`;
    const uncommitted = await this.redis.hget(cacheKey, 'tokens_used_uncommitted');
    return uncommitted ? parseInt(uncommitted, 10) : 0;
  }
}

export const billingAccumulator = new RedisBillingAccumulator();
