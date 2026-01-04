'use client';

import { useState } from 'react';

/**
 * Admin Users - Gerenciamento de usuários
 * Planos alinhados com estratégia 2025 (sem Free)
 */
export default function AdminUsers() {
  const [users, setUsers] = useState([
    { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'User', plan: 'Starter', tokensUsed: 150000, tokensLimit: 500000 },
    { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'Pro', plan: 'Pro', tokensUsed: 3200000, tokensLimit: 8000000 },
    { id: 3, name: 'Pedro Costa', email: 'pedro@example.com', role: 'User', plan: 'Basic', tokensUsed: 800000, tokensLimit: 2000000 }
  ]);

  const handleEdit = (id: number, field: string, value: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
    return tokens.toString();
  };

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciar Usuários</h1>
      <table className='w-full bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-3'>Nome</th>
            <th className='p-3'>Email</th>
            <th className='p-3'>Role</th>
            <th className='p-3'>Plano</th>
            <th className='p-3'>Tokens Usados</th>
            <th className='p-3'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className='border-t'>
              <td className='p-3'><input value={user.name} onChange={(e) => handleEdit(user.id, 'name', e.target.value)} className='border rounded px-2 py-1' /></td>
              <td className='p-3'><input value={user.email} onChange={(e) => handleEdit(user.id, 'email', e.target.value)} className='border rounded px-2 py-1' /></td>
              <td className='p-3'>
                <select value={user.role} onChange={(e) => handleEdit(user.id, 'role', e.target.value)} className='border rounded px-2 py-1'>
                  <option>User</option>
                  <option>Pro</option>
                  <option>Admin</option>
                </select>
              </td>
              <td className='p-3'>
                <select value={user.plan} onChange={(e) => handleEdit(user.id, 'plan', e.target.value)} className='border rounded px-2 py-1'>
                  <option>Starter</option>
                  <option>Basic</option>
                  <option>Pro</option>
                  <option>Studio</option>
                  <option>Enterprise</option>
                </select>
              </td>
              <td className='p-3'>
                <span className={`px-2 py-1 rounded text-sm ${
                  user.tokensUsed / user.tokensLimit > 0.9 ? 'bg-red-100 text-red-800' :
                  user.tokensUsed / user.tokensLimit > 0.7 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {formatTokens(user.tokensUsed)} / {formatTokens(user.tokensLimit)}
                </span>
              </td>
              <td className='p-3'>
                <button className='bg-blue-500 text-white px-2 py-1 rounded mr-2'>Editar</button>
                <button className='bg-red-500 text-white px-2 py-1 rounded'>Suspender</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
