/**
 * AETHEL ENGINE - RENDER PROGRESS COMPONENT
 * =========================================
 * 
 * Componente para exibir progresso de renderização em tempo real
 * com suporte a múltiplos jobs, thumbnails e estimativa de tempo.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NextImage from 'next/image';
import {
    Play,
    Pause,
    Square,
    RotateCcw,
    Clock,
    Image as ImageIcon,
    Film,
    AlertCircle,
    CheckCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    X,
    Maximize2,
    Download
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type RenderJobStatus = 
    | 'queued'
    | 'preparing'
    | 'rendering'
    | 'compositing'
    | 'finalizing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'paused';

export interface RenderFrame {
    frame: number;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    thumbnail?: string;
}

export interface RenderJob {
    id: string;
    name: string;
    type: 'image' | 'animation' | 'sequence';
    status: RenderJobStatus;
    progress: number;
    currentFrame: number;
    totalFrames: number;
    startTime?: number;
    endTime?: number;
    estimatedTimeRemaining?: number;
    thumbnail?: string;
    output?: string;
    error?: string;
    resolution: { width: number; height: number };
    samples: number;
    engine: 'cycles' | 'eevee' | 'workbench';
    frames?: RenderFrame[];
    renderTime?: number;
    peakMemory?: number;
}

export interface RenderProgressProps {
    job: RenderJob;
    onPause?: (jobId: string) => void;
    onResume?: (jobId: string) => void;
    onCancel?: (jobId: string) => void;
    onRetry?: (jobId: string) => void;
    onDownload?: (jobId: string, output: string) => void;
    onViewFull?: (thumbnail: string) => void;
    className?: string;
    compact?: boolean;
}

export interface RenderQueueProps {
    jobs: RenderJob[];
    onPause?: (jobId: string) => void;
    onResume?: (jobId: string) => void;
    onCancel?: (jobId: string) => void;
    onRetry?: (jobId: string) => void;
    onClearCompleted?: () => void;
    className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

function formatTimeRemaining(ms: number): string {
    if (ms < 60000) return '< 1 min';
    
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `~${hours}h ${minutes % 60}m restantes`;
    }
    return `~${minutes}m restantes`;
}

function getStatusColor(status: RenderJobStatus): string {
    switch (status) {
        case 'completed':
            return 'text-green-500';
        case 'rendering':
        case 'compositing':
            return 'text-blue-500';
        case 'preparing':
        case 'finalizing':
            return 'text-yellow-500';
        case 'queued':
            return 'text-gray-400';
        case 'paused':
            return 'text-orange-500';
        case 'failed':
        case 'cancelled':
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
}

function getStatusBg(status: RenderJobStatus): string {
    switch (status) {
        case 'completed':
            return 'bg-green-500';
        case 'rendering':
        case 'compositing':
            return 'bg-blue-500';
        case 'preparing':
        case 'finalizing':
            return 'bg-yellow-500';
        case 'queued':
            return 'bg-gray-500';
        case 'paused':
            return 'bg-orange-500';
        case 'failed':
        case 'cancelled':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}

function getStatusLabel(status: RenderJobStatus): string {
    switch (status) {
        case 'queued': return 'Na fila';
        case 'preparing': return 'Preparando';
        case 'rendering': return 'Renderizando';
        case 'compositing': return 'Compositando';
        case 'finalizing': return 'Finalizando';
        case 'completed': return 'Concluído';
        case 'failed': return 'Falhou';
        case 'cancelled': return 'Cancelado';
        case 'paused': return 'Pausado';
        default: return status;
    }
}

// ============================================================================
// STATUS ICON COMPONENT
// ============================================================================

interface StatusIconProps {
    status: RenderJobStatus;
    size?: number;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, size = 16 }) => {
    const className = getStatusColor(status);
    
    switch (status) {
        case 'completed':
            return <CheckCircle size={size} className={className} />;
        case 'rendering':
        case 'compositing':
        case 'preparing':
        case 'finalizing':
            return <Loader2 size={size} className={`${className} animate-spin`} />;
        case 'failed':
            return <AlertCircle size={size} className={className} />;
        case 'cancelled':
            return <X size={size} className={className} />;
        case 'paused':
            return <Pause size={size} className={className} />;
        case 'queued':
        default:
            return <Clock size={size} className={className} />;
    }
};

// ============================================================================
// SINGLE RENDER PROGRESS COMPONENT
// ============================================================================

export const RenderProgress: React.FC<RenderProgressProps> = ({
    job,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onDownload,
    onViewFull,
    className = '',
    compact = false
}) => {
    const [expanded, setExpanded] = useState(!compact);
    const [elapsedTime, setElapsedTime] = useState(0);
    
    // Calculate elapsed time
    useEffect(() => {
        if (!job.startTime || job.status === 'completed' || job.status === 'failed') {
            if (job.startTime && job.endTime) {
                setElapsedTime(job.endTime - job.startTime);
            }
            return;
        }
        
        const interval = setInterval(() => {
            setElapsedTime(Date.now() - job.startTime!);
        }, 1000);
        
        return () => clearInterval(interval);
    }, [job.startTime, job.endTime, job.status]);
    
    const isActive = ['rendering', 'compositing', 'preparing', 'finalizing'].includes(job.status);
    const canPause = isActive && onPause;
    const canResume = job.status === 'paused' && onResume;
    const canCancel = (isActive || job.status === 'queued' || job.status === 'paused') && onCancel;
    const canRetry = (job.status === 'failed' || job.status === 'cancelled') && onRetry;
    const canDownload = job.status === 'completed' && job.output && onDownload;
    
    return (
        <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                {/* Thumbnail */}
                <div className="relative w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {job.thumbnail ? (
                        <>
                            <NextImage
                                src={job.thumbnail}
                                alt={job.name}
                                fill
                                unoptimized
                                className="w-full h-full object-cover"
                            />
                            {onViewFull && (
                                <button
                                    onClick={() => onViewFull(job.thumbnail!)}
                                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Maximize2 size={20} className="text-white" />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {job.type === 'animation' ? (
                                <Film size={24} className="text-gray-500" />
                            ) : (
                                <ImageIcon size={24} className="text-gray-500" />
                            )}
                        </div>
                    )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white truncate">{job.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(job.status)} bg-gray-700`}>
                            {getStatusLabel(job.status)}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{job.resolution.width}x{job.resolution.height}</span>
                        <span>•</span>
                        <span>{job.samples} samples</span>
                        <span>•</span>
                        <span className="capitalize">{job.engine}</span>
                        {job.type === 'animation' && (
                            <>
                                <span>•</span>
                                <span>Frame {job.currentFrame}/{job.totalFrames}</span>
                            </>
                        )}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${getStatusBg(job.status)} transition-all duration-300`}
                                style={{ width: `${job.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-400">
                            <span>{job.progress.toFixed(1)}%</span>
                            {isActive && job.estimatedTimeRemaining && (
                                <span>{formatTimeRemaining(job.estimatedTimeRemaining)}</span>
                            )}
                            {elapsedTime > 0 && (
                                <span>{formatDuration(elapsedTime)}</span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                    {canPause && (
                        <button
                            onClick={() => onPause(job.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Pausar"
                        >
                            <Pause size={18} className="text-gray-400" />
                        </button>
                    )}
                    
                    {canResume && (
                        <button
                            onClick={() => onResume(job.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Retomar"
                        >
                            <Play size={18} className="text-green-500" />
                        </button>
                    )}
                    
                    {canCancel && (
                        <button
                            onClick={() => onCancel(job.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Cancelar"
                        >
                            <Square size={18} className="text-red-400" />
                        </button>
                    )}
                    
                    {canRetry && (
                        <button
                            onClick={() => onRetry(job.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Tentar novamente"
                        >
                            <RotateCcw size={18} className="text-blue-400" />
                        </button>
                    )}
                    
                    {canDownload && (
                        <button
                            onClick={() => onDownload(job.id, job.output!)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download"
                        >
                            <Download size={18} className="text-green-400" />
                        </button>
                    )}
                    
                    {!compact && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {expanded ? (
                                <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={18} className="text-gray-400" />
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Expanded details */}
            {expanded && !compact && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                    {/* Error message */}
                    {job.error && (
                        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-red-500 text-sm">
                                <AlertCircle size={16} />
                                <span className="font-medium">Erro:</span>
                            </div>
                            <p className="text-red-400 text-sm mt-1">{job.error}</p>
                        </div>
                    )}
                    
                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Tipo</span>
                            <p className="text-white capitalize">{job.type}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Engine</span>
                            <p className="text-white capitalize">{job.engine}</p>
                        </div>
                        {job.renderTime !== undefined && (
                            <div>
                                <span className="text-gray-500">Tempo Total</span>
                                <p className="text-white">{formatDuration(job.renderTime)}</p>
                            </div>
                        )}
                        {job.peakMemory !== undefined && (
                            <div>
                                <span className="text-gray-500">Memória Pico</span>
                                <p className="text-white">{(job.peakMemory / 1024 / 1024).toFixed(0)} MB</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Frame progress for animations */}
                    {job.type === 'animation' && job.frames && job.frames.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">
                                Frames ({job.frames.filter(f => f.status === 'completed').length}/{job.totalFrames})
                            </h4>
                            <div className="flex gap-1 flex-wrap">
                                {job.frames.slice(0, 50).map((frame) => (
                                    <div
                                        key={frame.frame}
                                        className={`w-4 h-4 rounded ${
                                            frame.status === 'completed' ? 'bg-green-500' :
                                            frame.status === 'rendering' ? 'bg-blue-500 animate-pulse' :
                                            frame.status === 'failed' ? 'bg-red-500' :
                                            'bg-gray-600'
                                        }`}
                                        title={`Frame ${frame.frame}: ${frame.status}`}
                                    />
                                ))}
                                {job.frames.length > 50 && (
                                    <span className="text-gray-500 text-xs self-center ml-2">
                                        +{job.frames.length - 50} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// RENDER QUEUE COMPONENT
// ============================================================================

export const RenderQueue: React.FC<RenderQueueProps> = ({
    jobs,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onClearCompleted,
    className = ''
}) => {
    const activeJobs = useMemo(() => 
        jobs.filter(j => ['rendering', 'compositing', 'preparing', 'finalizing'].includes(j.status)),
        [jobs]
    );
    
    const queuedJobs = useMemo(() => 
        jobs.filter(j => j.status === 'queued'),
        [jobs]
    );
    
    const completedJobs = useMemo(() => 
        jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status)),
        [jobs]
    );
    
    if (jobs.length === 0) {
        return (
            <div className={`bg-gray-900 rounded-xl p-8 text-center ${className}`}>
                <ImageIcon size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                    Nenhum render na fila
                </h3>
                <p className="text-gray-400 text-sm">
                    Inicie um render no editor para ver o progresso aqui.
                </p>
            </div>
        );
    }
    
    return (
        <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Fila de Render</h2>
                    <span className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                    </span>
                </div>
                
                {completedJobs.length > 0 && onClearCompleted && (
                    <button
                        onClick={onClearCompleted}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Limpar concluídos
                    </button>
                )}
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-500">{activeJobs.length}</div>
                    <div className="text-xs text-gray-400">Ativos</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-500">{queuedJobs.length}</div>
                    <div className="text-xs text-gray-400">Na Fila</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-500">{completedJobs.length}</div>
                    <div className="text-xs text-gray-400">Concluídos</div>
                </div>
            </div>
            
            {/* Active Jobs */}
            {activeJobs.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Renderizando
                    </h3>
                    <div className="space-y-3">
                        {activeJobs.map(job => (
                            <RenderProgress
                                key={job.id}
                                job={job}
                                onPause={onPause}
                                onResume={onResume}
                                onCancel={onCancel}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Queued Jobs */}
            {queuedJobs.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Aguardando ({queuedJobs.length})
                    </h3>
                    <div className="space-y-2">
                        {queuedJobs.map(job => (
                            <RenderProgress
                                key={job.id}
                                job={job}
                                onCancel={onCancel}
                                compact
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Completed Jobs */}
            {completedJobs.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Histórico ({completedJobs.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {completedJobs.map(job => (
                            <RenderProgress
                                key={job.id}
                                job={job}
                                onRetry={onRetry}
                                compact
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default RenderProgress;
