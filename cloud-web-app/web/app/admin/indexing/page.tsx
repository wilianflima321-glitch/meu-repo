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

type FileEntry = {
  id: string;
  name: string;
  path: string;
  indexed: boolean;
  context: string;
  size: number;
};

type IndexingPayload = {
  files?: FileEntry[];
  config?: {
    depthLevel?: number;
    maxFileSizeMb?: number;
  };
};

export default function IndexingPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [depthLevel, setDepthLevel] = useState(3);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const json = await adminJsonFetch<IndexingPayload>(`/api/admin/indexing${query}`);
      setFiles(Array.isArray(json?.files) ? json.files : []);
      setDepthLevel(json?.config?.depthLevel ?? 3);
      setMaxFileSizeMb(json?.config?.maxFileSizeMb ?? 10);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load indexing settings');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateConfig = useCallback(async () => {
    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/indexing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depthLevel, maxFileSizeMb }),
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update indexing configuration');
    } finally {
      setSaving(false);
    }
  }, [depthLevel, fetchData, maxFileSizeMb]);

  const toggleIndex = useCallback(
    async (file: FileEntry) => {
      try {
        await adminJsonFetch('/api/admin/indexing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: file.id, indexed: !file.indexed, context: file.context }),
        });
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle indexing status');
      }
    },
    [fetchData],
  );

  const summary = useMemo(
    () => ({
      total: files.length,
      indexed: files.filter((file) => file.indexed).length,
      unindexed: files.filter((file) => !file.indexed).length,
    }),
    [files],
  );

  return (
    <AdminPageShell
      title='Indexing'
      description='Control RAG indexing scope, context limits, and per-file inclusion.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchData}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Files' value={summary.total} tone='sky' />
          <AdminStatCard label='Indexed' value={summary.indexed} tone='emerald' />
          <AdminStatCard label='Unindexed' value={summary.unindexed} tone='amber' />
          <AdminStatCard label='Depth level' value={depthLevel} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Project search' className='mb-6'>
        <div className='flex flex-col gap-3 md:flex-row'>
          <input
            type='text'
            placeholder='Search by file or context'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className='flex-1 rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <AdminPrimaryButton onClick={fetchData} className='bg-blue-600 text-white hover:bg-blue-500'>
            Search
          </AdminPrimaryButton>
        </div>
      </AdminSection>

      <AdminSection title='Context configuration' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Depth level</span>
            <input
              type='number'
              value={depthLevel}
              onChange={(event) => setDepthLevel(Number(event.target.value))}
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Max file size (MB)</span>
            <input
              type='number'
              value={maxFileSizeMb}
              onChange={(event) => setMaxFileSizeMb(Number(event.target.value))}
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
          </label>
        </div>
        <AdminPrimaryButton
          onClick={updateConfig}
          disabled={saving}
          className='mt-4 bg-emerald-600 text-white hover:bg-emerald-500'
        >
          {saving ? 'Saving...' : 'Update configuration'}
        </AdminPrimaryButton>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>File</th>
                <th className='p-3 text-left'>Path</th>
                <th className='p-3 text-left'>Context</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading files...' />
              ) : files.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No files found.' />
              ) : (
                files.map((file) => (
                  <tr key={file.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{file.name}</td>
                    <td className='p-3 text-zinc-500'>{file.path}</td>
                    <td className='p-3'>{file.context || 'No context'}</td>
                    <td className='p-3'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>
                        {file.indexed ? 'Indexed' : 'Not indexed'}
                      </span>
                    </td>
                    <td className='p-3'>
                      <button
                        onClick={() => toggleIndex(file)}
                        className='rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500'
                        type='button'
                      >
                        Toggle
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
