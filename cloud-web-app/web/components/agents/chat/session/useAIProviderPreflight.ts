'use client'

import { useEffect, useState } from 'react'
import { analytics } from '@/lib/analytics'
import {
  buildAiProviderGateMessage,
  type AiProviderStatusResponse,
  fetchAiProviderStatus,
} from '@/lib/ai-provider-status-client'
import type { ProviderGateState } from '@/components/agents/chat/session-types'

export function useAIProviderPreflight() {
  const [providerGate, setProviderGate] = useState<ProviderGateState | null>(null)
  const [providerStatus, setProviderStatus] = useState<AiProviderStatusResponse | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        setProviderStatus(status)

        if (status.configured || status.demoModeEnabled) {
          setProviderGate(null)
          return
        }

        const gateMessage = buildAiProviderGateMessage(status)
        setProviderGate({
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message: gateMessage,
          capability: status.capability || 'AI_PROVIDER_CONFIG',
          setupUrl: status.setupUrl,
        })
        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-provider-preflight',
            error: 'AI_PROVIDER_NOT_CONFIGURED',
            capability: status.capability || 'AI_PROVIDER_CONFIG',
          },
        })
      } catch {
        setProviderStatus(null)
      }
    })()

    return () => controller.abort()
  }, [])

  return {
    providerGate,
    providerStatus,
    setProviderGate,
  }
}
