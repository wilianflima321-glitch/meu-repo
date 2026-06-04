'use client';

/**
 * AETHEL ENGINE - RENDER PROGRESS COMPONENT
 * =========================================
 *
 * Component for displaying real-time render progress
 * with support for multiple jobs, thumbnails, and time estimates.
 */
import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import {
    Play,
    Pause,
    Square,
    RotateCcw,
    Image as ImageIcon,
    Film,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Maximize2,
    Download
} from 'lucide-react';
import {
    StatusIcon,
    formatDuration,
    formatTimeRemaining,
    getStatusBg,
    getStatusColor,
    getStatusLabel,
    type RenderProgressProps,
    type RenderQueueProps,
} from './RenderProgress.model';
export type {
    RenderFrame,
    RenderJob,
    RenderJobStatus,
    RenderProgressProps,
    RenderQueueProps,
} from './RenderProgress.model';

// ============================================================================
// SINGLE RENDER PROGRESS COMPONENT
// ============================================================================

export function RenderProgress({
    job,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onDownload,
    onViewFull,
    className = '',
    compact = false
}: RenderProgressProps) {
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
        <div className={`bg-[var(--aethel-surface-secondary)] rounded-lg overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                {/* Thumbnail */}
                <div className="relative w-16 h-16 bg-[var(--aethel-surface-secondary)] rounded-lg overflow-hidden flex-shrink-0">
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
                                <button type="button" aria-label={`Open preview for ${job.name}`}
                                    onClick={() => onViewFull(job.thumbnail!)}
                                    className="absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Maximize2 size={20} className="text-[var(--aethel-text-primary)]" />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {job.type === 'animation' ? (
                                <Film size={24} className="text-[var(--aethel-text-tertiary)]" />
                            ) : (
                                <ImageIcon size={24} className="text-[var(--aethel-text-tertiary)]" />
                            )}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[var(--aethel-text-primary)] truncate">{job.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(job.status)} bg-[var(--aethel-surface-secondary)]`}>
                            {getStatusLabel(job.status)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--aethel-text-secondary)]">
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
                        <div className="h-2 bg-[var(--aethel-surface-secondary)] rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getStatusBg(job.status)} transition-all duration-300`}
                                style={{ width: `${job.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-[var(--aethel-text-secondary)]">
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
                        <button type="button" aria-label={`Pause render ${job.name}`}
                            onClick={() => onPause(job.id)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                            title="Pause"
                        >
                            <Pause size={18} className="text-[var(--aethel-text-secondary)]" />
                        </button>
                    )}

                    {canResume && (
                        <button type="button" aria-label={`Resume render ${job.name}`}
                            onClick={() => onResume(job.id)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                            title="Resume"
                        >
                            <Play size={18} className="text-[var(--aethel-success-light)]" />
                        </button>
                    )}

                    {canCancel && (
                        <button type="button" aria-label={`Cancel render ${job.name}`}
                            onClick={() => onCancel(job.id)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                            title="Cancel"
                        >
                            <Square size={18} className="text-[var(--aethel-error)]" />
                        </button>
                    )}

                    {canRetry && (
                        <button type="button" aria-label={`Retry render ${job.name}`}
                            onClick={() => onRetry(job.id)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                            title="Retry"
                        >
                            <RotateCcw size={18} className="text-[var(--aethel-primary-light)]" />
                        </button>
                    )}

                    {canDownload && (
                        <button type="button" aria-label={`Download render output for ${job.name}`}
                            onClick={() => onDownload(job.id, job.output!)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                            title="Download"
                        >
                            <Download size={18} className="text-[var(--aethel-success-light)]" />
                        </button>
                    )}

                    {!compact && (
                        <button type="button" aria-label={expanded ? `Collapse render details for ${job.name}` : `Expand render details for ${job.name}`}
                            onClick={() => setExpanded(!expanded)}
                            className="p-2 hover:bg-[var(--aethel-surface-secondary)] rounded-lg transition-colors"
                        >
                            {expanded ? (
                                <ChevronUp size={18} className="text-[var(--aethel-text-secondary)]" />
                            ) : (
                                <ChevronDown size={18} className="text-[var(--aethel-text-secondary)]" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && !compact && (
                <div className="px-4 pb-4 border-t border-[var(--aethel-border-primary)] pt-3">
                    {/* Error message */}
                    {job.error && (
                        <div className="mb-3 p-3 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] rounded-lg">
                            <div className="flex items-center gap-2 text-[var(--aethel-error)] text-sm">
                                <AlertCircle size={16} />
                                <span className="font-medium">Error:</span>
                            </div>
                            <p className="text-[var(--aethel-error)] text-sm mt-1">{job.error}</p>
                        </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-[var(--aethel-text-tertiary)]">Type</span>
                            <p className="text-[var(--aethel-text-primary)] capitalize">{job.type}</p>
                        </div>
                        <div>
                            <span className="text-[var(--aethel-text-tertiary)]">Engine</span>
                            <p className="text-[var(--aethel-text-primary)] capitalize">{job.engine}</p>
                        </div>
                        {job.renderTime !== undefined && (
                            <div>
                                <span className="text-[var(--aethel-text-tertiary)]">Total time</span>
                                <p className="text-[var(--aethel-text-primary)]">{formatDuration(job.renderTime)}</p>
                            </div>
                        )}
                        {job.peakMemory !== undefined && (
                            <div>
                                <span className="text-[var(--aethel-text-tertiary)]">Peak memory</span>
                                <p className="text-[var(--aethel-text-primary)]">{(job.peakMemory / 1024 / 1024).toFixed(0)} MB</p>
                            </div>
                        )}
                    </div>

                    {/* Frame progress for animations */}
                    {job.type === 'animation' && job.frames && job.frames.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-[var(--aethel-text-secondary)] mb-2">
                                Frames ({job.frames.filter(f => f.status === 'completed').length}/{job.totalFrames})
                            </h4>
                            <div className="flex gap-1 flex-wrap">
                                {job.frames.slice(0, 50).map((frame) => (
                                    <div
                                        key={frame.frame}
                                        className={`w-4 h-4 rounded ${
                                            frame.status === 'completed' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]' :
                                            frame.status === 'rendering' ? 'bg-[var(--aethel-primary)] animate-pulse' :
                                            frame.status === 'failed' ? 'bg-[var(--aethel-error)]' :
                                            'bg-[var(--aethel-surface-secondary)]'
                                        }`}
                                        title={`Frame ${frame.frame}: ${frame.status}`}
                                    />
                                ))}
                                {job.frames.length > 50 && (
                                    <span className="text-[var(--aethel-text-tertiary)] text-xs self-center ml-2">
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
}

// ============================================================================
// RENDER QUEUE COMPONENT
// ============================================================================

export function RenderQueue({
    jobs,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onClearCompleted,
    className = ''
}: RenderQueueProps) {
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
            <div className={`bg-[var(--aethel-surface-secondary)] rounded-xl p-8 text-center ${className}`}>
                <ImageIcon size={48} className="mx-auto text-[var(--aethel-text-tertiary)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--aethel-text-primary)] mb-2">
                    No renders queued
                </h3>
                <p className="text-[var(--aethel-text-secondary)] text-sm">
                    Start a render in the editor to see progress here.
                </p>
            </div>
        );
    }

    return (
        <div className={`bg-[var(--aethel-surface-secondary)] rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">Render queue</h2>
                    <span className="px-2 py-1 bg-[var(--aethel-surface-secondary)] rounded text-sm text-[var(--aethel-text-secondary)]">
                        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                    </span>
                </div>

                {completedJobs.length > 0 && onClearCompleted && (
                    <button type="button" aria-label="Clear completed renders"
                        onClick={onClearCompleted}
                        className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                    >
                        Clear completed
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--aethel-surface-secondary)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--aethel-primary)]">{activeJobs.length}</div>
                    <div className="text-xs text-[var(--aethel-text-secondary)]">Active</div>
                </div>
                <div className="bg-[var(--aethel-surface-secondary)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--aethel-warning)]">{queuedJobs.length}</div>
                    <div className="text-xs text-[var(--aethel-text-secondary)]">Queued</div>
                </div>
                <div className="bg-[var(--aethel-surface-secondary)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--aethel-success-light)]">{completedJobs.length}</div>
                    <div className="text-xs text-[var(--aethel-text-secondary)]">Completed</div>
                </div>
            </div>

            {/* Active Jobs */}
            {activeJobs.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)] uppercase tracking-wider mb-3">
                        Rendering
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
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)] uppercase tracking-wider mb-3">
                        Waiting ({queuedJobs.length})
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
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)] uppercase tracking-wider mb-3">
                        History ({completedJobs.length})
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
}

// ============================================================================
// EXPORTS
// ============================================================================

export default RenderProgress;
