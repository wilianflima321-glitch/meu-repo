'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Zap,
  Globe,
  Box,
  Layers,
  BarChart2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime?: number;
  lastCheck: string;
  details?: string;
}

interface ResourceMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    in: number; // bytes/s
    out: number;
  };
}

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}

interface InfrastructureData {
  services: ServiceHealth[];
  resources: ResourceMetrics;
  queues: QueueMetrics[];
  
  // Additional metrics
  requestsPerMinute: number;
  activeConnections: number;
  errorRate: number;
  
  // Database
  dbConnections: {
    active: number;
    idle: number;
    max: number;
  };
  dbQueryTime: number;
  
  // Cache
  cacheHitRate: number;
  cacheMemory: number;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };
  
  const { icon: Icon, color, bg, border } = config[status];
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${bg} ${border}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs capitalize ${color}`}>{status}</span>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className={`
      bg-[#1a1a1a] border rounded-lg p-4
      ${service.status === 'healthy' ? 'border-[#333]' : 
        service.status === 'degraded' ? 'border-yellow-500/30' : 'border-red-500/30'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
        {service.latency !== undefined && (
          <div>
            <span className="text-gray-500">Latency</span>
            <p className={`text-sm font-medium ${
              service.latency < 100 ? 'text-green-400' :
              service.latency < 500 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {service.latency}ms
            </p>
          </div>
        )}
        
        {service.uptime !== undefined && (
          <div>
            <span className="text-gray-500">Uptime</span>
            <p className="text-sm font-medium text-white">{service.uptime.toFixed(2)}%</p>
          </div>
        )}
      </div>
      
      {service.details && (
        <p className="text-xs text-gray-500 mt-3">{service.details}</p>
      )}
      
      <p className="text-[10px] text-gray-600 mt-3">
        Last check: {new Date(service.lastCheck).toLocaleTimeString()}
      </p>
    </div>
  );
}

function ResourceGauge({ 
  label, 
  value, 
  max, 
  unit,
  icon: Icon,
  warning = 70,
  critical = 90
}: {
  label: string;
  value: number;
  max?: number;
  unit: string;
  icon: React.ElementType;
  warning?: number;
  critical?: number;
}) {
  const percentage = max ? (value / max) * 100 : value;
  const color = percentage >= critical ? 'text-red-400' : 
                percentage >= warning ? 'text-yellow-400' : 'text-green-400';
  const barColor = percentage >= critical ? 'bg-red-500' : 
                   percentage >= warning ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {max && (
        <p className="text-xs text-gray-500 mt-2">
          {value.toFixed(1)} / {max.toFixed(1)} {unit}
        </p>
      )}
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueMetrics }) {
  const total = queue.waiting + queue.active + queue.completed + queue.failed;
  const failRate = total > 0 ? (queue.failed / total) * 100 : 0;
  
  return (
    <div className={`
      bg-[#1a1a1a] border rounded-lg p-4
      ${queue.isPaused ? 'border-yellow-500/30' : 'border-[#333]'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white capitalize">
          {queue.name.replace(/_/g, ' ')}
        </h4>
        {queue.isPaused && (
          <span className="text-xs text-yellow-400 px-2 py-0.5 bg-yellow-500/10 rounded">
            PAUSED
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-yellow-400">{queue.waiting}</p>
          <p className="text-[10px] text-gray-500">Waiting</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-400">{queue.active}</p>
          <p className="text-[10px] text-gray-500">Active</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-400">{queue.completed}</p>
          <p className="text-[10px] text-gray-500">Done</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${failRate > 5 ? 'text-red-400' : 'text-gray-400'}`}>
            {queue.failed}
          </p>
          <p className="text-[10px] text-gray-500">Failed</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  subtitle
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  subtitle?: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
        {trend && (
          trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function InfrastructureDashboard() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/infrastructure/status');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // 10s refresh
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400">{error || 'No data available'}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }
  
  const overallStatus = data.services.every(s => s.status === 'healthy') ? 'healthy' :
                        data.services.some(s => s.status === 'down') ? 'down' : 'degraded';
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server className="w-6 h-6" />
            Infrastructure
            <StatusBadge status={overallStatus} />
          </h1>
          <p className="text-sm text-gray-400">
            System health and resource utilization
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              autoRefresh 
                ? 'border-green-500/30 bg-green-500/10 text-green-400' 
                : 'border-[#333] text-gray-400'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Requests/min"
          value={data.requestsPerMinute}
          icon={Activity}
          trend={data.requestsPerMinute > 100 ? 'up' : undefined}
        />
        <MetricCard
          label="Active Connections"
          value={data.activeConnections}
          icon={Wifi}
        />
        <MetricCard
          label="Error Rate"
          value={data.errorRate.toFixed(2)}
          unit="%"
          icon={AlertTriangle}
          trend={data.errorRate > 1 ? 'down' : undefined}
        />
        <MetricCard
          label="Cache Hit Rate"
          value={data.cacheHitRate.toFixed(1)}
          unit="%"
          icon={Zap}
          trend={data.cacheHitRate > 80 ? 'up' : undefined}
        />
      </div>
      
      {/* Services Grid */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-4">Services</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.services.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>
      
      {/* Resources */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-4">Resources</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceGauge
            label="CPU"
            value={data.resources.cpu.usage}
            unit="%"
            icon={Cpu}
          />
          <ResourceGauge
            label="Memory"
            value={data.resources.memory.used}
            max={data.resources.memory.total}
            unit="GB"
            icon={Activity}
          />
          <ResourceGauge
            label="Disk"
            value={data.resources.disk.used}
            max={data.resources.disk.total}
            unit="GB"
            icon={HardDrive}
          />
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">Network I/O</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500">In</p>
                <p className="text-sm font-medium text-green-400">
                  {(data.resources.network.in / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Out</p>
                <p className="text-sm font-medium text-blue-400">
                  {(data.resources.network.out / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Database */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-blue-400">{data.dbConnections.active}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Idle</p>
              <p className="text-xl font-bold text-gray-400">{data.dbConnections.idle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Max</p>
              <p className="text-xl font-bold text-white">{data.dbConnections.max}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#333]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Avg Query Time</span>
              <span className={`text-sm font-medium ${
                data.dbQueryTime < 50 ? 'text-green-400' :
                data.dbQueryTime < 200 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.dbQueryTime}ms
              </span>
            </div>
          </div>
        </div>
        
        {/* Cache */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Cache (Redis)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Hit Rate</p>
              <p className={`text-xl font-bold ${
                data.cacheHitRate > 80 ? 'text-green-400' :
                data.cacheHitRate > 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.cacheHitRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Memory Used</p>
              <p className="text-xl font-bold text-white">
                {(data.cacheMemory / 1024 / 1024).toFixed(0)} MB
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Queues */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Job Queues
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.queues.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      </div>
    </div>
  );
}
