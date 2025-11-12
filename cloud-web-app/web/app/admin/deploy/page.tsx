'use client';

import { useState } from 'react';

export default function Deploy() {
  const [deploys, setDeploys] = useState([
    { id: 1, name: 'Build Front-End', status: 'Success', lastRun: '2023-10-01' },
    { id: 2, name: 'Deploy IA Model', status: 'In Progress', lastRun: '2023-10-02' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>CI/CD e Deploy</h1>
      <p className='mb-4 text-gray-600'>Configure pipelines de build e deploy para o Aethel.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4'>Novo Pipeline</button>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Integrar GitHub Actions</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Última Execução</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {deploys.map((d) => (
            <tr key={d.id}>
              <td className='p-2'>{d.name}</td>
              <td className='p-2'>{d.status}</td>
              <td className='p-2'>{d.lastRun}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Executar</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
