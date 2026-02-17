/**
 * Usage Dashboard - Visualização de Consumo de Recursos
 * 
 * Mostra ao usuário seu consumo atual de:
 * - Tokens de IA
 * - Storage
 * - Build minutes
 * - GPU hours
 * 
 * @module components/billing/UsageDashboard
 */

'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Sparkles,
  Server,
  Activity,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface UsageMetric {
  id: string;
  name: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: number; // % change vs last month
  details?: string;
}

interface UsageData {
  plan: {
    id: string;
    name: string;
    renewsAt: string;
  };
  usage: {
    aiTokens: { used: number; limit: number };
    storage: { used: number; limit: number }; // in MB
    buildMinutes: { used: number; limit: number };
    gpuHours: { used: number; limit: number };
    apiCalls: { used: number; limit: number };
    collaborators: { used: number; limit: number };
  };
  history: Array<{
    date: string;
    aiTokens: number;
    storage: number;
    buildMinutes: number;
  }>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function UsageDashboard() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: UsageData }>(
    '/api/billing/usage',
    fetcher,
    { refreshInterval: 60000 } // Atualiza a cada minuto
  );

  const usage = data?.data;

  const metrics: UsageMetric[] = useMemo(() => {
    if (!usage) return [];
    
    return [
      {
        id: 'ai-tokens',
        name: 'Tokens de IA',
        used: usage.usage.aiTokens.used,
        limit: usage.usage.aiTokens.limit,
        unit: 'tokens',
        icon: <Sparkles className="w-5 h-5" />,
        color: 'indigo',
        details: 'Usado em chat, geração de código e assets',
      },
      {
        id: 'storage',
        name: 'Armazenamento',
        used: usage.usage.storage.used,
        limit: usage.usage.storage.limit,
        unit: 'MB',
        icon: <HardDrive className="w-5 h-5" />,
        color: 'blue',
        details: 'Arquivos, assets e backups',
      },
      {
        id: 'build-minutes',
        name: 'Build Minutes',
        used: usage.usage.buildMinutes.used,
        limit: usage.usage.buildMinutes.limit,
        unit: 'min',
        icon: <Clock className="w-5 h-5" />,
        color: 'green',
        details: 'Compilação e deploy',
      },
      {
        id: 'gpu-hours',
        name: 'GPU Hours',
        used: usage.usage.gpuHours.used,
        limit: usage.usage.gpuHours.limit,
        unit: 'h',
        icon: <Cpu className="w-5 h-5" />,
        color: 'purple',
        details: 'Renderização e AI inference',
      },
      {
        id: 'api-calls',
        name: 'API Calls',
        used: usage.usage.apiCalls.used,
        limit: usage.usage.apiCalls.limit,
        unit: 'calls',
        icon: <Activity className="w-5 h-5" />,
        color: 'amber',
        details: 'Chamadas de API externas',
      },
      {
        id: 'collaborators',
        name: 'Colaboradores',
        used: usage.usage.collaborators.used,
        limit: usage.usage.collaborators.limit,
        unit: 'pessoas',
        icon: <Server className="w-5 h-5" />,
        color: 'cyan',
        details: 'Membros da equipe',
      },
    ];
  }, [usage]);

  if (isLoading) {
    return <UsageSkeleton />;
  }

  if (error || !usage) {
    return <UsageError />;
  }

  const daysUntilRenewal = Math.ceil(
    (new Date(usage.plan.renewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Seu Consumo</h2>
          <p className="text-sm text-slate-400">
            Plano <span className="text-sky-400 font-medium">{usage.plan.name}</span> • 
            Renova em {daysUntilRenewal} dias
          </p>
        </div>
        <button className="px-4 py-2 text-sm bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-medium transition-colors">
          Upgrade
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(metric => (
          <UsageCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Usage Over Time Chart */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-400" />
          Consumo dos últimos 30 dias
        </h3>
        <UsageChart history={usage.history} />
      </div>

      {/* Warnings */}
      {metrics.some(m => (m.used / m.limit) > 0.8) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium">Atenção ao consumo</p>
            <p className="text-sm text-amber-300/70">
              Alguns recursos estão próximos do limite. Considere fazer upgrade para evitar interrupções.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function UsageCard({ metric }: { metric: UsageMetric }) {
  const percentage = Math.min((metric.used / metric.limit) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  const colorOptions = {
    indigo: { bg: 'bg-sky-500', text: 'text-sky-400', ring: 'ring-sky-500/30' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-500/30' },
    green: { bg: 'bg-green-500', text: 'text-green-400', ring: 'ring-green-500/30' },
    purple: { bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-sky-500/30' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/30' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
  };
  
  const colorClasses = colorOptions[metric.color as keyof typeof colorOptions] || colorOptions.indigo;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className={`bg-slate-800 rounded-xl p-5 border ${
      isCritical ? 'border-red-500/50' : isWarning ? 'border-amber-500/30' : 'border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses.bg}/20 ${colorClasses.text}`}>
            {metric.icon}
          </div>
          <div>
            <h4 className="font-medium text-white">{metric.name}</h4>
            <p className="text-xs text-slate-400">{metric.details}</p>
          </div>
        </div>
        {isCritical && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
            Crítico
          </span>
        )}
        {isWarning && !isCritical && (
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
            Alto
          </span>
        )}
      </div>

      {/* Usage Numbers */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-white">
          {formatNumber(metric.used)}
        </span>
        <span className="text-slate-400 text-sm">
          / {formatNumber(metric.limit)} {metric.unit}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : colorClasses.bg
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={`${
          isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-400'
        }`}>
          {percentage.toFixed(1)}% usado
        </span>
        <span className="text-slate-500">
          {formatNumber(metric.limit - metric.used)} {metric.unit} restantes
        </span>
      </div>
    </div>
  );
}

function UsageChart({ history }: { history: UsageData['history'] }) {
  // Gráfico simplificado - em produção usar Recharts ou Victory
  const maxTokens = Math.max(...history.map(h => h.aiTokens), 1);
  
  return (
    <div className="h-48 flex items-end gap-1">
      {history.slice(-30).map((day, i) => {
        const height = (day.aiTokens / maxTokens) * 100;
        return (
          <div
            key={i}
            className="flex-1 bg-sky-500/30 hover:bg-sky-500/50 rounded-t transition-all cursor-pointer group relative"
            style={{ height: `${Math.max(height, 4)}%` }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              <br />
              {day.aiTokens.toLocaleString()} tokens
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="h-10 w-24 bg-slate-700 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-5 h-40 border border-slate-700" />
        ))}
      </div>
    </div>
  );
}

function UsageError() {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">
        Erro ao carregar dados de consumo
      </h3>
      <p className="text-slate-400 mb-4">
        Não foi possível carregar seus dados de consumo. Tente novamente.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Recarregar
      </button>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UsageDashboard;
