'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Zap,
  Server,
  Bot,
  PieChart
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface FinanceMetrics {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  
  dailyRevenue: number;
  dailyAICost: number;
  dailyInfraCost: number;
  dailyProfit: number;
  profitMargin: number;
  
  burnRate: number;
  runway: number; // months
  
  activeSubscriptions: number;
  churnRate: number;
  ltv: number;
  cac: number;
  
  aiCostBreakdown: {
    model: string;
    cost: number;
    calls: number;
    percentage: number;
  }[];
  
  revenueByPlan: {
    plan: string;
    users: number;
    revenue: number;
    percentage: number;
  }[];
  
  recentTransactions: {
    id: string;
    type: 'subscription' | 'usage' | 'refund' | 'credit';
    amount: number;
    userId: string;
    userEmail: string;
    description: string;
    createdAt: string;
  }[];
  
  alerts: {
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }[];
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  prefix = '',
  suffix = '',
  trend,
  subtitle
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) {
  const isPositive = trend === 'up' || (change && change > 0);
  const isNegative = trend === 'down' || (change && change < 0);
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{title}</span>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">
          {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : value}{suffix}
        </span>
        {change !== undefined && (
          <span className={`text-xs flex items-center ${
            isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNegative ? <ArrowDownRight className="w-3 h-3" /> : null}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CostBreakdownChart({ data }: { data: FinanceMetrics['aiCostBreakdown'] }) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
  const total = data.reduce((sum, item) => sum + item.cost, 0);
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Bot className="w-4 h-4" />
        Custo de IA por modelo
      </h3>
      
      {/* Bar chart */}
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.model}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{item.model}</span>
              <span className="text-gray-400">
                ${item.cost.toFixed(2)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${item.percentage}%`,
                  backgroundColor: colors[i % colors.length]
                }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {item.calls.toLocaleString()} chamadas
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-[#333]">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Custo total de IA hoje</span>
          <span className="text-white font-medium">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function RevenueByPlanChart({ data }: { data: FinanceMetrics['revenueByPlan'] }) {
  const colors: Record<string, string> = {
    'starter': '#6b7280',
    'basic': '#3b82f6',
    'pro': '#8b5cf6',
    'studio': '#f59e0b',
    'enterprise': '#10b981'
  };
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <PieChart className="w-4 h-4" />
        Receita por plano
      </h3>
      
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.plan} className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[item.plan.toLowerCase()] || '#6366f1' }}
            />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 capitalize">{item.plan}</span>
                <span className="text-white font-medium">${item.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{item.users} usuários</span>
                <span>{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: FinanceMetrics['alerts'] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Alertas financeiros
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum alerta no momento
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alertas financeiros ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div 
            key={i}
            className={`p-3 rounded-lg border ${
              alert.type === 'critical' 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}
          >
            <p className={`text-sm ${
              alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {alert.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {alert.metric}: {alert.value} (limite: {alert.threshold})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTable({ transactions }: { transactions: FinanceMetrics['recentTransactions'] }) {
  const typeColors: Record<string, string> = {
    subscription: 'text-green-400',
    usage: 'text-blue-400',
    refund: 'text-red-400',
    credit: 'text-purple-400'
  };

  const typeLabels: Record<string, string> = {
    subscription: 'assinatura',
    usage: 'uso',
    refund: 'reembolso',
    credit: 'crédito',
  };
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[#333] flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Transações recentes
        </h3>
        <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <Download className="w-3 h-3" />
          Exportar
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333]">
              <th className="text-left text-xs text-gray-500 font-normal px-4 py-2">Tipo</th>
              <th className="text-left text-xs text-gray-500 font-normal px-4 py-2">Usuário</th>
              <th className="text-left text-xs text-gray-500 font-normal px-4 py-2">Descrição</th>
              <th className="text-right text-xs text-gray-500 font-normal px-4 py-2">Valor</th>
              <th className="text-right text-xs text-gray-500 font-normal px-4 py-2">Hora</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-[#252525] hover:bg-[#252525]/50">
                <td className="px-4 py-2">
                  <span className={`capitalize ${typeColors[tx.type]}`}>
                    {typeLabels[tx.type] ?? tx.type}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-gray-300">{tx.userEmail}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-gray-400">{tx.description}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={tx.type === 'refund' ? 'text-red-400' : 'text-green-400'}>
                    {tx.type === 'refund' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {new Date(tx.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function FinanceDashboard() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'mtd'>('today');
  
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/finance/metrics?range=${dateRange}`);
      if (!res.ok) throw new Error('Falha ao carregar métricas');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);
  
  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // 30s refresh
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }
  
  if (error || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error || 'Sem dados disponíveis'}</p>
        <button 
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  
  const profitColor = metrics.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400';
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Saúde financeira</h1>
          <p className="text-sm text-gray-400">MRR, custos e métricas de rentabilidade</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded-lg p-1">
            {(['today', '7d', '30d', 'mtd'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-xs rounded ${
                  dateRange === range 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === 'today' ? 'HOJE' : range === '7d' ? '7D' : range === '30d' ? '30D' : 'MTD'}
              </button>
            ))}
          </div>
          
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border ${
              autoRefresh 
                ? 'border-green-500/30 bg-green-500/10 text-green-400' 
                : 'border-[#333] text-gray-400'
            }`}
            title={autoRefresh ? 'Atualização automática ligada' : 'Atualização automática desligada'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Critical Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="MRR"
          value={metrics.mrr}
          change={metrics.mrrGrowth}
          icon={TrendingUp}
          prefix="$"
          trend={metrics.mrrGrowth >= 0 ? 'up' : 'down'}
          subtitle={`ARR: $${(metrics.arr / 1000).toFixed(0)}k`}
        />
        <MetricCard
          title="Receita diária"
          value={metrics.dailyRevenue}
          icon={DollarSign}
          prefix="$"
        />
        <MetricCard
          title="Lucro diário"
          value={metrics.dailyProfit}
          icon={metrics.dailyProfit >= 0 ? TrendingUp : TrendingDown}
          prefix="$"
          trend={metrics.dailyProfit >= 0 ? 'up' : 'down'}
          subtitle={`Margem: ${metrics.profitMargin.toFixed(1)}%`}
        />
        <MetricCard
          title="Queima diária"
          value={metrics.burnRate}
          icon={Zap}
          prefix="$"
          suffix="/dia"
          subtitle={`Fôlego: ${metrics.runway} meses`}
        />
      </div>
      
      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Custos de IA"
          value={metrics.dailyAICost}
          icon={Bot}
          prefix="$"
          subtitle="Gasto de IA hoje"
        />
        <MetricCard
          title="Infraestrutura"
          value={metrics.dailyInfraCost}
          icon={Server}
          prefix="$"
          subtitle="Servidores, BD, CDN"
        />
        <MetricCard
          title="Assinaturas ativas"
          value={metrics.activeSubscriptions}
          icon={Users}
          subtitle={`Churn: ${metrics.churnRate.toFixed(1)}%`}
        />
      </div>
      
      {/* Unit Economics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="LTV"
          value={metrics.ltv}
          icon={TrendingUp}
          prefix="$"
          subtitle="Valor do ciclo de vida"
        />
        <MetricCard
          title="CAC"
          value={metrics.cac}
          icon={CreditCard}
          prefix="$"
          subtitle="Custo de aquisição"
        />
        <MetricCard
          title="LTV:CAC"
          value={(metrics.ltv / metrics.cac).toFixed(1)}
          icon={PieChart}
          suffix="x"
          trend={(metrics.ltv / metrics.cac) >= 3 ? 'up' : 'down'}
          subtitle={metrics.ltv / metrics.cac >= 3 ? 'Saudável' : 'Precisa melhorar'}
        />
        <MetricCard
          title="Taxa de churn"
          value={metrics.churnRate}
          icon={TrendingDown}
          suffix="%"
          trend={metrics.churnRate <= 5 ? 'up' : 'down'}
          subtitle="Mensal"
        />
      </div>
      
      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <AlertsPanel alerts={metrics.alerts} />
      )}
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostBreakdownChart data={metrics.aiCostBreakdown} />
        <RevenueByPlanChart data={metrics.revenueByPlan} />
      </div>
      
      {/* Transactions */}
      <TransactionsTable transactions={metrics.recentTransactions} />
    </div>
  );
}
