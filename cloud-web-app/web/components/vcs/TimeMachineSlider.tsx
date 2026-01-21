/**
 * TimeMachineSlider - Slider Visual de Histórico Git
 * 
 * Interface visual para navegar pelo histórico de commits.
 * Inspirado em Time Machine do macOS.
 * Preview em tempo real das mudanças.
 * 
 * @see IDEIAS_SUGESTOES_INOVACAO.md
 * @see INOVACOES_TECNICAS_DETALHADAS.md
 * 
 * @module components/vcs/TimeMachineSlider
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import useSWR from 'swr';
import {
  History,
  GitCommit,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  User,
  FileCode,
  FilePlus,
  FileMinus,
  FileEdit,
  Eye,
  Check,
  X,
  Maximize2,
  Minimize2,
  Calendar,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface Commit {
  id: string;
  hash: string;
  shortHash: string;
  message: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: number;
  changes: {
    added: number;
    modified: number;
    deleted: number;
    files: FileChange[];
  };
  branch: string;
  tags?: string[];
  isMerge?: boolean;
  parentIds: string[];
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath?: string; // For renamed files
}

interface TimeMachineSliderProps {
  projectId?: string;
  onRestoreCommit?: (commit: Commit) => Promise<void>;
  onPreviewCommit?: (commit: Commit) => void;
  onDiffView?: (commit: Commit, file?: FileChange) => void;
  defaultBranch?: string;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SLIDE_WIDTH = 280; // Width of each commit card
const AUTOPLAY_INTERVAL = 3000; // ms

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// HOOKS
// ============================================================================

function useCommitHistory(projectId?: string, branch?: string) {
  const { data, error, isLoading, mutate } = useSWR<Commit[]>(
    projectId ? `/api/projects/${projectId}/commits?branch=${branch || 'main'}&limit=50` : null,
    fetcher
  );

  return { commits: data || [], error, isLoading, refresh: mutate };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  if (weeks < 4) return `${weeks} sem atrás`;
  
  return new Date(timestamp).toLocaleDateString('pt-BR', { 
    day: 'numeric', 
    month: 'short' 
  });
}

function FileIcon({ type }: { type: FileChange['type'] }) {
  switch (type) {
    case 'added':
      return <FilePlus className="w-3.5 h-3.5 text-emerald-400" />;
    case 'deleted':
      return <FileMinus className="w-3.5 h-3.5 text-red-400" />;
    case 'modified':
      return <FileEdit className="w-3.5 h-3.5 text-amber-400" />;
    case 'renamed':
      return <FileCode className="w-3.5 h-3.5 text-sky-400" />;
    default:
      return <FileCode className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

interface CommitCardProps {
  commit: Commit;
  isActive: boolean;
  isPreviewing: boolean;
  onClick: () => void;
  onPreview: () => void;
  onDiff: (file?: FileChange) => void;
}

function CommitCard({ commit, isActive, isPreviewing, onClick, onPreview, onDiff }: CommitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      animate={{
        scale: isActive ? 1 : 0.9,
        opacity: isActive ? 1 : 0.7,
        y: isActive ? 0 : 10,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        relative flex-shrink-0 w-[280px] rounded-xl border transition-all cursor-pointer
        ${isActive 
          ? 'bg-zinc-800 border-violet-500/50 shadow-lg shadow-violet-500/20' 
          : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
        }
        ${isPreviewing ? 'ring-2 ring-sky-500/50' : ''}
      `}
      onClick={onClick}
    >
      {/* Merge indicator */}
      {commit.isMerge && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-600 rounded-full 
                      flex items-center justify-center">
          <GitBranch className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Author avatar */}
            {commit.author.avatar ? (
              <img 
                src={commit.author.avatar} 
                alt={commit.author.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-500/20 
                            flex items-center justify-center">
                <User className="w-4 h-4 text-violet-400" />
              </div>
            )}
            
            <div>
              <p className="text-xs font-medium text-white">
                {commit.author.name}
              </p>
              <p className="text-[10px] text-zinc-500">
                {formatRelativeTime(commit.timestamp)}
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 bg-zinc-700 rounded-full 
                         font-mono text-[10px] text-zinc-400">
            {commit.shortHash}
          </span>
        </div>

        {/* Message */}
        <p className={`text-sm text-zinc-200 ${isExpanded ? '' : 'line-clamp-2'}`}>
          {commit.message}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 flex items-center gap-3 text-xs">
        {commit.changes.added > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <FilePlus className="w-3 h-3" />
            {commit.changes.added}
          </span>
        )}
        {commit.changes.modified > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <FileEdit className="w-3 h-3" />
            {commit.changes.modified}
          </span>
        )}
        {commit.changes.deleted > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <FileMinus className="w-3 h-3" />
            {commit.changes.deleted}
          </span>
        )}

        {commit.tags && commit.tags.length > 0 && (
          <span className="ml-auto px-1.5 py-0.5 bg-amber-500/20 
                         rounded text-amber-300 text-[10px]">
            {commit.tags[0]}
          </span>
        )}
      </div>

      {/* Expanded files list */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-700"
          >
            <div className="p-3 space-y-1.5 max-h-[150px] overflow-y-auto">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                Arquivos alterados
              </p>
              {commit.changes.files.slice(0, 5).map((file, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); onDiff(file); }}
                  className="w-full flex items-center gap-2 px-2 py-1 
                           bg-zinc-900 hover:bg-zinc-800 rounded text-left
                           transition-colors group"
                >
                  <FileIcon type={file.type} />
                  <span className="text-xs text-zinc-400 truncate flex-1">
                    {file.path.split('/').pop()}
                  </span>
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">
                    +{file.additions} -{file.deletions}
                  </span>
                </button>
              ))}
              {commit.changes.files.length > 5 && (
                <p className="text-xs text-zinc-500 text-center pt-1">
                  +{commit.changes.files.length - 5} mais arquivos
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 pt-0 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5
                         bg-zinc-700 hover:bg-zinc-600 rounded-lg
                         text-xs text-zinc-300 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDiff(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5
                         bg-violet-600 hover:bg-violet-500 rounded-lg
                         text-xs font-medium transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Ver Diff
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimelineBar({ commits, activeIndex, onSelect }: { 
  commits: Commit[]; 
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  // Group commits by date
  const dateGroups = useMemo(() => {
    const groups: { date: string; count: number; startIndex: number }[] = [];
    let currentDate = '';
    
    commits.forEach((commit, i) => {
      const date = new Date(commit.timestamp).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
      });
      
      if (date !== currentDate) {
        groups.push({ date, count: 1, startIndex: i });
        currentDate = date;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    
    return groups;
  }, [commits]);

  return (
    <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden">
      {/* Date groups */}
      <div className="absolute inset-0 flex">
        {dateGroups.map((group, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center border-r border-zinc-800 last:border-0"
            style={{ flex: group.count }}
          >
            <span className="text-[10px] text-zinc-500">{group.date}</span>
          </div>
        ))}
      </div>

      {/* Commit dots */}
      <div className="absolute inset-0 flex items-center px-2">
        {commits.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`
              w-2 h-2 rounded-full transition-all mx-0.5
              ${i === activeIndex 
                ? 'bg-violet-500 scale-150' 
                : 'bg-zinc-600 hover:bg-zinc-500'
              }
            `}
          />
        ))}
      </div>

      {/* Active indicator line */}
      <motion.div
        className="absolute bottom-0 h-0.5 bg-violet-500"
        initial={false}
        animate={{
          left: `${(activeIndex / commits.length) * 100}%`,
          width: `${100 / commits.length}%`,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TimeMachineSlider({
  projectId,
  onRestoreCommit,
  onPreviewCommit,
  onDiffView,
  defaultBranch = 'main',
  className = '',
}: TimeMachineSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [branch, setBranch] = useState(defaultBranch);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout>();

  const { commits, isLoading, refresh } = useCommitHistory(projectId, branch);

  // Autoplay
  useEffect(() => {
    if (isPlaying && commits.length > 0) {
      autoplayRef.current = setInterval(() => {
        setActiveIndex(prev => 
          prev < commits.length - 1 ? prev + 1 : 0
        );
      }, AUTOPLAY_INTERVAL);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isPlaying, commits.length]);

  // Scroll to active commit
  useEffect(() => {
    if (sliderRef.current) {
      const scrollPosition = activeIndex * (SLIDE_WIDTH + 12) - 
        (sliderRef.current.clientWidth / 2) + (SLIDE_WIDTH / 2);
      sliderRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex(prev => Math.max(0, prev - 1));
        setIsPlaying(false);
      } else if (e.key === 'ArrowRight') {
        setActiveIndex(prev => Math.min(commits.length - 1, prev + 1));
        setIsPlaying(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commits.length]);

  const handlePreview = useCallback((commit: Commit, index: number) => {
    setPreviewingIndex(index);
    onPreviewCommit?.(commit);
  }, [onPreviewCommit]);

  const handleRestore = useCallback(async () => {
    const commit = commits[activeIndex];
    if (!commit || !onRestoreCommit) return;
    await onRestoreCommit(commit);
  }, [commits, activeIndex, onRestoreCommit]);

  const activeCommit = commits[activeIndex];

  if (isLoading) {
    return (
      <div className={`bg-zinc-900 rounded-xl p-8 text-center ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="inline-block"
        >
          <History className="w-8 h-8 text-violet-400" />
        </motion.div>
        <p className="text-sm text-zinc-400 mt-3">Carregando histórico...</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className={`bg-zinc-900 rounded-xl p-8 text-center ${className}`}>
        <GitCommit className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Nenhum commit encontrado</p>
        <p className="text-xs text-zinc-500 mt-1">
          Faça alterações e commite para ver o histórico
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={`
        bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden
        ${isFullscreen ? 'fixed inset-4 z-50' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-lg 
                        flex items-center justify-center">
            <History className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Time Machine
            </h3>
            <p className="text-xs text-zinc-500">
              {commits.length} commits • {branch}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Autoplay control */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-violet-400" />
            ) : (
              <Play className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-zinc-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="px-4 pt-3">
        <TimelineBar 
          commits={commits} 
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />
      </div>

      {/* Commit slider */}
      <div
        ref={sliderRef}
        className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {commits.map((commit, index) => (
          <CommitCard
            key={commit.id}
            commit={commit}
            isActive={index === activeIndex}
            isPreviewing={index === previewingIndex}
            onClick={() => setActiveIndex(index)}
            onPreview={() => handlePreview(commit, index)}
            onDiff={(file) => onDiffView?.(commit, file)}
          />
        ))}
      </div>

      {/* Navigation & actions */}
      <div className="p-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs text-zinc-500 min-w-[60px] text-center">
            {activeIndex + 1} / {commits.length}
          </span>

          <button
            onClick={() => setActiveIndex(prev => Math.min(commits.length - 1, prev + 1))}
            disabled={activeIndex === commits.length - 1}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview current state */}
          <button
            onClick={() => handlePreview(activeCommit, activeIndex)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 
                     hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 
                     transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Estado
          </button>

          {/* Restore */}
          {onRestoreCommit && (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 px-3 py-1.5 
                       bg-violet-600 hover:bg-violet-500 rounded-lg 
                       text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar para Este Commit
            </button>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-4 pb-3 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
        <span>← → para navegar</span>
        <span>Espaço para play/pause</span>
      </div>
    </motion.div>
  );
}

export default TimeMachineSlider;
