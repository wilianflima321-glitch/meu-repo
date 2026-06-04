'use client';

// @aethel-heavy-async-boundary: imported only through lazy AI surfaces.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from '@/lib/ui/motion';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Loader2,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { STEP_COLORS, STEP_ICONS } from './AIThinkingPanel.config';
import type { ThinkingStep } from './AIThinkingPanel.types';

export function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-[var(--aethel-primary)] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}

function NeuralPulse({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <motion.div
      className="absolute inset-0 rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]"
      animate={{
        opacity: [0.25, 0.6, 0.25],
        scale: [1, 1.02, 1],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}

export function ProgressRing({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * 10;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-[var(--aethel-border-primary)]"
      />
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-[var(--aethel-primary)]"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

interface StepItemProps {
  step: ThinkingStep;
  index: number;
  isLast: boolean;
  onCopy?: (step: ThinkingStep) => void;
}

export function StepItem({ step, index, isLast, onCopy }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(step.status === 'active');
  const [copied, setCopied] = useState(false);
  const colors = STEP_COLORS[step.type];
  const Icon = STEP_ICONS[step.type];
  const iconButtonClass = `rounded transition-colors ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(step.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(step);
  }, [step, onCopy]);

  // Auto-expand active steps
  useEffect(() => {
    if (step.status === 'active') {
      setIsExpanded(true);
    }
  }, [step.status]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-4 top-10 w-0.5 h-full -translate-x-1/2 bg-[var(--aethel-border-primary)]" />
      )}

      <div className={`
        relative rounded-lg border transition-all duration-200
        ${colors.bg} ${colors.border}
        ${step.status === 'active' ? 'ring-1 ring-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]' : ''}
      `}>
        <NeuralPulse active={step.status === 'active'} />

        {/* Header */}
        <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} step ${step.title}`}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center gap-3 p-3 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
        >
          {/* Status indicator */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${step.status === 'active' ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'}
          `}>
            {step.status === 'active' ? (
              <Loader2 className={`w-4 h-4 ${colors.text} animate-spin`} />
            ) : step.status === 'error' ? (
              <XCircle className="w-4 h-4 text-[var(--aethel-error)]" />
            ) : step.status === 'complete' ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--aethel-success)]" />
            ) : (
              <Clock className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${colors.text}`} />
              <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
                {step.title}
              </span>
              {step.status === 'active' && <ThinkingDots />}
            </div>

            {step.duration && (
              <p className="text-xs text-[var(--aethel-text-tertiary)] mt-0.5">
                Completed in {(step.duration / 1000).toFixed(1)}s
              </p>
            )}
          </div>

          {/* Expand/collapse */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          </motion.div>
        </button>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0">
                <div className="ml-11 space-y-2">
                  {/* Content text */}
                  <p className="text-sm text-[var(--aethel-text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {step.content}
                    {step.status === 'active' && (
                      <span className="inline-block w-2 h-4 bg-[var(--aethel-primary)] ml-0.5 animate-pulse" />
                    )}
                  </p>

                  {/* Code preview */}
                  {step.metadata?.codePreview && (
                    <div className="relative rounded bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] p-3 font-mono text-xs overflow-x-auto">
                      <pre className="text-[var(--aethel-text-secondary)]">
                        {step.metadata.codePreview}
                      </pre>
                      <button type="button" aria-label={copied ? 'Content copied' : `Copy code preview for step ${step.title}`}
                        onClick={handleCopy}
                        className={`absolute top-2 right-2 bg-[var(--aethel-surface-tertiary)] p-1 hover:bg-[var(--aethel-surface-quaternary)] ${iconButtonClass}`}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-[var(--aethel-success)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Metadata */}
                  {step.metadata && (
                    <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
                      {step.metadata.tokensUsed && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {step.metadata.tokensUsed} tokens
                        </span>
                      )}
                      {step.metadata.model && (
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {step.metadata.model}
                        </span>
                      )}
                      {step.metadata.confidence && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(step.metadata.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
