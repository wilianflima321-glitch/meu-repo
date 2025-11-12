'use client';

import { useState } from 'react';

export default function APIs() {
  const [apis, setApis] = useState([
    { id: 1, name: 'OpenAI API', key: 'sk-...', limit: 1000, usage: 500 },
    { id: 2, name: 'GitHub API', key: 'gh-...', limit: 5000, usage: 2000 },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciamento de APIs</h1>
      <p className='mb-4 text-gray-600'>Gerencie chaves, limites e uso de APIs externas e internas.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Adicionar Nova API</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Chave (Mascarada)</th>
            <th className='p-2'>Limite</th>
            <th className='p-2'>Uso Atual</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((api) => (
            <tr key={api.id}>
              <td className='p-2'>{api.name}</td>
              <td className='p-2'>{api.key}</td>
              <td className='p-2'>{api.limit}</td>
              <td className='p-2'>{api.usage}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Editar</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Revogar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
