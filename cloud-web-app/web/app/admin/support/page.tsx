'use client';

import { useState } from 'react';

export default function Support() {
  const [tickets, setTickets] = useState([
    { id: 1, user: 'user1@example.com', issue: 'Problema com login', status: 'Open' },
    { id: 2, user: 'user2@example.com', issue: 'IA não responde', status: 'Resolved' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Suporte ao Usuário</h1>
      <p className='mb-4 text-gray-600'>Gerencie tickets, chat e notificações para usuários.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Novo Ticket</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>ID</th>
            <th className='p-2'>Usuário</th>
            <th className='p-2'>Problema</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td className='p-2'>{t.id}</td>
              <td className='p-2'>{t.user}</td>
              <td className='p-2'>{t.issue}</td>
              <td className='p-2'>{t.status}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Responder</button>
                <button className='px-2 py-1 bg-green-500 text-white rounded'>Resolver</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
