import type { ChatMessage } from '@/lib/api'

type Point3 = {
  x: number
  y: number
  z: number
}

export function buildLivePreviewContextPayload(workflowId: string | null, point: Point3) {
  return {
    workflowId,
    livePreview: {
      selectedPoint: {
        x: point.x,
        y: point.y,
        z: point.z,
      },
    },
  }
}

export function buildLivePreviewPrompt(point: Point3) {
  return (
    `Live Preview Context:\n` +
    `Selected point: x=${point.x.toFixed(3)}, y=${point.y.toFixed(3)}, z=${point.z.toFixed(3)}\n\n` +
    `Task: suggest ONE concrete improvement for the scene at that point. ` +
    `Return one short sentence. No markdown. No lists.`
  )
}

export function buildLivePreviewSystemMessage(): ChatMessage {
  return {
    role: 'system',
    content:
      'You are the Aethel Copilot for Live Preview. Be precise, minimal, and avoid assumptions. If information is missing, ask one question.',
  }
}

type AssistantPayload = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
  message?: {
    content?: unknown
  }
}

export function extractPrimaryAssistantContent(data: unknown): string {
  const payload = data as AssistantPayload | null
  const choiceContent = payload?.choices?.[0]?.message?.content
  if (typeof choiceContent === 'string') {
    return choiceContent
  }
  const messageContent = payload?.message?.content
  return typeof messageContent === 'string' ? messageContent : ''
}

export function buildLivePreviewSuggestionMessage(suggestion: string): ChatMessage {
  return {
    role: 'user',
    content: `Live preview suggestion: ${suggestion}`,
  }
}
