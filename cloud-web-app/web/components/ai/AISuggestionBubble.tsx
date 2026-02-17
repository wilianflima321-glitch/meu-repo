/**
 * AISuggestionBubble - Bolhas de Sugestão Proativa da IA
 * 
 * Sugestões contextuais não-intrusivas da IA.
 * Aparece próximo ao elemento relevante.
 * Pode ser dispensada ou aplicada rapidamente.
 * 
 * @see AI_SELF_REFLECTION_SYSTEM.md
 * @see INOVACOES_TECNICAS_DETALHADAS.md
 * 
 * @module components/ai/AISuggestionBubble
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Sparkles,
  Lightbulb,
  Wand2,
  X,
  ChevronRight,
  Check,
  Copy,
  Code,
  Palette,
  Zap,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  ExternalLink,
  Brain,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SuggestionType = 
  | 'code'        // Sugestão de código
  | 'design'      // Sugestão de design/visual
  | 'performance' // Sugestão de performance
  | 'ux'          // Sugestão de UX
  | 'error'       // Correção de erro
  | 'tip';        // Dica geral

export type SuggestionPosition = 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right';

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  code?: string;
  autoApplyable: boolean;
  priority: 'low' | 'medium' | 'high';
  context?: {
    file?: string;
    line?: number;
    element?: string;
  };
  createdAt: number;
  expiresAt?: number;
}

interface AISuggestionBubbleProps {
  suggestion: AISuggestion;
  position?: SuggestionPosition;
  anchor?: { x: number; y: number } | React.RefObject<HTMLElement>;
  onApply?: (suggestion: AISuggestion) => Promise<void>;
  onDismiss?: (suggestion: AISuggestion) => void;
  onFeedback?: (suggestion: AISuggestion, helpful: boolean) => void;
  onLearnMore?: (suggestion: AISuggestion) => void;
  autoHideDelay?: number; // ms, 0 = no auto hide
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_CONFIG: Record<SuggestionType, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  code: {
    icon: Code,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    label: 'Código',
  },
  design: {
    icon: Palette,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    label: 'Design',
  },
  performance: {
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Performance',
  },
  ux: {
    icon: Sparkles,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    label: 'UX',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Erro',
  },
  tip: {
    icon: Lightbulb,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Dica',
  },
};

const POSITION_STYLES: Record<SuggestionPosition, { 
  initial: { x: number; y: number; scale: number };
  arrow: string;
}> = {
  'top': { 
    initial: { x: 0, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-zinc-800 border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom': {
    initial: { x: 0, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-zinc-800 border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
  'left': {
    initial: { x: 10, y: 0, scale: 0.95 },
    arrow: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-zinc-800 border-t-transparent border-b-transparent border-r-transparent border-l-[6px] border-t-[6px] border-b-[6px]',
  },
  'right': {
    initial: { x: -10, y: 0, scale: 0.95 },
    arrow: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-zinc-800 border-t-transparent border-b-transparent border-l-transparent border-r-[6px] border-t-[6px] border-b-[6px]',
  },
  'top-left': {
    initial: { x: 10, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] right-4 border-t-zinc-800 border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'top-right': {
    initial: { x: -10, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] left-4 border-t-zinc-800 border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom-left': {
    initial: { x: 10, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] right-4 border-b-zinc-800 border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom-right': {
    initial: { x: -10, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] left-4 border-b-zinc-800 border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AIPulse({ color }: { color: string }) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-full ${color.replace('text-', 'bg-').replace('-400', '-500/30')}`}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.3, 0, 0.3],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function CodePreview({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative mt-2 rounded bg-zinc-950 border border-zinc-800 overflow-hidden">
      <pre className="p-2 text-xs text-zinc-300 overflow-x-auto max-h-[100px]">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 p-1 bg-zinc-800 hover:bg-zinc-700 
                 rounded transition-colors"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3 text-zinc-500" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const config = TYPE_CONFIG[suggestion.type];
  const Icon = config.icon;
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
    try {
      await onApply(suggestion);
      setIsVisible(false);
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
          bg-zinc-900 border ${config.borderColor} rounded-xl shadow-xl
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
                <AIPulse color={config.color} />
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
                    <span className="px-1 py-0.5 bg-red-500/20 rounded text-[10px] text-red-400">
                      Importante
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-white mt-0.5">
                  {suggestion.title}
                </h4>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {suggestion.description}
          </p>

          {/* Code preview */}
          {suggestion.code && (
            <CodePreview code={suggestion.code} />
          )}

          {/* Context info */}
          {suggestion.context?.file && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
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
          {suggestion.autoApplyable && (
            <button
              onClick={handleApply}
              disabled={isApplying}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2
                bg-gradient-to-r from-blue-600 to-cyan-600
                hover:from-blue-500 hover:to-cyan-500
                rounded-lg text-sm font-medium transition-all
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
                  Aplicar
                </>
              )}
            </button>
          )}

          {onLearnMore && (
            <button
              onClick={() => onLearnMore(suggestion)}
              className="flex items-center gap-1 px-3 py-2 bg-zinc-800 
                       hover:bg-zinc-700 rounded-lg text-sm text-zinc-300
                       transition-colors"
            >
              Saber mais
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More options */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-500" />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-1 py-1 w-40
                           bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl"
                >
                  <button
                    onClick={() => handleFeedback(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Útil
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Não útil
                  </button>
                  <div className="my-1 border-t border-zinc-700" />
                  <button
                    onClick={handleDismiss}
                    className="w-full flex items-center gap-2 px-3 py-1.5
                             hover:bg-zinc-700 text-sm text-zinc-400 transition-colors"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    Não mostrar novamente
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// SUGGESTION MANAGER COMPONENT
// ============================================================================

interface SuggestionManagerProps {
  suggestions: AISuggestion[];
  onApply?: (suggestion: AISuggestion) => Promise<void>;
  onDismiss?: (suggestion: AISuggestion) => void;
  onFeedback?: (suggestion: AISuggestion, helpful: boolean) => void;
  maxVisible?: number;
}

export function SuggestionManager({
  suggestions,
  onApply,
  onDismiss,
  onFeedback,
  maxVisible = 3,
}: SuggestionManagerProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<AISuggestion[]>([]);

  // Show only the most recent suggestions
  useEffect(() => {
    const sorted = [...suggestions]
      .filter(s => !s.expiresAt || s.expiresAt > Date.now())
      .sort((a, b) => {
        // Priority order: high > medium > low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        // Then by date
        return b.createdAt - a.createdAt;
      })
      .slice(0, maxVisible);
    
    setVisibleSuggestions(sorted);
  }, [suggestions, maxVisible]);

  const handleDismiss = useCallback((suggestion: AISuggestion) => {
    setVisibleSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    onDismiss?.(suggestion);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 right-4 space-y-3 z-40">
      <AnimatePresence mode="popLayout">
        {visibleSuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            layout
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ delay: index * 0.1 }}
          >
            <AISuggestionBubble
              suggestion={suggestion}
              position="left"
              onApply={onApply}
              onDismiss={handleDismiss}
              onFeedback={onFeedback}
              autoHideDelay={30000} // 30 seconds
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// AUTO-MANAGED VERSION
// ============================================================================

/**
 * AISuggestionBubbleAuto - Versão auto-gerenciada
 * Busca sugestões da API automaticamente e gerencia exibição
 */
export function AISuggestionBubbleAuto() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [enabled, setEnabled] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Buscar sugestões da API
  useEffect(() => {
    if (!enabled) return;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/ai/suggestions?limit=5');
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions) {
            setSuggestions(data.suggestions.map((s: any) => ({
              id: s.id,
              type: mapSuggestionType(s.type),
              title: s.title,
              description: s.description,
              autoApplyable: !!s.action,
              priority: s.priority,
              createdAt: Date.now(),
              expiresAt: s.expiresAt,
            })));
          }
        }
      } catch (e) {
        // Silent fail
      }
    };

    fetchSuggestions();
    pollIntervalRef.current = setInterval(fetchSuggestions, 120000); // 2 min

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled]);

  const handleApply = useCallback(async (suggestion: AISuggestion) => {
    try {
      // Em produção, chamar API para aplicar
      console.log('Applying suggestion:', suggestion.id);
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (e) {
      console.error('Failed to apply suggestion:', e);
    }
  }, []);

  const handleDismiss = useCallback((suggestion: AISuggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    // Log para melhorar IA
    fetch('/api/ai/suggestions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: suggestion.id, action: 'dismissed' }),
    }).catch(() => {});
  }, []);

  const handleFeedback = useCallback((suggestion: AISuggestion, helpful: boolean) => {
    fetch('/api/ai/suggestions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: suggestion.id, helpful }),
    }).catch(() => {});
  }, []);

  // Não mostrar nada se desabilitado ou sem sugestões
  if (!enabled || suggestions.length === 0) {
    return null;
  }

  return (
    <SuggestionManager
      suggestions={suggestions}
      onApply={handleApply}
      onDismiss={handleDismiss}
      onFeedback={handleFeedback}
      maxVisible={2}
    />
  );
}

function mapSuggestionType(apiType: string): SuggestionType {
  const mapping: Record<string, SuggestionType> = {
    optimization: 'performance',
    feature: 'tip',
    workflow: 'ux',
    learning: 'tip',
    warning: 'error',
  };
  return mapping[apiType] || 'tip';
}

export default AISuggestionBubble;
