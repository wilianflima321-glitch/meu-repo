'use client';

import { useState } from 'react';

export default function Backup() {
  const [backups, setBackups] = useState([
    { id: 1, date: '2023-10-01', size: '5GB', status: 'Completed' },
    { id: 2, date: '2023-10-02', size: '5.1GB', status: 'In Progress' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Backup e Recovery</h1>
      <p className='mb-4 text-gray-600'>Gerencie backups automáticos e recovery de dados para compliance e segurança.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4'>Iniciar Backup Manual</button>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Configurar Automático</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>ID</th>
            <th className='p-2'>Data</th>
            <th className='p-2'>Tamanho</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((b) => (
            <tr key={b.id}>
              <td className='p-2'>{b.id}</td>
              <td className='p-2'>{b.date}</td>
              <td className='p-2'>{b.size}</td>
              <td className='p-2'>{b.status}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Download</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Restaurar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
