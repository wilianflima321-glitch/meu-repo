export type ChangeFeedbackValue = 'accepted' | 'rejected' | 'needs_work'

export type SubmitChangeFeedbackInput = {
  runId: string
  feedback: ChangeFeedbackValue
  reason?: string
  notes?: string
  rating?: number
  filePath?: string
  runSource?: 'production' | 'rehearsal'
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem('aethel-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function submitChangeFeedback(input: SubmitChangeFeedbackInput): Promise<void> {
  if (!input.runId?.trim()) return
  const payload = {
    runId: input.runId.trim(),
    feedback: input.feedback,
    reason: input.reason,
    notes: input.notes,
    rating: input.rating,
    filePath: input.filePath,
    runSource: input.runSource,
  }

  await fetch('/api/ai/change/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
