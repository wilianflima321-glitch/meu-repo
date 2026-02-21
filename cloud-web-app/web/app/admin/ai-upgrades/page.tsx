'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type UpgradeStatus = 'planned' | 'partial' | 'missing' | 'applied';

interface Upgrade {
  id: string;
  name: string;
  status: UpgradeStatus;
  description?: string | null;
  applied: boolean;
}

const statusLabels: Record<UpgradeStatus, string> = {
  applied: 'Applied',
  partial: 'Partial',
  missing: 'Missing',
  planned: 'Planned',
};

const statusColors: Record<UpgradeStatus, string> = {
  applied: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  partial: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  missing: 'bg-rose-500/15 text-rose-200 border-rose-500/40',
  planned: 'bg-sky-500/15 text-sky-200 border-sky-500/40',
};

const strengths = [
  'IDE integration focused on development workflows and tuned operations.',
  'Agent + bias detection baseline already available with explicit governance.',
  'Cost-aware execution path with optimization controls.',
  'Modular architecture with explicit fallback behavior.',
];

const gaps = [
  'Reasoning stability varies for high-complexity contexts and still requires reviewer validation.',
  'Multimodal coverage is partial and needs consistent ingestion/runtime handling.',
  'Creative generation quality still depends on human curation for narrative/art outputs.',
  'Large-file processing and streaming need further memory/I/O hardening.',
  'Agent planning/execution needs deeper multi-agent orchestration maturity.',
  'Ethics filtering needs richer dashboards and rule policy controls.',
];

export default function AIUpgrades() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUpgrades = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<{ items?: Upgrade[] }>('/api/admin/ai/enhancements');
      setUpgrades(Array.isArray(json.items) ? json.items : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upgrades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return upgrades.filter(
      (upgrade) =>
        !term ||
        upgrade.name.toLowerCase().includes(term) ||
        (upgrade.description || '').toLowerCase().includes(term),
    );
  }, [upgrades, search]);

  const applyUpgrade = useCallback(
    async (upgrade: Upgrade) => {
      try {
        await adminJsonFetch('/api/admin/ai/enhancements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: upgrade.id,
            applied: !upgrade.applied,
            status: upgrade.applied ? upgrade.status : 'applied',
          }),
        });
        await fetchUpgrades();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update upgrade');
      }
    },
    [fetchUpgrades],
  );

  return (
    <AdminPageShell
      title='AI Upgrades Matrix'
      description='Maturity matrix for AI capabilities, gaps, and controlled upgrade actions.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchUpgrades}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
        <AdminSection title='Current strengths'>
          <ul className='list-disc space-y-1 pl-5 text-sm text-zinc-300'>
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AdminSection>
        <AdminSection title='Known gaps'>
          <ul className='list-disc space-y-1 pl-5 text-sm text-zinc-300'>
            {gaps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AdminSection>
      </div>

      <AdminSection title='Proposed upgrades'>
        <div className='mb-4'>
          <input
            className='w-full max-w-sm rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            placeholder='Search upgrades'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Name</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Description</th>
                <th className='p-3 text-left'>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={4} message='Loading upgrades...' />
              ) : filtered.length === 0 ? (
                <AdminTableStateRow colSpan={4} message='No upgrades found for current filters.' />
              ) : (
                filtered.map((upgrade) => (
                  <tr key={upgrade.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 font-medium text-zinc-100'>{upgrade.name}</td>
                    <td className='p-3'>
                      <span className={`inline-flex rounded border px-2 py-1 text-xs ${statusColors[upgrade.status]}`}>
                        {statusLabels[upgrade.status]}
                      </span>
                    </td>
                    <td className='p-3 text-zinc-400'>{upgrade.description || 'No description'}</td>
                    <td className='p-3'>
                      <button
                        type='button'
                        onClick={() => applyUpgrade(upgrade)}
                        className={`rounded px-3 py-1.5 text-xs font-semibold text-white ${
                          upgrade.applied ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        {upgrade.applied ? 'Revert' : 'Apply'}
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
