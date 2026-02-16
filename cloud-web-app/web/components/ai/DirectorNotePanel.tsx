/**
 * DirectorNotePanel - Painel de Crítica Artística da IA
 * 
 * A IA age como um "diretor de cinema/jogos" experiente,
 * oferecendo feedback artístico e técnico sobre o projeto.
 * Sugestões proativas baseadas em análise de cena.
 * 
 * @see AI_SELF_REFLECTION_SYSTEM.md
 * @see IDEIAS_SUGESTOES_INOVACAO.md
 * 
 * @module components/ai/DirectorNotePanel
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  Clapperboard,
  Eye,
  Lightbulb,
  Palette,
  Camera,
  Volume2,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  MessageSquare,
  ArrowRight,
  Wand2,
  AlertTriangle,
  Film,
  Gamepad2,
  RefreshCw,
  X,
  Star,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type NoteCategory = 
  | 'composition'   // Composição visual
  | 'lighting'      // Iluminação
  | 'color'         // Paleta de cores
  | 'pacing'        // Ritmo/timing
  | 'audio'         // Som e música
  | 'gameplay'      // Mecânicas de jogo
  | 'narrative'     // Narrativa
  | 'performance'   // Performance técnica
  | 'accessibility' // Acessibilidade
  | 'ux';           // Experiência do usuário

export type NoteSeverity = 'suggestion' | 'recommendation' | 'critical';

export interface DirectorNote {
  id: string;
  category: NoteCategory;
  severity: NoteSeverity;
  title: string;
  description: string;
  suggestion?: string;
  autoFixAvailable: boolean;
  reference?: {
    type: 'scene' | 'asset' | 'blueprint' | 'timeline';
    id: string;
    name: string;
    thumbnail?: string;
  };
  examples?: {
    label: string;
    image?: string;
    description: string;
  }[];
  createdAt: number;
  status: 'new' | 'acknowledged' | 'applied' | 'dismissed';
  feedback?: 'helpful' | 'not_helpful';
}

export interface DirectorSession {
  id: string;
  projectType: 'game' | 'film' | 'archviz' | 'general';
  notes: DirectorNote[];
  overallScore: number; // 0-100
  strengths: string[];
  improvements: string[];
  lastAnalysis: number;
  isAnalyzing: boolean;
}

interface DirectorNotePanelProps {
  projectId?: string;
  projectType?: 'game' | 'film' | 'archviz' | 'general';
  position?: 'right' | 'bottom' | 'floating';
  defaultCollapsed?: boolean;
  onApplyFix?: (note: DirectorNote) => Promise<void>;
  onJumpTo?: (reference: DirectorNote['reference']) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_INFO: Record<NoteCategory, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = {
  composition: { icon: Camera, label: 'Composição', color: 'text-sky-400' },
  lighting: { icon: Sparkles, label: 'Iluminação', color: 'text-amber-400' },
  color: { icon: Palette, label: 'Cores', color: 'text-cyan-400' },
  pacing: { icon: Clock, label: 'Ritmo', color: 'text-emerald-400' },
  audio: { icon: Volume2, label: 'Áudio', color: 'text-violet-400' },
  gameplay: { icon: Gamepad2, label: 'Gameplay', color: 'text-orange-400' },
  narrative: { icon: MessageSquare, label: 'Narrativa', color: 'text-rose-400' },
  performance: { icon: TrendingUp, label: 'Performance', color: 'text-lime-400' },
  accessibility: { icon: Users, label: 'Acessibilidade', color: 'text-teal-400' },
  ux: { icon: Target, label: 'UX', color: 'text-sky-400' },
};

const SEVERITY_STYLES: Record<NoteSeverity, {
  bg: string;
  border: string;
  badge: string;
  label: string;
}> = {
  suggestion: {
    bg: 'bg-zinc-800/50',
    border: 'border-zinc-700',
    badge: 'bg-zinc-600 text-zinc-200',
    label: 'Sugestão',
  },
  recommendation: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300',
    label: 'Recomendação',
  },
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300',
    label: 'Crítico',
  },
};

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreRing({ score, size = 60 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * ((size - 8) / 2);
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-amber-400';
    return 'text-red-400';
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
          className="text-zinc-800"
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

function NoteCard({ note, onApplyFix, onJumpTo, onFeedback, onDismiss }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  
  const categoryInfo = CATEGORY_INFO[note.category];
  const severityStyle = SEVERITY_STYLES[note.severity];
  const CategoryIcon = categoryInfo.icon;

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
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-3"
      >
        {/* Category icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          bg-zinc-800/80 ${categoryInfo.color}
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
            <span className="text-xs text-zinc-500">{categoryInfo.label}</span>
          </div>
          
          <h4 className="text-sm font-medium text-white">
            {note.title}
          </h4>
          
          {!isExpanded && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {note.description}
            </p>
          )}
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-zinc-500" />
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
              <p className="text-sm text-zinc-300 leading-relaxed pl-11">
                {note.description}
              </p>

              {/* Suggestion */}
              {note.suggestion && (
                <div className="ml-11 p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-violet-300">
                      Sugestão do Diretor
                    </span>
                  </div>
                  <p className="text-sm text-violet-200/80">
                    {note.suggestion}
                  </p>
                </div>
              )}

              {/* Reference */}
              {note.reference && (
                <button
                  onClick={() => onJumpTo?.(note.reference)}
                  className="ml-11 flex items-center gap-2 px-2 py-1.5 
                           bg-zinc-800 hover:bg-zinc-700 rounded-lg
                           text-xs text-zinc-300 transition-colors group"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                  <span>Ir para: {note.reference.name}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Examples toggle */}
              {note.examples && note.examples.length > 0 && (
                <div className="ml-11">
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 
                             hover:text-zinc-300 transition-colors"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Ver exemplos de referência
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
                          <div key={i} className="flex gap-2 p-2 bg-zinc-900 rounded">
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
                              <p className="text-xs font-medium text-zinc-300">
                                {example.label}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
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
                    onClick={handleApplyFix}
                    disabled={isApplying}
                    className="flex items-center gap-1.5 px-3 py-1.5
                             bg-violet-600 hover:bg-violet-500 rounded-lg
                             text-xs font-medium transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        Aplicar Correção
                      </>
                    )}
                  </button>
                )}

                {note.status === 'applied' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 
                                 bg-green-500/20 rounded-lg text-xs text-green-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aplicado
                  </span>
                )}

                {/* Feedback buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => onFeedback?.(note.id, 'helpful')}
                    className={`p-1.5 rounded transition-colors ${
                      note.feedback === 'helpful' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'hover:bg-zinc-800 text-zinc-500'
                    }`}
                    title="Útil"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback?.(note.id, 'not_helpful')}
                    className={`p-1.5 rounded transition-colors ${
                      note.feedback === 'not_helpful'
                        ? 'bg-red-500/20 text-red-400'
                        : 'hover:bg-zinc-800 text-zinc-500'
                    }`}
                    title="Não útil"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDismiss?.(note.id)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 transition-colors"
                    title="Dispensar"
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
// MAIN COMPONENT
// ============================================================================

export function DirectorNotePanel({
  projectId,
  projectType = 'general',
  position = 'right',
  defaultCollapsed = false,
  onApplyFix,
  onJumpTo,
  className = '',
}: DirectorNotePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeFilter, setActiveFilter] = useState<NoteSeverity | 'all'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch director session
  const { data: session, mutate } = useSWR<DirectorSession>(
    projectId ? `/api/ai/director/${projectId}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  // Request new analysis
  const requestAnalysis = useCallback(async () => {
    if (!projectId) return;
    setIsAnalyzing(true);
    try {
      await fetch(`/api/ai/director/${projectId}/analyze`, { method: 'POST' });
      await mutate();
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, mutate]);

  // Handle feedback
  const handleFeedback = useCallback(async (noteId: string, feedback: 'helpful' | 'not_helpful') => {
    await fetch(`/api/ai/director/feedback`, {
      method: 'POST',
      body: JSON.stringify({ noteId, feedback }),
    });
    mutate();
  }, [mutate]);

  // Handle dismiss
  const handleDismiss = useCallback(async (noteId: string) => {
    await fetch(`/api/ai/director/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ noteId }),
    });
    mutate();
  }, [mutate]);

  // Filter notes
  const filteredNotes = session?.notes.filter(note => {
    if (activeFilter === 'all') return note.status !== 'dismissed';
    return note.severity === activeFilter && note.status !== 'dismissed';
  }) || [];

  // Count by severity
  const counts = {
    critical: session?.notes.filter(n => n.severity === 'critical' && n.status !== 'dismissed').length || 0,
    recommendation: session?.notes.filter(n => n.severity === 'recommendation' && n.status !== 'dismissed').length || 0,
    suggestion: session?.notes.filter(n => n.severity === 'suggestion' && n.status !== 'dismissed').length || 0,
  };

  // Project type icons
  const projectIcon = projectType === 'game' ? Gamepad2 
    : projectType === 'film' ? Film 
    : Clapperboard;
  const ProjectIcon = projectIcon;

  return (
    <motion.div
      layout
      className={`
        bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-600/20 
                          rounded-lg flex items-center justify-center">
              <ProjectIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Notas do Diretor
              </h3>
              <p className="text-xs text-zinc-500">
                Feedback artístico por IA
              </p>
            </div>
          </div>

          {/* Score */}
          {session && (
            <ScoreRing score={session.overallScore} />
          )}
        </div>

        {/* Strengths & Improvements summary */}
        {session && !isCollapsed && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs text-emerald-400 font-medium mb-1">Pontos Fortes</p>
              <ul className="text-xs text-emerald-300/80 space-y-0.5">
                {session.strengths.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Star className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400 font-medium mb-1">A Melhorar</p>
              <ul className="text-xs text-amber-300/80 space-y-0.5">
                {session.improvements.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={requestAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 
                     hover:bg-zinc-700 rounded-lg text-xs text-zinc-300
                     transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analisando...' : 'Nova Análise'}
          </button>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto p-1.5 hover:bg-zinc-800 rounded transition-colors"
          >
            {isCollapsed 
              ? <ChevronDown className="w-4 h-4 text-zinc-500" />
              : <ChevronRight className="w-4 h-4 text-zinc-500 -rotate-90" />
            }
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'all' as const, label: 'Todas' },
                { key: 'critical' as const, label: `Críticos (${counts.critical})` },
                { key: 'recommendation' as const, label: `Recom. (${counts.recommendation})` },
                { key: 'suggestion' as const, label: `Sugest. (${counts.suggestion})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`
                    px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors
                    ${activeFilter === key 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">
                    Nenhuma nota pendente!
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    O projeto está ótimo ou clique para nova análise.
                  </p>
                </div>
              ) : (
                filteredNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onApplyFix={onApplyFix}
                    onJumpTo={onJumpTo}
                    onFeedback={handleFeedback}
                    onDismiss={handleDismiss}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DirectorNotePanel;
