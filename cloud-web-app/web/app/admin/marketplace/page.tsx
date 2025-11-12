'use client';

import { useState } from 'react';

export default function AdminMarketplace() {
  const [extensions, setExtensions] = useState([
    { id: 1, name: 'VR Tools', author: 'User1', status: 'Pending', commission: 10 },
    { id: 2, name: 'AI Debugger', author: 'User2', status: 'Approved', commission: 15 }
  ]);

  const handleStatus = (id, status) => {
    setExtensions(extensions.map(e => e.id === id ? { ...e, status } : e));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciar Marketplace</h1>
      <table className='w-full bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-3'>Extensão</th>
            <th className='p-3'>Autor</th>
            <th className='p-3'>Status</th>
            <th className='p-3'>Comissão (%)</th>
            <th className='p-3'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {extensions.map(ext => (
            <tr key={ext.id} className='border-t'>
              <td className='p-3'>{ext.name}</td>
              <td className='p-3'>{ext.author}</td>
              <td className='p-3'>{ext.status}</td>
              <td className='p-3'>{ext.commission}%</td>
              <td className='p-3'>
                <button onClick={() => handleStatus(ext.id, 'Approved')} className='bg-green-500 text-white px-2 py-1 rounded mr-2'>Aprovar</button>
                <button onClick={() => handleStatus(ext.id, 'Rejected')} className='bg-red-500 text-white px-2 py-1 rounded'>Rejeitar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
