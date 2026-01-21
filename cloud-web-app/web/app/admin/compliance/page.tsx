'use client';

import { useCallback, useEffect, useState } from 'react';

type Policy = {
  id: string;
  name: string;
  status: 'active' | 'review' | 'inactive';
  lastAuditAt: string | null;
  incidents: number;
};

export default function Compliance() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/compliance');
      if (!res.ok) throw new Error('Falha ao carregar conformidade');
      const data = await res.json();
      setPolicies(Array.isArray(data?.policies) ? data.policies : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conformidade');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const summary = {
    total: policies.length,
    incidents: policies.reduce((sum, policy) => sum + policy.incidents, 0),
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Compliance e Privacidade</h1>
          <p className='text-gray-600'>Políticas legais e auditorias de conformidade.</p>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchPolicies}
          className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
        >
          Atualizar
        </button>
      </div>

      <div className='bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Políticas monitoradas</h3>
          <p className='text-2xl font-bold text-blue-600'>{summary.total}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Incidentes críticos</h3>
          <p className='text-2xl font-bold text-red-600'>{summary.incidents}</p>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-gray-100 text-sm'>
              <th className='p-2 text-left'>Política</th>
              <th className='p-2 text-left'>Status</th>
              <th className='p-2 text-left'>Última auditoria</th>
              <th className='p-2 text-left'>Incidentes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-gray-500' colSpan={4}>Carregando políticas...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className='p-2 text-sm text-red-500' colSpan={4}>{error}</td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-gray-500' colSpan={4}>Nenhuma política configurada.</td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id} className='border-t'>
                  <td className='p-2'>{policy.name}</td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      policy.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : policy.status === 'review'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {policy.status === 'active'
                        ? 'Ativa'
                        : policy.status === 'review'
                        ? 'Revisão'
                        : 'Inativa'}
                    </span>
                  </td>
                  <td className='p-2'>
                    {policy.lastAuditAt ? new Date(policy.lastAuditAt).toLocaleString() : '—'}
                  </td>
                  <td className='p-2'>{policy.incidents}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className='mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600'>
        Limitação: políticas são calculadas a partir de logs de auditoria. Para automações legais completas,
        integrar serviços externos de conformidade.
      </div>
    </div>
  );
}
