'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Users, XCircle } from 'lucide-react';

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

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
      if (!res.ok) throw new Error('Failed to load fluxos');
      const data = await res.json();
      setWorkflows(Array.isArray(data?.workflows) ? data.workflows : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading fluxos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const projects = Array.from(
    new Set(workflows.map((workflow) => workflow.projectName || 'No project'))
  ).sort();

  const filteredWorkflows = workflows.filter((workflow) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      workflow.title.toLowerCase().includes(term) ||
      workflow.userEmail.toLowerCase().includes(term);
    const projectName = workflow.projectName || 'No project';
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
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button type="button"
          onClick={fetchWorkflows}
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
            icon: Users,
            label: 'Total de fluxos',
            value: summary.total,
          },
          {
            icon: CheckCircle,
            label: 'With project',
            value: summary.withProject,
            tone: 'success',
          },
          {
            icon: XCircle,
            label: 'No project',
            value: summary.withoutProject,
            tone: 'warning',
          },
        ]}
      />

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Search by title or owner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Fluxos assets</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div>
            <p className="text-sm text-[var(--aethel-error)]">{error}</p>
            <button type="button" className="mt-3 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] px-3 py-1 rounded" onClick={fetchWorkflows}>
              Tentar novamente
            </button>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">No active flow found.</p>
        ) : (
          <ul>
            {filteredWorkflows.map((workflow) => (
              <li key={workflow.id} className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 p-2 border-b">
                <div>
                  <h3 className="font-semibold">{workflow.title}</h3>
                  <p className="text-sm text-[var(--aethel-text-secondary)]">Owner: {workflow.userEmail}</p>
                  {workflow.projectName && (
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">Project: {workflow.projectName}</p>
                  )}
                </div>
                <div className="text-xs text-[var(--aethel-text-tertiary)]">
                  Atualizado: {new Date(workflow.updatedAt).toLocaleString()}
                  {workflow.lastUsedAt && (
                    <div>Last used: {new Date(workflow.lastUsedAt).toLocaleString()}</div>
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
