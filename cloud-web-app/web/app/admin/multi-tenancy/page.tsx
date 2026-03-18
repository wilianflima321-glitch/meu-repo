'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, HardDrive, Users } from 'lucide-react';

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

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
          <p className="text-sm text-[var(--aethel-text-secondary)]">
            Visão por domínio (derivado de usuários reais). Gestão manual de locatários não está habilitada.
          </p>
        </div>
        <button
          onClick={fetchTenants}
          className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
        >
          Atualizar
        </button>
      </div>

      <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          {
            icon: Building2,
            label: 'Locat??rios detectados',
            value: tenants.length,
          },
          {
            icon: Users,
            label: 'Usu??rios totais',
            value: summary.totalUsers,
          },
          {
            icon: HardDrive,
            label: 'Armazenamento agregado',
            value: formatStorage(summary.totalStorage),
          },
        ]}
      />
        <div className="text-center">
          <h3 className="text-sm font-semibold">Usuários totais</h3>
          <p className="text-2xl font-bold text-[var(--aethel-text-secondary)]">{summary.totalUsers}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Armazenamento agregado</h3>
          <p className="text-2xl font-bold text-[var(--aethel-text-secondary)]">{formatStorage(summary.totalStorage)}</p>
        </div>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Locatários existentes</h2>
        {loading ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Carregando locatários...</p>
        ) : error ? (
          <p className="text-sm text-[var(--aethel-error)]">{error}</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhum locatário encontrado.</p>
        ) : (
          <ul>
            {tenants.map((tenant) => (
              <li key={tenant.id} className="p-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{tenant.domain}</h3>
                    <p className="text-sm text-[var(--aethel-text-secondary)]">
                      Usuários: {tenant.users} | Armazenamento: {formatStorage(tenant.storageBytes)}
                    </p>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">
                      Última atividade: {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString() : 'N/D'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      tenant.status === 'active'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
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
