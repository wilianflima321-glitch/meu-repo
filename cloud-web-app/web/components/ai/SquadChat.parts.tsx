'use client';

import { useCallback, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Code2, Coins, Copy, Loader2, Play, RotateCcw, X } from 'lucide-react';

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';

import { AGENTS } from './SquadChat.agents';
import type { SquadMessage, SquadTask, TaskStep } from './SquadChat.types';

// ============================================================================
// COMPONENTE: STEP VISUALIZATION
// ============================================================================

interface StepVisualizationProps {
  step: TaskStep;
  isActive: boolean;
  isLast: boolean;
}

function StepVisualization({ step, isActive, isLast }: StepVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const agent = AGENTS[step.agentId];
  const iconButtonClass = `rounded-lg p-1.5 text-[var(--aethel-text-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  const handleCopy = useCallback(() => {
    if (step.code) {
      navigator.clipboard.writeText(step.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [step.code]);

  return (
    <div className={`relative pl-8 pb-4 ${!isLast ? 'border-l-2 border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] ml-3' : 'ml-3'}`}>
      {/* Agent Avatar */}
      <div className={`
        absolute -left-4 w-8 h-8 rounded-full flex items-center justify-center
        ${agent.bgColor} ${agent.color}
        ${isActive ? `ring-2 ring-offset-2 ring-offset-[var(--aethel-surface-primary)] ${agent.ringColor} animate-pulse` : ''}
      `}>
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : step.phase === 'complete' ? (
          <Check className="w-4 h-4" />
        ) : step.phase === 'error' ? (
          <X className="w-4 h-4 text-[var(--aethel-error)]" />
        ) : (
          agent.icon
        )}
      </div>

      {/* Step Content */}
      <div className={`
        rounded-lg border transition-all
        ${isActive
          ? `${agent.bgColor} ${agent.borderColor}`
          : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] border-[var(--aethel-border-primary)]'
        }
      `}>
        {/* Header */}
        <button type="button" aria-label={`${expanded ? 'Recolher' : 'Expandir'} etapa ${step.message}`}
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center justify-between p-3 text-left ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          aria-expanded={expanded}
          aria-controls={`step-panel-${step.id}`}
        >
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${agent.color}`}>
              {agent.name}
            </span>
            <span className="text-[var(--aethel-text-tertiary)] text-sm">
              {step.message}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {step.duration && (
              <span className="text-xs text-[var(--aethel-text-quaternary)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {(step.duration / 1000).toFixed(1)}s
              </span>
            )}
            {(step.code || step.diff || step.detail) && (
              expanded ? (
                <ChevronUp className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
              )
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div id={`step-panel-${step.id}`} className="px-3 pb-3 border-t border-[var(--aethel-border-primary)]">
            {/* Detail Text */}
            {step.detail && (
              <p className="text-sm text-[var(--aethel-text-tertiary)] mt-3 whitespace-pre-wrap">
                {step.detail}
              </p>
            )}

            {/* Code Block */}
            {step.code && (
              <div className="mt-3 relative">
                <div className="flex items-center justify-between bg-[var(--aethel-surface-tertiary)] rounded-t-lg px-3 py-1.5 border border-b-0 border-[var(--aethel-border-primary)]">
                  <span className="text-xs text-[var(--aethel-text-quaternary)]">codigo</span>
                  <button type="button" aria-label={copied ? 'Codigo copiado' : 'Copiar codigo'}
                    onClick={handleCopy}
                    className={`flex items-center gap-1 text-xs text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-[var(--aethel-surface-primary)] rounded-b-lg p-3 text-sm text-[var(--aethel-text-secondary)] overflow-x-auto border border-[var(--aethel-border-primary)]">
                  <code>{step.code}</code>
                </pre>
              </div>
            )}

            {/* Diff View */}
            {step.diff && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <span className="text-xs text-[var(--aethel-error)] mb-1 block">Antes</span>
                  <pre className="bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] rounded-lg p-2 text-xs text-[var(--aethel-error)] overflow-x-auto border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]">
                    {step.diff.before}
                  </pre>
                </div>
                <div>
                  <span className="text-xs text-[var(--aethel-success)] mb-1 block">Depois</span>
                  <pre className="bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded-lg p-2 text-xs text-[var(--aethel-success)] overflow-x-auto border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]">
                    {step.diff.after}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: TASK CARD
// ============================================================================

interface TaskCardProps {
  task: SquadTask;
  onApply?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}

function TaskCard({ task, onApply, onReject, onRetry }: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const currentStepIndex = task.steps.findIndex(s => s.phase !== 'complete');
  const isProcessing = task.status !== 'complete' && task.status !== 'error';
  const duration = task.endTime
    ? (task.endTime.getTime() - task.startTime.getTime()) / 1000
    : (Date.now() - task.startTime.getTime()) / 1000;
  const headerButtonClass = `rounded-lg p-1 text-[var(--aethel-text-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;
  const primaryActionClass = `flex items-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:brightness-110 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;
  const secondaryActionClass = `flex items-center gap-2 rounded-lg bg-[var(--aethel-surface-tertiary)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] rounded-xl border border-[var(--aethel-border-primary)] overflow-hidden">
      {/* Task Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[var(--aethel-text-primary)] font-medium mb-1">{task.prompt}</p>
            <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-quaternary)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration.toFixed(1)}s
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {task.creditsUsed} creditos
              </span>
              {task.files && task.files.length > 0 && (
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3" />
                  {task.files.length} files
                </span>
              )}
            </div>
          </div>
          <button type="button" aria-label={`${expanded ? 'Recolher' : 'Expandir'} tarefa ${task.prompt}`}
            onClick={() => setExpanded(!expanded)}
            className={headerButtonClass}
            aria-expanded={expanded}
            aria-controls={`task-panel-${task.id}`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-3 h-1 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--aethel-border-primary)_85%,transparent)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--aethel-info)] via-[var(--aethel-primary)] to-[var(--aethel-success)] animate-pulse"
              style={{
                width: `${Math.min(((currentStepIndex + 1) / task.steps.length) * 100, 100)}%`,
                transition: 'width 0.5s ease-out'
              }}
            />
          </div>
        )}
      </div>

      {/* Steps */}
      {expanded && (
        <div id={`task-panel-${task.id}`} className="p-4">
          {task.steps.map((step, index) => (
            <StepVisualization
              key={step.id}
              step={step}
              isActive={index === currentStepIndex && isProcessing}
              isLast={index === task.steps.length - 1}
            />
          ))}

          {/* Result Section */}
          {task.status === 'complete' && task.result && (
            <div className="mt-4 p-4 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] rounded-lg">
              <div className="flex items-center gap-2 text-[var(--aethel-success)] mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Tarefa concluida</span>
              </div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{task.result}</p>

              {/* Files Created */}
              {task.files && task.files.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-[var(--aethel-text-quaternary)] mb-2 block">Files modified:</span>
                  <div className="flex flex-wrap gap-2">
                    {task.files.map((file) => (
                      <span key={file} className="px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs text-[var(--aethel-text-secondary)] font-mono">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button type="button" aria-label="Revisar proposta"
                  onClick={onApply}
                  className={primaryActionClass}
                >
                  <Play className="w-4 h-4" />
                  Revisar proposta
                </button>
                <button type="button" aria-label="Descartar proposta"
                  onClick={onReject}
                  className={secondaryActionClass}
                >
                  <X className="w-4 h-4" />
                  Descartar proposta
                </button>
              </div>
            </div>
          )}

          {/* Error Section */}
          {task.status === 'error' && (
            <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4">
              <div className="mb-2 flex items-center gap-2 text-[var(--aethel-error)]">
                <X className="w-5 h-5" />
                <span className="font-medium">Task error</span>
              </div>
              <button type="button" aria-label="Executar novamente a tarefa com error"
                onClick={onRetry}
                className={`mt-2 flex items-center gap-2 rounded-lg bg-[var(--aethel-error)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:brightness-110 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              >
                <RotateCcw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: MESSAGE BUBBLE
// ============================================================================

interface MessageBubbleProps {
  message: SquadMessage;
  onApply?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}

export function MessageBubble({ message, onApply, onReject, onRetry }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] px-4 py-3 bg-[var(--aethel-primary)] rounded-2xl rounded-br-sm">
          <p className="text-[var(--aethel-text-primary)]">{message.content}</p>
          <span className="text-xs text-[color-mix(in_srgb,var(--aethel-primary-light)_80%,transparent)] mt-1 block">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  }

  if (message.task) {
    return (
      <div className="mb-4">
        <TaskCard
          task={message.task}
          onApply={onApply}
          onReject={onReject}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
      <div className="flex justify-start mb-4">
      <div className="max-w-[80%] px-4 py-3 bg-[var(--aethel-surface-secondary)] rounded-2xl rounded-bl-sm border border-[var(--aethel-border-primary)]">
        <p className="text-[var(--aethel-text-secondary)]">{message.content}</p>
        <span className="text-xs text-[var(--aethel-text-quaternary)] mt-1 block">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
