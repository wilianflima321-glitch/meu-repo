'use client';

import React, { useCallback, useEffect, useState } from 'react';

type Workflow = {
  id: string;
  title: string;
  userEmail: string;
  projectName: string | null;
  updatedAt: string;
  lastUsedAt: string | null;
};

export default function AIAgentsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/agents');
      if (!res.ok) throw new Error('Falha ao carregar fluxos');
      const data = await res.json();
      setWorkflows(Array.isArray(data?.workflows) ? data.workflows : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fluxos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const projects = Array.from(
    new Set(workflows.map((workflow) => workflow.projectName || 'Sem projeto'))
  ).sort();

  const filteredWorkflows = workflows.filter((workflow) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      workflow.title.toLowerCase().includes(term) ||
      workflow.userEmail.toLowerCase().includes(term);
    const projectName = workflow.projectName || 'Sem projeto';
    const matchesProject = projectFilter === 'all' || projectFilter === projectName;
    return matchesSearch && matchesProject;
  });

  const summary = {
    total: workflows.length,
    withProject: workflows.filter((workflow) => workflow.projectName).length,
    withoutProject: workflows.filter((workflow) => !workflow.projectName).length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fluxos de agentes de IA</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchWorkflows}
          className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Com projeto</h3>
          <p className="text-2xl font-bold text-green-600">{summary.withProject}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Sem projeto</h3>
          <p className="text-2xl font-bold text-gray-600">{summary.withoutProject}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por título ou responsável"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="all">Todos os projetos</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Fluxos ativos</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div>
            <p className="text-sm text-red-500">{error}</p>
            <button className="mt-3 bg-blue-500 text-white px-3 py-1 rounded" onClick={fetchWorkflows}>
              Tentar novamente
            </button>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum fluxo ativo encontrado.</p>
        ) : (
          <ul>
            {filteredWorkflows.map((workflow) => (
              <li key={workflow.id} className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 p-2 border-b">
                <div>
                  <h3 className="font-semibold">{workflow.title}</h3>
                  <p className="text-sm text-gray-600">Responsável: {workflow.userEmail}</p>
                  {workflow.projectName && (
                    <p className="text-xs text-gray-500">Projeto: {workflow.projectName}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Atualizado: {new Date(workflow.updatedAt).toLocaleString()}
                  {workflow.lastUsedAt && (
                    <div>Último uso: {new Date(workflow.lastUsedAt).toLocaleString()}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
