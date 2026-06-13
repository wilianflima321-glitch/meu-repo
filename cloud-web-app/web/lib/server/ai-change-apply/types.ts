import type { ChangeValidationResult } from '@/lib/server/change-validation'
import type { DependencyImpactAnalysis } from '@/lib/server/dependency-impact-guard'

export const CAPABILITY = 'AI_CHANGE_APPLY'
export const RUN_SOURCE = 'production'
export const MAX_BATCH_CHANGES = 50
export const MAX_LOCAL_IMPORT_FANOUT = 40
export const MAX_REVERSE_DEPENDENTS = 80

export type ApplyExecutionMode = 'workspace' | 'sandbox'

export type ApplyChangeInput = {
  filePath?: string
  original?: string
  modified?: string
  fullDocument?: string
  language?: string
  enforceOriginalMatch?: boolean
  approvedHighRisk?: boolean
}

export type ApplyBody = ApplyChangeInput & {
  projectId?: string
  agent?: string
  enforceAgentScope?: boolean
  enforceReadReceipts?: boolean
  /** When true, the governed tool bus blocks apply unless the diff-proposal job is fully evidenced. */
  enforceToolBus?: boolean
  approvedHighRisk?: boolean
  changes?: ApplyChangeInput[]
  executionMode?: ApplyExecutionMode
}

export type PreparedApplyChange = {
  absolutePath: string
  virtualPath: string
  currentContent: string
  nextDocument: string
  language?: string
  validation: ChangeValidationResult
  projectImpact: DependencyImpactAnalysis
  approvalGrantId?: string
  lastModified?: string
}
