'use client';

// @aethel-heavy-async-boundary: loaded only when autonomous agent mode is opened.

import { AnimatePresence, motion } from '@/lib/ui/motion';
import {
  AlertCircle,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Send,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Textarea } from '@/components/ui/Textarea';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { cn } from '@/lib/utils';
import { useAgentModePanelController } from './AgentModePanel.controller';
import type { AgentModePanelProps } from './AgentModePanel.types';

/**
 * Agent Mode Panel - governed autonomous agent sidecar.
 */

export function AgentModePanel({ isOpen, onClose }: AgentModePanelProps) {
  const {
    agentLaneLabel,
    aiAgentLane,
    aiAgentStartBlockNotice,
    browserOperatorApprovalNotice,
    browserOperatorLabel,
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
  } = useAgentModePanelController();

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 z-50 flex w-[500px] flex-col border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--aethel-info-light)]" />
          <span className="font-semibold text-[var(--aethel-text-primary)]">Agent Mode</span>
          <span className={cn('rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] px-2 py-0.5 text-xs', getStatusColor(status))}>
            {getStatusLabel(status)}
          </span>
          <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_6%,transparent)] px-2 py-0.5 text-[11px] text-[var(--aethel-text-secondary)]">
            {agentLaneLabel}
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px]',
              browserOperatorApprovalNotice?.approveDisabled
                ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]',
            )}
          >
            {browserOperatorLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {status === 'running' && (
            <Button type="button" variant="ghost" size="icon" onClick={handlePause} className={iconButtonClass} aria-label="Pause agent">
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {status === 'paused' && (
            <Button type="button" variant="ghost" size="icon" onClick={handleResume} className={iconButtonClass} aria-label="Resume agent">
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(status === 'running' || status === 'paused') && (
            <Button type="button" variant="ghost" size="icon" onClick={handleStop} className={`${iconButtonClass} text-[var(--aethel-error-light)]`} aria-label="Stop agent">
              <Square className="h-4 w-4" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className={iconButtonClass} aria-label="Close agent mode">
            X
          </Button>
        </div>
      </div>

      {status === 'running' && (
        <div className="h-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)]">
          <motion.div
            className="h-full bg-[var(--aethel-info)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {task && (
        <div className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)] px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-[var(--aethel-success-light)]" />}
            {task.status === 'failed' && <XCircle className="h-4 w-4 text-[var(--aethel-error-light)]" />}
            {(task.status === 'executing' || task.status === 'planning') && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--aethel-info-light)]" />
            )}
            <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{task.description.slice(0, 50)}...</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-quaternary)]">
            <span>{task.subtasks.length} subtasks</span>
            <span>{steps.length} steps</span>
            <span>{progress}% complete</span>
          </div>
        </div>
      )}

      {status === 'idle' && aiAgentStartBlockNotice ? (
        <div className={`mx-4 mt-4 rounded-lg border p-3 text-xs ${runtimeNoticeToneClass(aiAgentStartBlockNotice)}`}>
          <div className="font-semibold">{aiAgentStartBlockNotice.title}</div>
          <div className="mt-1 text-[var(--aethel-text-secondary)]">{aiAgentStartBlockNotice.detail}</div>
        </div>
      ) : null}

      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[var(--aethel-warning-light)]" />
              <span className="text-sm font-semibold text-[var(--aethel-warning-light)]">Approval required</span>
            </div>
            <p className="mb-2 text-xs text-[var(--aethel-text-secondary)]">{pendingApproval.thinking}</p>
            <div className="mb-3 rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] p-2 text-xs font-mono text-[var(--aethel-text-tertiary)]">
              {pendingApproval.action.tool}: {JSON.stringify(pendingApproval.action.input)}
            </div>
            {browserOperatorApprovalNotice ? (
              <div className={`mb-3 rounded border px-3 py-2 text-xs ${runtimeNoticeToneClass(browserOperatorApprovalNotice)}`}>
                <div className="font-semibold">{browserOperatorApprovalNotice.title}</div>
                <div className="mt-1">{browserOperatorApprovalNotice.detail}</div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleApprove}
                disabled={browserOperatorApprovalNotice?.approveDisabled}
                title={browserOperatorApprovalNotice?.approveDisabled ? browserOperatorApprovalNotice.detail : undefined}
                className="bg-[var(--aethel-success-dark)] hover:bg-[var(--aethel-success)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Approve pending agent action"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleReject} className="border-[var(--aethel-error)] text-[var(--aethel-error-light)]" aria-label="Reject pending agent action">
                <XCircle className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {steps.map((step) => {
            const StepIcon = getStepIcon(step.type)
            const isExpanded = expandedSteps.has(step.id)

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)]"
              >
                <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} step details for ${step.type}`}
                  onClick={() => toggleStepExpand(step.id)}
                  className={stepToggleClass}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                  )}
                  <StepIcon
                    className={cn(
                      'h-4 w-4',
                      step.type === 'think' && 'text-[var(--aethel-info-light)]',
                      step.type === 'plan' && 'text-[var(--aethel-info-light)]',
                      step.type === 'execute' && 'text-[var(--aethel-success-light)]',
                      step.type === 'observe' && 'text-[var(--aethel-warning-light)]',
                      step.type === 'reflect' && 'text-[var(--aethel-info-light)]',
                      step.type === 'correct' && 'text-[var(--aethel-warning-light)]',
                    )}
                  />
                  <span className="font-medium text-[var(--aethel-text-secondary)] capitalize">{step.type}</span>
                  <span className="flex-1 truncate text-[var(--aethel-text-quaternary)]">{step.content.slice(0, 40)}...</span>
                  <span className="text-[var(--aethel-text-quaternary)]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_2%,transparent)] px-3 py-2">
                        <p className="whitespace-pre-wrap text-xs text-[var(--aethel-text-tertiary)]">{step.content}</p>

                        {step.toolCalls && step.toolCalls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.toolCalls.map((tc) => (
                              <div key={tc.id} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] p-2 text-xs">
                                <div className="mb-1 flex items-center gap-2">
                                  <Terminal className="h-3 w-3 text-[var(--aethel-text-quaternary)]" />
                                  <span className="font-mono text-[var(--aethel-info-light)]">{tc.tool}</span>
                                  <span
                                    className={cn(
                                      'rounded px-1 py-0.5 text-[10px]',
                                      tc.status === 'success' && 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]',
                                      tc.status === 'failed' && 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error-light)]',
                                      tc.status === 'running' && 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]',
                                    )}
                                  >
                                    {tc.status}
                                  </span>
                                </div>
                                <pre className="max-h-20 overflow-auto text-[var(--aethel-text-quaternary)]">
                                  {JSON.stringify(tc.input, null, 2)}
                                </pre>
                                {tc.output !== undefined && tc.output !== null && (
                                  <pre className="mt-1 max-h-20 overflow-auto text-[var(--aethel-success-light)]">
                                    {typeof tc.output === 'string'
                                      ? tc.output.slice(0, 200)
                                      : JSON.stringify(tc.output, null, 2).slice(0, 200)}
                                  </pre>
                                )}
                                {tc.error && <pre className="mt-1 text-[var(--aethel-error-light)]">{tc.error}</pre>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {steps.length === 0 && status === 'idle' && (
            <div className="py-12 text-center">
              <Bot className="mx-auto mb-4 h-12 w-12 text-[var(--aethel-text-primary)]/20" />
              <p className="text-sm text-[var(--aethel-text-quaternary)]">Describe a task and the agent will run it autonomously.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--aethel-border-primary)] p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe the task for the agent..."
            className="min-h-[80px] border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] pr-12"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                handleSubmit()
              }
            }}
            disabled={status === 'running' || status === 'paused'}
          />
          <Button type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || status === 'running' || status === 'paused' || !aiAgentLane.decision.canStart}
            title={!aiAgentLane.decision.canStart ? aiAgentLane.decision.reason : undefined}
            aria-label={status === 'running' || status === 'paused' ? 'Agent task is running' : 'Send task to agent'}
            className={`absolute bottom-2 right-2 h-8 w-8 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary-dark)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          >
            {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {status === 'idle' && aiAgentStartBlockNotice ? (
          <p className="mt-2 text-xs text-[var(--aethel-warning-light)]">
            {aiAgentStartBlockNotice.detail}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">
            Press <kbd className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] px-1">Ctrl</kbd> +{' '}
            <kbd className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] px-1">Enter</kbd> to send. Browser steps prefer{' '}
            <span className="text-[var(--aethel-text-secondary)]">{browserOperatorPlacementLabel}</span>.
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default AgentModePanel
