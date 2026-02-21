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

type Environment = 'staging' | 'production';

type AiSettings = {
  model: string;
  creditCost: number;
  maxTokens: number;
  policy: string;
  enabled: boolean;
};

type AiMetrics = {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
};

type SettingsResponse = {
  data?: AiSettings;
};

type MetricsResponse = {
  metrics?: Partial<AiMetrics>;
};

const defaultSettings: AiSettings = {
  model: 'gpt-4',
  creditCost: 0.01,
  maxTokens: 1000,
  policy: 'Block unsafe outputs',
  enabled: true,
};

export default function AdminAI() {
  const [environment, setEnvironment] = useState<Environment>('staging');
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [metrics, setMetrics] = useState<AiMetrics>({
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
    errorRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsPayload, metricsPayload] = await Promise.all([
        adminJsonFetch<SettingsResponse>(`/api/admin/ai/settings?env=${environment}`),
        adminJsonFetch<MetricsResponse>('/api/admin/ai/metrics'),
      ]);

      setSettings(settingsPayload?.data ?? defaultSettings);
      setMetrics({
        totalCalls: metricsPayload?.metrics?.totalCalls ?? 0,
        totalTokens: metricsPayload?.metrics?.totalTokens ?? 0,
        totalCost: metricsPayload?.metrics?.totalCost ?? 0,
        avgLatency: metricsPayload?.metrics?.avgLatency ?? 0,
        errorRate: metricsPayload?.metrics?.errorRate ?? 0,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI control plane data');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSettings = useCallback(async () => {
    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          environment,
        }),
      });
      setMessage('AI settings saved.');
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  }, [environment, settings]);

  const formattedErrorRate = useMemo(() => `${(metrics.errorRate * 100).toFixed(1)}%`, [metrics.errorRate]);

  return (
    <AdminPageShell
      title='AI Control Plane'
      description='Manage model policy and monitor live AI usage from a single operational surface.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchData}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {message ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{message}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Calls (24h)' value={metrics.totalCalls} tone='sky' />
          <AdminStatCard label='Tokens (24h)' value={metrics.totalTokens.toLocaleString()} tone='neutral' />
          <AdminStatCard label='Cost (24h)' value={`$${metrics.totalCost.toFixed(2)}`} tone='amber' />
          <AdminStatCard label='Error Rate' value={formattedErrorRate} tone='rose' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Environment'>
        <div className='flex flex-wrap items-center gap-2'>
          {(['staging', 'production'] as const).map((env) => (
            <button
              key={env}
              type='button'
              onClick={() => setEnvironment(env)}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                environment === env ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
              }`}
            >
              {env === 'staging' ? 'Staging' : 'Production'}
            </button>
          ))}
        </div>
      </AdminSection>

      <AdminSection title='AI Settings' className='mt-4'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Loading settings...</p>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <label className='flex flex-col gap-1 text-sm'>
              Model
              <input
                value={settings.model}
                onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
            </label>
            <label className='flex flex-col gap-1 text-sm'>
              Credit Cost
              <input
                type='number'
                step='0.0001'
                min='0'
                value={settings.creditCost}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, creditCost: Number(event.target.value) || 0 }))
                }
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
            </label>
            <label className='flex flex-col gap-1 text-sm'>
              Max Tokens
              <input
                type='number'
                min='1'
                value={settings.maxTokens}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, maxTokens: Number(event.target.value) || 1 }))
                }
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
            </label>
            <label className='flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-sm'>
              <input
                type='checkbox'
                checked={settings.enabled}
                onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              />
              Enabled
            </label>
            <label className='md:col-span-2 flex flex-col gap-1 text-sm'>
              Policy
              <textarea
                rows={3}
                value={settings.policy}
                onChange={(event) => setSettings((current) => ({ ...current, policy: event.target.value }))}
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
            </label>
            <div className='md:col-span-2 flex justify-end'>
              <AdminPrimaryButton onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </AdminPrimaryButton>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection title='Latency baseline' className='mt-4'>
        <p className='text-sm text-zinc-400'>Average latency across recent AI calls: {metrics.avgLatency}ms.</p>
      </AdminSection>
    </AdminPageShell>
  );
}
