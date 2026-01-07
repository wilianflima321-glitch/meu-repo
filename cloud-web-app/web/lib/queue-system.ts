/**
 * Queue System - BullMQ para Jobs Assíncronos
 * 
 * Sistema de filas para processamento de tarefas pesadas:
 * - Emails transacionais
 * - Exports de projetos
 * - Processamento de assets
 * - AI batch jobs
 * - Webhooks
 * 
 * Usa Redis como backend para persistência e distribuição.
 */

import { Queue, Worker, Job, QueueEvents, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

// ============================================================================
// CONFIGURAÇÃO REDIS
// ============================================================================

const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Conexão singleton
let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);
    
    redisConnection.on('error', (error) => {
      console.error('[QueueSystem] Redis connection error:', error);
    });
    
    redisConnection.on('connect', () => {
      console.log('[QueueSystem] Redis connected');
    });
  }
  return redisConnection;
}

// ============================================================================
// TIPOS DE JOBS
// ============================================================================

export type JobType =
  | 'email:send'
  | 'email:welcome'
  | 'email:password-reset'
  | 'email:invoice'
  | 'export:project'
  | 'export:game'
  | 'asset:process'
  | 'asset:thumbnail'
  | 'asset:optimize'
  | 'ai:batch'
  | 'ai:embedding'
  | 'ai:moderation'
  | 'webhook:send'
  | 'analytics:aggregate'
  | 'backup:create'
  | 'backup:restore';

export interface JobData {
  type: JobType;
  userId?: string;
  payload: Record<string, unknown>;
  priority?: number;
  retries?: number;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
}

export interface ExportJobData {
  projectId: string;
  userId: string;
  format: 'zip' | 'html5' | 'electron';
  options: Record<string, unknown>;
}

export interface AssetJobData {
  assetId: string;
  userId: string;
  operation: 'process' | 'thumbnail' | 'optimize' | 'convert';
  options: Record<string, unknown>;
}

export interface AIBatchJobData {
  userId: string;
  operation: 'embedding' | 'moderation' | 'batch-chat';
  items: Array<{ id: string; content: string }>;
  model?: string;
}

export interface WebhookJobData {
  url: string;
  event: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

// ============================================================================
// FILAS
// ============================================================================

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'aethel:email',
  EXPORT: 'aethel:export',
  ASSET: 'aethel:asset',
  AI: 'aethel:ai',
  WEBHOOK: 'aethel:webhook',
  ANALYTICS: 'aethel:analytics',
  BACKUP: 'aethel:backup',
} as const;

// Default job options
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs for debugging
    age: 7 * 24 * 3600, // 7 days
  },
};

// ============================================================================
// CLASSE PRINCIPAL: QUEUE MANAGER
// ============================================================================

class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private events: Map<string, QueueEvents> = new Map();
  private initialized = false;
  
  /**
   * Inicializa todas as filas
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const connection = getRedisConnection();
    
    // Cria filas
    for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);
      
      // Event listeners
      const events = new QueueEvents(queueName, { connection });
      this.events.set(queueName, events);
      
      events.on('completed', ({ jobId }) => {
        console.log(`[Queue:${name}] Job ${jobId} completed`);
      });
      
      events.on('failed', ({ jobId, failedReason }) => {
        console.error(`[Queue:${name}] Job ${jobId} failed:`, failedReason);
      });
    }
    
    this.initialized = true;
    console.log('[QueueManager] All queues initialized');
  }
  
  /**
   * Adiciona job a uma fila
   */
  async addJob<T extends Record<string, unknown>>(
    queueName: string,
    jobType: JobType,
    data: T,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
      jobId?: string;
    }
  ): Promise<Job<T>> {
    await this.initialize();
    
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const job = await queue.add(
      jobType,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        ...options,
        jobId: options?.jobId,
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
      }
    );
    
    console.log(`[QueueManager] Added job ${job.id} to ${queueName}`);
    return job as Job<T>;
  }
  
  /**
   * Registra worker para processar jobs
   */
  registerWorker<T>(
    queueName: string,
    processor: (job: Job<T>) => Promise<unknown>,
    concurrency = 5
  ): Worker {
    const connection = getRedisConnection();
    
    const worker = new Worker(
      queueName,
      async (job) => {
        console.log(`[Worker:${queueName}] Processing job ${job.id}: ${job.name}`);
        try {
          const result = await processor(job as Job<T>);
          return result;
        } catch (error) {
          console.error(`[Worker:${queueName}] Job ${job.id} error:`, error);
          throw error;
        }
      },
      { connection, concurrency }
    );
    
    worker.on('completed', (job) => {
      console.log(`[Worker:${queueName}] Job ${job.id} completed`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, err);
    });
    
    this.workers.set(queueName, worker);
    console.log(`[QueueManager] Worker registered for ${queueName} (concurrency: ${concurrency})`);
    
    return worker;
  }
  
  /**
   * Retorna estatísticas de uma fila
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    await this.initialize();
    
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    return { waiting, active, completed, failed, delayed };
  }
  
  /**
   * Retorna estatísticas de todas as filas
   */
  async getAllStats(): Promise<Record<string, {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>> {
    const stats: Record<string, any> = {};
    
    for (const queueName of Object.values(QUEUE_NAMES)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }
  
  /**
   * Pausa uma fila
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      console.log(`[QueueManager] Queue ${queueName} paused`);
    }
  }
  
  /**
   * Resume uma fila
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`[QueueManager] Queue ${queueName} resumed`);
    }
  }
  
  /**
   * Limpa jobs completos/falhos
   */
  async cleanQueue(
    queueName: string,
    grace: number = 0,
    limit: number = 1000,
    type: 'completed' | 'failed' | 'delayed' | 'wait' | 'active' = 'completed'
  ): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;
    
    const removed = await queue.clean(grace, limit, type);
    console.log(`[QueueManager] Cleaned ${removed.length} ${type} jobs from ${queueName}`);
    return removed.length;
  }
  
  /**
   * Fecha todas as conexões
   */
  async shutdown(): Promise<void> {
    console.log('[QueueManager] Shutting down...');
    
    // Fecha workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`[QueueManager] Worker ${name} closed`);
    }
    
    // Fecha event listeners
    for (const [name, events] of this.events) {
      await events.close();
    }
    
    // Fecha filas
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[QueueManager] Queue ${name} closed`);
    }
    
    // Fecha Redis
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }
    
    this.initialized = false;
    console.log('[QueueManager] Shutdown complete');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForQueue = globalThis as unknown as {
  queueManager: QueueManager | undefined;
};

export const queueManager = globalForQueue.queueManager ?? new QueueManager();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.queueManager = queueManager;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Envia email via fila
 */
export async function queueEmail(data: EmailJobData, options?: { delay?: number }): Promise<Job> {
  return queueManager.addJob(QUEUE_NAMES.EMAIL, 'email:send', data, options);
}

/**
 * Queue export de projeto
 */
export async function queueProjectExport(data: ExportJobData): Promise<Job> {
  return queueManager.addJob(QUEUE_NAMES.EXPORT, 'export:project', data, {
    priority: 5, // Higher priority
  });
}

/**
 * Queue processamento de asset
 */
export async function queueAssetProcess(data: AssetJobData): Promise<Job> {
  return queueManager.addJob(QUEUE_NAMES.ASSET, 'asset:process', data);
}

/**
 * Queue batch de IA
 */
export async function queueAIBatch(data: AIBatchJobData): Promise<Job> {
  return queueManager.addJob(QUEUE_NAMES.AI, 'ai:batch', data);
}

/**
 * Queue webhook
 */
export async function queueWebhook(data: WebhookJobData): Promise<Job> {
  return queueManager.addJob(QUEUE_NAMES.WEBHOOK, 'webhook:send', data, {
    attempts: 5,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default queueManager;
export { Queue, Worker, Job } from 'bullmq';
