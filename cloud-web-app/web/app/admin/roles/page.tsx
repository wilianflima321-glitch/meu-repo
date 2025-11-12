'use client';

import React, { useState } from 'react';

export default function RolesPage() {
  type Role = { id: number; name: string; permissions: string[]; users: number };
  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: 'Admin', permissions: ['all'], users: 5 },
    { id: 2, name: 'Editor', permissions: ['edit_ai', 'view_ide'], users: 20 },
    { id: 3, name: 'Viewer', permissions: ['view_only'], users: 100 }
  ]);

  const [newRole, setNewRole] = useState<{ name: string; permissions: string[] }>({ name: '', permissions: [] });

  const permissionsList: string[] = ['all', 'edit_ai', 'view_ide', 'manage_users', 'view_only'];

  const handleCreate = () => {
    if (newRole.name) {
      setRoles([...roles, {
        id: roles.length + 1,
        name: newRole.name,
        permissions: newRole.permissions,
        users: 0
      }]);
      setNewRole({ name: '', permissions: [] });
    }
  };

  const togglePermission = (perm: string) => {
    setNewRole({
      ...newRole,
      permissions: newRole.permissions.includes(perm)
        ? newRole.permissions.filter(p => p !== perm)
        : [...newRole.permissions, perm]
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Roles e Permissões Detalhadas</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Role</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nome do Role"
            value={newRole.name}
            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            className="border p-2 w-full"
          />
          <div>
            <label className="block text-sm font-medium mb-2">Permissões</label>
            <div className="grid grid-cols-2 gap-2">
              {permissionsList.map(perm => (
                <label key={perm} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="mr-2"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded">Criar Role</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Roles Existentes</h2>
        <ul>
          {roles.map(role => (
            <li key={role.id} className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{role.name}</h3>
                <span className="text-sm text-gray-600">{role.users} usuários</span>
              </div>
              <div>
                <strong>Permissões:</strong> {role.permissions.join(', ')}
              </div>
              <button className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-sm">Editar</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
