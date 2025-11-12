'use client';

import { useState } from 'react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'Email', message: 'Bem-vindo ao Aethel!', enabled: true },
    { id: 2, type: 'Push', message: 'Atualização disponível', enabled: false },
  ]);

  const toggle = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciamento de Notificações</h1>
      <p className='mb-4 text-gray-600'>Configure notificações push, emails e alerts para usuários e admin.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Nova Notificação</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Tipo</th>
            <th className='p-2'>Mensagem</th>
            <th className='p-2'>Ativo</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((n) => (
            <tr key={n.id}>
              <td className='p-2'>{n.type}</td>
              <td className='p-2'>{n.message}</td>
              <td className='p-2'>{n.enabled ? 'Sim' : 'Não'}</td>
              <td className='p-2'>
                <button onClick={() => toggle(n.id)} className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Toggle</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
