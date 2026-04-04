/**
 * AIThinkingPanel - Painel Visual de "Cadeia de Pensamento" da IA
 *
 * Mostra em tempo real os passos de raciocínio da IA.
 * Inspirado em "Chain of Thought" prompting visibility.
 * Usa WebSocket para streaming de tokens.
 *
 * @see AI_SELF_REFLECTION_SYSTEM.md
 * @see INOVACOES_TECNICAS_DETALHADAS.md
 *
 * @module components/ai/AIThinkingPanel
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Brain,
  Cpu,
  Search,
  FileCode,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  Layers,
  Palette,
  Wand2,
  AlertCircle,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Zap,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type ThinkingStepType =
  | 'thinking'      // Raciocínio geral
  | 'analyzing'     // Analisando código/contexto
  | 'searching'     // Buscando referências
  | 'planning'      // Planejando solução
  | 'generating'    // Gerando código/asset
  | 'validating'    // Validando resultado
  | 'refining'      // Refinando output
  | 'complete'      // Etapa concluída
  | 'error';        // Erro na etapa

export interface ThinkingStep {
  id: string;
  type: ThinkingStepType;
  title: string;
  content: string;
  timestamp: number;
  duration?: number;
  status: 'pending' | 'active' | 'complete' | 'error';
  children?: ThinkingStep[];
  metadata?: {
    tokensUsed?: number;
    model?: string;
    confidence?: number;
    codePreview?: string;
  };
}

export interface AISession {
  id: string;
  prompt: string;
  startTime: number;
  endTime?: number;
  steps: ThinkingStep[];
  status: 'thinking' | 'complete' | 'error' | 'cancelled';
  result?: {
    type: 'code' | 'asset' | 'text';
    preview?: string;
    files?: string[];
  };
}

interface AIThinkingPanelProps {
  session?: AISession | null;
  isStreaming?: boolean;
  position?: 'right' | 'bottom' | 'floating';
  defaultCollapsed?: boolean;
  onClose?: () => void;
  onCopyStep?: (step: ThinkingStep) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEP_ICONS: Record<ThinkingStepType, React.ComponentType<{ className?: string }>> = {
  thinking: Brain,
  analyzing: Search,
  searching: FileCode,
  planning: Lightbulb,
  generating: Code2,
  validating: CheckCircle2,
  refining: Wand2,
  complete: CheckCircle2,
  error: XCircle,
};

const STEP_COLORS: Record<ThinkingStepType, { bg: string; text: string; border: string }> = {
  thinking: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]',
    text: 'text-[var(--aethel-primary)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]',
  },
  analyzing: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)]',
    text: 'text-[var(--aethel-info)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  },
  searching: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]',
    text: 'text-[var(--aethel-warning-light)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
  },
  planning: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_16%,transparent)]',
    text: 'text-[var(--aethel-secondary)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-secondary)_35%,transparent)]',
  },
  generating: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)]',
    text: 'text-[var(--aethel-info)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  },
  validating: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)]',
    text: 'text-[var(--aethel-success)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  },
  refining: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]',
    text: 'text-[var(--aethel-warning-light)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
  },
  complete: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)]',
    text: 'text-[var(--aethel-success)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  },
  error: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)]',
    text: 'text-[var(--aethel-error)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]',
  },
};

// ============================================================================
// HOOKS
// ============================================================================

function useThinkingStream(sessionId?: string) {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    try {
      wsRef.current = new WebSocket(`${wsUrl}/ai/thinking/${sessionId}`);

      wsRef.current.onopen = () => {
        setIsStreaming(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'STEP_START') {
            setSteps(prev => [...prev, data.step]);
          } else if (data.type === 'STEP_UPDATE') {
            setSteps(prev => prev.map(s =>
              s.id === data.stepId ? { ...s, ...data.updates } : s
            ));
          } else if (data.type === 'STEP_COMPLETE') {
            setSteps(prev => prev.map(s =>
              s.id === data.stepId ? { ...s, status: 'complete', duration: data.duration } : s
            ));
          } else if (data.type === 'SESSION_COMPLETE') {
            setIsStreaming(false);
          }
        } catch (e) {
          console.error('Error parsing thinking stream:', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsStreaming(false);
      };

      wsRef.current.onerror = () => {
        setIsStreaming(false);
      };
    } catch {
      // WebSocket not available
    }

    return () => {
      wsRef.current?.close();
    };
  }, [sessionId]);

  return { steps, isStreaming };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ThinkingDots() {
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

function ProgressRing({ progress }: { progress: number }) {
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

function StepItem({ step, index, isLast, onCopy }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(step.status === 'active');
  const [copied, setCopied] = useState(false);
  const colors = STEP_COLORS[step.type];
  const Icon = STEP_ICONS[step.type];

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
        <button type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 p-3"
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
                Concluido em {(step.duration / 1000).toFixed(1)}s
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
                      <button type="button"
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1 bg-[var(--aethel-surface-tertiary)]
                                 hover:bg-[var(--aethel-surface-quaternary)] rounded transition-colors"
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
                          {Math.round(step.metadata.confidence * 100)}% confianca
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
// MAIN COMPONENT
// ============================================================================

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
              Pensamento da IA
              {isStreaming && <ThinkingDots />}
            </h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {session.status === 'complete'
                ? `Concluido em ${((session.endTime || Date.now()) - session.startTime) / 1000}s`
                : `${completedSteps}/${totalSteps} etapas`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Progress */}
          <ProgressRing progress={progress} />

          {/* Toggle collapse */}
          <button type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
          </button>

          {/* Maximize */}
          <button type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
          </button>

          {/* Close */}
          {onClose && (
            <button type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded transition-colors"
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
              Resultado gerado
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
              Erro durante processamento
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AIThinkingPanel;
