'use client';

import { useCallback, useEffect, useState } from 'react';

type ProjectItem = {
  id: string;
  name: string;
  members: number;
  status: string;
  updatedAt: string;
};

export default function Collaboration() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusLabels: Record<string, string> = {
    active: 'Ativo',
    paused: 'Pausado',
    archived: 'Arquivado',
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/collaboration');
      if (!res.ok) throw new Error('Falha ao carregar projetos');
      const json = await res.json();
      setProjects(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateStatus = async (projectId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, status }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Colaboração e Projetos</h1>
          <p className='text-sm text-gray-500'>Governança de projetos e colaboração com auditoria.</p>
        </div>
        <button onClick={fetchProjects} className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'>Atualizar</button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <table className='w-full table-auto bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2 text-left'>Nome</th>
            <th className='p-2 text-left'>Membros</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Atualizado</th>
            <th className='p-2 text-left'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Carregando projetos...</td>
            </tr>
          ) : projects.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Nenhum projeto encontrado.</td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr key={p.id} className='border-t'>
                <td className='p-2'>{p.name}</td>
                <td className='p-2'>{p.members}</td>
                <td className='p-2'>
                  <span className='text-xs px-2 py-1 rounded bg-gray-100 text-gray-600'>
                    {statusLabels[p.status] ?? p.status}
                  </span>
                </td>
                <td className='p-2'>{new Date(p.updatedAt).toLocaleString()}</td>
                <td className='p-2'>
                  {p.status === 'active' ? (
                    <button onClick={() => updateStatus(p.id, 'paused')} className='px-2 py-1 bg-red-500 text-white rounded text-sm'>Suspender</button>
                  ) : (
                    <button onClick={() => updateStatus(p.id, 'active')} className='px-2 py-1 bg-green-500 text-white rounded text-sm'>Reativar</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
