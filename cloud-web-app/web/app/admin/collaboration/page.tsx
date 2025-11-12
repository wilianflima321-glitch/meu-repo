'use client';

import { useState } from 'react';

export default function Collaboration() {
  const [projects, setProjects] = useState([
    { id: 1, name: 'Projeto X', members: 5, status: 'Active' },
    { id: 2, name: 'Projeto Y', members: 3, status: 'Paused' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Colaboração e Projetos</h1>
      <p className='mb-4 text-gray-600'>Gerencie projetos colaborativos, permissões e integrações (ex.: GitHub).</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4'>Novo Projeto</button>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Integrar GitHub</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Membros</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td className='p-2'>{p.name}</td>
              <td className='p-2'>{p.members}</td>
              <td className='p-2'>{p.status}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Editar</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Suspender</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
