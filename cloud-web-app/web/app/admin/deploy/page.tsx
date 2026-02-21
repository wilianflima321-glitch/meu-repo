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

type Pipeline = {
  id: string;
  name: string;
  status: string;
  provider: string;
  lastRunAt?: string | null;
};

type DeployPayload = {
  items?: Pipeline[];
};

export default function Deploy() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', provider: 'internal' });
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<DeployPayload>('/api/admin/deploy');
      setPipelines(Array.isArray(json?.items) ? json.items : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const createPipeline = useCallback(async () => {
    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ name: '', provider: 'internal' });
      await fetchPipelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline');
    } finally {
      setSaving(false);
    }
  }, [fetchPipelines, form]);

  const runPipeline = useCallback(
    async (id: string) => {
      try {
        await adminJsonFetch('/api/admin/deploy', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'run' }),
        });
        await fetchPipelines();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to execute pipeline');
      }
    },
    [fetchPipelines],
  );

  const summary = useMemo(
    () => ({
      total: pipelines.length,
      running: pipelines.filter((pipeline) => pipeline.status === 'running').length,
      failed: pipelines.filter((pipeline) => pipeline.status === 'failed').length,
      healthy: pipelines.filter((pipeline) => pipeline.status === 'success').length,
    }),
    [pipelines],
  );

  return (
    <AdminPageShell
      title='Deploy Pipelines'
      description='Manage CI/CD pipeline catalog and trigger controlled execution from admin.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchPipelines}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Pipelines' value={summary.total} tone='sky' />
          <AdminStatCard label='Running' value={summary.running} tone='amber' />
          <AdminStatCard label='Failed' value={summary.failed} tone='rose' />
          <AdminStatCard label='Healthy' value={summary.healthy} tone='emerald' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Create pipeline' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <input
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            placeholder='Pipeline name'
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <select
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            value={form.provider}
            onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
          >
            <option value='internal'>Internal</option>
            <option value='github'>GitHub Actions</option>
            <option value='gitlab'>GitLab CI</option>
          </select>
          <AdminPrimaryButton
            onClick={createPipeline}
            disabled={saving || !form.name.trim()}
            className='bg-blue-600 text-white hover:bg-blue-500'
          >
            {saving ? 'Creating...' : 'Create pipeline'}
          </AdminPrimaryButton>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Name</th>
                <th className='p-3 text-left'>Provider</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Last run</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading pipelines...' />
              ) : pipelines.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No pipelines found.' />
              ) : (
                pipelines.map((pipeline) => (
                  <tr key={pipeline.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{pipeline.name}</td>
                    <td className='p-3'>{pipeline.provider}</td>
                    <td className='p-3'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>{pipeline.status}</span>
                    </td>
                    <td className='p-3 text-zinc-500'>
                      {pipeline.lastRunAt ? new Date(pipeline.lastRunAt).toLocaleString() : '-'}
                    </td>
                    <td className='p-3'>
                      <button
                        onClick={() => runPipeline(pipeline.id)}
                        className='rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500'
                        type='button'
                      >
                        Run
                      </button>
                    </td>
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
