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

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import {
  Clapperboard,
  Eye,
  Lightbulb,
  Palette,
  Camera,
  Volume2,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
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
  composition: { icon: Camera, label: 'Composicao', color: 'text-[var(--aethel-info)]' },
  lighting: { icon: Sparkles, label: 'Iluminacao', color: 'text-[var(--aethel-warning-light)]' },
  color: { icon: Palette, label: 'Cores', color: 'text-[var(--aethel-secondary)]' },
  pacing: { icon: Clock, label: 'Ritmo', color: 'text-[var(--aethel-success)]' },
  audio: { icon: Volume2, label: 'Audio', color: 'text-[var(--aethel-primary)]' },
  gameplay: { icon: Gamepad2, label: 'Jogabilidade', color: 'text-[var(--aethel-info)]' },
  narrative: { icon: MessageSquare, label: 'Narrativa', color: 'text-[var(--aethel-secondary)]' },
  performance: { icon: TrendingUp, label: 'Performance', color: 'text-[var(--aethel-warning-light)]' },
  accessibility: { icon: Users, label: 'Acessibilidade', color: 'text-[var(--aethel-success)]' },
  ux: { icon: Target, label: 'UX', color: 'text-[var(--aethel-info)]' },
};

const SEVERITY_STYLES: Record<NoteSeverity, {
  bg: string;
  border: string;
  badge: string;
  label: string;
}> = {
  suggestion: {
    bg: 'bg-[var(--aethel-surface-tertiary)]',
    border: 'border-[var(--aethel-border-primary)]',
    badge: 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]',
    label: 'Sugestao',
  },
  recommendation: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
    badge: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]',
    label: 'Recomendacao',
  },
  critical: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]',
    badge: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]',
    label: 'Critico',
  },
};

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data.');
  return res.json();
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreRing({ score, size = 60 }: { score: number; size?: number }) {
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

function NoteCard({ note, onApplyFix, onJumpTo, onFeedback, onDismiss }: NoteCardProps) {
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
        aria-label={isExpanded ? `Recolher nota ${note.title}` : `Expandir nota ${note.title}`}
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
                      Sugestao do Diretor
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
                  aria-label={`Ir para referencia ${note.reference.name}`}
                  onClick={() => onJumpTo?.(note.reference)}
                  className={`group ml-11 ${subtleActionClass}`}
                >
                  <Eye className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)] group-hover:text-[var(--aethel-text-primary)]" />
                  <span>Ir para: {note.reference.name}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--aethel-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Examples toggle */}
              {note.examples && note.examples.length > 0 && (
                <div className="ml-11">
                  <button
                    type="button"
                    aria-label={showExamples ? 'Ocultar exemplos de referencia' : 'Mostrar exemplos de referencia'}
                    onClick={() => setShowExamples(!showExamples)}
                    className={`flex items-center gap-1.5 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    Ver exemplos de referencia
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
                    aria-label={`Aplicar correcao sugerida para ${note.title}`}
                    onClick={handleApplyFix}
                    disabled={isApplying}
                    className={`flex items-center gap-1.5 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        Aplicar correcao
                      </>
                    )}
                  </button>
                )}

                {note.status === 'applied' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5
                                 bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] rounded-lg text-xs text-[var(--aethel-success)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aplicado
                  </span>
                )}

                {/* Feedback buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    aria-label={`Marcar a nota ${note.title} como util`}
                    onClick={() => onFeedback?.(note.id, 'helpful')}
                    className={`rounded p-1.5 ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${
                      note.feedback === 'helpful'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success)]'
                        : 'hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
                    }`}
                    title="Util"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Marcar a nota ${note.title} como nao util`}
                    onClick={() => onFeedback?.(note.id, 'not_helpful')}
                    className={`rounded p-1.5 ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${
                      note.feedback === 'not_helpful'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)] text-[var(--aethel-error)]'
                        : 'hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
                    }`}
                    title="Nao util"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Dispensar nota ${note.title}`}
                    onClick={() => onDismiss?.(note.id)}
                    className={iconButtonClass}
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
  const panelIconButtonClass = `rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`;

  return (
    <motion.div
      layout
      className={`
        bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-secondary)] rounded-xl overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-warning-dark)_20%,transparent)]
                          rounded-lg flex items-center justify-center">
              <ProjectIcon className="w-5 h-5 text-[var(--aethel-warning-light)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                Notas do Diretor
              </h3>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">
                Feedback artistico de IA
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
            <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)] rounded-lg">
              <p className="text-xs text-[var(--aethel-success)] font-medium mb-1">Pontos Fortes</p>
              <ul className="text-xs text-[var(--aethel-success)]/80 space-y-0.5">
                {session.strengths.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Star className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-2 bg-[var(--aethel-warning)]/10 border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] rounded-lg">
              <p className="text-xs text-[var(--aethel-warning-light)] font-medium mb-1">A Melhorar</p>
              <ul className="text-xs text-[var(--aethel-warning-light)]/80 space-y-0.5">
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
            type="button"
            aria-label="Solicitar nova analise do diretor"
            onClick={requestAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-1.5 rounded-lg bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] disabled:opacity-50 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analisando...' : 'Nova analise'}
          </button>

          <button
            type="button"
            aria-label={isCollapsed ? 'Expandir painel de notas do diretor' : 'Recolher painel de notas do diretor'}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`ml-auto ${panelIconButtonClass}`}
          >
            {isCollapsed
              ? <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
              : <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)] -rotate-90" />
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
            <div className="px-4 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'all' as const, label: 'Todas' },
                { key: 'critical' as const, label: `Criticos (${counts.critical})` },
                { key: 'recommendation' as const, label: `Recom. (${counts.recommendation})` },
                { key: 'suggestion' as const, label: `Sugest. (${counts.suggestion})` },
              ].map(({ key, label }) => (
                <button
                  type="button"
                  aria-label={`Filtrar notas por ${label}`}
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-2.5 py-1 text-xs whitespace-nowrap rounded-full ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${activeFilter === key ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'} `}
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
                  <CheckCircle2 className="w-10 h-10 text-[color-mix(in_srgb,var(--aethel-success)_50%,transparent)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--aethel-text-tertiary)]">
                    Nenhuma nota pendente!
                  </p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">
                    O projeto esta otimo ou clique para nova analise.
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
