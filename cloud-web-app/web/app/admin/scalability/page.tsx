'use client';

import React, { useState, useEffect, useCallback } from 'react';

type InfrastructureServiceMetric = {
  latency?: number | string | null;
};

export default function ScalabilityPage() {
  const [metrics, setMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    networkTraffic: 0,
    activeConnections: 0,
    errorRate: 0,
    responseTime: 0,
  });

  const [usage, setUsage] = useState({
    planName: '—',
    aiTokensUsed: 0,
    storageUsedMb: 0,
    buildMinutesUsed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [infraRes, billingRes] = await Promise.all([
        fetch('/api/admin/infrastructure/status'),
        fetch('/api/billing/usage'),
      ]);

      if (!infraRes.ok) throw new Error('Failed to load infrastructure');
      if (!billingRes.ok) throw new Error('Failed to load usage/billing');

      const infra = await infraRes.json();
      const billing = await billingRes.json();

      const resources = infra?.resources;
      const cpuUsage = Number(resources?.cpu?.usage || 0);
      const memoryUsage = Number(resources?.memory?.percentage || 0);

      const networkIn = Number(resources?.network?.in || 0);
      const networkOut = Number(resources?.network?.out || 0);
      const networkMbps = ((networkIn + networkOut) * 8) / 1_000_000;

      const activeConnections = Number(infra?.activeConnections || 0);
      const errorRate = Number(infra?.errorRate || 0);

      const latencies = Array.isArray(infra?.services)
        ? (infra.services as InfrastructureServiceMetric[]).map((s) => Number(s?.latency || 0)).filter((v: number) => Number.isFinite(v) && v > 0)
        : [];
      const responseTime = latencies.length
        ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
        : 0;

      setMetrics({
        cpuUsage: Math.round(cpuUsage),
        memoryUsage: Math.round(memoryUsage),
        networkTraffic: Math.round(networkMbps),
        activeConnections,
        errorRate: Number.isFinite(errorRate) ? errorRate : 0,
        responseTime,
      });

      setUsage({
        planName: billing?.data?.plan?.name || billing?.data?.plan?.id || '—',
        aiTokensUsed: Number(billing?.data?.usage?.aiTokens?.used || 0),
        storageUsedMb: Number(billing?.data?.usage?.storage?.used || 0),
        buildMinutesUsed: Number(billing?.data?.usage?.buildMinutes?.used || 0),
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Scalability metrics</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-4 text-[var(--aethel-error)]">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="mb-6 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 text-[var(--aethel-text-tertiary)]">
          Loading metrics...
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">CPU usage</h3>
          <p className="text-2xl font-bold text-[var(--aethel-primary)]">{metrics.cpuUsage}%</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Memory usage</h3>
          <p className="text-2xl font-bold text-[var(--aethel-success)]">{metrics.memoryUsage}%</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Network traffic</h3>
          <p className="text-2xl font-bold text-[var(--aethel-primary)]">{metrics.networkTraffic} Mbps</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Active connections</h3>
          <p className="text-2xl font-bold text-[var(--aethel-error)]">{metrics.activeConnections}</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Error rate</h3>
          <p className="text-2xl font-bold text-[var(--aethel-warning)]">{metrics.errorRate}%</p>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Tempo de resposta</h3>
          <p className="text-2xl font-bold text-[var(--aethel-info)]">{metrics.responseTime}ms</p>
        </div>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Monthly usage</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Plano</h3>
            <p className="text-2xl font-bold text-[var(--aethel-primary)]">{usage.planName}</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Tokens de IA</h3>
            <p className="text-2xl font-bold text-[var(--aethel-success)]">{usage.aiTokensUsed.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Armazenamento</h3>
            <p className="text-2xl font-bold text-[var(--aethel-primary)]">{usage.storageUsedMb.toLocaleString()} MB</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Minutos de compilaction</h3>
            <p className="text-2xl font-bold text-[var(--aethel-error)]">{usage.buildMinutesUsed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recommendations de escalabilidade</h2>
        <ul className="list-disc list-inside">
          <li>Considerar autoescalonamento quando CPU &gt; 80%</li>
          <li>Otimizar consultas para reduzir o tempo de resposta</li>
          <li>Implementar CDN para reduzir custos de banda</li>
          <li>Monitor the error rate to identify bottlenecks</li>
        </ul>
      </div>
    </div>
  );
}
