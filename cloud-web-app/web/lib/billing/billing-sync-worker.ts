import { Redis } from 'ioredis';
import { prisma } from '../db';

const BILLING_STREAM_KEY = 'aethel:billing:tokens_stream';
const CONSUMER_GROUP = 'aethel:billing:sync_group';
const CONSUMER_NAME = `worker-${process.pid}`;

export class BillingSyncWorker {
  private redis: Redis;
  private isRunning: boolean = false;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Garante que o consumer group existe
    try {
      await this.redis.xgroup('CREATE', BILLING_STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) {
        console.error('Failed to create consumer group', err);
      }
    }

    this.poll();
  }

  public stop(): void {
    this.isRunning = false;
    this.redis.quit();
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        // Bloqueia por até 5000ms esperando novos eventos no stream
        const result = await this.redis.xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', 100, // Processa em batches de 100
          'BLOCK', 5000,
          'STREAMS', BILLING_STREAM_KEY, '>'
        ) as any;

        if (result && result.length > 0) {
          const events = result[0][1];
          await this.processBatch(events);
        }
      } catch (err) {
        console.error('Error polling billing stream', err);
        await new Promise(res => setTimeout(res, 2000)); // Backoff on error
      }
    }
  }

  private async processBatch(events: any[]): Promise<void> {
    if (events.length === 0) return;

    // 1. Agrupar os tokens por usuário
    const usageByUser = new Map<string, number>();
    const eventIds: string[] = [];

    for (const event of events) {
      const id = event[0];
      const fields = event[1];
      eventIds.push(id);

      let userId = '';
      let tokensUsed = 0;

      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === 'userId') userId = fields[i + 1];
        if (fields[i] === 'tokensUsed') tokensUsed = parseInt(fields[i + 1], 10);
      }

      if (userId && tokensUsed > 0) {
        usageByUser.set(userId, (usageByUser.get(userId) || 0) + tokensUsed);
      }
    }

    // 2. Transação ACID no PostgreSQL para consolidar o saldo
    try {
      await prisma.$transaction(async (tx) => {
        for (const [userId, tokens] of usageByUser.entries()) {
          // Decrementa do UserCredits (ou incrementa em uso caso billing post-pago)
          await tx.user.update({
            where: { id: userId },
            data: {
              aiTokensUsed: { increment: tokens } // Assumindo campo aiTokensUsed no model User
            }
          });
        }
      });

      // 3. PostgreSQL Commit com Sucesso! Agora sim podemos dar ACK no Redis
      await this.redis.xack(BILLING_STREAM_KEY, CONSUMER_GROUP, ...eventIds);

      // 4. Limpar o hash 'uncommitted' para estes usuários já que agora está consolidado
      for (const [userId, tokens] of usageByUser.entries()) {
        const cacheKey = `aethel:billing:balance:${userId}`;
        // Reduz o valor uncommitted (ou zera se quisermos ser agressivos)
        // Usamos hincrby com valor negativo
        await this.redis.hincrby(cacheKey, 'tokens_used_uncommitted', -tokens);
      }

    } catch (txError) {
      console.error('Falha na transação Postgres! O Redis NÃO receberá ACK e os eventos serão reprocessados.', txError);
      // NENHUM EVENTO É PERDIDO.
    }
  }
}
