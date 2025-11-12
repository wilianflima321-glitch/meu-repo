'use client';

import { useState } from 'react';

export default function Onboarding() {
  const [journeys, setJourneys] = useState([
    { id: 1, name: 'Tutorial Básico', steps: 5, users: 100, active: true },
    { id: 2, name: 'Onboarding Avançado IA', steps: 8, users: 50, active: false },
  ]);

  const toggle = (id) => {
    setJourneys(journeys.map(j => j.id === id ? { ...j, active: !j.active } : j));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>User Onboarding</h1>
      <p className='mb-4 text-gray-600'>Gerencie jornadas adaptativas de onboarding para novos usuários.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Nova Jornada</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Passos</th>
            <th className='p-2'>Usuários Ativos</th>
            <th className='p-2'>Ativa</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {journeys.map((j) => (
            <tr key={j.id}>
              <td className='p-2'>{j.name}</td>
              <td className='p-2'>{j.steps}</td>
              <td className='p-2'>{j.users}</td>
              <td className='p-2'>{j.active ? 'Sim' : 'Não'}</td>
              <td className='p-2'>
                <button onClick={() => toggle(j.id)} className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Toggle</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
