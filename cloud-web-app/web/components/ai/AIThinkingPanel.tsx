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
  thinking: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  analyzing: { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
  searching: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  planning: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  generating: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  validating: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
  refining: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  complete: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
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
          className="w-1.5 h-1.5 bg-violet-400 rounded-full"
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
      className="absolute inset-0 rounded-lg"
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(139, 92, 246, 0)',
          '0 0 0 4px rgba(139, 92, 246, 0.3)',
          '0 0 0 0 rgba(139, 92, 246, 0)',
        ],
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
        className="text-zinc-700"
      />
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-violet-400"
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
        <div className="absolute left-4 top-10 w-0.5 h-full -translate-x-1/2 bg-zinc-800" />
      )}

      <div className={`
        relative rounded-lg border transition-all duration-200
        ${colors.bg} ${colors.border}
        ${step.status === 'active' ? 'ring-1 ring-sky-500/50' : ''}
      `}>
        <NeuralPulse active={step.status === 'active'} />

        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 p-3"
        >
          {/* Status indicator */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${step.status === 'active' ? 'bg-violet-500/30' : 'bg-zinc-800/50'}
          `}>
            {step.status === 'active' ? (
              <Loader2 className={`w-4 h-4 ${colors.text} animate-spin`} />
            ) : step.status === 'error' ? (
              <XCircle className="w-4 h-4 text-red-400" />
            ) : step.status === 'complete' ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Clock className="w-4 h-4 text-zinc-500" />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${colors.text}`} />
              <span className="text-sm font-medium text-white">
                {step.title}
              </span>
              {step.status === 'active' && <ThinkingDots />}
            </div>
            
            {step.duration && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Concluído em {(step.duration / 1000).toFixed(1)}s
              </p>
            )}
          </div>

          {/* Expand/collapse */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-zinc-500" />
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
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {step.content}
                    {step.status === 'active' && (
                      <span className="inline-block w-2 h-4 bg-violet-400 ml-0.5 animate-pulse" />
                    )}
                  </p>

                  {/* Code preview */}
                  {step.metadata?.codePreview && (
                    <div className="relative rounded bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs overflow-x-auto">
                      <pre className="text-zinc-300">
                        {step.metadata.codePreview}
                      </pre>
                      <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1 bg-zinc-800 
                                 hover:bg-zinc-700 rounded transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Metadata */}
                  {step.metadata && (
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
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
                          {Math.round(step.metadata.confidence * 100)}% confiança
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
        bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl
        flex flex-col overflow-hidden z-40
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-5 h-5 text-violet-400" />
            {isStreaming && (
              <motion.div
                className="absolute -inset-1 bg-violet-500/30 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              Pensamento da IA
              {isStreaming && <ThinkingDots />}
            </h3>
            <p className="text-xs text-zinc-500">
              {session.status === 'complete' 
                ? `Concluído em ${((session.endTime || Date.now()) - session.startTime) / 1000}s`
                : `${completedSteps}/${totalSteps} etapas`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Progress */}
          <ProgressRing progress={progress} />

          {/* Toggle collapse */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Maximize */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-zinc-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
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
            <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Prompt</p>
              <p className="text-sm text-zinc-300 line-clamp-2">
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
        <div className="px-4 py-3 border-t border-zinc-800 bg-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">
              Resultado gerado
            </span>
          </div>
          
          {session.result.files && session.result.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.result.files.map((file, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300"
                >
                  {file}
                </span>
              ))}
            </div>
          )}
          
          {session.result.preview && (
            <pre className="mt-2 p-2 bg-zinc-950 rounded text-xs text-zinc-400 overflow-x-auto">
              {session.result.preview}
            </pre>
          )}
        </div>
      )}

      {/* Error state */}
      {session.status === 'error' && (
        <div className="px-4 py-3 border-t border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">
              Erro durante processamento
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AIThinkingPanel;
