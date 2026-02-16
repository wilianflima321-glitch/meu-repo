/**
 * Agent Monitor Page - Raio-X dos Agentes de IA
 * 
 * Painel para visualizar:
 * - Logs de prompts/respostas
 * - Contagem de tokens
 * - Custos em tempo real
 * - Histórico de chamadas
 * 
 * @see PLANO_ACAO_TECNICA_2026.md - Seção 3.1 (AgentMonitor)
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Brain,
  Zap,
  Clock,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Pause,
  Play,
  Settings,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface AICall {
  id: string;
  userId: string;
  userEmail: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  prompt: string;
  response: string;
  timestamp: string;
  projectId?: string;
  operation: string;
}

interface AIMetrics {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }>;
}

// ============================================================================
// COMPONENTE: METRIC CARD
// ============================================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down';
  alert?: boolean;
}) {
  return (
    <div className={`
      p-4 rounded-xl border
      ${alert ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800/50 border-zinc-700'}
    `}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-zinc-400'}`} />
        {trend && (
          <span className={trend === 'up' ? 'text-red-400' : 'text-green-400'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {subValue && <p className="text-xs text-zinc-600 mt-1">{subValue}</p>}
    </div>
  );
}

// ============================================================================
// COMPONENTE: AI CALL ROW
// ============================================================================

function AICallRow({ call, expanded, onToggle }: { call: AICall; expanded: boolean; onToggle: () => void }) {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const statusColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    timeout: 'text-amber-400',
  };
  
  const modelColors: Record<string, string> = {
    'gpt-4o': 'bg-green-500/20 text-green-400',
    'gpt-4o-mini': 'bg-blue-500/20 text-blue-400',
    'gpt-4-turbo': 'bg-blue-500/20 text-blue-400',
    'claude-3-5-sonnet': 'bg-amber-500/20 text-amber-400',
    'claude-3-5-haiku': 'bg-cyan-500/20 text-cyan-400',
  };
  
  return (
    <div className="border-b border-zinc-800 last:border-0">
      {/* Main Row */}
      <div 
        className="flex items-center gap-4 p-3 hover:bg-zinc-800/50 cursor-pointer"
        onClick={onToggle}
      >
        <button className="text-zinc-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <span className={`text-xs ${statusColors[call.status]}`}>●</span>
        
        <span className="text-xs text-zinc-500 w-20">
          {new Date(call.timestamp).toLocaleTimeString()}
        </span>
        
        <span className={`text-xs px-2 py-0.5 rounded ${modelColors[call.model] || 'bg-zinc-700 text-zinc-300'}`}>
          {call.model}
        </span>
        
        <span className="text-sm text-zinc-400 truncate flex-1">
          {call.userEmail}
        </span>
        
        <span className="text-xs text-zinc-500 w-24 text-right">
          {call.inputTokens + call.outputTokens} tokens
        </span>
        
        <span className="text-xs text-zinc-500 w-20 text-right">
          {call.latencyMs}ms
        </span>
        
        <span className={`text-xs font-mono w-16 text-right ${call.cost > 0.01 ? 'text-amber-400' : 'text-zinc-500'}`}>
          ${call.cost.toFixed(4)}
        </span>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-10 pb-4 space-y-3 bg-zinc-900/50">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Usuário: {call.userId}</span>
            <span>Operação: {call.operation}</span>
            {call.projectId && <span>Projeto: {call.projectId}</span>}
          </div>
          
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-400">Prompt ({call.inputTokens} tokens)</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowPrompt(!showPrompt); }}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(call.prompt); }}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <pre className={`
              text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-40
              ${showPrompt ? 'text-zinc-300' : 'text-zinc-600 blur-sm select-none'}
            `}>
              {call.prompt.slice(0, 500)}
              {call.prompt.length > 500 && '...'}
            </pre>
          </div>
          
          {/* Response */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-400">Resposta ({call.outputTokens} tokens)</span>
              <button 
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(call.response); }}
                className="text-xs text-zinc-500 hover:text-white"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs bg-zinc-950 rounded p-2 text-zinc-300 overflow-auto max-h-40">
              {call.response.slice(0, 500)}
              {call.response.length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function AgentMonitorPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Fetch metrics
  const { data: metricsData, error: metricsError } = useSWR(
    '/api/admin/ai/metrics',
    { refreshInterval: isPaused ? 0 : 10000 }
  );
  
  // Fetch calls
  const { data: callsData, error: callsError, mutate: refreshCalls } = useSWR(
    `/api/admin/ai/calls?limit=50&model=${modelFilter}&status=${statusFilter}`,
    { refreshInterval: isPaused ? 0 : 5000 }
  );
  
  // Fetch emergency state
  const { data: emergencyData } = useSWR(
    '/api/admin/emergency',
    { refreshInterval: isPaused ? 0 : 10000 }
  );
  
  const metrics: AIMetrics | null = metricsData?.metrics || null;
  const calls: AICall[] = callsData?.calls || [];
  const emergencyState = emergencyData?.data;

  React.useEffect(() => {
    if (metrics || calls.length > 0) {
      setLastUpdated(new Date());
    }
  }, [metrics, calls.length]);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Monitor de Agentes</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              isPaused ? 'border-zinc-700 text-zinc-400' : 'border-green-500/30 bg-green-500/10 text-green-400'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Retomar' : 'Pausado? Não'}
          </button>
          <button
            onClick={() => refreshCalls()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitor de Agentes de IA</h1>
          <p className="text-sm text-zinc-500">Raio-X em tempo real dos agentes de IA</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPaused 
                ? 'bg-green-600 hover:bg-green-500 text-white' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Retomar' : 'Pausar'}
          </button>
          
          <button
            onClick={() => refreshCalls()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>
      
      {/* Emergency Alert */}
      {emergencyState && emergencyState.level !== 'normal' && (
        <div className={`
          flex items-center justify-between p-4 rounded-xl border
          ${emergencyState.level === 'shutdown' 
            ? 'bg-red-500/20 border-red-500/50' 
            : emergencyState.level === 'critical'
            ? 'bg-orange-500/20 border-orange-500/50'
            : 'bg-amber-500/20 border-amber-500/50'
          }
        `}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-medium text-white">
                Modo de emergência: {emergencyState.level.toUpperCase()}
              </p>
              <p className="text-sm text-zinc-400">{emergencyState.reason}</p>
            </div>
          </div>
          <a 
            href="/admin/emergency" 
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white"
          >
            Gerenciar
          </a>
        </div>
      )}
      
      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-5 gap-4">
          <MetricCard
            icon={Brain}
            label="Total de chamadas (24h)"
            value={metrics.totalCalls.toLocaleString()}
          />
          <MetricCard
            icon={Zap}
            label="Total de tokens"
            value={`${(metrics.totalTokens / 1000).toFixed(1)}K`}
          />
          <MetricCard
            icon={DollarSign}
            label="Custo total"
            value={`$${metrics.totalCost.toFixed(2)}`}
            alert={metrics.totalCost > 50}
          />
          <MetricCard
            icon={Clock}
            label="Latência média"
            value={`${metrics.avgLatency}ms`}
            alert={metrics.avgLatency > 3000}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Taxa de erro"
            value={`${(metrics.errorRate * 100).toFixed(1)}%`}
            alert={metrics.errorRate > 0.05}
          />
        </div>
      )}
      
      {/* Model Breakdown */}
      {metrics?.modelBreakdown && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Uso por modelo</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
              <div key={model} className="flex items-center gap-3 px-4 py-2 bg-zinc-800 rounded-lg">
                <span className="text-sm font-medium text-white">{model}</span>
                <span className="text-xs text-zinc-500">{data.calls} chamadas</span>
                <span className="text-xs text-zinc-500">${data.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Filtros:</span>
        </div>
        
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value="all">Todos os modelos</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value="all">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="error">Erro</option>
          <option value="timeout">Tempo esgotado</option>
        </select>
      </div>
      
      {/* Calls Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-white">Chamadas recentes de IA</h3>
          <span className="text-xs text-zinc-500">{calls.length} chamadas</span>
        </div>
        
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-800/50 text-xs text-zinc-500 font-medium">
          <span className="w-8"></span>
          <span className="w-4"></span>
          <span className="w-20">Hora</span>
          <span className="w-32">Modelo</span>
          <span className="flex-1">Usuário</span>
          <span className="w-24 text-right">Tokens</span>
          <span className="w-20 text-right">Latência</span>
          <span className="w-16 text-right">Custo</span>
        </div>
        
        {/* Rows */}
        <div className="max-h-[500px] overflow-auto">
          {calls.map((call) => (
            <AICallRow
              key={call.id}
              call={call}
              expanded={expandedId === call.id}
              onToggle={() => setExpandedId(expandedId === call.id ? null : call.id)}
            />
          ))}
          
          {calls.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chamada de IA no período selecionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
