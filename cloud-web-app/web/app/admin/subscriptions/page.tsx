'use client';

import { useState } from 'react';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState([
    { name: 'Free', price: 0, credits: 500 },
    { name: 'Pro', price: 19, credits: 2000 },
    { name: 'Studio', price: 39, credits: 5000 }
  ]);

  const handleEdit = (index, field, value) => {
    const newPlans = [...plans];
    newPlans[index][field] = value;
    setPlans(newPlans);
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Assinaturas e Créditos</h1>
      <table className='w-full bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-3'>Plano</th>
            <th className='p-3'>Preço (R$/mês)</th>
            <th className='p-3'>Créditos</th>
            <th className='p-3'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, index) => (
            <tr key={index} className='border-t'>
              <td className='p-3'>{plan.name}</td>
              <td className='p-3'><input type='number' value={plan.price} onChange={(e) => handleEdit(index, 'price', e.target.value)} /></td>
              <td className='p-3'><input type='number' value={plan.credits} onChange={(e) => handleEdit(index, 'credits', e.target.value)} /></td>
              <td className='p-3'><button className='bg-green-500 text-white px-2 py-1 rounded'>Salvar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className='mt-4 bg-blue-500 text-white px-4 py-2 rounded'>Aplicar Mudanças Globais</button>
    </div>
  );
}
