'use client';

import { useState } from 'react';

export default function Automation() {
  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'Suspender Usuários Inativos', trigger: 'Inativo > 30 dias', action: 'Suspender', active: true },
    { id: 2, name: 'Notificar Atualizações', trigger: 'Nova versão IA', action: 'Enviar Email', active: false },
  ]);

  const toggle = (id) => {
    setWorkflows(workflows.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Automação de Workflows</h1>
      <p className='mb-4 text-gray-600'>Crie regras automáticas para tarefas repetitivas, como suspensões ou notificações.</p>

      <div className='mb-6'>
        <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Novo Workflow</button>
      </div>

      <table className='w-full table-auto'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>Nome</th>
            <th className='p-2'>Trigger</th>
            <th className='p-2'>Ação</th>
            <th className='p-2'>Ativo</th>
            <th className='p-2'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((w) => (
            <tr key={w.id}>
              <td className='p-2'>{w.name}</td>
              <td className='p-2'>{w.trigger}</td>
              <td className='p-2'>{w.action}</td>
              <td className='p-2'>{w.active ? 'Sim' : 'Não'}</td>
              <td className='p-2'>
                <button onClick={() => toggle(w.id)} className='px-2 py-1 bg-yellow-500 text-white rounded mr-2'>Toggle</button>
                <button className='px-2 py-1 bg-red-500 text-white rounded'>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
