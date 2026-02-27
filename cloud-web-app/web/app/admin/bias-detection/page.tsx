'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type BiasItem = {
  id: string;
  text: string;
  status: string;
  autoScore?: number | null;
  autoFlags?: string[];
  createdAt: string;
};

type BiasStats = {
  total: number;
  highBias: number;
  mediumBias: number;
  lowBias: number;
  pending: number;
};

type BiasResponse = {
  items?: BiasItem[];
  stats?: BiasStats;
};

const emptyStats: BiasStats = {
  total: 0,
  highBias: 0,
  mediumBias: 0,
  lowBias: 0,
  pending: 0,
};

export default function BiasDetectionPage() {
  const [items, setItems] = useState<BiasItem[]>([]);
  const [stats, setStats] = useState<BiasStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ text: '', score: '0.5', flags: 'bias, fairness', reason: 'manual audit' });

  const fetchBias = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<BiasResponse>('/api/admin/bias-detection?limit=100');
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setStats(payload?.stats ?? emptyStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bias audits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBias();
  }, [fetchBias]);

  const createAudit = useCallback(async () => {
    if (!form.text.trim()) {
      setError('Text is required.');
      return;
    }

    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/bias-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.text,
          score: Number(form.score),
          flags: form.flags,
          reason: form.reason,
        }),
      });
      setMessage('Bias audit item created.');
      setError(null);
      setForm({ text: '', score: '0.5', flags: 'bias, fairness', reason: 'manual audit' });
      await fetchBias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bias audit');
    } finally {
      setSaving(false);
    }
  }, [fetchBias, form]);

  return (
    <AdminPageShell
      title='Bias Detection'
      description='Review AI outputs for potential bias with explicit risk distribution and manual audit intake.'
      actions={<AdminPrimaryButton onClick={fetchBias}>Refresh</AdminPrimaryButton>}
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
          <AdminStatCard label='Total' value={stats.total} tone='neutral' />
          <AdminStatCard label='High Bias' value={stats.highBias} tone='rose' />
          <AdminStatCard label='Medium Bias' value={stats.mediumBias} tone='amber' />
          <AdminStatCard label='Pending' value={stats.pending} tone='sky' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Create Manual Bias Audit' className='mb-4'>
        <div className='grid grid-cols-1 gap-3'>
          <textarea
            rows={3}
            placeholder='Output text to audit'
            value={form.text}
            onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            <input
              type='number'
              min='0'
              max='1'
              step='0.01'
              value={form.score}
              onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
            <input
              value={form.flags}
              onChange={(event) => setForm((current) => ({ ...current, flags: event.target.value }))}
              placeholder='Comma separated flags'
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
            <input
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder='Reason'
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </div>
          <div className='flex justify-end'>
            <AdminPrimaryButton onClick={createAudit} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit audit'}
            </AdminPrimaryButton>
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Text</th>
                <th className='p-3 text-left'>Score</th>
                <th className='p-3 text-left'>Flags</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading bias audits...' />
              ) : items.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No bias audits available.' />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{item.text}</td>
                    <td className='p-3'>{item.autoScore !== undefined && item.autoScore !== null ? item.autoScore.toFixed(2) : '-'}</td>
                    <td className='p-3 text-zinc-400'>{item.autoFlags?.join(', ') || '-'}</td>
                    <td className='p-3'>{item.status}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
