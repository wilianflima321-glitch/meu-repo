'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCcw,
  MoreHorizontal,
  Layers,
  Zap,
} from 'lucide-react';
import { authHeaders } from '@/lib/auth';

type JobStatus = 'queued' | 'rendering' | 'completed' | 'failed';

interface RenderJob {
  id: string;
  status: JobStatus;
  progress: number;
  provider: string;
  outputUrl: string | null;
  errorMessage: string | null;
  costUsd: number | null;
  createdAt: string;
  completedAt: string | null;
}

// ─────────────────── Sub-components ───────────────────

function StatusBadge({ status }: { status: JobStatus }) {
  const config = {
    queued:    { label: 'Queued',    icon: Clock,         cls: 'text-[var(--aethel-warning)]   bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]   border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)]'    },
    rendering: { label: 'Rendering', icon: Loader2,       cls: 'text-[var(--aethel-neon-cyan)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-neon-cyan)_25%,transparent)] animate-glow-cyan' },
    completed: { label: 'Done',      icon: CheckCircle2,  cls: 'text-[var(--aethel-success)]   bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]   border-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)]'  },
    failed:    { label: 'Failed',    icon: XCircle,       cls: 'text-[var(--aethel-error)]     bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]     border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)]'      },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.cls}`}
    >
      <Icon className={`h-3 w-3 ${status === 'rendering' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function ProgressBar({ progress, status }: { progress: number; status: JobStatus }) {
  if (status === 'queued') {
    return (
      <div className="h-1 w-full rounded-full bg-[var(--aethel-surface-quaternary)] overflow-hidden">
        <div className="h-full w-full aethel-shimmer opacity-40" />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="h-1 w-full rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]">
        <div className="h-full rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_60%,transparent)]" style={{ width: `${progress}%` }} />
      </div>
    );
  }
  if (status === 'rendering') {
    return (
      <div className="relative h-1.5 w-full rounded-full bg-[var(--aethel-surface-quaternary)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--aethel-neon-cyan)] to-[var(--aethel-primary)] transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full aethel-progress-stripe opacity-40"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }
  // completed
  return (
    <div className="h-1 w-full rounded-full bg-[var(--aethel-surface-quaternary)]">
      <div className="h-full w-full rounded-full bg-gradient-to-r from-[var(--aethel-success)] to-[var(--aethel-neon-cyan)]" />
    </div>
  );
}

function JobCard({ job }: { job: RenderJob }) {
  const elapsed = job.completedAt
    ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)}s`
    : null;
  const isRendering = job.status === 'rendering';

  return (
    <div
      className={`
        group relative flex flex-col gap-3 rounded-xl px-4 py-3.5 overflow-hidden
        transition-all duration-300
        ${isRendering ? 'aethel-processing-card aethel-neon-topline-cyan' : ''}
        ${!isRendering ? 'border bg-[var(--aethel-surface-secondary)] border-[var(--aethel-border-secondary)] hover:border-[var(--aethel-border-primary)] hover:shadow-[var(--aethel-shadow-md)]' : ''}
      `}
    >
      {/* Animated grid overlay when rendering */}
      {isRendering && (
        <div className="pointer-events-none absolute inset-0 aethel-grid-overlay opacity-50" />
      )}

      {/* Row 1: icon + id + status */}
      <div className="relative flex items-center gap-3">
        <div className={`
          flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border
          ${isRendering ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25 animate-glow-cyan' :
            job.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
            job.status === 'failed'    ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                                          'bg-amber-500/10 text-amber-400 border-amber-500/20'}
        `}>
          <Film className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-[var(--aethel-text-tertiary)] truncate">
            {job.id}
          </p>
          <p className="text-[11px] text-[var(--aethel-text-quaternary)] mt-0.5">
            {job.provider} · {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {elapsed && ` · ${elapsed}`}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Row 2: progress bar */}
      <div className="relative">
        <ProgressBar progress={job.progress} status={job.status} />

        {isRendering && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-mono text-cyan-400 tabular-nums">
            {job.progress}%
          </span>
        )}
      </div>

      {/* Row 3: metadata */}
      <div className="relative flex items-center gap-3 text-[11px] text-[var(--aethel-text-quaternary)]">
        {!isRendering && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {job.progress}%
          </span>
        )}
        {job.costUsd != null && (
          <span className="flex items-center gap-1 ml-auto">
            ${job.costUsd.toFixed(4)}
          </span>
        )}
        {job.outputUrl && (
          <a
            href={job.outputUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
          >
            Download
          </a>
        )}
        {job.errorMessage && (
          <span className="ml-auto text-red-400 truncate max-w-[160px]" title={job.errorMessage}>
            {job.errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="animate-float flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)]">
        <Layers className="h-6 w-6 text-[var(--aethel-text-quaternary)]" />
      </div>
      <p className="text-sm font-medium text-[var(--aethel-text-secondary)]">No render jobs yet</p>
      <p className="text-xs text-[var(--aethel-text-quaternary)] max-w-xs">
        Submit a scene from the Studio to see real-time progress here.
      </p>
    </div>
  );
}

// ─────────────────── Main Panel ───────────────────

export function RenderQueueDashboard({ projectId }: { projectId?: string }) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | JobStatus>('all');

  const fetchJobs = useCallback(async () => {
    try {
      const url = projectId
        ? `/api/render/jobs?projectId=${projectId}`
        : '/api/render/jobs';
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      const mappedJobs = (data.jobs ?? []).map((job: any) => {
        let status = job.status;
        if (['processing', 'running', 'active'].includes(status)) {
          status = 'rendering';
        } else if (status === 'cancelled') {
          status = 'failed';
        }
        return { ...job, status };
      });
      setJobs(mappedJobs);
      setError(null);
    } catch {
      setError('Could not load render queue.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initial fetch + poll every 4s while any job is rendering/queued
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'rendering');
      if (hasActive) fetchJobs();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  const counts = {
    all:       jobs.length,
    queued:    jobs.filter((j) => j.status === 'queued').length,
    rendering: jobs.filter((j) => j.status === 'rendering').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed:    jobs.filter((j) => j.status === 'failed').length,
  };

  const FILTERS: { key: typeof filter; label: string; color: string }[] = [
    { key: 'all',       label: 'All',       color: 'text-[var(--aethel-text-secondary)]' },
    { key: 'queued',    label: 'Queued',    color: 'text-amber-400'  },
    { key: 'rendering', label: 'Rendering', color: 'text-cyan-400'   },
    { key: 'completed', label: 'Done',      color: 'text-emerald-400'},
    { key: 'failed',    label: 'Failed',    color: 'text-red-400'    },
  ];

  return (
    <section
      id="render-queue-dashboard"
      aria-labelledby="rq-heading"
      className="flex flex-col gap-4 h-full"
    >
      {/* Header — Processing Center */}
      <div
        className="relative flex items-center gap-3 flex-wrap rounded-xl px-4 py-3 overflow-hidden aethel-neon-topline-cyan"
        style={{
          background: 'rgba(8,12,22,0.88)',
          border: '1px solid rgba(34,211,238,.16)',
          boxShadow: 'inset 0 0 32px rgba(34,211,238,.03)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 aethel-grid-overlay opacity-40" />
        <div className="relative flex items-center gap-2">
          <div className={`
            flex h-8 w-8 items-center justify-center rounded-lg border
            ${counts.rendering > 0 ? 'bg-cyan-500/15 border-cyan-500/30 animate-glow-cyan text-cyan-400' : 'bg-[var(--aethel-primary)]/12 border-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)]'}
          `}>
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h2 id="rq-heading" className="text-sm font-semibold text-[var(--aethel-text-primary)] leading-none">
              Render Queue
            </h2>
            <p className="text-[10px] text-[var(--aethel-text-quaternary)] mt-0.5 font-mono uppercase tracking-wider">
              Processing Center
            </p>
          </div>
          {counts.rendering > 0 && (
            <span className="aethel-beacon flex h-2 w-2 text-cyan-400">
              <span className="block h-2 w-2 rounded-full bg-cyan-400" />
            </span>
          )}
        </div>

        <div className="relative ml-auto flex items-center gap-1.5">
          {/* Filter tabs */}
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`
                flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all
                ${filter === f.key
                  ? `${f.color} bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]`
                  : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'
                }
              `}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="rounded-full bg-[var(--aethel-surface-quaternary)] px-1 text-[10px]">
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}

          <div className="h-4 w-px bg-[var(--aethel-border-primary)] mx-1" />

          <button
            type="button"
            onClick={fetchJobs}
            aria-label="Refresh render queue"
            className="rounded-lg p-1.5 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl aethel-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </section>
  );
}
