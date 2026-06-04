export const QUEUE_NAMES = {
  EMAIL: 'aethel:email',
  EXPORT: 'aethel:export',
  ASSET: 'aethel:asset',
  AI: 'aethel:ai',
  WEBHOOK: 'aethel:webhook',
  ANALYTICS: 'aethel:analytics',
  BACKUP: 'aethel:backup',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
    age: 24 * 3600,
  },
  removeOnFail: {
    count: 5000,
    age: 7 * 24 * 3600,
  },
};
