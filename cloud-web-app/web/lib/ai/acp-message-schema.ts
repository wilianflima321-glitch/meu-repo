import { z } from 'zod';

/**
 * Agent Client Protocol (ACP) Message Schema
 * IMPROVE-AI-001
 * Unified async bus for desktop Rust + cloud WSS.
 * Unifies creative/code agents into the same protocol.
 */

export const AcpMessageType = z.enum([
  'system:init',
  'system:heartbeat',
  'system:error',
  
  'agent:task_started',
  'agent:task_progress',
  'agent:task_completed',
  'agent:task_failed',
  
  'tool:request',
  'tool:response',
  'tool:progress',
  
  'chat:message',
  'chat:stream_chunk',
  
  'patch:proposal',
  'patch:apply',
  'patch:rollback'
]);

export type AcpMessageType = z.infer<typeof AcpMessageType>;

export const AcpMessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  type: AcpMessageType,
  source: z.enum(['cloud', 'desktop', 'web_client']),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  payload: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AcpMessage = z.infer<typeof AcpMessageSchema>;

// Payload Schemas
export const AcpToolRequestPayload = z.object({
  toolName: z.string(),
  parameters: z.record(z.string(), z.unknown()),
});

export const AcpToolResponsePayload = z.object({
  success: z.boolean(),
  result: z.unknown(),
  error: z.string().optional(),
});

export const AcpPatchPayload = z.object({
  filePath: z.string(),
  patchData: z.string(), // unified diff or custom format
});
