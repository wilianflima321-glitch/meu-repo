'use client';

import React, { useCallback, useEffect, useState } from 'react';

/**
 * Rate Limiting Admin - Alinhado com planos 2025
 * Sem plano Free - todos os planos são pagos
 */
export default function RateLimitingPage() {
  const [limits, setLimits] = useState<Array<{
    name: string;
    algorithm: string;
    limit: number;
    window: number;
    identifier: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rate-limits');
      if (!res.ok) throw new Error('Falha ao carregar limites');
      const data = await res.json();
      setLimits(Array.isArray(data?.configs) ? data.configs : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar limites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const filteredLimits = limits.filter((limit) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      limit.name.toLowerCase().includes(term) ||
      limit.identifier.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Limitação global de taxa da API</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchLimits}
          className="px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-4 flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou identificador"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <span className="text-xs text-zinc-500">{filteredLimits.length} regras</span>
      </div>
      
      <div className="bg-zinc-900/70 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Limites ativos</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando limites...</p>
        ) : error ? (
          <div>
            <p className="text-sm text-red-500">{error}</p>
            <button className="mt-3 bg-blue-500 text-white px-3 py-1 rounded" onClick={fetchLimits}>
              Tentar novamente
            </button>
          </div>
        ) : filteredLimits.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma configuração disponível.</p>
        ) : (
          <ul>
            {filteredLimits.map((limit) => (
              <li key={limit.name} className="p-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{limit.name}</h3>
                    <p className="text-xs text-zinc-500">Algoritmo: {limit.algorithm} • Identificador: {limit.identifier}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-sm bg-zinc-800/70">
                      {limit.limit} requisições / {limit.window}s
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(limit.identifier)}
                      className="px-3 py-1 rounded text-xs bg-zinc-800/70 text-zinc-300"
                    >
                      Copiar ID
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
