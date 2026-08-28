/**
 * J.11 — Agent Control Protocol (ACP)
 * 
 * Formal JSON-RPC 2.0 based protocol for Agent-to-Agent and Agent-to-Orchestrator communication.
 * Enables proactive, autonomous workers to operate safely within the Aethel Engine boundaries
 * while strictly adhering to the Zero-MVP and CostGuard constraints.
 */

import { z } from 'zod'

export const AcpMessageType = z.enum([
  'request',
  'response',
  'notification'
])

export const AcpMethod = z.enum([
  'agent/status',
  'agent/delegate',
  'agent/report',
  'task/reserve_cost',
  'task/yield',
  'system/halt'
])

export const AcpMessageSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string().uuid().optional(),
  type: AcpMessageType,
  method: AcpMethod.optional(),
  params: z.record(z.string(), z.any()).optional(),
  result: z.record(z.string(), z.any()).optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
})

export type AcpMessage = z.infer<typeof AcpMessageSchema>

export interface AcpConnection {
  send(message: AcpMessage): Promise<void>
  onMessage(handler: (message: AcpMessage) => void): void
  close(): void
}

/**
 * Creates a compliant ACP envelope for a request.
 */
export function createAcpRequest(method: z.infer<typeof AcpMethod>, params: Record<string, any>): AcpMessage {
  return {
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
    type: 'request',
    method,
    params
  }
}

/**
 * Creates a compliant ACP envelope for a notification (no ID, no response expected).
 */
export function createAcpNotification(method: z.infer<typeof AcpMethod>, params: Record<string, any>): AcpMessage {
  return {
    jsonrpc: '2.0',
    type: 'notification',
    method,
    params
  }
}
