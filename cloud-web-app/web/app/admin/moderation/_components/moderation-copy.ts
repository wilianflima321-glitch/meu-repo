import type { ModerationItem } from './moderation-types'

export const SHORTCUTS: Record<string, string> = {
  a: 'Approve',
  r: 'Reject',
  e: 'Escalate',
  s: 'Skip',
  b: 'Shadow-ban user',
  d: 'Delete content',
  n: 'Next item',
  p: 'Previous item',
  v: 'Toggle view',
  '?': 'Show shortcuts',
}

export const TYPE_LABELS: Record<ModerationItem['type'], string> = {
  user_report: 'User report',
  ai_output: 'AI output',
  project_content: 'Project content',
  asset: 'Asset',
}

export const TARGET_LABELS: Record<ModerationItem['targetType'], string> = {
  user: 'User',
  project: 'Project',
  asset: 'Asset',
  ai_generation: 'AI generation',
}

export const FILTER_LABELS = {
  pending: 'Pending',
  urgent: 'Urgent',
  all: 'All',
} as const
