import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'

type WorkflowContextCandidate = {
  livePreview?: unknown
  editor?: unknown
  openFiles?: unknown
}

export function mapApiMessagesToChatHistory(payload: unknown): ChatMessage[] {
  const rawMessages = Array.isArray((payload as { messages?: unknown[] } | null)?.messages)
    ? ((payload as { messages: unknown[] }).messages ?? [])
    : []

  return rawMessages
    .filter((message): message is { role?: string; content: string } => {
      return Boolean(message && typeof (message as { content?: unknown }).content === 'string')
    })
    .map((message) => ({
      role: (message.role as ChatMessage['role']) || 'user',
      content: message.content,
    }))
}

export function extractCopilotWorkflowList(payload: unknown): CopilotWorkflowSummary[] {
  const workflows = (payload as { workflows?: unknown[] } | null)?.workflows
  if (!Array.isArray(workflows)) {
    return []
  }
  return workflows as CopilotWorkflowSummary[]
}

export function buildWorkflowTitle(prefix: string, timestamp: Date = new Date()) {
  return `${prefix} ${timestamp.toLocaleString()}`
}

export function buildCopilotContextPatch(workflowId: string, context: unknown) {
  if (!context || typeof context !== 'object') {
    return null
  }

  const candidate = context as WorkflowContextCandidate
  const patch: {
    workflowId: string
    livePreview?: unknown
    editor?: unknown
    openFiles?: unknown[]
  } = { workflowId }

  if (candidate.livePreview) {
    patch.livePreview = candidate.livePreview
  }
  if (candidate.editor) {
    patch.editor = candidate.editor
  }
  if (Array.isArray(candidate.openFiles)) {
    patch.openFiles = candidate.openFiles
  }

  const hasContext = patch.livePreview || patch.editor || patch.openFiles
  return hasContext ? patch : null
}
