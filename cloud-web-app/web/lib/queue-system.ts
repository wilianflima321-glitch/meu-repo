import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('queue-system')


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
 * 
 * DEPENDÊNCIAS OPCIONAIS:
 * npm install bullmq ioredis
 */

// ============================================================================
// LAZY LOAD - Dependências opcionais
// ============================================================================

export interface QueueJobAdapter {
  id?: string | number;
  name: string;
  data: unknown;
  attemptsMade?: number;
  progress?: unknown;
  returnvalue?: unknown;
  failedReason?: string;
  timestamp?: number | string;
  processedOn?: number;
  finishedOn?: number;
  getState: () => Promise<string>;
  remove: () => Promise<void>;
  retry: () => Promise<void>;
}

interface QueueAdapter {
  add: (name: string, data: unknown, options: Record<string, unknown>) => Promise<QueueJobAdapter>;
  getWaitingCount: () => Promise<number>;
  getActiveCount: () => Promise<number>;
  getCompletedCount: () => Promise<number>;
  getFailedCount: () => Promise<number>;
  getDelayedCount: () => Promise<number>;
  getJobs: (states: string[], start: number, end: number, asc: boolean) => Promise<QueueJobAdapter[]>;
  getJob: (jobId: string) => Promise<QueueJobAdapter | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  clean: (grace: number, limit: number, type: string) => Promise<unknown[]>;
  close: () => Promise<void>;
}

interface QueueEventsAdapter {
  on: (event: string, listener: (payload: Record<string, unknown>) => void) => void;
  close: () => Promise<void>;
}

export interface WorkerAdapter {
  on: (event: string, listener: (job: QueueJobAdapter | undefined, err?: Error) => void) => void;
  close: () => Promise<void>;
}

interface RedisConnectionAdapter {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  quit: () => Promise<void>;
}

interface BullMQRuntime {
  Queue: new (name: string, options: { connection: RedisConnectionAdapter }) => QueueAdapter;
  QueueEvents: new (name: string, options: { connection: RedisConnectionAdapter }) => QueueEventsAdapter;
  Worker: new (
    name: string,
    processor: (job: QueueJobAdapter) => Promise<unknown>,
    options: { connection: RedisConnectionAdapter | null; concurrency: number }
  ) => WorkerAdapter;
}

type RedisConstructor = new (config: Record<string, unknown>) => RedisConnectionAdapter;

let BullMQ: BullMQRuntime | null = null;
let IORedis: RedisConstructor | null = null;
let loadAttempted = false;

async function loadDependencies(): Promise<boolean> {
  if (loadAttempted) return !!BullMQ;
  loadAttempted = true;
  
  try {
    // Dynamic imports usando eval para evitar erros de webpack
    BullMQ = (await eval('import("bullmq")')) as BullMQRuntime;
    const redisModule = (await eval('import("ioredis")')) as { default?: RedisConstructor } | RedisConstructor;
    IORedis = typeof redisModule === 'function' ? redisModule : redisModule.default || null;
    return true;
  } catch {
    log.warn('[QueueSystem] bullmq/ioredis not installed. Queue features disabled.');
    return false;
  }
}

// ============================================================================
// CONFIGURAÇÃO REDIS
// ============================================================================

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Conexão singleton
let redisConnection: RedisConnectionAdapter | null = null;

async function getRedisConnection(): Promise<RedisConnectionAdapter | null> {
  if (!await loadDependencies() || !IORedis) return null;
  
  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);
    
    redisConnection.on('error', (error: unknown) => {
      log.error('[QueueSystem] Redis connection error:', error);
    });
    
    redisConnection.on('connect', () => {
      log.info('[QueueSystem] Redis connected');
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
  | 'render:viewport'
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

export interface QueueJobSnapshot {
  id: string;
  queueName: string;
  name: string;
  state: string;
  data: unknown;
  attemptsMade: number;
  progress: unknown;
  returnvalue?: unknown;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
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
  private queues: Map<string, QueueAdapter> = new Map();
  private workers: Map<string, WorkerAdapter> = new Map();
  private events: Map<string, QueueEventsAdapter> = new Map();
  private initialized = false;
  private available = false;
  
  /**
   * Verifica se o sistema de filas está disponível
   */
  async isAvailable(): Promise<boolean> {
    await this.initialize();
    return this.available;
  }
  
  /**
   * Inicializa todas as filas
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    
    const connection = await getRedisConnection();
    if (!connection || !BullMQ) {
      log.warn('[QueueManager] Redis/BullMQ not available. Queue features disabled.');
      this.available = false;
      return;
    }
    
    this.available = true;
    const { Queue, QueueEvents } = BullMQ;
    
    // Cria filas
    for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);
      
      // Event listeners
      const events = new QueueEvents(queueName, { connection });
      this.events.set(queueName, events);
      
      events.on('completed', ({ jobId }) => {
        log.info(`[Queue:${name}] Job ${jobId} completed`);
      });
      
      events.on('failed', ({ jobId, failedReason }) => {
        log.error(`[Queue:${name}] Job ${jobId} failed:`, failedReason);
      });
    }
    
    log.info('[QueueManager] All queues initialized');
  }
  
  /**
   * Adiciona job a uma fila
   */
  async addJob<T>(
    queueName: string,
    jobType: JobType,
    data: T,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
      jobId?: string;
    }
  ): Promise<QueueJobAdapter | null> {
    await this.initialize();
    
    if (!this.available) {
      log.warn('[QueueManager] Queue system not available. Job not queued:', jobType);
      return null;
    }
    
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
    
    log.info(`[QueueManager] Added job ${job.id} to ${queueName}`);
    return job;
  }
  
  /**
   * Registra worker para processar jobs
   */
  async registerWorker(
    queueName: string,
    processor: (job: QueueJobAdapter) => Promise<unknown>,
    concurrency = 5
  ): Promise<WorkerAdapter | null> {
    await this.initialize();
    
    if (!this.available || !BullMQ) {
      log.warn('[QueueManager] Queue system not available. Worker not registered.');
      return null;
    }
    
    const connection = await getRedisConnection();
    const { Worker } = BullMQ;
    
    const worker = new Worker(
      queueName,
      async (job: QueueJobAdapter) => {
        log.info(`[Worker:${queueName}] Processing job ${job.id}: ${job.name}`);
        try {
          const result = await processor(job);
          return result;
        } catch (error) {
          log.error(`[Worker:${queueName}] Job ${job.id} error:`, error);
          throw error;
        }
      },
      { connection, concurrency }
    );
    
    worker.on('completed', (job) => {
      log.info(`[Worker:${queueName}] Job ${job?.id ?? 'unknown'} completed`);
    });
    
    worker.on('failed', (job, err) => {
      log.error(`[Worker:${queueName}] Job ${job?.id} failed:`, err);
    });
    
    this.workers.set(queueName, worker);
    log.info(`[QueueManager] Worker registered for ${queueName} (concurrency: ${concurrency})`);
    
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
    if (!this.available) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
    
    const queue = this.queues.get(queueName);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
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
    await this.initialize();
    const stats: Record<string, {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }> = {};
    
    for (const queueName of Object.values(QUEUE_NAMES)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }
  
  /**
   * Pausa uma fila
   */
  async pauseQueue(queueName: string): Promise<void> {
    await this.initialize();
    if (!this.available) return;
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      log.info(`[QueueManager] Queue ${queueName} paused`);
    }
  }
  
  /**
   * Resume uma fila
   */
  async resumeQueue(queueName: string): Promise<void> {
    await this.initialize();
    if (!this.available) return;
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      log.info(`[QueueManager] Queue ${queueName} resumed`);
    }
  }

  /**
   * Lista jobs entre filas para consumo de API.
   */
  async listJobs(limit = 50): Promise<QueueJobSnapshot[]> {
    await this.initialize();
    if (!this.available) return [];

    const states = ['active', 'waiting', 'completed', 'failed', 'delayed', 'paused'];
    const snapshots: QueueJobSnapshot[] = [];
    const perQueueLimit = Math.max(1, limit);

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = this.queues.get(queueName);
      if (!queue) continue;

      const jobs = await queue.getJobs(states, 0, perQueueLimit - 1, true);
      for (const job of jobs) {
        const state = await job.getState();
        snapshots.push({
          id: String(job.id),
          queueName,
          name: job.name,
          state,
          data: job.data,
          attemptsMade: job.attemptsMade ?? 0,
          progress: job.progress ?? 0,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          timestamp: Number(job.timestamp || 0),
          processedOn: job.processedOn || undefined,
          finishedOn: job.finishedOn || undefined,
        });
      }
    }

    snapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return snapshots.slice(0, limit);
  }

  /**
   * Busca um job por id em qualquer fila.
   */
  async getJobById(jobId: string): Promise<QueueJobSnapshot | null> {
    await this.initialize();
    if (!this.available) return null;

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = this.queues.get(queueName);
      if (!queue) continue;
      const job = await queue.getJob(jobId);
      if (!job) continue;
      const state = await job.getState();
      return {
        id: String(job.id),
        queueName,
        name: job.name,
        state,
        data: job.data,
        attemptsMade: job.attemptsMade ?? 0,
        progress: job.progress ?? 0,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: Number(job.timestamp || 0),
        processedOn: job.processedOn || undefined,
        finishedOn: job.finishedOn || undefined,
      };
    }

    return null;
  }

  /**
   * Cancela (remove) job pendente/adiado/pausado.
   */
  async cancelJob(jobId: string): Promise<{
    found: boolean;
    cancelled: boolean;
    reason?: string;
    state?: string;
  }> {
    await this.initialize();
    if (!this.available) {
      return { found: false, cancelled: false, reason: 'QUEUE_BACKEND_UNAVAILABLE' };
    }

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = this.queues.get(queueName);
      if (!queue) continue;
      const job = await queue.getJob(jobId);
      if (!job) continue;

      const state = await job.getState();
      if (state === 'completed' || state === 'failed') {
        return { found: true, cancelled: false, reason: 'JOB_ALREADY_FINALIZED', state };
      }
      if (state === 'active') {
        return { found: true, cancelled: false, reason: 'JOB_ACTIVE_CANNOT_CANCEL', state };
      }

      await job.remove();
      return { found: true, cancelled: true, state };
    }

    return { found: false, cancelled: false, reason: 'JOB_NOT_FOUND' };
  }

  /**
   * Reenvia job com falha.
   */
  async retryJob(jobId: string): Promise<{
    found: boolean;
    retried: boolean;
    reason?: string;
    state?: string;
  }> {
    await this.initialize();
    if (!this.available) {
      return { found: false, retried: false, reason: 'QUEUE_BACKEND_UNAVAILABLE' };
    }

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = this.queues.get(queueName);
      if (!queue) continue;
      const job = await queue.getJob(jobId);
      if (!job) continue;

      const state = await job.getState();
      if (state !== 'failed') {
        return { found: true, retried: false, reason: 'JOB_NOT_FAILED', state };
      }

      await job.retry();
      return { found: true, retried: true, state };
    }

    return { found: false, retried: false, reason: 'JOB_NOT_FOUND' };
  }

  /**
   * Pausa ou resume todas as filas conhecidas.
   */
  async setAllQueuesPaused(paused: boolean): Promise<{ available: boolean; queues: string[] }> {
    await this.initialize();
    if (!this.available) return { available: false, queues: [] };

    const touched: string[] = [];
    for (const queueName of Object.values(QUEUE_NAMES)) {
      if (paused) {
        await this.pauseQueue(queueName);
      } else {
        await this.resumeQueue(queueName);
      }
      touched.push(queueName);
    }
    return { available: true, queues: touched };
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
    log.info(`[QueueManager] Cleaned ${removed.length} ${type} jobs from ${queueName}`);
    return removed.length;
  }
  
  /**
   * Fecha todas as conexões
   */
  async shutdown(): Promise<void> {
    log.info('[QueueManager] Shutting down...');
    
    // Fecha workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      log.info(`[QueueManager] Worker ${name} closed`);
    }
    
    // Fecha event listeners
    for (const [name, events] of this.events) {
      await events.close();
    }
    
    // Fecha filas
    for (const [name, queue] of this.queues) {
      await queue.close();
      log.info(`[QueueManager] Queue ${name} closed`);
    }
    
    // Fecha Redis
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }
    
    this.initialized = false;
    log.info('[QueueManager] Shutdown complete');
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
export async function queueEmail(data: EmailJobData, options?: { delay?: number }): Promise<QueueJobAdapter | null> {
  return queueManager.addJob(QUEUE_NAMES.EMAIL, 'email:send', data, options);
}

/**
 * Queue export de projeto
 */
export async function queueProjectExport(data: ExportJobData): Promise<QueueJobAdapter | null> {
  return queueManager.addJob(QUEUE_NAMES.EXPORT, 'export:project', data, {
    priority: 5, // Higher priority
  });
}

/**
 * Queue processamento de asset
 */
export async function queueAssetProcess(data: AssetJobData): Promise<QueueJobAdapter | null> {
  return queueManager.addJob(QUEUE_NAMES.ASSET, 'asset:process', data);
}

/**
 * Queue batch de IA
 */
export async function queueAIBatch(data: AIBatchJobData): Promise<QueueJobAdapter | null> {
  return queueManager.addJob(QUEUE_NAMES.AI, 'ai:batch', data);
}

/**
 * Queue webhook
 */
export async function queueWebhook(data: WebhookJobData): Promise<QueueJobAdapter | null> {
  return queueManager.addJob(QUEUE_NAMES.WEBHOOK, 'webhook:send', data, {
    attempts: 5,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default queueManager;
