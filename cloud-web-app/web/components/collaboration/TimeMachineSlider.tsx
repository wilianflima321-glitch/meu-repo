/**
 * TimeMachineSlider - Componente de Viagem no Tempo para Versões
 *
 * Permite navegar entre versões históricas do projeto.
 * Integrado com sistema de controle de versão.
 *
 * @module components/collaboration/TimeMachineSlider
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  History,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  GitBranch,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface VersionSnapshot {
  id: string;
  timestamp: Date;
  author: string;
  message: string;
  branch?: string;
  tag?: string;
  thumbnail?: string;
  changes?: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export interface TimeMachineSliderProps {
  versions: VersionSnapshot[];
  currentVersion?: string;
  onVersionChange?: (versionId: string) => void;
  onRestore?: (versionId: string) => void;
  className?: string;
  variant?: 'compact' | 'full' | 'minimal';
  showThumbnails?: boolean;
  autoPlay?: boolean;
  playbackSpeed?: number;
}

// ============================================================================
// TIME MACHINE SLIDER COMPONENT
// ============================================================================

export function TimeMachineSlider({
  versions = [],
  currentVersion,
  onVersionChange,
  onRestore,
  className = '',
  variant = 'compact',
  showThumbnails = true,
  autoPlay = false,
  playbackSpeed = 1000,
}: TimeMachineSliderProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (currentVersion) {
      const idx = versions.findIndex(v => v.id === currentVersion);
      return idx >= 0 ? idx : versions.length - 1;
    }
    return versions.length - 1;
  });
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showDetails, setShowDetails] = useState(false);

  // Selected version
  const selectedVersion = versions[selectedIndex];

  // Playback control
  React.useEffect(() => {
    if (!isPlaying || versions.length === 0) return;

    const interval = setInterval(() => {
      setSelectedIndex(prev => {
        const next = prev + 1;
        if (next >= versions.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, versions.length, playbackSpeed]);

  // Notify version change
  React.useEffect(() => {
    if (selectedVersion && onVersionChange) {
      onVersionChange(selectedVersion.id);
    }
  }, [selectedVersion, onVersionChange]);

  // Handlers
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIndex(Number(e.target.value));
  }, []);

  const handlePrevious = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(versions.length - 1, prev + 1));
  }, [versions.length]);

  const handleFirst = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const handleLast = useCallback(() => {
    setSelectedIndex(versions.length - 1);
  }, [versions.length]);

  const handleRestore = useCallback(() => {
    if (selectedVersion && onRestore) {
      onRestore(selectedVersion.id);
    }
  }, [selectedVersion, onRestore]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Format date
  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return `${mins}m atrás`;
      }
      return `${hours}h atrás`;
    }
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: days > 365 ? 'numeric' : undefined,
    });
  }, []);

  // Empty state
  if (versions.length === 0) {
    return (
      <div className={`flex items-center justify-center p-4 text-[var(--aethel-text-secondary)] ${className}`}>
        <History className="w-5 h-5 mr-2" />
        <span>Nenhum histórico disponível</span>
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button type="button" aria-label="Ir para a vers?o anterior"
          onClick={handlePrevious}
          disabled={selectedIndex === 0}
          className="p-1 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-[var(--aethel-text-secondary)] min-w-[80px] text-center">
          {selectedIndex + 1} / {versions.length}
        </span>

        <button type="button" aria-label="Ir para a pr?xima vers?o"
          onClick={handleNext}
          disabled={selectedIndex === versions.length - 1}
          className="p-1 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--aethel-surface-secondary)]/90 backdrop-blur-sm rounded-lg border border-[var(--aethel-border-primary)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Máquina do Tempo</span>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" aria-label={showDetails ? 'Ocultar detalhes do hist?rico' : 'Mostrar detalhes do hist?rico'}
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 rounded hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
            title="Mostrar detalhes"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Selected Version Info */}
        {selectedVersion && (
          <div className="flex items-start gap-3">
            {showThumbnails && selectedVersion.thumbnail && (
              <Image
                src={selectedVersion.thumbnail}
                alt="Version preview"
                width={64}
                height={48}
                unoptimized
                className="w-16 h-12 rounded object-cover"
              />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--aethel-text-primary)] truncate">
                {selectedVersion.message || 'Sem descrição'}
              </p>

              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--aethel-text-secondary)]">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {selectedVersion.author}
                </span>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(new Date(selectedVersion.timestamp))}
                </span>

                {selectedVersion.branch && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {selectedVersion.branch}
                  </span>
                )}
              </div>

              {selectedVersion.changes && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-[var(--aethel-success-light)]">+{selectedVersion.changes.added}</span>
                  <span className="text-[var(--aethel-warning-light)]">~{selectedVersion.changes.modified}</span>
                  <span className="text-[var(--aethel-error-light)]">-{selectedVersion.changes.deleted}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={versions.length - 1}
            value={selectedIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-[var(--aethel-surface-secondary)] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {/* Version markers */}
          {variant === 'full' && (
            <div className="flex justify-between text-xs text-[var(--aethel-text-secondary)]">
              <span>{formatDate(new Date(versions[0]?.timestamp))}</span>
              <span>{formatDate(new Date(versions[versions.length - 1]?.timestamp))}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Ir para a primeira vers?o"
              onClick={handleFirst}
              disabled={selectedIndex === 0}
              className="p-1.5 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              title="Primeira versão"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button type="button" aria-label="Ir para a vers?o anterior"
              onClick={handlePrevious}
              disabled={selectedIndex === 0}
              className="p-1.5 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              title="Versão anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button type="button" aria-label={isPlaying ? 'Pausar reprodu??o da linha do tempo' : 'Reproduzir linha do tempo'}
              onClick={togglePlayback}
              className="p-1.5 rounded hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button type="button" aria-label="Ir para a pr?xima vers?o"
              onClick={handleNext}
              disabled={selectedIndex === versions.length - 1}
              className="p-1.5 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              title="Próxima versão"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button type="button" aria-label="Ir para a ?ltima vers?o"
              onClick={handleLast}
              disabled={selectedIndex === versions.length - 1}
              className="p-1.5 rounded hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              title="Última versão"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--aethel-text-secondary)]">
              {selectedIndex + 1} / {versions.length}
            </span>

            {onRestore && selectedIndex < versions.length - 1 && (
              <button type="button" aria-label={`Restaurar vers?o ${selectedVersion.message || selectedVersion.id}`}
                onClick={handleRestore}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--aethel-border-primary)] overflow-hidden"
          >
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <button type="button" aria-label={`Selecionar vers?o ${version.message || version.id}`}
                    key={version.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
                        : 'hover:bg-[var(--aethel-surface-secondary)]/50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      index === selectedIndex ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]' : 'bg-[var(--aethel-surface-secondary)]'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--aethel-text-primary)] truncate">
                        {version.message || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-[var(--aethel-text-secondary)]">
                        {version.author} • {formatDate(new Date(version.timestamp))}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TimeMachineSlider;
