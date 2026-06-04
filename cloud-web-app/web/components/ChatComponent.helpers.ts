import type { ChatStoredMessage } from '@/lib/api';

const STORAGE_KEYS_BASE = {
  activeThreadId: 'chat::activeThreadId',
  activeWorkflowId: 'copilot::activeWorkflowId',
} as const;

export function getScopedStorageKeys(projectId: string | null) {
  const suffix = projectId ? `::${projectId}` : '';
  return {
    activeThreadId: `${STORAGE_KEYS_BASE.activeThreadId}${suffix}`,
    activeWorkflowId: `${STORAGE_KEYS_BASE.activeWorkflowId}${suffix}`,
    legacyActiveThreadId: STORAGE_KEYS_BASE.activeThreadId,
    legacyActiveWorkflowId: STORAGE_KEYS_BASE.activeWorkflowId,
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

export function createWelcomeMessages(): Message[] {
  return [
    {
      role: 'system',
      content: 'Welcome to Aethel Chat! How can I help you today?',
      timestamp: new Date(),
    },
  ];
}

export type CopilotContextPatch = {
  workflowId: string;
  livePreview?: unknown;
  editor?: unknown;
  openFiles?: unknown[];
};

export function toMessageRole(role: ChatStoredMessage['role']): Message['role'] {
  return role === 'assistant' || role === 'system' || role === 'user' ? role : 'user';
}

function isContextRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function buildContextPatch(workflowId: string, context: unknown): CopilotContextPatch | null {
  if (!isContextRecord(context)) return null;

  const patch: CopilotContextPatch = { workflowId };
  if ('livePreview' in context) patch.livePreview = context.livePreview;
  if ('editor' in context) patch.editor = context.editor;
  if (Array.isArray(context.openFiles)) patch.openFiles = context.openFiles;

  return patch;
}
