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

export interface QueueAdapter {
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

export interface QueueEventsAdapter {
  on: (event: string, listener: (payload: Record<string, unknown>) => void) => void;
  close: () => Promise<void>;
}

export interface WorkerAdapter {
  on: (event: string, listener: (job: QueueJobAdapter | undefined, err?: Error) => void) => void;
  close: () => Promise<void>;
}

export interface RedisConnectionAdapter {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  quit: () => Promise<void>;
}

export interface BullMQRuntime {
  Queue: new (name: string, options: { connection: RedisConnectionAdapter }) => QueueAdapter;
  QueueEvents: new (name: string, options: { connection: RedisConnectionAdapter }) => QueueEventsAdapter;
  Worker: new (
    name: string,
    processor: (job: QueueJobAdapter) => Promise<unknown>,
    options: { connection: RedisConnectionAdapter | null; concurrency: number }
  ) => WorkerAdapter;
}

export type RedisConstructor = new (config: Record<string, unknown>) => RedisConnectionAdapter;

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
  jobId: string;
  projectId: string;
  userId: string;
  format: string;
  quality?: string;
  sceneIds?: string[];
  options?: Record<string, unknown>;
}

export interface AssetJobData {
  assetId: string;
  storageKey: string;
  userId?: string;
  operation?: 'process' | 'thumbnail' | 'optimize' | 'convert';
  options?: Record<string, unknown>;
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
