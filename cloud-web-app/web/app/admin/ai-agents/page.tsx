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

type Workflow = {
  id: string;
  title: string;
  userEmail: string;
  projectName: string | null;
  updatedAt: string;
  lastUsedAt: string | null;
};

type WorkflowsResponse = {
  workflows?: Workflow[];
};

export default function AIAgentsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<WorkflowsResponse>('/api/admin/ai/agents');
      setWorkflows(Array.isArray(payload?.workflows) ? payload.workflows : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const projectOptions = useMemo(() => {
    return Array.from(new Set(workflows.map((workflow) => workflow.projectName || 'Unassigned'))).sort();
  }, [workflows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workflows.filter((workflow) => {
      const projectLabel = workflow.projectName || 'Unassigned';
      const projectMatches = projectFilter === 'all' || projectFilter === projectLabel;
      const searchMatches =
        !term ||
        workflow.title.toLowerCase().includes(term) ||
        workflow.userEmail.toLowerCase().includes(term) ||
        projectLabel.toLowerCase().includes(term);
      return projectMatches && searchMatches;
    });
  }, [projectFilter, search, workflows]);

  return (
    <AdminPageShell
      title='AI Agent Workflows'
      description='Monitor mission workflows executed by agent orchestration and validate active usage.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchWorkflows}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total Workflows' value={workflows.length} tone='sky' />
          <AdminStatCard label='Filtered Workflows' value={filtered.length} tone='neutral' />
          <AdminStatCard label='Projects' value={projectOptions.length} tone='emerald' />
          <AdminStatCard
            label='Recently Used'
            value={workflows.filter((workflow) => workflow.lastUsedAt).length}
            tone='amber'
          />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search title, user or project'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>All projects</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Workflow</th>
                <th className='p-3 text-left'>User</th>
                <th className='p-3 text-left'>Project</th>
                <th className='p-3 text-left'>Last used</th>
                <th className='p-3 text-left'>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading agent workflows...' />
              ) : filtered.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No workflows found for current filters.' />
              ) : (
                filtered.map((workflow) => (
                  <tr key={workflow.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{workflow.title}</td>
                    <td className='p-3'>{workflow.userEmail}</td>
                    <td className='p-3'>{workflow.projectName || 'Unassigned'}</td>
                    <td className='p-3 text-zinc-500'>
                      {workflow.lastUsedAt ? new Date(workflow.lastUsedAt).toLocaleString() : '-'}
                    </td>
                    <td className='p-3 text-zinc-500'>{new Date(workflow.updatedAt).toLocaleString()}</td>
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
