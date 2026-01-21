'use client';

/**
 * AETHEL ENGINE - Job Queue Dashboard
 * =====================================
 * 
 * Professional monitoring UI for the Persistent Job Queue.
 * Real-time visualization of job processing, stats, and history.
 * 
 * Features:
 * - Real-time job list with status
 * - Progress indicators
 * - Stats overview
 * - Job history timeline
 * - Error details
 * - Retry/Cancel actions
 * - Filtering and search
 * 
 * @see server/src/services/persistent-job-queue.ts
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
type JobPriority = 'low' | 'normal' | 'high' | 'critical';

interface Job {
  id: string;
  type: string;
  priority: JobPriority;
  status: JobStatus;
  payload: unknown;
  result?: unknown;
  error?: string;
  progress: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeoutMs: number;
  scheduledAt?: string;
  workerId?: string;
  metadata?: Record<string, unknown>;
}

interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
  avgProcessingTime: number;
  successRate: number;
}

interface JobQueueDashboardProps {
  /** WebSocket URL for real-time updates */
  wsUrl?: string;
  /** HTTP API base URL */
  apiUrl?: string;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Custom class name */
  className?: string;
  /** Jobs per page */
  pageSize?: number;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Play: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Server: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
};

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  running: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' },
  timeout: { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
};

const PRIORITY_COLORS: Record<JobPriority, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  normal: 'text-blue-400',
  low: 'text-gray-400',
};



// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  color?: string;
}

function StatCard({ label, value, icon, trend, color = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-gray-500">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' && value > 1000 
          ? `${(value / 1000).toFixed(1)}k` 
          : value}
      </div>
      {trend && (
        <div className={`text-xs mt-1 ${trend.isUp ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isUp ? '↑' : '↓'} {trend.value}% da última hora
        </div>
      )}
    </div>
  );
}

// ============================================================================
// JOB ROW
// ============================================================================

interface JobRowProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

function JobRow({ job, isExpanded, onToggle, onRetry, onCancel }: JobRowProps) {
  const statusColor = STATUS_COLORS[job.status];
  const priorityColor = PRIORITY_COLORS[job.priority];
  
  const formatTime = (date?: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString();
  };
  
  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '-';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diff = endDate.getTime() - startDate.getTime();
    
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
    return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
  };
  
  return (
    <div className="border-b border-[#3c3c3c] hover:bg-[#2a2a2a] transition-colors">
      {/* Main Row */}
      <div 
        className="px-4 py-3 flex items-center gap-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* Expand Arrow */}
        <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <Icons.ChevronDown />
        </span>
        
        {/* Status */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${statusColor.bg}`}>
          <span className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
          <span className={`text-xs font-medium ${statusColor.text} uppercase`}>
            {job.status}
          </span>
        </div>
        
        {/* Type */}
        <div className="w-24">
          <span className="text-white font-mono text-sm">{job.type}</span>
        </div>
        
        {/* Priority */}
        <div className="w-16">
          <span className={`text-xs font-medium ${priorityColor} uppercase`}>
            {job.priority}
          </span>
        </div>
        
        {/* Progress */}
        <div className="w-32">
          {job.status === 'running' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">
                {job.progress.toFixed(0)}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
        
        {/* Duration */}
        <div className="w-24 text-right">
          <span className="text-xs text-gray-400">
            {formatDuration(job.startedAt, job.completedAt)}
          </span>
        </div>
        
        {/* Created */}
        <div className="w-20 text-right">
          <span className="text-xs text-gray-500">{formatTime(job.createdAt)}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {(job.status === 'failed' || job.status === 'cancelled') && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(job.id); }}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
              title="Tentar novamente"
            >
              <Icons.Refresh />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(job.id); }}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Cancelar"
            >
              <Icons.X />
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#3c3c3c]">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div>
              <h4 className="text-xs text-gray-500 uppercase mb-2">Job Details</h4>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-24 text-xs text-gray-500">ID:</dt>
                  <dd className="text-xs text-gray-300 font-mono">{job.id}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-gray-500">Worker:</dt>
                  <dd className="text-xs text-gray-300 font-mono">{job.workerId || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-gray-500">Retries:</dt>
                  <dd className="text-xs text-gray-300">{job.retryCount} / {job.maxRetries}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-gray-500">Timeout:</dt>
                  <dd className="text-xs text-gray-300">{job.timeoutMs / 1000}s</dd>
                </div>
              </dl>
            </div>
            
            {/* Right Column */}
            <div>
              <h4 className="text-xs text-gray-500 uppercase mb-2">Payload</h4>
              <pre className="text-xs text-gray-300 bg-[#252526] p-2 rounded overflow-auto max-h-32 font-mono">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* Erro */}
          {Boolean(job.error) && (
            <div className="mt-3">
              <h4 className="text-xs text-red-400 uppercase mb-1">Erro</h4>
              <div className="text-xs text-red-300 bg-red-500/10 p-2 rounded font-mono">
                {String(job.error)}
              </div>
            </div>
          )}
          
          {/* Resultado */}
          {Boolean(job.result) && (
            <div className="mt-3">
              <h4 className="text-xs text-green-400 uppercase mb-1">Resultado</h4>
              <pre className="text-xs text-green-300 bg-green-500/10 p-2 rounded overflow-auto max-h-32 font-mono">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JobQueueDashboard({
  wsUrl,
  apiUrl = '/api/jobs',
  refreshInterval = 5000,
  className = '',
  pageSize = 20,
}: JobQueueDashboardProps) {
  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isQueueRunning, setIsQueueRunning] = useState(true);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [jobsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}?page=${page}&limit=${pageSize}&status=${filter}`),
        fetch(`${apiUrl}/stats`),
      ]);
      
      if (!jobsRes.ok) {
        throw new Error(`Failed to fetch jobs: ${jobsRes.status}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.status}`);
      }
      
      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();
      
      setJobs(jobsData.jobs || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, apiUrl, pageSize]);
  
  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);
  
  // WebSocket for real-time updates
  useEffect(() => {
    if (!wsUrl) return;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'job:update') {
          setJobs(prev => prev.map(j => j.id === data.job.id ? data.job : j));
        } else if (data.type === 'job:new') {
          setJobs(prev => [data.job, ...prev].slice(0, pageSize));
        } else if (data.type === 'stats:update') {
          setStats(data.stats);
        }
      } catch {
        // ignore
      }
    };
    
    return () => ws.close();
  }, [wsUrl, pageSize]);
  
  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filter !== 'all' && job.status !== filter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          job.id.toLowerCase().includes(query) ||
          job.type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [jobs, filter, searchQuery]);
  
  // Handlers
  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to retry job');
      fetchData();
    } catch {
      setError('Failed to retry job');
    }
  };
  
  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel job');
      fetchData();
    } catch {
      setError('Failed to cancel job');
    }
  };
  
  const handleToggleQueue = async () => {
    try {
      const res = await fetch(`${apiUrl}/${isQueueRunning ? 'stop' : 'start'}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle queue');
      setIsQueueRunning(!isQueueRunning);
    } catch {
      setError('Failed to toggle queue');
    }
  };
  
  // Loading state
  if (isLoading && jobs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Carregando fila de jobs...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full bg-[#1e1e1e] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-3">
          <Icons.Server />
          <h2 className="text-lg font-semibold text-white">Fila de Jobs</h2>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isQueueRunning ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {isQueueRunning ? 'Executando' : 'Pausada'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleQueue}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isQueueRunning
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isQueueRunning ? <Icons.Pause /> : <Icons.Play />}
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            title="Atualizar"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-[#3c3c3c]">
          <StatCard
            label="Pendentes"
            value={stats.pending}
            icon={<Icons.Clock />}
            color="text-yellow-400"
          />
          <StatCard
            label="Executando"
            value={stats.running}
            icon={<Icons.Play />}
            color="text-blue-400"
          />
          <StatCard
            label="Concluídos"
            value={stats.completed}
            icon={<Icons.Check />}
            color="text-green-400"
          />
          <StatCard
            label="Taxa de Sucesso"
            value={`${(stats.successRate * 100).toFixed(1)}%`}
            icon={<Icons.Check />}
            color={stats.successRate > 0.9 ? 'text-green-400' : 'text-yellow-400'}
          />
        </div>
      )}
      
      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#3c3c3c]">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Icons.Filter />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as JobStatus | 'all')}
            className="bg-[#252526] border border-[#3c3c3c] text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="running">Executando</option>
            <option value="completed">Concluído</option>
            <option value="failed">Falhou</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por ID ou tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252526] border border-[#3c3c3c] text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Count */}
        <div className="text-sm text-gray-400">
          {filteredJobs.length} jobs
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/50">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}
      
      {/* Job List */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#252526] border-b border-[#3c3c3c] px-4 py-2 flex items-center gap-4 text-xs text-gray-500 uppercase">
          <span className="w-4"></span>
          <span className="w-20">Status</span>
          <span className="w-24">Tipo</span>
          <span className="w-16">Prioridade</span>
          <span className="w-32">Progresso</span>
          <span className="w-24 text-right">Duração</span>
          <span className="w-20 text-right">Criado</span>
          <span className="ml-auto w-16">Ações</span>
        </div>
        
        {/* Rows */}
        {filteredJobs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Nenhum job encontrado
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobRow
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#3c3c3c]">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <span className="text-sm text-gray-400">Página {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={filteredJobs.length < pageSize}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}

export default JobQueueDashboard;
