'use client';

import { useState } from 'react';

/**
 * Admin Subscriptions - Gestão de Planos
 * Alinhado com estratégia 2025 - ZERO PREJUÍZO
 */

interface Plan {
  id: string;
  name: string;
  priceUSD: number;
  priceBRL: number;
  tokensPerMonth: number;
  margin: string;
  models: string[];
  domains: string[];
}

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([
    { 
      id: 'starter',
      name: 'Starter', 
      priceUSD: 3, 
      priceBRL: 15, 
      tokensPerMonth: 500_000,
      margin: '96.7%',
      models: ['gemini-1.5-flash', 'deepseek-v3'],
      domains: ['code'],
    },
    { 
      id: 'basic',
      name: 'Basic', 
      priceUSD: 9, 
      priceBRL: 45, 
      tokensPerMonth: 2_000_000,
      margin: '93.9%',
      models: ['gemini-1.5-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-3-haiku'],
      domains: ['code', 'research'],
    },
    { 
      id: 'pro',
      name: 'Pro', 
      priceUSD: 29, 
      priceBRL: 149, 
      tokensPerMonth: 8_000_000,
      margin: '89.2%',
      models: ['all-balanced'],
      domains: ['code', 'trading', 'research', 'creative'],
    },
    { 
      id: 'studio',
      name: 'Studio', 
      priceUSD: 79, 
      priceBRL: 399, 
      tokensPerMonth: 25_000_000,
      margin: '89.6%',
      models: ['all'],
      domains: ['all'],
    },
    { 
      id: 'enterprise',
      name: 'Enterprise', 
      priceUSD: 199, 
      priceBRL: 999, 
      tokensPerMonth: 100_000_000,
      margin: '92.0%',
      models: ['all', 'custom'],
      domains: ['all', 'custom'],
    },
  ]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${tokens / 1_000_000}M`;
    if (tokens >= 1_000) return `${tokens / 1_000}K`;
    return tokens.toString();
  };

  const handleEdit = (index: number, field: keyof Plan, value: string | number) => {
    const newPlans = [...plans];
    (newPlans[index] as any)[field] = value;
    setPlans(newPlans);
  };

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Gestão de Planos</h1>
        <p className='text-gray-600 mt-2'>
          Planos alinhados com estratégia ZERO PREJUÍZO - Margem mínima 89%
        </p>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-5 gap-4 mb-6'>
        {plans.map((plan) => (
          <div key={plan.id} className='bg-white rounded-lg shadow p-4'>
            <h3 className='font-bold text-lg'>{plan.name}</h3>
            <p className='text-2xl font-bold text-green-600'>R${plan.priceBRL}</p>
            <p className='text-sm text-gray-500'>${plan.priceUSD} USD</p>
            <p className='text-sm mt-2'>
              <span className='font-medium'>{formatTokens(plan.tokensPerMonth)}</span> tokens
            </p>
            <p className='text-sm text-green-500'>Margem: {plan.margin}</p>
          </div>
        ))}
      </div>

      {/* Detailed Table */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <table className='w-full'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-3 text-left'>Plano</th>
              <th className='p-3 text-left'>USD/mês</th>
              <th className='p-3 text-left'>BRL/mês</th>
              <th className='p-3 text-left'>Tokens/mês</th>
              <th className='p-3 text-left'>Margem</th>
              <th className='p-3 text-left'>Modelos</th>
              <th className='p-3 text-left'>Domínios</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, index) => (
              <tr key={plan.id} className='border-t hover:bg-gray-50'>
                <td className='p-3 font-medium'>{plan.name}</td>
                <td className='p-3'>
                  <input 
                    type='number' 
                    value={plan.priceUSD} 
                    onChange={(e) => handleEdit(index, 'priceUSD', Number(e.target.value))} 
                    className='w-20 border rounded px-2 py-1'
                  />
                </td>
                <td className='p-3'>
                  <input 
                    type='number' 
                    value={plan.priceBRL} 
                    onChange={(e) => handleEdit(index, 'priceBRL', Number(e.target.value))} 
                    className='w-20 border rounded px-2 py-1'
                  />
                </td>
                <td className='p-3'>{formatTokens(plan.tokensPerMonth)}</td>
                <td className='p-3'>
                  <span className={`px-2 py-1 rounded text-sm ${
                    parseFloat(plan.margin) >= 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {plan.margin}
                  </span>
                </td>
                <td className='p-3 text-sm text-gray-600'>
                  {plan.models.join(', ')}
                </td>
                <td className='p-3 text-sm text-gray-600'>
                  {plan.domains.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className='mt-6 flex gap-4'>
        <button className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
          Salvar Alterações
        </button>
        <button className='bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300'>
          Restaurar Padrão
        </button>
      </div>

      {/* Info Box */}
      <div className='mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <h3 className='font-bold text-blue-800'>💡 Estratégia Zero Prejuízo</h3>
        <ul className='mt-2 text-sm text-blue-700 space-y-1'>
          <li>• Sem plano gratuito = todo usuário gera receita</li>
          <li>• Margem mínima 89% garante lucro em todos os planos</li>
          <li>• IAs ultra baratas (Gemini Flash $0.14/1M) nos planos básicos</li>
          <li>• Hard limits impedem uso excessivo</li>
        </ul>
      </div>
    </div>
  );
}
