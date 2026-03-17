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
import { Badge } from '@/components/ui/Badge';

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
    healthy: { icon: CheckCircle, label: 'saudavel', variant: 'success' as const },
    degraded: { icon: AlertTriangle, label: 'degradado', variant: 'warning' as const },
    down: { icon: XCircle, label: 'indisponivel', variant: 'error' as const },
  };

  const { icon: Icon, label, variant } = config[status];

  return (
    <Badge
      variant={variant}
      size="sm"
      icon={<Icon className="w-3.5 h-3.5" />}
      className="px-2 py-1 text-xs capitalize"
    >
      {label}
    </Badge>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className={`
      bg-[var(--aethel-surface-secondary)] border rounded-lg p-4
      ${service.status === 'healthy' ? 'border-[var(--aethel-border-primary)]' : 
        service.status === 'degraded' ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]' : 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
        {service.latency !== undefined && (
          <div>
            <span className="text-[var(--aethel-text-tertiary)]">Latência</span>
            <p className={`text-sm font-medium ${
              service.latency < 100 ? 'text-[var(--aethel-success)]' :
              service.latency < 500 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'
            }`}>
              {service.latency}ms
            </p>
          </div>
        )}
        
        {service.uptime !== undefined && (
          <div>
            <span className="text-[var(--aethel-text-tertiary)]">Disponibilidade</span>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{service.uptime.toFixed(2)}%</p>
          </div>
        )}
      </div>
      
      {service.details && (
        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-3">{service.details}</p>
      )}
      
      <p className="text-[10px] text-[var(--aethel-text-secondary)] mt-3">
        Última verificação: {new Date(service.lastCheck).toLocaleTimeString()}
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
  const color = percentage >= critical ? 'text-[var(--aethel-error)]' : 
                percentage >= warning ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-success)]';
  const barColor = percentage >= critical ? 'bg-[var(--aethel-error)]' : 
                   percentage >= warning ? 'bg-[var(--aethel-warning)]' : 'bg-[var(--aethel-success)]';
  
  return (
    <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          <span className="text-sm text-[var(--aethel-text-tertiary)]">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="h-2 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {max && (
        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">
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
      bg-[var(--aethel-surface-secondary)] border rounded-lg p-4
      ${queue.isPaused ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]' : 'border-[var(--aethel-border-primary)]'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-[var(--aethel-text-primary)] capitalize">
          {queue.name.replace(/_/g, ' ')}
        </h4>
        {queue.isPaused && (
          <span className="text-xs text-[var(--aethel-warning)] px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] rounded">
            PAUSADA
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-[var(--aethel-warning)]">{queue.waiting}</p>
          <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Aguardando</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--aethel-primary-light)]">{queue.active}</p>
          <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Ativos</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--aethel-success)]">{queue.completed}</p>
          <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Concluídos</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${failRate > 5 ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}`}>
            {queue.failed}
          </p>
          <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Falhas</p>
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
    <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--aethel-text-tertiary)]">{label}</span>
        <Icon className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--aethel-text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-[var(--aethel-text-tertiary)]">{unit}</span>}
        {trend && (
          trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-[var(--aethel-success)]" />
          ) : (
            <TrendingDown className="w-4 h-4 text-[var(--aethel-error)]" />
          )
        )}
      </div>
      {subtitle && <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">{subtitle}</p>}
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/infrastructure/status');
      if (!res.ok) throw new Error('Falha ao carregar');
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
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
        <RefreshCw className="w-6 h-6 text-[var(--aethel-text-tertiary)] animate-spin" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="w-12 h-12 text-[var(--aethel-error)]" />
        <p className="text-[var(--aethel-error)]">{error || 'Sem dados disponíveis'}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] rounded-lg text-sm"
        >
          Tentar novamente
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
          <h1 className="text-xl font-semibold text-[var(--aethel-text-primary)] flex items-center gap-2">
            <Server className="w-6 h-6" />
            Infraestrutura
            <StatusBadge status={overallStatus} />
          </h1>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">
            Saúde do sistema e utilização de recursos
          </p>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              autoRefresh 
                ? 'border-green-500/30 bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]' 
                : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)]'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Ao vivo' : 'Pausado'}
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Requisições/min"
          value={data.requestsPerMinute}
          icon={Activity}
          trend={data.requestsPerMinute > 100 ? 'up' : undefined}
        />
        <MetricCard
          label="Conexões ativas"
          value={data.activeConnections}
          icon={Wifi}
        />
        <MetricCard
          label="Taxa de erro"
          value={data.errorRate.toFixed(2)}
          unit="%"
          icon={AlertTriangle}
          trend={data.errorRate > 1 ? 'down' : undefined}
        />
        <MetricCard
          label="Taxa de acerto de cache"
          value={data.cacheHitRate.toFixed(1)}
          unit="%"
          icon={Zap}
          trend={data.cacheHitRate > 80 ? 'up' : undefined}
        />
      </div>
      
      {/* Services Grid */}
      <div>
        <h2 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-4">Serviços</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.services.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>
      
      {/* Resources */}
      <div>
        <h2 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-4">Recursos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceGauge
            label="CPU"
            value={data.resources.cpu.usage}
            unit="%"
            icon={Cpu}
          />
          <ResourceGauge
            label="Memória"
            value={data.resources.memory.used}
            max={data.resources.memory.total}
            unit="GB"
            icon={Activity}
          />
          <ResourceGauge
            label="Disco"
            value={data.resources.disk.used}
            max={data.resources.disk.total}
            unit="GB"
            icon={HardDrive}
          />
          <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
              <span className="text-sm text-[var(--aethel-text-tertiary)]">Rede I/O</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Entrada</p>
                <p className="text-sm font-medium text-[var(--aethel-success)]">
                  {(data.resources.network.in / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Saída</p>
                <p className="text-sm font-medium text-[var(--aethel-primary-light)]">
                  {(data.resources.network.out / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Database */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Banco de dados
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Ativas</p>
              <p className="text-xl font-bold text-[var(--aethel-primary-light)]">{data.dbConnections.active}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Ociosas</p>
              <p className="text-xl font-bold text-[var(--aethel-text-tertiary)]">{data.dbConnections.idle}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Máximo</p>
              <p className="text-xl font-bold text-[var(--aethel-text-primary)]">{data.dbConnections.max}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[var(--aethel-border-primary)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--aethel-text-tertiary)]">Tempo médio de consulta</span>
              <span className={`text-sm font-medium ${
                data.dbQueryTime < 50 ? 'text-[var(--aethel-success)]' :
                data.dbQueryTime < 200 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'
              }`}>
                {data.dbQueryTime}ms
              </span>
            </div>
          </div>
        </div>
        
        {/* Cache */}
        <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Cache (Redis)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Taxa de acerto</p>
              <p className={`text-xl font-bold ${
                data.cacheHitRate > 80 ? 'text-[var(--aethel-success)]' :
                data.cacheHitRate > 50 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'
              }`}>
                {data.cacheHitRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Memória usada</p>
              <p className="text-xl font-bold text-[var(--aethel-text-primary)]">
                {(data.cacheMemory / 1024 / 1024).toFixed(0)} MB
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Queues */}
      <div>
        <h2 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Filas de tarefas
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
