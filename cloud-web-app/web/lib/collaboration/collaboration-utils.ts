const COLLABORATOR_COLOR_TOKENS = [
  '--aethel-collab-vivid-0',
  '--aethel-collab-vivid-1',
  '--aethel-collab-vivid-2',
  '--aethel-collab-vivid-3',
  '--aethel-collab-vivid-4',
  '--aethel-collab-vivid-5',
  '--aethel-collab-vivid-6',
  '--aethel-collab-vivid-7',
  '--aethel-collab-vivid-8',
  '--aethel-collab-vivid-9',
  '--aethel-collab-vivid-10',
  '--aethel-collab-vivid-11',
  '--aethel-collab-vivid-12',
  '--aethel-collab-vivid-13',
  '--aethel-collab-vivid-14',
] as const

export function getColorForCollaborator(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash = hash & hash
  }
  const token = COLLABORATOR_COLOR_TOKENS[Math.abs(hash) % COLLABORATOR_COLOR_TOKENS.length]
  return `var(${token})`
}

export function createCollaborationSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createCollaborationMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateReconnectDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000)
}
