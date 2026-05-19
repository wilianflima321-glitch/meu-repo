'use client';

import React, { useCallback, useEffect, useState } from 'react';

type FinanceMetrics = {
  mrr: number;
  activeSubscriptions: number;
  churnRate: number;
};

export default function ArpuChurnPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/finance/metrics?range=30d');
      if (!res.ok) throw new Error('Failed to load financial metrics');
      const data = await res.json();
      setMetrics({
        mrr: data?.mrr || 0,
        activeSubscriptions: data?.activeSubscriptions || 0,
        churnRate: data?.churnRate || 0,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">ARPU e churn</h1>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">ARPU e churn</h1>
        <p className="text-sm text-[var(--aethel-error)]">{error}</p>
        <button type="button" className="mt-4 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] px-4 py-2 rounded" onClick={fetchMetrics}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const activeSubs = metrics?.activeSubscriptions || 0;
  const arpu = activeSubs > 0 ? (metrics?.mrr || 0) / activeSubs : 0;
  const churnRate = metrics?.churnRate || 0;
  const retentionRate = Math.max(0, 100 - churnRate);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ARPU e churn</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">ARPU (30d)</h3>
          <p className="text-2xl font-bold text-[var(--aethel-success)]">${arpu.toFixed(2)}</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Rate de Churn</h3>
          <p className="text-2xl font-bold text-[var(--aethel-error)]">{churnRate.toFixed(1)}%</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Retention Rate</h3>
          <p className="text-2xl font-bold text-[var(--aethel-primary)]">{retentionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Historical Data</h2>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">No consolidated historical series is currently available.</p>
      </div>
    </div>
  );
}
