export interface AgentModePanelProps {
  isOpen: boolean
  onClose: () => void
}

export type PendingApprovalRequest = {
  action: {
    tool?: string
    input?: Record<string, unknown>
  }
  thinking: string
  confidence: number
  approve: () => void
  reject: () => void
}

export type AgentModeStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
