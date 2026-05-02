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
    `Contexto da Previa ao Vivo:\n` +
    `Ponto selecionado: x=${point.x.toFixed(3)}, y=${point.y.toFixed(3)}, z=${point.z.toFixed(3)}\n\n` +
    `Tarefa: sugira UMA melhoria concreta para a cena naquele ponto. ` +
    `Retorne uma unica frase curta. Sem markdown. Sem listas.`
  )
}

export function buildLivePreviewSystemMessage(): ChatMessage {
  return {
    role: 'system',
    content:
      'Voce e o Copilot Aethel para Previa ao Vivo. Seja preciso, minimalista e evite suposicoes. Se faltar informacao, faca uma pergunta.',
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
    content: `Sugestao de previa ao vivo: ${suggestion}`,
  }
}
