'use client';

import React, { useCallback, useEffect, useState } from 'react';

type RoleSummary = { role: string | null; count: number };

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [adminRoles, setAdminRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles');
      if (!res.ok) throw new Error('Falha ao carregar funções');
      const data = await res.json();
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setAdminRoles(Array.isArray(data?.adminRoles) ? data.adminRoles : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar funções');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const summary = {
    totalUsers: roles.reduce((sum, role) => sum + role.count, 0),
    totalAdmins: adminRoles.reduce((sum, role) => sum + role.count, 0),
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Funções e permissões detalhadas</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchRoles}
          className="px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Usuários totais</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.totalUsers}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Administradores totais</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.totalAdmins}</p>
        </div>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Distribuição de funções</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 bg-zinc-800/70 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma função encontrada.</p>
        ) : (
          <ul>
            {roles.map((role) => (
              <li key={role.role ?? 'unknown'} className="p-3 border-b flex justify-between">
                <span>{role.role ?? 'sem função'}</span>
                <span className="text-sm text-zinc-400">{role.count} usuários</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Funções administrativas</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-10 bg-zinc-800/70 rounded animate-pulse" />
            ))}
          </div>
        ) : adminRoles.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma função administrativa definida.</p>
        ) : (
          <ul>
            {adminRoles.map((role) => (
              <li key={role.role ?? 'admin-unknown'} className="p-3 border-b flex justify-between">
                <span>{role.role ?? 'sem função administrativa'}</span>
                <span className="text-sm text-zinc-400">{role.count} usuários</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
