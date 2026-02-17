'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  Layers
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';
type JobType = 'render' | 'build' | 'ai' | 'export' | 'import' | 'other';

interface Job {
  id: string;
  type: JobType;
  name: string;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
  priority: number;
  retries: number;
  maxRetries: number;
}

interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  throughput: number;
}



// ============================================================================
// COMPONENTS
// ============================================================================

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const config = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    running: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Activity },
    completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
    failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    paused: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Pause },
  };
  
  const { color, icon: Icon } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${color}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const TypeBadge: React.FC<{ type: JobType }> = ({ type }) => {
  const config: Record<JobType, { color: string; label: string }> = {
    render: { color: 'bg-blue-500/20 text-blue-400', label: '🎨 Render' },
    build: { color: 'bg-orange-500/20 text-orange-400', label: '🔨 Build' },
    ai: { color: 'bg-cyan-500/20 text-cyan-400', label: '🤖 AI' },
    export: { color: 'bg-green-500/20 text-green-400', label: '📤 Export' },
    import: { color: 'bg-blue-500/20 text-blue-400', label: '📥 Import' },
    other: { color: 'bg-gray-500/20 text-gray-400', label: '⚙️ Other' },
  };
  
  const { color, label } = config[type];
  
  return (
    <span className={`px-2 py-1 rounded text-xs ${color}`}>
      {label}
    </span>
  );
};

const ProgressBar: React.FC<{ progress: number; status: JobStatus }> = ({ progress, status }) => {
  const colors = {
    pending: 'bg-yellow-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    paused: 'bg-gray-500',
  };
  
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colors[status]} transition-all duration-300`}
        style={{ width: `${status === 'completed' ? 100 : progress}%` }}
      />
    </div>
  );
};

const JobRow: React.FC<{
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onPause: () => void;
}> = ({ job, isExpanded, onToggle, onRetry, onCancel, onPause }) => {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      {/* Main Row */}
      <div 
        className="flex items-center gap-4 p-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <button className="text-gray-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={job.type} />
            <span className="font-medium text-white truncate">{job.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <ProgressBar progress={job.progress} status={job.status} />
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {job.status === 'completed' ? '100%' : `${job.progress}%`}
            </span>
          </div>
        </div>
        
        <StatusBadge status={job.status} />
        
        <div className="flex items-center gap-1">
          {job.status === 'failed' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="p-1.5 hover:bg-blue-600/20 rounded text-blue-400"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {job.status === 'running' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              className="p-1.5 hover:bg-yellow-600/20 rounded text-yellow-400"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {job.status === 'paused' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              className="p-1.5 hover:bg-green-600/20 rounded text-green-400"
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="p-1.5 hover:bg-red-600/20 rounded text-red-400"
              title="Cancel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-gray-800 bg-gray-800/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 text-sm">
            <div>
              <p className="text-gray-500">ID</p>
              <p className="text-gray-300 font-mono text-xs">{job.id.slice(0, 16)}...</p>
            </div>
            <div>
              <p className="text-gray-500">Criado</p>
              <p className="text-gray-300">{job.createdAt.toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Prioridade</p>
              <p className="text-gray-300">{'⭐'.repeat(job.priority)}</p>
            </div>
            <div>
              <p className="text-gray-500">Tentativas</p>
              <p className="text-gray-300">{job.retries}/{job.maxRetries}</p>
            </div>
          </div>
          
          {job.error && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              <strong>Erro:</strong> {job.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatsCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className={`p-4 rounded-lg border ${color}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-800">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const JobQueueDashboard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<JobType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/admin/jobs'),
        fetch('/api/admin/jobs/stats'),
      ]);
      
      if (!jobsRes.ok) {
        throw new Error(`Falha ao carregar jobs: ${jobsRes.status}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Falha ao carregar estatísticas: ${statsRes.status}`);
      }
      
      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();
      
      setJobs(jobsData.jobs?.map((j: Job) => ({
        ...j,
        createdAt: new Date(j.createdAt),
        startedAt: j.startedAt ? new Date(j.startedAt) : undefined,
        completedAt: j.completedAt ? new Date(j.completedAt) : undefined,
      })) || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false;
    if (filterType !== 'all' && job.type !== filterType) return false;
    if (searchQuery && !job.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao retentar job');
      await fetchJobs();
    } catch {
      setError('Falha ao retentar job');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao cancelar job');
      await fetchJobs();
    } catch {
      setError('Falha ao cancelar job');
    }
  };

  const handlePause = async (id: string) => {
    const job = jobs.find(j => j.id === id);
    const action = job?.status === 'paused' ? 'resume' : 'pause';
    try {
      const res = await fetch(`/api/admin/jobs/${id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Falha ao ${action} job`);
      await fetchJobs();
    } catch {
      setError(`Falha ao ${action} job`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Carregando fila de jobs...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Fila de Jobs</h2>
            <p className="text-sm text-gray-400">{jobs.length} jobs no total</p>
          </div>
        </div>
        
        <button
          onClick={fetchJobs}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <StatsCard
            label="Pendentes"
            value={stats.pending}
            icon={<Clock className="w-5 h-5 text-yellow-400" />}
            color="border-yellow-500/30 bg-yellow-500/5"
          />
          <StatsCard
            label="Rodando"
            value={stats.running}
            icon={<Cpu className="w-5 h-5 text-blue-400" />}
            color="border-blue-500/30 bg-blue-500/5"
          />
          <StatsCard
            label="Completos"
            value={stats.completed}
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
            color="border-green-500/30 bg-green-500/5"
          />
          <StatsCard
            label="Falhos"
            value={stats.failed}
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            color="border-red-500/30 bg-red-500/5"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as JobStatus | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos Status</option>
            <option value="pending">Pendentes</option>
            <option value="running">Rodando</option>
            <option value="completed">Completos</option>
            <option value="failed">Falhos</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as JobType | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos Tipos</option>
            <option value="render">Render</option>
            <option value="build">Build</option>
            <option value="ai">AI</option>
            <option value="export">Export</option>
            <option value="import">Import</option>
          </select>
        </div>
      </div>

      {/* Job List */}
      <div className="p-4 pt-0 space-y-2 max-h-[500px] overflow-y-auto">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum job encontrado</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobRow
              key={job.id}
              job={job}
              isExpanded={expandedIds.has(job.id)}
              onToggle={() => toggleExpanded(job.id)}
              onRetry={() => handleRetry(job.id)}
              onCancel={() => handleCancel(job.id)}
              onPause={() => handlePause(job.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default JobQueueDashboard;
