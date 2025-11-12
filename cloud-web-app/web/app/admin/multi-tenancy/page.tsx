'use client';

import React, { useState } from 'react';

export default function MultiTenancyPage() {
  const [tenants, setTenants] = useState([
    { id: 1, name: 'Empresa A', domain: 'empresaA.aethel.com', users: 150, storage: '500GB', status: 'Active' },
    { id: 2, name: 'Empresa B', domain: 'empresaB.aethel.com', users: 75, storage: '250GB', status: 'Inactive' },
    { id: 3, name: 'Empresa C', domain: 'empresaC.aethel.com', users: 300, storage: '1TB', status: 'Active' }
  ]);

  const [newTenant, setNewTenant] = useState({ name: '', domain: '', storage: '' });

  const handleCreate = () => {
    if (newTenant.name && newTenant.domain) {
      setTenants([...tenants, {
        id: tenants.length + 1,
        name: newTenant.name,
        domain: newTenant.domain,
        users: 0,
        storage: newTenant.storage || '100GB',
        status: 'Active'
      }]);
      setNewTenant({ name: '', domain: '', storage: '' });
    }
  };

  const toggleStatus = (id) => {
    setTenants(tenants.map(tenant => 
      tenant.id === id ? { ...tenant, status: tenant.status === 'Active' ? 'Inactive' : 'Active' } : tenant
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Multi-Tenancy</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Tenant</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nome da Empresa"
            value={newTenant.name}
            onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Domínio Customizado"
            value={newTenant.domain}
            onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Storage (ex: 100GB)"
            value={newTenant.storage}
            onChange={(e) => setNewTenant({ ...newTenant, storage: e.target.value })}
            className="border p-2"
          />
          <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded col-span-3">Criar Tenant</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Tenants Existentes</h2>
        <ul>
          {tenants.map(tenant => (
            <li key={tenant.id} className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{tenant.name}</h3>
                <span className="px-2 py-1 rounded">{tenant.status}</span>
              </div>
              <p className="text-sm text-gray-600">Domínio: {tenant.domain}</p>
              <p className="text-sm text-gray-600">Usuários: {tenant.users} | Storage: {tenant.storage}</p>
              <button onClick={() => toggleStatus(tenant.id)} className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-sm">Toggle Status</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
