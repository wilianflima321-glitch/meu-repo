"use client";

import { useState } from 'react';

interface AiSettings {
  model: string;
  creditCost: number;
  maxTokens: number;
  policy: string;
}

export default function AdminAI() {
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    model: 'gpt-4',
    creditCost: 0.01,
    maxTokens: 1000,
    policy: 'Bloquear conteúdo prejudicial'
  });

  const handleUpdate = () => {
    // Simulação de API call
    alert('Configurações de IA atualizadas!');
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Administração da IA Aethel</h1>
      <div className='bg-white p-6 rounded-lg shadow'>
        <div className='mb-4'>
          <label className='block mb-2'>Modelo de IA:</label>
          <select value={aiSettings.model} onChange={(e) => setAiSettings({...aiSettings, model: e.target.value})} className='border p-2 w-full'>
            <option value='gpt-4'>GPT-4</option>
            <option value='custom-aethel'>Custom Aethel AI</option>
            <option value='claude'>Claude</option>
          </select>
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Custo por Crédito:</label>
          <input
            type='number'
            step='0.01'
            value={aiSettings.creditCost}
            onChange={(e) => setAiSettings({...aiSettings, creditCost: parseFloat(e.target.value) || 0})}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Máx. Tokens:</label>
          <input
            type='number'
            value={aiSettings.maxTokens}
            onChange={(e) => setAiSettings({...aiSettings, maxTokens: parseInt(e.target.value, 10) || 0})}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Política:</label>
          <textarea value={aiSettings.policy} onChange={(e) => setAiSettings({...aiSettings, policy: e.target.value})} className='border p-2 w-full' rows={3} />
        </div>
        <button onClick={handleUpdate} className='bg-green-500 text-white px-4 py-2 rounded'>Atualizar IA</button>
      </div>
    </div>
  );
}
