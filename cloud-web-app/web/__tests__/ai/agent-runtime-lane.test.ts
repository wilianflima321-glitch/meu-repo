import { describe, expect, it } from 'vitest'

import {
  describeRuntimePlacement,
  getAiAgentStartBlockNotice,
  getBrowserOperatorApprovalNotice,
  isBrowserOperatorToolName,
} from '@/components/ai/agent-runtime-lane'
import type { RuntimeLaneBudget, RuntimeLaneDecision } from '@/lib/device/runtime-lane-scheduler'

const browserLaneBudget: RuntimeLaneBudget = {
  lane: 'browser-operator',
  label: 'Browser operator',
  maxConcurrent: 1,
  placement: 'cloud-sandbox',
  pauseWhenUserActive: false,
  requiresConfirmation: true,
  maxQueueDepth: 2,
}

const allowedDecision: RuntimeLaneDecision = {
  lane: 'browser-operator',
  canStart: true,
  placement: 'cloud-sandbox',
  reason: 'Browser operator can start in cloud sandbox.',
  requiresConfirmation: true,
}

const blockedDecision: RuntimeLaneDecision = {
  lane: 'browser-operator',
  canStart: false,
  placement: 'cloud-sandbox',
  reason: 'Browser operator is at its concurrency limit.',
  requiresConfirmation: true,
}

describe('agent runtime lane helpers', () => {
  it('recognizes browser operator tools by name', () => {
    expect(isBrowserOperatorToolName('web_search')).toBe(true)
    expect(isBrowserOperatorToolName('fetch_url')).toBe(true)
    expect(isBrowserOperatorToolName('write_file')).toBe(false)
    expect(isBrowserOperatorToolName(null)).toBe(false)
  })

  it('builds a blocking approval notice for held browser operator work', () => {
    const notice = getBrowserOperatorApprovalNotice({
      toolName: 'web_search',
      decision: blockedDecision,
      budget: browserLaneBudget,
    })

    expect(notice).toMatchObject({
      tone: 'warning',
      title: 'Browser operator held',
      approveDisabled: true,
    })
    expect(notice?.detail).toContain('concurrency limit')
  })

  it('describes placement and confirmation for allowed browser operator approvals', () => {
    const notice = getBrowserOperatorApprovalNotice({
      toolName: 'fetch_url',
      decision: allowedDecision,
      budget: browserLaneBudget,
    })

    expect(notice).toMatchObject({
      tone: 'info',
      title: 'Browser operator confirmation',
      approveDisabled: false,
    })
    expect(notice?.detail).toContain('cloud sandbox')
    expect(describeRuntimePlacement('local-worker')).toBe('local worker')
  })

  it('returns a start-block notice only when the ai lane is blocked', () => {
    const aiNotice = getAiAgentStartBlockNotice({
      decision: {
        lane: 'ai-agents',
        canStart: false,
        placement: 'cloud-sandbox',
        reason: 'AI agents is at its concurrency limit.',
        requiresConfirmation: false,
      },
      budget: {
        lane: 'ai-agents',
        label: 'AI agents',
        maxConcurrent: 1,
        placement: 'cloud-sandbox',
        pauseWhenUserActive: false,
        requiresConfirmation: false,
        maxQueueDepth: 2,
      },
    })

    expect(aiNotice?.title).toBe('Agent lane held')
    expect(aiNotice?.approveDisabled).toBe(true)
    expect(
      getAiAgentStartBlockNotice({
        decision: {
          lane: 'ai-agents',
          canStart: true,
          placement: 'local-worker',
          reason: 'AI agents can start in local worker.',
          requiresConfirmation: false,
        },
        budget: null,
      }),
    ).toBeNull()
  })
})
