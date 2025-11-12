'use client';

import { useState } from 'react';

export default function Updates() {
  const [updates, setUpdates] = useState([
    { id: 1, type: 'IA Library', version: '2.1.0', description: 'Melhorias em performance.', status: 'Pending' },
    { id: 2, type: 'API', version: '1.5.0', description: 'Novos endpoints.', status: 'Approved' },
  ]);

  const approve = (id) => {
    setUpdates(updates.map(u => u.id === id ? { ...u, status: 'Approved' } : u));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Pesquisa e Aprovação de Atualizações</h1>
      <p className='mb-4 text-gray-600'>A IA pesquisa atualizações automaticamente; aprove ou rejeite para deploy seguro.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Pesquisar Atualizações</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Tipo</th>
            <th className='p-2'>Versão</th>
            <th className='p-2'>Descrição</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {updates.map((u) => (
            <tr key={u.id}>
              <td className='p-2'>{u.type}</td>
              <td className='p-2'>{u.version}</td>
              <td className='p-2'>{u.description}</td>
              <td className='p-2'>{u.status}</td>
              <td className='p-2'>
                {u.status === 'Pending' && <button onClick={() => approve(u.id)} className='px-2 py-1 bg-green-500 text-white rounded mr-2'>Aprovar</button>}
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Rejeitar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
