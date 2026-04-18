'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Zap,
  Server,
  Bot,
  PieChart
} from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

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

function CostBreakdownChart({ data }: { data: FinanceMetrics['aiCostBreakdown'] }) {
  const colors = ['var(--aethel-primary)', 'var(--aethel-accent)', 'var(--aethel-secondary)', 'var(--aethel-warning)', 'var(--aethel-success)', 'var(--aethel-info)'];
  const total = data.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
        <Bot className="w-4 h-4" />
        Custo de IA por modelo
      </h3>

      {/* Bar chart */}
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.model}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--aethel-text-secondary)]">{item.model}</span>
              <span className="text-[var(--aethel-text-tertiary)]">
                ${item.cost.toFixed(2)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: colors[i % colors.length]
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--aethel-text-tertiary)] mt-0.5">
              {item.calls.toLocaleString()} chamadas
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--aethel-border-secondary)]">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--aethel-text-tertiary)]">Custo total de IA hoje</span>
          <span className="text-[var(--aethel-text-primary)] font-medium">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function RevenueByPlanChart({ data }: { data: FinanceMetrics['revenueByPlan'] }) {
  const colors: Record<string, string> = {
    'starter': 'var(--aethel-text-quaternary)',
    'basic': 'var(--aethel-primary)',
    'pro': 'var(--aethel-accent)',
    'studio': 'var(--aethel-warning)',
    'enterprise': 'var(--aethel-success)'
  };

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
        <PieChart className="w-4 h-4" />
        Receita por plano
      </h3>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.plan} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[item.plan.toLowerCase()] || 'var(--aethel-primary)' }}
            />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--aethel-text-secondary)] capitalize">{item.plan}</span>
                <span className="text-[var(--aethel-text-primary)] font-medium">${item.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)]">
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
      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Alertas financeiros
        </h3>
        <p className="text-sm text-[var(--aethel-text-tertiary)] text-center py-4">
          Nenhum alerta no momento
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alertas financeiros ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border ${
 alert.type === 'critical'
 ? 'bg-[var(--aethel-error)]/10 border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]'
 : 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
 }`}
          >
            <p className={`text-sm ${
 alert.type === 'critical' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-warning)]'
 }`}>
              {alert.message}
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">
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
    subscription: 'text-[var(--aethel-success)]',
    usage: 'text-[var(--aethel-primary-light)]',
    refund: 'text-[var(--aethel-error)]',
    credit: 'text-[var(--aethel-info)]'
  };

  const typeLabels: Record<string, string> = {
    subscription: 'assinatura',
    usage: 'uso',
    refund: 'reembolso',
    credit: 'crédito',
  };

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[var(--aethel-border-secondary)] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Transações recentes
        </h3>
        <button type="button" className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] flex items-center gap-1">
          <Download className="w-3 h-3" />
          Exportar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--aethel-border-secondary)]">
              <th className="text-left text-xs text-[var(--aethel-text-tertiary)] font-normal px-4 py-2">Tipo</th>
              <th className="text-left text-xs text-[var(--aethel-text-tertiary)] font-normal px-4 py-2">Usuário</th>
              <th className="text-left text-xs text-[var(--aethel-text-tertiary)] font-normal px-4 py-2">Descrição</th>
              <th className="text-right text-xs text-[var(--aethel-text-tertiary)] font-normal px-4 py-2">Valor</th>
              <th className="text-right text-xs text-[var(--aethel-text-tertiary)] font-normal px-4 py-2">Hora</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]/50">
                <td className="px-4 py-2">
                  <span className={`capitalize ${typeColors[tx.type]}`}>
                    {typeLabels[tx.type] ?? tx.type}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-[var(--aethel-text-secondary)]">{tx.userEmail}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-[var(--aethel-text-tertiary)]">{tx.description}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={tx.type === 'refund' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-success)]'}>
                    {tx.type === 'refund' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-[var(--aethel-text-tertiary)]">
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
        <RefreshCw className="w-6 h-6 text-[var(--aethel-text-tertiary)] animate-spin" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--aethel-error)]">{error || 'Sem dados disponíveis'}</p>
        <button type="button"
          onClick={fetchMetrics}
          className="px-4 py-2 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] rounded-lg text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const profitColor = metrics.dailyProfit >= 0 ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--aethel-text-primary)]">Saúde financeira</h1>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">MRR, custos e métricas de rentabilidade</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-1">
            {(['today', '7d', '30d', 'mtd'] as const).map((range) => (
              <button type="button"
                aria-label="Set date range"
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-xs rounded ${
 dateRange === range
 ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
 }`}
              >
                {range === 'today' ? 'HOJE' : range === '7d' ? '7D' : range === '30d' ? '30D' : 'MTD'}
              </button>
            ))}
          </div>

          {/* Auto Refresh Toggle */}
          <button type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border ${
 autoRefresh
 ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]'
 : 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-tertiary)]'
 }`}
            aria-label={autoRefresh ? 'Atualização automática ligada' : 'Atualização automática desligada'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Critical Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard
          label="MRR"
          value={metrics.mrr}
          delta={metrics.mrrGrowth}
          icon={TrendingUp}
          valuePrefix="$"
          trend={metrics.mrrGrowth >= 0 ? 'up' : 'down'}
          subValue={`ARR: $${(metrics.arr / 1000).toFixed(0)}k`}
        />
        <AdminMetricCard
          label="Receita diária"
          value={metrics.dailyRevenue}
          icon={DollarSign}
          valuePrefix="$"
        />
        <AdminMetricCard
          label="Lucro diário"
          value={metrics.dailyProfit}
          icon={metrics.dailyProfit >= 0 ? TrendingUp : TrendingDown}
          valuePrefix="$"
          trend={metrics.dailyProfit >= 0 ? 'up' : 'down'}
          subValue={`Margem: ${metrics.profitMargin.toFixed(1)}%`}
        />
        <AdminMetricCard
          label="Queima diária"
          value={metrics.burnRate}
          icon={Zap}
          valuePrefix="$"
          valueSuffix="/dia"
          subValue={`Fôlego: ${metrics.runway} meses`}
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminMetricCard
          label="Custos de IA"
          value={metrics.dailyAICost}
          icon={Bot}
          valuePrefix="$"
          subValue="Gasto de IA hoje"
        />
        <AdminMetricCard
          label="Infraestrutura"
          value={metrics.dailyInfraCost}
          icon={Server}
          valuePrefix="$"
          subValue="Servidores, BD, CDN"
        />
        <AdminMetricCard
          label="Assinaturas ativas"
          value={metrics.activeSubscriptions}
          icon={Users}
          subValue={`Churn: ${metrics.churnRate.toFixed(1)}%`}
        />
      </div>

      {/* Unit Economics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard
          label="LTV"
          value={metrics.ltv}
          icon={TrendingUp}
          valuePrefix="$"
          subValue="Valor do ciclo de vida"
        />
        <AdminMetricCard
          label="CAC"
          value={metrics.cac}
          icon={CreditCard}
          valuePrefix="$"
          subValue="Custo de aquisição"
        />
        <AdminMetricCard
          label="LTV:CAC"
          value={(metrics.ltv / metrics.cac).toFixed(1)}
          icon={PieChart}
          valueSuffix="x"
          trend={(metrics.ltv / metrics.cac) >= 3 ? 'up' : 'down'}
          subValue={metrics.ltv / metrics.cac >= 3 ? 'Saudável' : 'Precisa melhorar'}
        />
        <AdminMetricCard
          label="Taxa de churn"
          value={metrics.churnRate}
          icon={TrendingDown}
          valueSuffix="%"
          trend={metrics.churnRate <= 5 ? 'up' : 'down'}
          subValue="Mensal"
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
