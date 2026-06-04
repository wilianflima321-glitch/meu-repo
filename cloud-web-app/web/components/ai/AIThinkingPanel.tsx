'use client';

// @aethel-heavy-async-boundary: loaded only while the dashboard streams animated AI reasoning.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from '@/lib/ui/motion';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { ProgressRing, StepItem, ThinkingDots } from './AIThinkingPanel.parts';
import type { AIThinkingPanelProps } from './AIThinkingPanel.types';

export function AIThinkingPanel({
  session,
  isStreaming = false,
  position = 'right',
  defaultCollapsed = false,
  onClose,
  onCopyStep,
  className = '',
}: AIThinkingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerButtonClass = `p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (scrollRef.current && session?.steps.length) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.steps.length]);

  // Calculate progress
  const completedSteps = session?.steps.filter(s => s.status === 'complete').length || 0;
  const totalSteps = session?.steps.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Position classes
  const positionClasses = {
    right: 'fixed right-4 top-20 bottom-20 w-96',
    bottom: 'fixed left-20 right-20 bottom-4 h-80',
    floating: 'fixed right-4 bottom-20 w-96 max-h-[600px]',
  };

  if (!session || session.steps.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        width: isMaximized ? '50vw' : undefined,
        height: isMaximized ? '80vh' : undefined,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        ${isMaximized ? 'fixed inset-10' : positionClasses[position]}
        bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-xl shadow-2xl
        flex flex-col overflow-hidden z-40
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-5 h-5 text-[var(--aethel-primary)]" />
            {isStreaming && (
              <motion.div
                className="absolute -inset-1 bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] flex items-center gap-2">
              AI reasoning
              {isStreaming && <ThinkingDots />}
            </h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {session.status === 'complete'
                ? `Completed in ${((session.endTime || Date.now()) - session.startTime) / 1000}s`
                : `${completedSteps}/${totalSteps} steps`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Progress */}
          <ProgressRing progress={progress} />

          {/* Toggle collapse */}
          <button type="button" aria-label={isCollapsed ? 'Expand AI reasoning panel' : 'Collapse AI reasoning panel'}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={headerButtonClass}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
          </button>

          {/* Maximize */}
          <button type="button" aria-label={isMaximized ? 'Restore AI reasoning panel size' : 'Maximize AI reasoning panel'}
            onClick={() => setIsMaximized(!isMaximized)}
            className={headerButtonClass}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
          </button>

          {/* Close */}
          {onClose && (
            <button type="button" aria-label="Close AI reasoning panel"
              onClick={onClose}
              className={headerButtonClass}
            >
              <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            </button>
          )}
        </div>
      </div>

      {/* Original prompt */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)] border-b border-[var(--aethel-border-primary)]">
              <p className="text-xs text-[var(--aethel-text-tertiary)] mb-1">Prompt</p>
              <p className="text-sm text-[var(--aethel-text-secondary)] line-clamp-2">
                &ldquo;{session.prompt}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto p-4 space-y-3"
            >
              {session.steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={index}
                  isLast={index === session.steps.length - 1}
                  onCopy={onCopyStep}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - Result preview */}
      {session.status === 'complete' && session.result && (
        <div className="px-4 py-3 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--aethel-success)]" />
            <span className="text-sm font-medium text-[var(--aethel-success)]">
              Result generated
            </span>
          </div>

          {session.result.files && session.result.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.result.files.map((file, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-[var(--aethel-surface-tertiary)] rounded text-xs text-[var(--aethel-text-secondary)]"
                >
                  {file}
                </span>
              ))}
            </div>
          )}

          {session.result.preview && (
            <pre className="mt-2 p-2 bg-[var(--aethel-surface-primary)] rounded text-xs text-[var(--aethel-text-tertiary)] overflow-x-auto">
              {session.result.preview}
            </pre>
          )}
        </div>
      )}

      {/* Error state */}
      {session.status === 'error' && (
        <div className="px-4 py-3 border-t border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--aethel-error)]" />
            <span className="text-sm text-[var(--aethel-error)]">
              Processing error
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AIThinkingPanel;
