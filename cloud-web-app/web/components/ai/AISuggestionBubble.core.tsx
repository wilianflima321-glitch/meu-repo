'use client';

// @aethel-heavy-async-boundary: imported only through lazy AI surfaces.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from '@/lib/ui/motion';
import { Brain, ChevronRight, Code, MoreHorizontal, Sparkles, ThumbsDown, ThumbsUp, VolumeX, Wand2, X } from 'lucide-react';

import { POSITION_STYLES, TYPE_CONFIG } from './AISuggestionBubble.config';
import { AIPulse, CodePreview } from './AISuggestionBubble.parts';
import type { AISuggestionBubbleProps } from './AISuggestionBubble.types';

// MAIN COMPONENT
// ============================================================================

export function AISuggestionBubble({
  suggestion,
  position = 'top-right',
  anchor,
  onApply,
  onDismiss,
  onFeedback,
  onLearnMore,
  autoHideDelay = 0,
  className = '',
}: AISuggestionBubbleProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const config = TYPE_CONFIG[suggestion.type];
  const posStyle = POSITION_STYLES[position];

  // Auto-hide timer
  useEffect(() => {
    if (autoHideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.(suggestion);
      }, autoHideDelay);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [autoHideDelay, suggestion, onDismiss]);

  // Reset timer on hover
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (autoHideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.(suggestion);
      }, autoHideDelay);
    }
  }, [autoHideDelay, suggestion, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.(suggestion);
  }, [suggestion, onDismiss]);

  const handleApply = useCallback(async () => {
    if (!onApply) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await onApply(suggestion);
      setIsVisible(false);
    } catch (error) {
      setApplyError('Could not apply that now. Try again.');
    } finally {
      setIsApplying(false);
    }
  }, [suggestion, onApply]);

  const handleFeedback = useCallback((helpful: boolean) => {
    onFeedback?.(suggestion, helpful);
    // Optionally dismiss after feedback
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.(suggestion);
    }, 1000);
  }, [suggestion, onFeedback, onDismiss]);

  // Calculate position based on anchor
  const bubbleStyle = useCallback(() => {
    if (!anchor) return {};

    if ('current' in anchor && anchor.current) {
      const rect = anchor.current.getBoundingClientRect();
      // Position relative to element
      return {
        position: 'fixed' as const,
        top: rect.top,
        left: rect.right + 10,
      };
    } else if ('x' in anchor) {
      return {
        position: 'fixed' as const,
        top: anchor.y,
        left: anchor.x,
      };
    }

    return {};
  }, [anchor]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, ...posStyle.initial }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={bubbleStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          relative z-50 w-72
          bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-xl shadow-xl
          ${className}
        `}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-solid ${posStyle.arrow}`} />

        {/* Header */}
        <div className={`p-3 ${config.bgColor} rounded-t-xl border-b ${config.borderColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* AI icon with pulse */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <AIPulse className={config.pulseColor} />
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`relative z-10 w-6 h-6 rounded-lg ${config.bgColor}
                            flex items-center justify-center`}
                >
                  <Brain className={`w-4 h-4 ${config.color}`} />
                </motion.div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {suggestion.priority === 'high' && (
                    <span className="px-1 py-0.5 bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] rounded text-[10px] text-[var(--aethel-error)]">
                      Importante
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-[var(--aethel-text-primary)] mt-0.5">
                  {suggestion.title}
                </h4>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded transition-colors"
              aria-label="Dispensar sugestao"
            >
              <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-sm text-[var(--aethel-text-secondary)] leading-relaxed">
            {suggestion.description}
          </p>

          {/* Code preview */}
          {suggestion.code && (
            <CodePreview code={suggestion.code} />
          )}

          {/* Context info */}
          {suggestion.context?.file && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--aethel-text-tertiary)]">
              <Code className="w-3 h-3" />
              <span className="truncate">{suggestion.context.file}</span>
              {suggestion.context.line && (
                <span>:{suggestion.context.line}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 pt-0 flex items-center gap-2">
          {suggestion.autoApplyable && onApply && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2
                bg-[linear-gradient(120deg,var(--aethel-primary),var(--aethel-info))]
                hover:brightness-110
                rounded-lg text-sm font-medium text-[var(--aethel-text-primary)] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isApplying ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  Aplicando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {suggestion.actionLabel || 'Aplicar'}
                </>
              )}
            </button>
          )}

          {onLearnMore && (
            <button
              type="button"
              onClick={() => onLearnMore(suggestion)}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)]
                       hover:bg-[var(--aethel-surface-quaternary)] rounded-lg text-sm text-[var(--aethel-text-secondary)]
                       transition-colors"
            >
              Saiba mais
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-[var(--aethel-surface-tertiary)] rounded-lg transition-colors"
              aria-label="Mais opcoes"
              aria-haspopup="true"
              aria-expanded={showActions}
            >
              <MoreHorizontal className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-1 py-1 w-40
                           bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => handleFeedback(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-[var(--aethel-surface-quaternary)] text-sm text-[var(--aethel-text-secondary)] transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Util
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-[var(--aethel-surface-quaternary)] text-sm text-[var(--aethel-text-secondary)] transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Nao util
                  </button>
                  <div className="my-1 border-t border-[var(--aethel-border-primary)]" />
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-[var(--aethel-surface-quaternary)] text-sm text-[var(--aethel-text-tertiary)] transition-colors"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    Nao mostrar novamente
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {applyError && (
          <div className="px-3 pb-3 text-xs text-[var(--aethel-error)]" role="status" aria-live="polite">
            {applyError}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================

export default AISuggestionBubble;
