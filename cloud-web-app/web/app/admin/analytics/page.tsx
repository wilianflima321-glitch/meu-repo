'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type AdminAnalyticsMetrics = {
  activeUsers: number;
  dailyRevenue: number;
  aiTokens: number;
  requestsPerMinute: number;
  aiCostToday: number;
};

type QuickStatsResponse = {
  stats?: {
    activeUsers?: number;
    requestsPerMinute?: number;
    aiCostToday?: number;
  };
};

type FinanceResponse = {
  dailyRevenue?: number;
};

type AIResponse = {
  metrics?: {
    totalTokens?: number;
  };
};

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [quickStats, finance, ai] = await Promise.all([
        adminJsonFetch<QuickStatsResponse>('/api/admin/quick-stats'),
        adminJsonFetch<FinanceResponse>('/api/admin/finance/metrics?range=today'),
        adminJsonFetch<AIResponse>('/api/admin/ai/metrics'),
      ]);

      setMetrics({
        activeUsers: quickStats?.stats?.activeUsers ?? 0,
        dailyRevenue: finance?.dailyRevenue ?? 0,
        aiTokens: ai?.metrics?.totalTokens ?? 0,
        requestsPerMinute: quickStats?.stats?.requestsPerMinute ?? 0,
        aiCostToday: quickStats?.stats?.aiCostToday ?? 0,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar metricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleExport = useCallback(() => {
    if (!metrics) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      metrics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [metrics]);

  const cards = useMemo(
    () => [
      {
        label: 'Usuarios ativos (1h)',
        value: metrics?.activeUsers ?? 0,
        subtitle: `Req/min: ${metrics?.requestsPerMinute ?? 0}`,
      },
      {
        label: 'Receita diaria (USD)',
        value: (metrics?.dailyRevenue ?? 0).toFixed(2),
        subtitle: `Custo IA hoje: $${(metrics?.aiCostToday ?? 0).toFixed(2)}`,
      },
      {
        label: 'Uso IA (tokens/24h)',
        value: (metrics?.aiTokens ?? 0).toLocaleString(),
        subtitle: 'Total consolidado por telemetria operacional',
      },
    ],
    [metrics],
  );

  return (
    <AdminPageShell
      title='Analises e relatorios'
      description='Consolidado operacional de usuarios, receita e custo de IA.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={
        <>
          <AdminPrimaryButton onClick={handleExport} disabled={!metrics}>
            Exportar relatorio
          </AdminPrimaryButton>
          <AdminPrimaryButton onClick={fetchMetrics}>Atualizar</AdminPrimaryButton>
        </>
      }
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>
            {error}
            <button className='ml-3 underline' onClick={fetchMetrics}>
              Tentar novamente
            </button>
          </AdminStatusBanner>
        </div>
      ) : null}

      <AdminSection>
        <AdminStatGrid>
          <AdminStatCard label='Usuarios ativos (1h)' value={loading ? '...' : cards[0].value} tone='sky' />
          <AdminStatCard label='Receita diaria (USD)' value={loading ? '...' : cards[1].value} tone='emerald' />
          <AdminStatCard label='Uso IA (tokens/24h)' value={loading ? '...' : cards[2].value} tone='amber' />
          <AdminStatCard
            label='Custo IA hoje (USD)'
            value={loading ? '...' : (metrics?.aiCostToday ?? 0).toFixed(2)}
            tone='rose'
          />
        </AdminStatGrid>
      </AdminSection>

      <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
        {cards.map((card) => (
          <AdminSection key={card.label} title={card.label}>
            {loading ? (
              <div className='h-16 animate-pulse rounded bg-zinc-800/70' />
            ) : (
              <>
                <p className='text-2xl font-semibold text-zinc-100'>{card.value}</p>
                <p className='mt-1 text-xs text-zinc-500'>{card.subtitle}</p>
              </>
            )}
          </AdminSection>
        ))}
      </div>
    </AdminPageShell>
  );
}

