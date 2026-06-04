import type { AgentFleetMode } from '@/lib/production/agent-fleet-session'

import type { AgentFleetMemberStatus, AgentReadinessDecision } from './AgentFleetCoordinatorStrip.types'

export const modeLabels: Record<AgentFleetMode, string> = {
  'coordinator-first': 'Coordinator',
  'selected-agent': 'Specialist',
  'review-only': 'Review',
}

export const statusTone: Record<AgentFleetMemberStatus, string> = {
  ready: 'bg-[var(--aethel-success)]',
  attention: 'bg-[var(--aethel-warning)]',
  blocked: 'bg-[var(--aethel-error)]',
  paused: 'bg-[var(--aethel-text-quaternary)]',
}

export function mapFleetAgentToCommandAgentId(agentName: string): string {
  const normalized = agentName.toLowerCase()
  if (normalized.includes('software') || normalized.includes('release')) return 'coder'
  if (normalized.includes('asset') || normalized.includes('artist') || normalized.includes('technical artist')) {
    return 'artist'
  }
  if (normalized.includes('cinematic')) return 'video-editor'
  if (normalized.includes('gameplay')) return 'game-designer'
  if (normalized.includes('research') || normalized.includes('performance')) return 'architect'
  if (normalized.includes('story') || normalized.includes('browser') || normalized.includes('qa')) return 'universal'
  return 'universal'
}

export function canRenderFleet(projectId: string): boolean {
  return Boolean(projectId && projectId !== 'default')
}

export function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names))
}

export function formatLockCount(count: number): string {
  return `${count} lock${count === 1 ? '' : 's'}`
}

export function readReceiptLabel(readiness: AgentReadinessDecision | null): string {
  if (!readiness) return 'Context...'
  if (readiness.allowed) return 'Context read'
  if (readiness.code === 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED') return 'Research blocked'
  if (!readiness.metadata.manifestId) return 'Cartography needed'
  return 'Context unread'
}

export function readReceiptTone(readiness: AgentReadinessDecision | null): string {
  if (!readiness) return 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-tertiary)]'
  if (readiness.allowed) return 'bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] text-[var(--aethel-success-light)]'
  if (readiness.code === 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED') {
    return 'bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] text-[var(--aethel-error-light)]'
  }
  return 'bg-[color-mix(in_srgb,var(--aethel-warning)_14%,transparent)] text-[var(--aethel-warning-light)]'
}
