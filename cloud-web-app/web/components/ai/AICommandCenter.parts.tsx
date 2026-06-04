'use client';

import { useState } from 'react';

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import type { AgentExecution, AgentStep } from '../../lib/ai-agent-system';

import { formatMarkdown } from './AICommandCenter.format';
import type { Message } from './AICommandCenter.types';

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
            : isSystem
            ? 'bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]'
            : 'bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)]'
        } ${message.isStreaming ? 'animate-pulse' : ''}`}
      >
        <div
          className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />
        <p className="mt-2 text-xs opacity-60">{message.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  )
}

export function ExecutionPanel({
  execution,
  onClose,
}: {
  execution: AgentExecution
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]">
      <button type="button" aria-label={expanded ? 'Collapse agent run details' : 'Expand agent run details'}
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] ${focusClass}`}
        aria-expanded={expanded}
        aria-controls="ai-execution-panel"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[var(--aethel-info-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {execution.steps.length} steps
          {execution.artifacts.length > 0 && (
            <span className="text-[var(--aethel-success-light)]">| {execution.artifacts.length} artifacts</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div id="ai-execution-panel" className="max-h-64 space-y-3 overflow-y-auto px-4 pb-4">
          {execution.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}

          {execution.artifacts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-[var(--aethel-text-quaternary)]">Artifacts</p>
              <div className="flex flex-wrap gap-2">
                {execution.artifacts.map((artifact, i) => (
                  <span
                    key={i}
                    className="rounded bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] px-2 py-1 text-xs text-[var(--aethel-success-light)]"
                  >
                    {artifact.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  return (
    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-3">
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--aethel-surface-tertiary)] text-xs text-[var(--aethel-text-secondary)]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--aethel-text-secondary)]">{step.thought}</p>
          {step.action && (
            <p className="mt-1 text-xs text-[var(--aethel-info-light)]">
              {'->'} {step.action.tool}
            </p>
          )}
          {step.observation && (
            <p className="mt-1 truncate text-xs text-[var(--aethel-text-quaternary)]">
              {step.observation.substring(0, 100)}...
            </p>
          )}
        </div>
        {step.result?.success !== undefined && (
          <span className={`text-xs ${step.result.success ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'}`}>
            {step.result.success ? 'ok' : 'failure'}
          </span>
        )}
      </div>
    </div>
  )
}
