'use client';

import { useCallback, useEffect, useState } from 'react';

type AutomationItem = {
  id: string;
  action: string | null;
  category: string | null;
  severity: string | null;
  resource: string | null;
  createdAt: string;
};

type AutomationPayload = {
  items: AutomationItem[];
  summary: { total: number; warning: number; critical: number };
};

export default function Automation() {
  const [data, setData] = useState<AutomationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'all' | 'warning' | 'critical'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const severityLabels: Record<string, string> = {
    warning: 'aviso',
    critical: 'crítico',
    info: 'informação',
  };

  const fetchAutomation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/automation');
      if (!res.ok) throw new Error('Falha ao carregar automações');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar automações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomation();
  }, [fetchAutomation]);

  const filteredItems = (data?.items || []).filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesTerm = !term ||
      (item.action || '').toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term) ||
      (item.resource || '').toLowerCase().includes(term);
    const matchesSeverity = severity === 'all' || item.severity === severity;
    return matchesTerm && matchesSeverity;
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Automação de fluxos</h1>
          <p className='text-sm text-zinc-500'>Eventos e regras automatizadas derivadas dos logs operacionais.</p>
          {lastUpdated && (
            <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchAutomation}
          className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Eventos</h3>
          <p className='text-2xl font-bold text-blue-600'>{data?.summary.total ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Avisos</h3>
          <p className='text-2xl font-bold text-yellow-600'>{data?.summary.warning ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Críticos</h3>
          <p className='text-2xl font-bold text-red-600'>{data?.summary.critical ?? 0}</p>
        </div>
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow p-4'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
          <h2 className='text-xl font-semibold'>Histórico de Automação</h2>
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='Buscar por ação, categoria ou recurso'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border p-2 rounded text-sm'
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className='border p-2 rounded text-sm'
            >
              <option value='all'>Todas</option>
              <option value='warning'>Aviso</option>
              <option value='critical'>Crítica</option>
            </select>
          </div>
        </div>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-zinc-800/70 text-sm'>
              <th className='p-2 text-left'>Ação</th>
              <th className='p-2 text-left'>Categoria</th>
              <th className='p-2 text-left'>Severidade</th>
              <th className='p-2 text-left'>Recurso</th>
              <th className='p-2 text-left'>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Carregando automações...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Nenhum evento encontrado.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2'>{item.action || '—'}</td>
                  <td className='p-2'>{item.category || '—'}</td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.severity === 'critical'
                        ? 'bg-rose-500/15 text-rose-300'
                        : item.severity === 'warning'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-zinc-800/70 text-zinc-400'
                    }`}>
                      {severityLabels[item.severity || 'info'] ?? item.severity ?? 'informação'}
                    </span>
                  </td>
                  <td className='p-2'>{item.resource || '—'}</td>
                  <td className='p-2'>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
