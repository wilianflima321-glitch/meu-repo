import type {
  AIChatLedgerArtifact,
  AIChatResearchArtifact,
  AIChatTraceArtifact,
} from '@/components/agents'
import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  traceArtifact?: AIChatTraceArtifact | null
  researchArtifact?: AIChatResearchArtifact | null
  /** J-ACC-04 TaskEvidenceLedger receipt */
  ledgerArtifact?: AIChatLedgerArtifact | null
  /** J.2 Nexus UI payload from Apex MoA */
  nexusMission?: NexusMissionUiPayload | null
  fusionUndoHint?: {
    transactionId: string
    message: string
    /** Portable server→client FusionTx handoff (Trava II). */
    fusionHandoffJson?: string
  } | null
}

export type ProviderGateState = {
  code: string
  message: string
  capability?: string
  setupUrl?: string
}
