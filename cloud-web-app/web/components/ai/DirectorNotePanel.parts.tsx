'use client';

// @aethel-heavy-async-boundary: imported only through lazy AI surfaces.

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from '@/lib/ui/motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Film,
  Lightbulb,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  X,
} from 'lucide-react';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { CATEGORY_INFO, SEVERITY_STYLES } from './DirectorNotePanel.config';
import type { DirectorNote } from './DirectorNotePanel.types';

export function ScoreRing({ score, size = 60 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * ((size - 8) / 2);
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'text-[var(--aethel-success)]';
    if (s >= 60) return 'text-[var(--aethel-warning-light)]';
    return 'text-[var(--aethel-error)]';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-[var(--aethel-border-primary)]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className={getColor(score)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${getColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

interface NoteCardProps {
  note: DirectorNote;
  onApplyFix?: (note: DirectorNote) => Promise<void>;
  onJumpTo?: (reference: DirectorNote['reference']) => void;
  onFeedback?: (noteId: string, feedback: 'helpful' | 'not_helpful') => void;
  onDismiss?: (noteId: string) => void;
}

export function NoteCard({ note, onApplyFix, onJumpTo, onFeedback, onDismiss }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const categoryInfo = CATEGORY_INFO[note.category];
  const severityStyle = SEVERITY_STYLES[note.severity];
  const CategoryIcon = categoryInfo.icon;
  const iconButtonClass = `rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;
  const subtleActionClass = `flex items-center gap-2 rounded-lg bg-[var(--aethel-surface-quaternary)] px-2 py-1.5 text-xs text-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  const handleApplyFix = async () => {
    if (!onApplyFix) return;
    setIsApplying(true);
    try {
      await onApplyFix(note);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        rounded-lg border transition-all
        ${severityStyle.bg} ${severityStyle.border}
        ${note.status === 'dismissed' ? 'opacity-50' : ''}
      `}
    >
      {/* Header */}
      <button
        type="button"
        aria-label={isExpanded ? `Collapse note ${note.title}` : `Expand note ${note.title}`}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-start gap-3 p-3 text-left ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
      >
        {/* Category icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)] ${categoryInfo.color}
        `}>
          <CategoryIcon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              px-1.5 py-0.5 rounded text-xs font-medium
              ${severityStyle.badge}
            `}>
              {severityStyle.label}
            </span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{categoryInfo.label}</span>
          </div>

          <h4 className="text-sm font-medium text-[var(--aethel-text-primary)]">
            {note.title}
          </h4>

          {!isExpanded && (
            <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1 line-clamp-1">
              {note.description}
            </p>
          )}
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Description */}
              <p className="text-sm text-[var(--aethel-text-secondary)] leading-relaxed pl-11">
                {note.description}
              </p>

              {/* Suggestion */}
              {note.suggestion && (
                <div className="ml-11 p-2 bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-[var(--aethel-primary)]" />
                    <span className="text-xs font-medium text-[var(--aethel-primary)]">
                      Director suggestion
                    </span>
                  </div>
                  <p className="text-sm text-[var(--aethel-text-secondary)]">
                    {note.suggestion}
                  </p>
                </div>
              )}

              {/* Reference */}
              {note.reference && (
                <button
                  type="button"
                  aria-label={`Jump to reference ${note.reference.name}`}
                  onClick={() => onJumpTo?.(note.reference)}
                  className={`group ml-11 ${subtleActionClass}`}
                >
                  <Eye className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)] group-hover:text-[var(--aethel-text-primary)]" />
                  <span>Open: {note.reference.name}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--aethel-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Examples toggle */}
              {note.examples && note.examples.length > 0 && (
                <div className="ml-11">
                  <button
                    type="button"
                    aria-label={showExamples ? 'Hide reference examples' : 'Show reference examples'}
                    onClick={() => setShowExamples(!showExamples)}
                    className={`flex items-center gap-1.5 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    View reference examples
                    <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showExamples && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-2"
                      >
                        {note.examples.map((example, i) => (
                          <div key={i} className="flex gap-2 p-2 bg-[var(--aethel-surface-secondary)] rounded">
                            {example.image && (
                              <Image
                                src={example.image}
                                alt={example.label}
                                width={64}
                                height={48}
                                unoptimized
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="text-xs font-medium text-[var(--aethel-text-secondary)]">
                                {example.label}
                              </p>
                              <p className="text-xs text-[var(--aethel-text-tertiary)] mt-0.5">
                                {example.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Actions */}
              <div className="ml-11 flex items-center gap-2">
                {note.autoFixAvailable && note.status !== 'applied' && (
                  <button
                    type="button"
                    aria-label={`Apply suggested fix for ${note.title}`}
                    onClick={handleApplyFix}
                    disabled={isApplying}
                    className={`flex items-center gap-1.5 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        Apply fix
                      </>
                    )}
                  </button>
                )}

                {note.status === 'applied' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5
                                 bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] rounded-lg text-xs text-[var(--aethel-success)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Applied
                  </span>
                )}

                {/* Feedback buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    aria-label={`Mark note ${note.title} as useful`}
                    onClick={() => onFeedback?.(note.id, 'helpful')}
                    className={`rounded p-1.5 ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${
                      note.feedback === 'helpful'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success)]'
                        : 'hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
                    }`}
                    title="Useful"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mark note ${note.title} as not useful`}
                    onClick={() => onFeedback?.(note.id, 'not_helpful')}
                    className={`rounded p-1.5 ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${
                      note.feedback === 'not_helpful'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)] text-[var(--aethel-error)]'
                        : 'hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
                    }`}
                    title="Not useful"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Dismiss note ${note.title}`}
                    onClick={() => onDismiss?.(note.id)}
                    className={iconButtonClass}
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
