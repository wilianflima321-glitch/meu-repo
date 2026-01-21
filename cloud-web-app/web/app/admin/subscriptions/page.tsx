'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Admin Subscriptions - Gestão de Planos (dados reais do DB/Stripe config)
 */

interface PlanSummary {
  id: string;
  name: string;
  priceUSD: number;
  users: number;
  mrr: number;
  isTrial: boolean;
}

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showTrials, setShowTrials] = useState(false);
  const [search, setSearch] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) throw new Error('Falha ao carregar planos');
      const data = await res.json();
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = plans.filter((plan) => {
    if (!showTrials && plan.isTrial) return false;
    const term = search.trim().toLowerCase();
    return !term || plan.name.toLowerCase().includes(term) || plan.id.toLowerCase().includes(term);
  });

  const summary = {
    totalUsers: plans.reduce((sum, plan) => sum + plan.users, 0),
    totalMRR: plans.reduce((sum, plan) => sum + plan.mrr, 0),
    trialUsers: plans.filter((plan) => plan.isTrial).reduce((sum, plan) => sum + plan.users, 0),
  };

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Gestão de Planos</h1>
          <p className='text-gray-600 mt-2'>
            Distribuição por plano e MRR baseado nos usuários ativos.
          </p>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchPlans}
          className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
        >
          Atualizar
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div className='bg-white rounded-lg shadow p-4 text-center'>
          <h3 className='text-sm font-semibold'>Usuários totais</h3>
          <p className='text-2xl font-bold text-blue-600'>{summary.totalUsers}</p>
        </div>
        <div className='bg-white rounded-lg shadow p-4 text-center'>
          <h3 className='text-sm font-semibold'>MRR total (US$)</h3>
          <p className='text-2xl font-bold text-green-600'>US${summary.totalMRR.toFixed(2)}</p>
        </div>
        <div className='bg-white rounded-lg shadow p-4 text-center'>
          <h3 className='text-sm font-semibold'>Usuários em teste</h3>
          <p className='text-2xl font-bold text-gray-600'>{summary.trialUsers}</p>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar plano'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border p-2 rounded w-full md:max-w-sm'
        />
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={showTrials}
            onChange={(e) => setShowTrials(e.target.checked)}
          />
          Exibir testes
        </label>
      </div>

      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <table className='w-full'>
          <thead>
            <tr className='bg-gray-100 text-sm'>
              <th className='p-3 text-left'>Plano</th>
              <th className='p-3 text-left'>Preço (US$)</th>
              <th className='p-3 text-left'>Usuários</th>
              <th className='p-3 text-left'>MRR</th>
              <th className='p-3 text-left'>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-3 text-sm text-gray-500' colSpan={5}>Carregando planos...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className='p-3 text-sm text-red-500' colSpan={5}>{error}</td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td className='p-3 text-sm text-gray-500' colSpan={5}>Nenhum plano encontrado.</td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr key={plan.id} className='border-t hover:bg-gray-50'>
                  <td className='p-3 font-medium'>{plan.name}</td>
                  <td className='p-3'>US${plan.priceUSD.toFixed(2)}</td>
                  <td className='p-3'>{plan.users}</td>
                  <td className='p-3'>US${plan.mrr.toFixed(2)}</td>
                  <td className='p-3'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      plan.isTrial ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {plan.isTrial ? 'Teste' : 'Pago'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className='mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600'>
        Limitação: preços e identificação de planos vêm da configuração do backend. Tokens, modelos e domínios são
        definidos no faturamento/Stripe e não são editáveis nesta tela.
      </div>
    </div>
  );
}
