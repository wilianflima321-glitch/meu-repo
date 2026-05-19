export interface ModerationItem {
  id: string
  type: 'user_report' | 'ai_output' | 'project_content' | 'asset'
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  reporterId?: string
  reporterEmail?: string
  targetType: 'user' | 'project' | 'asset' | 'ai_generation'
  targetId: string
  targetOwnerId?: string
  targetOwnerEmail?: string
  contentSnapshot?: {
    type: string
    preview: string
    fullContent?: string
  }
  reason?: string
  category?: string
  notes?: string
  autoScore?: number
  autoFlags?: string[]
  createdAt: string
  updatedAt: string
}

export interface ModerationStats {
  pending: number
  urgent: number
  todayProcessed: number
  avgResponseTime: number
}

export type ModerationAction = 'approve' | 'reject' | 'escalate' | 'skip' | 'shadowban' | 'delete'
