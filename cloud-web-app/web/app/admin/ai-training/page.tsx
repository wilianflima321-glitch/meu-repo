'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type TrainingJob = {
  id: string;
  model: string;
  status: string;
  cost: number;
  efficiency: number;
  filters?: string | null;
  auxAI?: string | null;
  optimization?: string | null;
  createdAt: string;
};

type JobsResponse = {
  items?: TrainingJob[];
};

export default function AITraining() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    model: 'Aethel-GPT',
    auxAI: 'gpt-4o',
    optimization: 'quantization + transfer learning',
    filters: 'bias-detection enabled',
  });

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<JobsResponse>('/api/admin/ai/training');
      setJobs(Array.isArray(payload?.items) ? payload.items : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const startTraining = useCallback(async () => {
    if (!form.model.trim()) {
      setError('Model is required.');
      return;
    }
    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/ai/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: form.model.trim(),
          auxAI: form.auxAI.trim(),
          optimization: form.optimization.trim(),
          filters: form.filters.trim(),
        }),
      });
      setMessage('Training job queued.');
      setError(null);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue training job');
    } finally {
      setSaving(false);
    }
  }, [fetchJobs, form]);

  const summary = useMemo(() => {
    const queued = jobs.filter((job) => job.status === 'queued').length;
    const running = jobs.filter((job) => job.status === 'running').length;
    const completed = jobs.filter((job) => job.status === 'completed').length;
    const avgEfficiency = jobs.length > 0 ? jobs.reduce((acc, job) => acc + (job.efficiency || 0), 0) / jobs.length : 0;
    return { queued, running, completed, avgEfficiency };
  }, [jobs]);

  return (
    <AdminPageShell
      title='AI Training Jobs'
      description='Queue and monitor model adaptation jobs with explicit runtime state and efficiency outcomes.'
      actions={<AdminPrimaryButton onClick={fetchJobs}>Refresh</AdminPrimaryButton>}
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
          <AdminStatCard label='Queued' value={summary.queued} tone='amber' />
          <AdminStatCard label='Running' value={summary.running} tone='sky' />
          <AdminStatCard label='Completed' value={summary.completed} tone='emerald' />
          <AdminStatCard label='Avg Efficiency' value={`${summary.avgEfficiency.toFixed(1)}%`} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Queue Training Job' className='mb-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <label className='flex flex-col gap-1 text-sm'>
            Model
            <input
              value={form.model}
              onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Auxiliary AI
            <input
              value={form.auxAI}
              onChange={(event) => setForm((current) => ({ ...current, auxAI: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <label className='md:col-span-2 flex flex-col gap-1 text-sm'>
            Optimization
            <input
              value={form.optimization}
              onChange={(event) => setForm((current) => ({ ...current, optimization: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <label className='md:col-span-2 flex flex-col gap-1 text-sm'>
            Filters
            <input
              value={form.filters}
              onChange={(event) => setForm((current) => ({ ...current, filters: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <div className='md:col-span-2 flex justify-end'>
            <AdminPrimaryButton onClick={startTraining} disabled={saving}>
              {saving ? 'Queuing...' : 'Queue job'}
            </AdminPrimaryButton>
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Model</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Cost</th>
                <th className='p-3 text-left'>Efficiency</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading training jobs...' />
              ) : jobs.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No training jobs found.' />
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>
                      <p className='text-zinc-100'>{job.model}</p>
                      <p className='text-xs text-zinc-500'>{job.auxAI || '-'}</p>
                    </td>
                    <td className='p-3'>{job.status}</td>
                    <td className='p-3'>${(job.cost || 0).toFixed(2)}</td>
                    <td className='p-3'>{(job.efficiency || 0).toFixed(1)}%</td>
                    <td className='p-3 text-zinc-500'>{new Date(job.createdAt).toLocaleString()}</td>
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
