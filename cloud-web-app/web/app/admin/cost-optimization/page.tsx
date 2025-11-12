'use client';

import { useState, useEffect } from 'react';

export default function CostOptimization() {
  const [costs, setCosts] = useState({
    training: 25000,
    cloud: 5000,
    domains: 200,
    total: 30200,
    savings: 0,
  });

  const [optimizations, setOptimizations] = useState([
    { name: 'Spot Instances (AWS)', savings: 2000, enabled: false },
    { name: 'Open-Source Models', savings: 1500, enabled: true },
    { name: 'Reserved Instances', savings: 1000, enabled: false },
  ]);

  const applyOptimization = (index) => {
    setOptimizations(opts => opts.map((opt, i) => 
      i === index ? { ...opt, enabled: !opt.enabled } : opt
    ));
  };

  useEffect(() => {
    const totalSavings = optimizations.filter(opt => opt.enabled).reduce((sum, opt) => sum + opt.savings, 0);
    setCosts(c => ({ ...c, savings: totalSavings, total: 30200 - totalSavings }));
  }, [optimizations]);

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Otimização de Custos</h1>
      <p className='mb-4 text-gray-600'>Monitore despesas iniciais e aplique otimizações para lucro sustentável.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Resumo de Custos (Estimativa Mensal)</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='p-4 bg-white rounded-lg shadow'>
            <h3 className='font-semibold'>Treinamento IA:</h3>
            <p className='text-2xl'></p>
            <p className='text-sm text-gray-600'>Inclui GPUs e dados iniciais.</p>
          </div>
          <div className='p-4 bg-white rounded-lg shadow'>
            <h3 className='font-semibold'>Nuvens:</h3>
            <p className='text-2xl'></p>
            <p className='text-sm text-gray-600'>AWS/GCP para hosting.</p>
          </div>
          <div className='p-4 bg-white rounded-lg shadow'>
            <h3 className='font-semibold'>Domínios:</h3>
            <p className='text-2xl'></p>
            <p className='text-sm text-gray-600'>Registro e hosting.</p>
          </div>
          <div className='p-4 bg-green-100 rounded-lg shadow'>
            <h3 className='font-semibold'>Total com Poupanças:</h3>
            <p className='text-2xl'></p>
            <p className='text-sm text-gray-600'>Economia: </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Otimizaçôes Disponíveis</h2>
        <div className='space-y-4'>
          {optimizations.map((opt, index) => (
            <div key={index} className='p-4 bg-white rounded-lg shadow flex justify-between items-center'>
              <div>
                <h3 className='font-semibold'>{opt.name}</h3>
                <p>Poupança: /mês</p>
              </div>
              <button 
                onClick={() => applyOptimization(index)}
                className="px-4 py-2 rounded"
              >
                {opt.enabled ? 'Ativado' : 'Ativar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-6 p-4 bg-blue-100 rounded-lg'>
        <h3 className='font-semibold'>Recomendações:</h3>
        <ul className='list-disc ml-5'>
          <li>Use spot instances para reduzir custos de nuvem em 60%.</li>
          <li>Migre para open-source (Mistral) para evitar taxas de APIs.</li>
          <li>Negocie Reserved Instances para longo prazo.</li>
        </ul>
      </div>
    </div>
  );
}
