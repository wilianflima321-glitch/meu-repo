'use client';

import { useState } from 'react';

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState({
    users: 1500,
    revenue: 25000,
    aiUsage: 50000
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Analytics e Relatórios</h1>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-lg font-semibold'>Usuários Ativos</h3>
          <p className='text-2xl'>{metrics.users}</p>
        </div>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-lg font-semibold'>Receita (R$)</h3>
          <p className='text-2xl'>{metrics.revenue}</p>
        </div>
        <div className='bg-white p-4 rounded-lg shadow'>
          <h3 className='text-lg font-semibold'>Uso de IA (Créditos)</h3>
          <p className='text-2xl'>{metrics.aiUsage}</p>
        </div>
      </div>
      <button className='bg-blue-500 text-white px-4 py-2 rounded'>Exportar Relatório</button>
    </div>
  );
}
