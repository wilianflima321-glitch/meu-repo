/**
 * Block 6H.4 — client bridge: open AiQuotaModal from any AI 402 path.
 */

import {
  normalizeAiQuotaBlocked,
  type AiQuotaBlockedResponse,
} from '@/lib/billing/ai-quota-blocked'

export const AI_QUOTA_BLOCKED_EVENT = 'aethel:ai-quota-blocked'

export function openAiQuotaModal(payload: AiQuotaBlockedResponse | unknown): void {
  if (typeof window === 'undefined') return
  const normalized = normalizeAiQuotaBlocked(payload)
  if (!normalized) return
  window.dispatchEvent(
    new CustomEvent(AI_QUOTA_BLOCKED_EVENT, {
      detail: normalized,
    }),
  )
}

export function subscribeAiQuotaModal(
  cb: (payload: AiQuotaBlockedResponse) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail
    const normalized = normalizeAiQuotaBlocked(detail)
    if (normalized) cb(normalized)
  }
  window.addEventListener(AI_QUOTA_BLOCKED_EVENT, handler)
  return () => window.removeEventListener(AI_QUOTA_BLOCKED_EVENT, handler)
}

/** Try parse Response / JSON body and open modal when quota-blocked. */
export async function openAiQuotaModalFromResponse(res: Response, body?: unknown): Promise<boolean> {
  if (res.status !== 402 && res.status !== 429) return false
  let payload = body
  if (payload === undefined) {
    try {
      payload = await res.clone().json()
    } catch {
      return false
    }
  }
  const normalized = normalizeAiQuotaBlocked(payload)
  if (!normalized) return false
  openAiQuotaModal(normalized)
  return true
}
