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

type ProjectItem = {
  id: string;
  name: string;
  members: number;
  status: string;
  updatedAt: string;
};

type CollaborationPayload = {
  items?: ProjectItem[];
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

export default function Collaboration() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<CollaborationPayload>('/api/admin/collaboration');
      setProjects(Array.isArray(json?.items) ? json.items : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collaboration projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateStatus = useCallback(
    async (projectId: string, status: string) => {
      try {
        await adminJsonFetch('/api/admin/collaboration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, status }),
        });
        await fetchProjects();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update project status');
      }
    },
    [fetchProjects],
  );

  const summary = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((project) => project.status === 'active').length,
      paused: projects.filter((project) => project.status === 'paused').length,
      members: projects.reduce((sum, project) => sum + project.members, 0),
    }),
    [projects],
  );

  return (
    <AdminPageShell
      title='Collaboration'
      description='Govern collaborative project status transitions with explicit operator actions.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchProjects}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Projects' value={summary.total} tone='sky' />
          <AdminStatCard label='Active' value={summary.active} tone='emerald' />
          <AdminStatCard label='Paused' value={summary.paused} tone='amber' />
          <AdminStatCard label='Members' value={summary.members} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Project</th>
                <th className='p-3 text-left'>Members</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Updated</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading projects...' />
              ) : projects.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No collaboration projects found.' />
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{project.name}</td>
                    <td className='p-3'>{project.members}</td>
                    <td className='p-3'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>
                        {statusLabels[project.status] ?? project.status}
                      </span>
                    </td>
                    <td className='p-3 text-zinc-500'>{new Date(project.updatedAt).toLocaleString()}</td>
                    <td className='p-3'>
                      {project.status === 'active' ? (
                        <button
                          onClick={() => updateStatus(project.id, 'paused')}
                          className='rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500'
                          type='button'
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(project.id, 'active')}
                          className='rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500'
                          type='button'
                        >
                          Reactivate
                        </button>
                      )}
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
