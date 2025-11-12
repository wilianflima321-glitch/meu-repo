'use client';

import { useState } from 'react';

export default function Compliance() {
  const [policies, setPolicies] = useState([
    { id: 1, name: 'GDPR Compliance', status: 'Active' },
    { id: 2, name: 'Data Retention Policy', status: 'Review Needed' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Compliance e Privacidade</h1>
      <p className='mb-4 text-gray-600'>Gerencie políticas de privacidade, GDPR e compliance legal.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4'>Nova Política</button>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Auditoria Automática</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id}>
              <td className='p-2'>{p.name}</td>
              <td className='p-2'>{p.status}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Editar</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Desativar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
