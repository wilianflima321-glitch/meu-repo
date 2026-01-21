'use client';

import { useCallback, useEffect, useState } from 'react';

type Integration = {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
};

export default function APIs() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'missing'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/apis');
      if (!res.ok) throw new Error('Falha ao carregar integrações');
      const data = await res.json();
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = integrations.filter((integration) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      integration.name.toLowerCase().includes(term) ||
      integration.envKey.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'configured' ? integration.configured : !integration.configured);
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: integrations.length,
    configured: integrations.filter((integration) => integration.configured).length,
    missing: integrations.filter((integration) => !integration.configured).length,
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Gerenciamento de APIs</h1>
          <p className='text-gray-600'>Status real de integração com provedores externos.</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchIntegrations}
          className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Configuradas</h3>
          <p className="text-2xl font-bold text-green-600">{summary.configured}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Ausentes</h3>
          <p className="text-2xl font-bold text-yellow-600">{summary.missing}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou ambiente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <div className="flex items-center gap-2">
          {(['all', 'configured', 'missing'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status === 'all' ? 'Todas' : status === 'configured' ? 'Configuradas' : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full table-auto bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Chave</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ambiente</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={4}>Carregando integrações...</td>
            </tr>
          ) : error ? (
            <tr>
              <td className='p-2 text-sm text-red-500' colSpan={4}>{error}</td>
            </tr>
          ) : filteredIntegrations.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={4}>Nenhuma integração configurada.</td>
            </tr>
          ) : (
            filteredIntegrations.map((integration) => (
              <tr key={integration.id}>
                <td className='p-2'>{integration.name}</td>
                <td className='p-2'>••••••••</td>
                <td className='p-2'>
                  <span className={`px-2 py-1 rounded text-xs ${integration.configured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {integration.configured ? 'Configurada' : 'Ausente'}
                  </span>
                </td>
                <td className='p-2 text-xs text-gray-500'>{integration.envKey}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
