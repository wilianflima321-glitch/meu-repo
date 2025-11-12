'use client';

import { useState } from 'react';

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([
    { id: 1, user: 'user1@example.com', rating: 4, comment: 'Ótimo, mas IA poderia ser mais rápida.', category: 'IA' },
    { id: 2, user: 'user2@example.com', rating: 5, comment: 'IDE incrível!', category: 'IDE' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Coleta de Feedback</h1>
      <p className='mb-4 text-gray-600'>Analise feedback de usuários para melhorar o Aethel.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4'>Enviar Survey</button>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Exportar Relatório</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Usuário</th>
            <th className='p-2'>Rating</th>
            <th className='p-2'>Comentário</th>
            <th className='p-2'>Categoria</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((f) => (
            <tr key={f.id}>
              <td className='p-2'>{f.user}</td>
              <td className='p-2'>{f.rating}/5</td>
              <td className='p-2'>{f.comment}</td>
              <td className='p-2'>{f.category}</td>
              <td className='p-2'>
                <button className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Responder</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Arquivar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
