'use client';

import { useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState([
    { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'User', plan: 'Free', credits: 500 },
    { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'Pro', plan: 'Pro', credits: 2000 }
  ]);

  const handleEdit = (id, field, value) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciar Usuários</h1>
      <table className='w-full bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-3'>Nome</th>
            <th className='p-3'>Email</th>
            <th className='p-3'>Role</th>
            <th className='p-3'>Plano</th>
            <th className='p-3'>Créditos</th>
            <th className='p-3'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className='border-t'>
              <td className='p-3'><input value={user.name} onChange={(e) => handleEdit(user.id, 'name', e.target.value)} /></td>
              <td className='p-3'><input value={user.email} onChange={(e) => handleEdit(user.id, 'email', e.target.value)} /></td>
              <td className='p-3'>
                <select value={user.role} onChange={(e) => handleEdit(user.id, 'role', e.target.value)}>
                  <option>User</option>
                  <option>Pro</option>
                  <option>Admin</option>
                </select>
              </td>
              <td className='p-3'>{user.plan}</td>
              <td className='p-3'><input type='number' value={user.credits} onChange={(e) => handleEdit(user.id, 'credits', e.target.value)} /></td>
              <td className='p-3'><button className='bg-red-500 text-white px-2 py-1 rounded'>Suspender</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className='mt-4 bg-blue-500 text-white px-4 py-2 rounded'>Salvar Mudanças</button>
    </div>
  );
}
