'use client';

// @aethel-heavy-async-boundary: loaded only when project director notes are visible.

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from '@/lib/ui/motion';
import useSWR from 'swr';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Film,
  Gamepad2,
  RefreshCw,
  Star,
} from 'lucide-react';
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';
import { fetcher } from './DirectorNotePanel.api';
import { NoteCard, ScoreRing } from './DirectorNotePanel.parts';
import type { DirectorNote, DirectorNotePanelProps, DirectorSession, NoteSeverity } from './DirectorNotePanel.types';

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
                Director Notes
              </h3>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">
                AI artistic feedback
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
              <p className="text-xs text-[var(--aethel-success)] font-medium mb-1">Strengths</p>
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
              <p className="text-xs text-[var(--aethel-warning-light)] font-medium mb-1">Needs Work</p>
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
            aria-label="Request a new director analysis"
            onClick={requestAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-1.5 rounded-lg bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] disabled:opacity-50 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'New analysis'}
          </button>

          <button
            type="button"
            aria-label={isCollapsed ? 'Expand director notes panel' : 'Collapse director notes panel'}
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
                { key: 'all' as const, label: 'All' },
                { key: 'critical' as const, label: `Critical (${counts.critical})` },
                { key: 'recommendation' as const, label: `Recommendations (${counts.recommendation})` },
                { key: 'suggestion' as const, label: `Suggestions (${counts.suggestion})` },
              ].map(({ key, label }) => (
                <button
                  type="button"
                  aria-label={`Filter notes by ${label}`}
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
                    No pending notes.
                  </p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">
                    The project looks great, or click for a new analysis.
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
