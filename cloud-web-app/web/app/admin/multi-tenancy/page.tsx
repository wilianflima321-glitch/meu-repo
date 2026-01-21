'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Tenant = {
  id: string;
  domain: string;
  users: number;
  storageBytes: number;
  lastActiveAt: string | null;
  status: 'active' | 'inactive';
};

function formatStorage(bytes: number) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function MultiTenancyPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/tenants');
      if (!res.ok) {
        throw new Error('Falha ao carregar tenants');
      }
      const data = await res.json();
      setTenants(Array.isArray(data?.tenants) ? data.tenants : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const summary = useMemo(() => {
    const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users, 0);
    const totalStorage = tenants.reduce((sum, tenant) => sum + tenant.storageBytes, 0);
    return { totalUsers, totalStorage };
  }, [tenants]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Multilocação</h1>
          <p className="text-sm text-gray-600">
            Visão por domínio (derivado de usuários reais). Gestão manual de locatários não está habilitada.
          </p>
        </div>
        <button
          onClick={fetchTenants}
          className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Locatários detectados</h3>
          <p className="text-2xl font-bold text-blue-600">{tenants.length}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Usuários totais</h3>
          <p className="text-2xl font-bold text-gray-700">{summary.totalUsers}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Armazenamento agregado</h3>
          <p className="text-2xl font-bold text-gray-700">{formatStorage(summary.totalStorage)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Locatários existentes</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando locatários...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum locatário encontrado.</p>
        ) : (
          <ul>
            {tenants.map((tenant) => (
              <li key={tenant.id} className="p-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{tenant.domain}</h3>
                    <p className="text-sm text-gray-600">
                      Usuários: {tenant.users} | Armazenamento: {formatStorage(tenant.storageBytes)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Última atividade: {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString() : 'N/D'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      tenant.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
