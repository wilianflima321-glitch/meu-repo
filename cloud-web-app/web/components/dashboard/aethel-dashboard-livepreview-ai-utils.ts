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

export function extractPrimaryAssistantContent(data: any): string {
  return data?.choices?.[0]?.message?.content || data?.message?.content || ''
}

export function buildLivePreviewSuggestionMessage(suggestion: string): ChatMessage {
  return {
    role: 'user',
    content: `Sugestao de previa ao vivo: ${suggestion}`,
  }
}
