'use client';

import { useState, useEffect } from 'react';

export default function AITraining() {
  const [trainingJobs, setTrainingJobs] = useState([
    { id: 1, model: 'Aethel-GPT', status: 'Em Andamento', cost: 250, efficiency: 95, filters: 'Bias Detection Enabled' },
    { id: 2, model: 'Aethel-Code', status: 'Concluído', cost: 150, efficiency: 98, filters: 'Error-Free Training' },
  ]);

  const [auxAI, setAuxAI] = useState('GPT-4 para dados sintéticos');
  const [optimization, setOptimization] = useState('Quantization + Transfer Learning');

  useEffect(() => {
    // Simulação de atualização em tempo real
    const interval = setInterval(() => {
      setTrainingJobs(jobs => jobs.map(job => 
        job.status === 'Em Andamento' ? { ...job, cost: job.cost + 10 } : job
      ));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Treinamento de IA Aethel</h1>
      <p className='mb-4 text-gray-600'>Otimize fine-tuning com IAs auxiliares, filtros para eficiência e custo-eficiência.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Configurações de Treinamento</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium'>IA Auxiliar:</label>
            <select value={auxAI} onChange={(e) => setAuxAI(e.target.value)} className='mt-1 block w-full p-2 border rounded'>
              <option>GPT-4 para dados sintéticos</option>
              <option>Mistral para compressão</option>
              <option>Gemma para fine-tuning</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium'>Técnicas de Otimização:</label>
            <select value={optimization} onChange={(e) => setOptimization(e.target.value)} className='mt-1 block w-full p-2 border rounded'>
              <option>Quantization + Transfer Learning</option>
              <option>Knowledge Distillation</option>
              <option>Model Pruning</option>
            </select>
          </div>
        </div>
        <button className='mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>Iniciar Treinamento</button>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Jobs de Treinamento Ativos</h2>
        <div className='space-y-4'>
          {trainingJobs.map(job => (
            <div key={job.id} className='p-4 bg-white rounded-lg shadow'>
              <h3 className='text-lg font-semibold'>{job.model}</h3>
              <p>Status: {job.status} | Custo:  | Eficiência: {job.efficiency}%</p>
              <p>Filtros: {job.filters}</p>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-6 p-4 bg-yellow-100 rounded-lg'>
        <h3 className='font-semibold'>Dicas de Eficiência:</h3>
        <ul className='list-disc ml-5'>
          <li>Use dados sintéticos gerados por GPT-4 para reduzir custos iniciais.</li>
          <li>Aplique quantization para economizar 50% em GPU.</li>
          <li>Filtros automáticos evitam erros e vieses.</li>
        </ul>
      </div>
    </div>
  );
}
