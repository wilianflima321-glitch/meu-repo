
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type UpgradeStatus = 'planned' | 'partial' | 'missing' | 'applied';

interface Upgrade {
  id: string;
  name: string;
  status: UpgradeStatus;
  description?: string | null;
  applied: boolean;
}

const statusLabels: Record<UpgradeStatus, string> = {
  applied: 'Aplicado',
  partial: 'Parcial',
  missing: 'Faltando',
  planned: 'Planejado',
};

const statusColors: Record<UpgradeStatus, string> = {
  applied: 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)]',
  partial: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)]',
  missing: 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)] border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)]',
  planned: 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]',
};

export default function AIUpgrades() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUpgrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/enhancements');
      if (!res.ok) throw new Error('Failed to load melhorias');
      const json = await res.json();
      setUpgrades(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading melhorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return upgrades.filter((u) => !term || u.name.toLowerCase().includes(term) || (u.description || '').toLowerCase().includes(term));
  }, [upgrades, search]);

  const applyUpgrade = async (upgrade: Upgrade) => {
    try {
      const res = await fetch('/api/admin/ai/enhancements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: upgrade.id, applied: !upgrade.applied, status: upgrade.applied ? upgrade.status : 'applied' }),
      });
      if (!res.ok) throw new Error('Failed to update melhoria');
      await fetchUpgrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating melhoria');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Melhorias para IA Aethel</h1>
      <p className='mb-4 text-[var(--aethel-text-secondary)]'>Maturity matrix: current capabilities, gaps, and prioritized improvements with governance.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>What Aethel Already Has (Strengths)</h2>
        <ul className='list-disc ml-5 space-y-2'>
          <li><strong>IDE integration:</strong> Focus on development and personalized fine-tuning.</li>
          <li><strong>Agents and Bias Detection:</strong> Basic agent mode and ethical correction.</li>
          <li><strong>Efficiency:</strong> Optimized, cost-efficient training.</li>
          <li><strong>Modularity:</strong> Safe, conflict-free, scalable.</li>
        </ul>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Lacunas Identificadas (Benchmark interno)</h2>
        <ul className='list-disc ml-5 space-y-2'>
          <li><strong>Reasoning:</strong> Variable robustness in complex contexts; requires validation and human review.</li>
          <li><strong>Multimodal:</strong> Partial image/audio/video coverage; needs a consistent pipeline.</li>
          <li><strong>Criatividade:</strong> Forte em engenharia, limitada para arte e narrativa sem curadoria.</li>
          <li><strong>Processing:</strong> Large files and streaming need memory and I/O optimization.</li>
          <li><strong>Programming:</strong> High performance, but still with gaps in specific domains and fine optimization.</li>
          <li><strong>Agent Mode:</strong> Collaboration and multi-agent planning are evolving.</li>
          <li><strong>Ethics and Filters:</strong> Detection is good, but visual dashboards and advanced dynamic rules are missing.</li>
        </ul>
      </div>

      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Melhorias Propostas</h2>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Buscar melhoria'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && (
          <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
            {error}
          </div>
        )}
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Loading improvements...</p>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Nenhuma melhoria encontrada.</p>
        ) : (
          <div className='space-y-4'>
            {filtered.map((upgrade) => (
              <div key={upgrade.id} className='p-4 bg-[var(--aethel-surface-tertiary)] rounded-lg shadow-md border-l-4'>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className='text-lg font-semibold text-[var(--aethel-text-primary)]'>{upgrade.name}</h3>
                    <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block ${statusColors[upgrade.status]}`}>
                      Status: {statusLabels[upgrade.status]}
                    </p>
                    <p className="mt-2 text-[var(--aethel-text-secondary)]">{upgrade.description || 'No description'}</p>
                  </div>
                  <button type="button"
                    onClick={() => applyUpgrade(upgrade)}
                    className={`mt-2 px-4 py-2 rounded-md font-semibold transition-colors ${upgrade.applied ? 'bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'}`}
                  >
                    {upgrade.applied ? 'Reverter' : 'Aplicar melhoria'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] rounded-lg'>
        <h3 className='font-semibold'>Evolution Guidelines:</h3>
        <ul className='list-disc ml-5'>
          <li>Prioritize reliability with validation, metrics, and approval by environment.</li>
          <li>Expanda multimodal com curadoria e limites de custo/qualidade.</li>
          <li>Elevate agent mode with planning, auditable execution, and rollback.</li>
          <li>Strengthen security, compliance, and observability across all routes.</li>
        </ul>
      </div>
    </div>
  );
}
