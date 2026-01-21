'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  Filter,
  Globe,
  Lock,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Zap,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ThreatType = 'prompt_injection' | 'code_injection' | 'rate_limit' | 'path_traversal' | 'auth_failure' | 'suspicious_pattern';

interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: ThreatType;
  level: ThreatLevel;
  source: string;
  userId?: string;
  ip?: string;
  description: string;
  blocked: boolean;
  details?: Record<string, unknown>;
}

interface SecurityStats {
  totalBlocked24h: number;
  criticalThreats: number;
  activeAttacks: number;
  blockedIPs: number;
  rateLimitHits: number;
  promptInjections: number;
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

const SkeletonCard: React.FC = () => (
  <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-lg bg-gray-700 w-9 h-9" />
      <div className="w-12 h-4 bg-gray-700 rounded" />
    </div>
    <div className="h-8 bg-gray-700 rounded mt-3 w-20" />
    <div className="h-4 bg-gray-700 rounded mt-2 w-24" />
  </div>
);

const SkeletonEventRow: React.FC = () => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700 border-l-4 border-l-gray-600 p-3 animate-pulse">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-20 h-6 bg-gray-700 rounded-full" />
          <div className="w-28 h-6 bg-gray-700 rounded" />
        </div>
        <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="flex items-center gap-4">
          <div className="w-24 h-4 bg-gray-700 rounded" />
          <div className="w-16 h-4 bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-700 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 bg-gray-700 rounded" />
        <div className="w-8 h-8 bg-gray-700 rounded" />
      </div>
    </div>
  </div>
);

// ============================================================================
// ERROR STATE
// ============================================================================

const ErrorState: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
    <h3 className="text-lg font-medium text-white mb-2">Erro ao carregar dados</h3>
    <p className="text-gray-400 mb-4 max-w-md">{message}</p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      Tentar Novamente
    </button>
  </div>
);

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <ShieldCheck className="w-16 h-16 text-green-400 mb-4 opacity-50" />
    <h3 className="text-lg font-medium text-white mb-2">Nenhum evento de segurança</h3>
    <p className="text-gray-400 max-w-md">
      Não há eventos de segurança registrados. Seu sistema está protegido e funcionando normalmente.
    </p>
  </div>
);

// ============================================================================
// COMPONENTS
// ============================================================================

const ThreatLevelBadge: React.FC<{ level: ThreatLevel }> = ({ level }) => {
  const config = {
    critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ShieldX },
    high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: ShieldAlert },
    medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
    low: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Shield },
    info: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: ShieldCheck },
  };
  
  const { color, icon: Icon } = config[level];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${color}`}>
      <Icon className="w-3 h-3" />
      {level.toUpperCase()}
    </span>
  );
};

const ThreatTypeBadge: React.FC<{ type: ThreatType }> = ({ type }) => {
  const labels: Record<ThreatType, string> = {
    prompt_injection: '💉 Injeção de Prompt',
    code_injection: '⚠️ Injeção de Código',
    rate_limit: '🚦 Limite de Taxa',
    path_traversal: '📁 Travessia de Caminho',
    auth_failure: '🔐 Falha de Auth',
    suspicious_pattern: '👁️ Suspeito',
  };
  
  return (
    <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
      {labels[type]}
    </span>
  );
};

const StatsCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}> = ({ label, value, icon, trend, color }) => (
  <div className={`p-4 rounded-lg border ${color}`}>
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-lg bg-gray-800">{icon}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-white mt-3">{value.toLocaleString()}</p>
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

const EventRow: React.FC<{
  event: SecurityEvent;
  onBlock: () => void;
  onInvestigate: () => void;
}> = ({ event, onBlock, onInvestigate }) => {
  const levelColors = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
    info: 'border-l-gray-500',
  };

  return (
    <div className={`bg-gray-800/30 rounded-lg border border-gray-700 border-l-4 ${levelColors[event.level]} p-3`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ThreatLevelBadge level={event.level} />
            <ThreatTypeBadge type={event.type} />
            {event.blocked && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                ✓ Bloqueado
              </span>
            )}
          </div>
          
          <p className="text-white font-medium mb-1">{event.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.timestamp.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {event.source}
            </span>
            {event.ip && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {event.ip}
              </span>
            )}
            {event.userId && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {event.userId}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onInvestigate}
            className="p-2 hover:bg-blue-600/20 rounded text-blue-400"
            title="Investigar"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!event.blocked && (
            <button
              onClick={onBlock}
              className="p-2 hover:bg-red-600/20 rounded text-red-400"
              title="Bloquear IP"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SecurityDashboard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalBlocked24h: 0,
    criticalThreats: 0,
    activeAttacks: 0,
    blockedIPs: 0,
    rateLimitHits: 0,
    promptInjections: 0,
  });
  const [filterLevel, setFilterLevel] = useState<ThreatLevel | 'all'>('all');
  const [filterType, setFilterType] = useState<ThreatType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (isLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    
    try {
      const [eventsResponse, rateLimitsResponse] = await Promise.all([
        fetch('/api/admin/security/events'),
        fetch('/api/admin/security/rate-limits')
      ]);
      
      if (!eventsResponse.ok) {
        throw new Error(`Falha ao buscar eventos: ${eventsResponse.status} ${eventsResponse.statusText}`);
      }
      
      if (!rateLimitsResponse.ok) {
        throw new Error(`Falha ao buscar rate limits: ${rateLimitsResponse.status} ${rateLimitsResponse.statusText}`);
      }
      
      const eventsData = await eventsResponse.json();
      const rateLimitsData = await rateLimitsResponse.json();
      
      // Parse events with proper date conversion
      const parsedEvents: SecurityEvent[] = (eventsData.events || []).map((e: Record<string, unknown>) => ({
        ...e,
        timestamp: new Date(e.timestamp as string),
      })).sort((a: SecurityEvent, b: SecurityEvent) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setEvents(parsedEvents);
      
      // Calculate stats from real data
      setStats({
        totalBlocked24h: parsedEvents.filter((e: SecurityEvent) => e.blocked).length,
        criticalThreats: parsedEvents.filter((e: SecurityEvent) => e.level === 'critical').length,
        activeAttacks: eventsData.activeAttacks || 0,
        blockedIPs: rateLimitsData.blockedIPs || 0,
        rateLimitHits: parsedEvents.filter((e: SecurityEvent) => e.type === 'rate_limit').length,
        promptInjections: parsedEvents.filter((e: SecurityEvent) => e.type === 'prompt_injection').length,
      });
    } catch (err) {
      console.error('Failed to fetch security data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados de segurança');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const filteredEvents = events.filter(event => {
    if (filterLevel !== 'all' && event.level !== filterLevel) return false;
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (searchQuery && !event.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleBlock = (id: string) => {
    setEvents(prev => prev.map(e => 
      e.id === id ? { ...e, blocked: true } : e
    ));
  };

  // Error state
  if (error && !isRefreshing) {
    return (
      <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Central de Segurança</h2>
            <p className="text-sm text-gray-400">Monitoramento de ameaças em tempo real</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchEvents} />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Central de Segurança</h2>
            <p className="text-sm text-gray-400">Monitoramento de ameaças em tempo real</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="p-4 pt-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonEventRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Central de Segurança</h2>
            <p className="text-sm text-gray-400">Monitoramento de ameaças em tempo real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs ${
            stats.activeAttacks > 0 
              ? 'bg-red-500/20 text-red-400 animate-pulse' 
              : 'bg-green-500/20 text-green-400'
          }`}>
            {stats.activeAttacks > 0 ? `🔴 ${stats.activeAttacks} Ataques Ativos` : '🟢 Sistema Seguro'}
          </div>
          
          <button
            onClick={fetchEvents}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
        <StatsCard
          label="Bloqueados (24h)"
          value={stats.totalBlocked24h}
          icon={<ShieldCheck className="w-5 h-5 text-green-400" />}
          color="border-green-500/30 bg-green-500/5"
        />
        <StatsCard
          label="Críticos"
          value={stats.criticalThreats}
          icon={<ShieldX className="w-5 h-5 text-red-400" />}
          trend={15}
          color="border-red-500/30 bg-red-500/5"
        />
        <StatsCard
          label="IPs Bloqueados"
          value={stats.blockedIPs}
          icon={<Ban className="w-5 h-5 text-orange-400" />}
          color="border-orange-500/30 bg-orange-500/5"
        />
        <StatsCard
          label="Rate Limits"
          value={stats.rateLimitHits}
          icon={<Activity className="w-5 h-5 text-yellow-400" />}
          color="border-yellow-500/30 bg-yellow-500/5"
        />
        <StatsCard
          label="Injeções de Prompt"
          value={stats.promptInjections}
          icon={<AlertTriangle className="w-5 h-5 text-purple-400" />}
          trend={-8}
          color="border-purple-500/30 bg-purple-500/5"
        />
        <StatsCard
          label="Ataques Ativos"
          value={stats.activeAttacks}
          icon={<Zap className="w-5 h-5 text-cyan-400" />}
          color="border-cyan-500/30 bg-cyan-500/5"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as ThreatLevel | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos Níveis</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
            <option value="info">Info</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ThreatType | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="prompt_injection">Injeção de Prompt</option>
            <option value="code_injection">Injeção de Código</option>
            <option value="rate_limit">Limite de Taxa</option>
            <option value="path_traversal">Travessia de Caminho</option>
            <option value="auth_failure">Falha de Autenticação</option>
            <option value="suspicious_pattern">Padrão Suspeito</option>
          </select>
        </div>
      </div>

      {/* Event List */}
      <div className="p-4 pt-0 space-y-2 max-h-[500px] overflow-y-auto">
        {filteredEvents.length === 0 && events.length === 0 ? (
          <EmptyState />
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum evento encontrado com os filtros selecionados</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventRow
              key={event.id}
              event={event}
              onBlock={() => handleBlock(event.id)}
              onInvestigate={() => console.log('Investigate:', event.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;
