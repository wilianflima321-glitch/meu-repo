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

type EmergencyLevel = 'normal' | 'warning' | 'critical' | 'shutdown';

type EmergencySettings = {
  dailyBudget: number;
  hourlyBudget: number;
  monthlyBudget: number;
  warningThreshold: number;
  criticalThreshold: number;
  autoDowngradeOnWarning: boolean;
  autoShutdownOnCritical: boolean;
  fallbackModel: string;
  alertEmails: string[];
  webhookUrl: string | null;
};

type EmergencyMetrics = {
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  totalTokensToday: number;
  totalRequestsToday: number;
  avgCostPerRequest: number;
  lastUpdated: string;
};

type EmergencyState = {
  level: EmergencyLevel;
  activatedAt: string | null;
  activatedBy: string | null;
  reason: string | null;
  settings: EmergencySettings;
  metrics: EmergencyMetrics;
};

type EmergencyResponse = {
  success: boolean;
  data?: EmergencyState;
  error?: string;
  message?: string;
};

const LEVEL_OPTIONS: Array<{ value: Exclude<EmergencyLevel, 'normal'>; label: string }> = [
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
  { value: 'shutdown', label: 'Shutdown' },
];

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function EmergencyAdminPage() {
  const [state, setState] = useState<EmergencyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [nextLevel, setNextLevel] = useState<Exclude<EmergencyLevel, 'normal'>>('warning');
  const [reason, setReason] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<EmergencySettings | null>(null);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<EmergencyResponse>('/api/admin/emergency');
      if (!payload?.success || !payload.data) {
        throw new Error(payload?.error || payload?.message || 'Failed to load emergency state');
      }
      setState(payload.data);
      setSettingsDraft(payload.data.settings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emergency state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const submitAction = useCallback(
    async (method: 'POST' | 'DELETE' | 'PATCH', body?: object) => {
      try {
        setSaving(true);
        setSuccess(null);
        const payload = await adminJsonFetch<EmergencyResponse>('/api/admin/emergency', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!payload?.success) {
          throw new Error(payload?.error || payload?.message || 'Emergency action failed');
        }
        setSuccess(payload?.message || 'Action completed');
        await loadState();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Emergency action failed');
      } finally {
        setSaving(false);
      }
    },
    [loadState],
  );

  const levelTone = useMemo(() => {
    if (!state) return 'neutral';
    if (state.level === 'shutdown') return 'danger';
    if (state.level === 'critical') return 'warning';
    if (state.level === 'warning') return 'info';
    return 'success';
  }, [state]);

  return (
    <AdminPageShell
      title='Emergency Operations'
      description='Control cost-protection emergency levels with explicit audit behavior.'
      actions={<AdminPrimaryButton onClick={loadState}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {success ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{success}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatusBanner tone={levelTone as 'neutral' | 'info' | 'success' | 'warning' | 'danger'}>
          Current level: <strong>{state?.level ?? 'unknown'}</strong>
          {state?.activatedBy ? ` • activated by ${state.activatedBy}` : ''}
          {state?.activatedAt ? ` • ${new Date(state.activatedAt).toLocaleString()}` : ''}
          {state?.reason ? ` • ${state.reason}` : ''}
        </AdminStatusBanner>
      </div>

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Hourly spend' value={currency(state?.metrics.hourlySpend ?? 0)} tone='amber' />
          <AdminStatCard label='Daily spend' value={currency(state?.metrics.dailySpend ?? 0)} tone='sky' />
          <AdminStatCard label='Monthly spend' value={currency(state?.metrics.monthlySpend ?? 0)} tone='rose' />
          <AdminStatCard label='Requests today' value={state?.metrics.totalRequestsToday ?? 0} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Emergency action' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_auto]'>
          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Level</span>
            <select
              value={nextLevel}
              onChange={(event) => setNextLevel(event.target.value as Exclude<EmergencyLevel, 'normal'>)}
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Reason (required)</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder='Explain why emergency mode is required'
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <div className='flex items-end gap-2'>
            <AdminPrimaryButton
              onClick={() => submitAction('POST', { level: nextLevel, reason: reason.trim() })}
              disabled={saving || !reason.trim()}
              className='bg-amber-600 text-white hover:bg-amber-500'
            >
              Activate
            </AdminPrimaryButton>
            <AdminPrimaryButton
              onClick={() => submitAction('DELETE')}
              disabled={saving || state?.level === 'normal'}
              className='bg-emerald-600 text-white hover:bg-emerald-500'
            >
              Deactivate
            </AdminPrimaryButton>
          </div>
        </div>
      </AdminSection>

      <AdminSection title='Emergency settings'>
        {loading || !settingsDraft ? (
          <p className='text-sm text-zinc-500'>Loading settings...</p>
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <InputNumber
                label='Hourly budget (USD)'
                value={settingsDraft.hourlyBudget}
                onChange={(value) => setSettingsDraft((prev) => (prev ? { ...prev, hourlyBudget: value } : prev))}
              />
              <InputNumber
                label='Daily budget (USD)'
                value={settingsDraft.dailyBudget}
                onChange={(value) => setSettingsDraft((prev) => (prev ? { ...prev, dailyBudget: value } : prev))}
              />
              <InputNumber
                label='Monthly budget (USD)'
                value={settingsDraft.monthlyBudget}
                onChange={(value) => setSettingsDraft((prev) => (prev ? { ...prev, monthlyBudget: value } : prev))}
              />
              <InputNumber
                label='Warning threshold (%)'
                value={settingsDraft.warningThreshold}
                onChange={(value) => setSettingsDraft((prev) => (prev ? { ...prev, warningThreshold: value } : prev))}
              />
              <InputNumber
                label='Critical threshold (%)'
                value={settingsDraft.criticalThreshold}
                onChange={(value) => setSettingsDraft((prev) => (prev ? { ...prev, criticalThreshold: value } : prev))}
              />
              <label className='text-sm'>
                <span className='mb-1 block text-zinc-400'>Fallback model</span>
                <input
                  value={settingsDraft.fallbackModel}
                  onChange={(event) =>
                    setSettingsDraft((prev) => (prev ? { ...prev, fallbackModel: event.target.value } : prev))
                  }
                  className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                />
              </label>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-4'>
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={settingsDraft.autoDowngradeOnWarning}
                  onChange={(event) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, autoDowngradeOnWarning: event.target.checked } : prev,
                    )
                  }
                />
                Auto downgrade on warning
              </label>
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={settingsDraft.autoShutdownOnCritical}
                  onChange={(event) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, autoShutdownOnCritical: event.target.checked } : prev,
                    )
                  }
                />
                Auto shutdown on critical
              </label>
              <AdminPrimaryButton onClick={() => submitAction('PATCH', settingsDraft)} disabled={saving}>
                Save settings
              </AdminPrimaryButton>
            </div>
          </>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}

function InputNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className='text-sm'>
      <span className='mb-1 block text-zinc-400'>{label}</span>
      <input
        type='number'
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
      />
    </label>
  );
}

