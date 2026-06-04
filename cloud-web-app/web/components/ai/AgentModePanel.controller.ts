'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brain,
  ChevronRight,
  FileCode,
  MessageSquare,
  Search,
  Settings,
  Zap,
} from 'lucide-react';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { buildBrowserOperatorRuntimePayload } from '@/lib/device/browser-operator-tool-guard';
import { useRuntimeCapabilityProfile } from '@/hooks/useRuntimeCapabilityProfile';
import { useRuntimeLanePolicy } from '@/hooks/useRuntimeLanePolicy';
import { AutonomousAgent, type AgentStep, type AgentTask, type ToolCall } from '@/lib/ai/agent-mode';
import {
  describeRuntimePlacement,
  getAiAgentStartBlockNotice,
  getBrowserOperatorApprovalNotice,
  isBrowserOperatorToolName,
  type AgentRuntimeNotice,
} from './agent-runtime-lane';
import type { AgentModeStatus, PendingApprovalRequest } from './AgentModePanel.types';

export function useAgentModePanelController() {
  const [input, setInput] = useState('')
  const [agent] = useState(
    () =>
      new AutonomousAgent({
        autonomyLevel: 'semi-autonomous',
        requireApproval: true,
        enableSelfCorrection: true,
      }),
  )

  const [task, setTask] = useState<AgentTask | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [status, setStatus] = useState<AgentModeStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalRequest | null>(null)
  const [activeBrowserOperatorCalls, setActiveBrowserOperatorCalls] = useState(0)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const browserOperatorApprovalOverrideRef = useRef(false)
  const { profile: capabilityProfile } = useRuntimeCapabilityProfile()
  const aiAgentLane = useRuntimeLanePolicy('ai-agents', {
    activeCount: status === 'running' || status === 'paused' ? 1 : 0,
  })
  const browserOperatorLane = useRuntimeLanePolicy('browser-operator', {
    activeCount: activeBrowserOperatorCalls,
    queuedCount: isBrowserOperatorToolName(pendingApproval?.action.tool) ? 1 : 0,
  })
  const aiAgentStartBlockNotice = getAiAgentStartBlockNotice({
    decision: aiAgentLane.decision,
    budget: aiAgentLane.budget,
  })
  const browserOperatorApprovalNotice = getBrowserOperatorApprovalNotice({
    toolName: pendingApproval?.action.tool,
    decision: browserOperatorLane.decision,
    budget: browserOperatorLane.budget,
  })
  const runtimeNoticeToneClass = (notice: AgentRuntimeNotice | null) =>
    notice?.tone === 'warning'
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]'
  const browserOperatorRequiresConfirmation = Boolean(browserOperatorLane.budget?.requiresConfirmation)

  useEffect(() => {
    agent.setToolContextProvider((action) => {
      if (!isBrowserOperatorToolName(action.tool)) {
        return null
      }

      return {
        __aethelRuntime: buildBrowserOperatorRuntimePayload({
          canStart: browserOperatorLane.decision.canStart,
          requiresConfirmation: browserOperatorRequiresConfirmation,
          approved: browserOperatorApprovalOverrideRef.current,
          placement: browserOperatorLane.decision.placement,
          target: browserOperatorLane.route.target,
          mode: capabilityProfile.policy.mode,
          reason: browserOperatorLane.route.reason,
        }),
      }
    })

    return () => {
      agent.setToolContextProvider(null)
    }
  }, [
    agent,
    browserOperatorLane.decision.canStart,
    browserOperatorLane.decision.placement,
    browserOperatorLane.route.reason,
    browserOperatorLane.route.target,
    browserOperatorRequiresConfirmation,
    capabilityProfile.policy.mode,
  ])

  useEffect(() => {
    const handleTaskStarted = (t: AgentTask) => {
      setTask(t)
      setStatus('running')
      setPendingApproval(null)
      setActiveBrowserOperatorCalls(0)
      browserOperatorApprovalOverrideRef.current = false
    }

    const handleTaskCompleted = (t: AgentTask) => {
      setTask(t)
      setStatus('completed')
      setPendingApproval(null)
      setActiveBrowserOperatorCalls(0)
      browserOperatorApprovalOverrideRef.current = false
    }

    const handleTaskFailed = (t: AgentTask) => {
      setTask(t)
      setStatus('failed')
      setPendingApproval(null)
      setActiveBrowserOperatorCalls(0)
      browserOperatorApprovalOverrideRef.current = false
    }

    const handleStepAdded = (step: AgentStep) => {
      setSteps((prev) => [...prev, step])
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }

    const handleProgress = ({ progress: p }: { progress: number }) => {
      setProgress(p)
    }

    const handleApprovalNeeded = (approval: PendingApprovalRequest) => {
      browserOperatorApprovalOverrideRef.current = false
      setPendingApproval(approval)
    }

    const handlePaused = () => {
      setStatus('paused')
    }

    const handleResumed = () => {
      setStatus('running')
    }

    const handleToolStarted = (toolCall: ToolCall) => {
      if (isBrowserOperatorToolName(toolCall.tool)) {
        setActiveBrowserOperatorCalls((current) => current + 1)
      }
    }

    const handleToolSettled = (toolCall: ToolCall) => {
      if (isBrowserOperatorToolName(toolCall.tool)) {
        setActiveBrowserOperatorCalls((current) => Math.max(0, current - 1))
        browserOperatorApprovalOverrideRef.current = false
      }
    }

    agent.on('task:started', handleTaskStarted)
    agent.on('task:completed', handleTaskCompleted)
    agent.on('task:failed', handleTaskFailed)
    agent.on('step:added', handleStepAdded)
    agent.on('agent:progress', handleProgress)
    agent.on('agent:approval_needed', handleApprovalNeeded)
    agent.on('agent:paused', handlePaused)
    agent.on('agent:resumed', handleResumed)
    agent.on('tool:started', handleToolStarted)
    agent.on('tool:completed', handleToolSettled)
    agent.on('tool:failed', handleToolSettled)

    return () => {
      agent.removeAllListeners()
    }
  }, [agent])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || status === 'running' || status === 'paused' || !aiAgentLane.decision.canStart) return

    setSteps([])
    setProgress(0)
    setPendingApproval(null)
    setActiveBrowserOperatorCalls(0)
    browserOperatorApprovalOverrideRef.current = false

    await agent.execute(input.trim())
    setInput('')
  }, [agent, aiAgentLane.decision.canStart, input, status])

  const handleApprove = () => {
    if (pendingApproval) {
      if (browserOperatorApprovalNotice?.approveDisabled) {
        return
      }
      if (isBrowserOperatorToolName(pendingApproval.action.tool)) {
        browserOperatorApprovalOverrideRef.current = true
      }
      pendingApproval.approve()
      setPendingApproval(null)
    }
  }

  const handleReject = () => {
    if (pendingApproval) {
      browserOperatorApprovalOverrideRef.current = false
      pendingApproval.reject()
      setPendingApproval(null)
    }
  }

  const handlePause = () => {
    agent.pause()
  }

  const handleResume = () => {
    agent.resume()
  }

  const handleStop = () => {
    agent.stop()
    setStatus('idle')
    setPendingApproval(null)
    setActiveBrowserOperatorCalls(0)
    browserOperatorApprovalOverrideRef.current = false
  }

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'think':
        return Brain
      case 'plan':
        return FileCode
      case 'execute':
        return Zap
      case 'observe':
        return Search
      case 'reflect':
        return MessageSquare
      case 'correct':
        return Settings
      default:
        return ChevronRight
    }
  }

  const getStatusLabel = (s: typeof status) => {
    switch (s) {
      case 'running':
        return 'RUNNING'
      case 'paused':
        return 'PAUSED'
      case 'completed':
        return 'COMPLETE'
      case 'failed':
        return 'FAILED'
      default:
        return 'IDLE'
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running':
        return 'text-[var(--aethel-info-light)]'
      case 'paused':
        return 'text-[var(--aethel-warning-light)]'
      case 'completed':
        return 'text-[var(--aethel-success-light)]'
      case 'failed':
        return 'text-[var(--aethel-error-light)]'
      default:
        return 'text-[var(--aethel-text-quaternary)]'
    }
  }

  const iconButtonClass = `h-8 w-8 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const stepToggleClass = `flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const agentLaneLabel = `Agent lane - ${describeRuntimePlacement(aiAgentLane.route.target)}`
  const browserOperatorLabel = `Browser operator - ${describeRuntimePlacement(browserOperatorLane.route.target)}`
  const browserOperatorPlacementLabel = describeRuntimePlacement(browserOperatorLane.route.target)


  return {
    activeBrowserOperatorCalls,
    agentLaneLabel,
    aiAgentLane,
    aiAgentStartBlockNotice,
    browserOperatorApprovalNotice,
    browserOperatorLabel,
    browserOperatorLane,
    browserOperatorPlacementLabel,
    expandedSteps,
    getStatusColor,
    getStatusLabel,
    getStepIcon,
    handleApprove,
    handlePause,
    handleReject,
    handleResume,
    handleStop,
    handleSubmit,
    iconButtonClass,
    input,
    pendingApproval,
    progress,
    runtimeNoticeToneClass,
    scrollRef,
    setInput,
    status,
    stepToggleClass,
    steps,
    task,
    toggleStepExpand,
  };
}
