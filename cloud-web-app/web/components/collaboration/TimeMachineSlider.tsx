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
      <div className={`flex items-center justify-center p-4 text-gray-500 ${className}`}>
        <History className="w-5 h-5 mr-2" />
        <span>Nenhum histórico disponível</span>
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handlePrevious}
          disabled={selectedIndex === 0}
          className="p-1 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <span className="text-sm text-gray-400 min-w-[80px] text-center">
          {selectedIndex + 1} / {versions.length}
        </span>
        
        <button
          onClick={handleNext}
          disabled={selectedIndex === versions.length - 1}
          className="p-1 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Máquina do Tempo</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
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
              <img
                src={selectedVersion.thumbnail}
                alt="Version preview"
                className="w-16 h-12 rounded object-cover"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {selectedVersion.message || 'Sem descrição'}
              </p>
              
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
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
                  <span className="text-green-400">+{selectedVersion.changes.added}</span>
                  <span className="text-yellow-400">~{selectedVersion.changes.modified}</span>
                  <span className="text-red-400">-{selectedVersion.changes.deleted}</span>
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
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          
          {/* Version markers */}
          {variant === 'full' && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatDate(new Date(versions[0]?.timestamp))}</span>
              <span>{formatDate(new Date(versions[versions.length - 1]?.timestamp))}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleFirst}
              disabled={selectedIndex === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white"
              title="Primeira versão"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button
              onClick={handlePrevious}
              disabled={selectedIndex === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white"
              title="Versão anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={togglePlayback}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleNext}
              disabled={selectedIndex === versions.length - 1}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white"
              title="Próxima versão"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleLast}
              disabled={selectedIndex === versions.length - 1}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white"
              title="Última versão"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {selectedIndex + 1} / {versions.length}
            </span>
            
            {onRestore && selectedIndex < versions.length - 1 && (
              <button
                onClick={handleRestore}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
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
            className="border-t border-gray-700 overflow-hidden"
          >
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      index === selectedIndex ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {version.message || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-gray-400">
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
