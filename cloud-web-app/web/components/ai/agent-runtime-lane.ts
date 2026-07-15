'use client'

import type {
  RuntimeLaneBudget,
  RuntimeLaneDecision,
} from '@/lib/device/runtime-lane-scheduler'

export type AgentRuntimeNotice = {
  tone: 'info' | 'warning'
  title: string
  detail: string
  approveDisabled: boolean
}

const BROWSER_OPERATOR_TOOL_NAMES = new Set([
  'web_search',
  'fetch_url',
  'search_docs',
  'web_scrape',
])

export function describeRuntimePlacement(
  placement: RuntimeLaneBudget['placement'] | RuntimeLaneDecision['placement'] | string | null | undefined
): string {
  if (!placement) return 'the safest available lane'
  return String(placement).replace(/-/g, ' ')
}

export function isBrowserOperatorToolName(toolName: string | null | undefined): boolean {
  if (!toolName) return false
  return BROWSER_OPERATOR_TOOL_NAMES.has(toolName)
}

export function getBrowserOperatorApprovalNotice(input: {
  toolName: string | null | undefined
  decision: RuntimeLaneDecision
  budget: RuntimeLaneBudget | null
}): AgentRuntimeNotice | null {
  if (!isBrowserOperatorToolName(input.toolName)) {
    return null
  }

  if (!input.decision.canStart) {
    return {
      tone: 'warning',
      title: 'Browser operator held',
      detail: input.decision.reason,
      approveDisabled: true,
    }
  }

  if (input.budget?.requiresConfirmation) {
    return {
      tone: 'info',
      title: 'Browser operator confirmation',
      detail: `This web step will run through ${describeRuntimePlacement(input.decision.placement)} after you approve it.`,
      approveDisabled: false,
    }
  }

  return {
    tone: 'info',
    title: 'Browser operator lane',
    detail: `This web step will run through ${describeRuntimePlacement(input.decision.placement)}.`,
    approveDisabled: false,
  }
}

export function getAiAgentStartBlockNotice(input: {
  decision: RuntimeLaneDecision
  budget: RuntimeLaneBudget | null
}): AgentRuntimeNotice | null {
  if (input.decision.canStart) {
    return null
  }

  return {
    tone: 'warning',
    title: 'Agent lane held',
    detail:
      input.decision.reason ||
      `Agent execution is paused until ${describeRuntimePlacement(input.budget?.placement)} is available again.`,
    approveDisabled: true,
  }
}
