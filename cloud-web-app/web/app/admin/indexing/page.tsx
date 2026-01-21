'use client';

import React, { useCallback, useEffect, useState } from 'react';

type FileEntry = { id: string; name: string; path: string; indexed: boolean; context: string; size: number };

export default function IndexingPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [depthLevel, setDepthLevel] = useState(3);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/admin/indexing${query}`);
      if (!res.ok) throw new Error('Falha ao carregar indexação');
      const json = await res.json();
      setFiles(json.files || []);
      setDepthLevel(json.config?.depthLevel ?? 3);
      setMaxFileSizeMb(json.config?.maxFileSizeMb ?? 10);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar indexação');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateConfig = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/indexing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depthLevel, maxFileSizeMb }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar configuração');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
    } finally {
      setSaving(false);
    }
  };

  const toggleIndex = async (file: FileEntry) => {
    try {
      const res = await fetch('/api/admin/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, indexed: !file.indexed, context: file.context }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar indexação');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar indexação');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Indexação avançada</h1>
          <p className="text-sm text-gray-500">Controle de indexação RAG com auditoria.</p>
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm">Atualizar</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Busca no projeto</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Buscar por arquivo ou contexto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 flex-1"
          />
          <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded">Buscar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurações de contexto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Nível de profundidade</label>
            <input type="number" value={depthLevel} onChange={(e) => setDepthLevel(Number(e.target.value))} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Tamanho máximo (MB)</label>
            <input type="number" value={maxFileSizeMb} onChange={(e) => setMaxFileSizeMb(Number(e.target.value))} className="border p-2 w-full" />
          </div>
        </div>
        <button onClick={updateConfig} disabled={saving} className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {saving ? 'Salvando...' : 'Atualizar configurações'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Arquivos Indexados</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando arquivos...</p>
        ) : (
          <ul>
            {files.map(file => (
              <li key={file.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <h3 className="font-semibold">{file.name}</h3>
                  <p className="text-sm text-gray-600">{file.path}</p>
                  <p className="text-sm">{file.context || 'Sem contexto'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs bg-gray-100">{file.indexed ? 'Indexado' : 'Não Indexado'}</span>
                  <button onClick={() => toggleIndex(file)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Alternar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
