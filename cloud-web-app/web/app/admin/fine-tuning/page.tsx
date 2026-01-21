'use client';

import React, { useCallback, useEffect, useState } from 'react';

type Dataset = {
  id: string;
  name: string;
  size: number;
  status: string;
  contentType?: string | null;
};

type Job = {
  id: string;
  status: string;
  epochs: number;
  learningRate: number;
  dataset: Dataset;
  createdAt: string;
};

export default function FineTuningPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newDataset, setNewDataset] = useState<{ name: string; file: File | null }>({ name: '', file: null });
  const [selectedDataset, setSelectedDataset] = useState('');
  const [epochs, setEpochs] = useState(5);
  const [learningRate, setLearningRate] = useState(0.001);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDatasets = useCallback(async () => {
    const res = await fetch('/api/admin/fine-tuning/datasets');
    if (!res.ok) throw new Error('Falha ao carregar conjuntos de dados');
    const json = await res.json();
    setDatasets(json.items || []);
  }, []);

  const fetchJobs = useCallback(async () => {
    const res = await fetch('/api/admin/fine-tuning/jobs');
    if (!res.ok) throw new Error('Falha ao carregar tarefas');
    const json = await res.json();
    setJobs(json.items || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchDatasets(), fetchJobs()]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchDatasets, fetchJobs]);

  const handleUpload = async () => {
    if (!newDataset.name || !newDataset.file) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/fine-tuning/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDataset.name,
          size: newDataset.file.size,
          contentType: newDataset.file.type || 'application/octet-stream',
        }),
      });
      if (!res.ok) throw new Error('Falha ao criar conjunto de dados');
      const json = await res.json();
      const dataset = json.dataset as Dataset;
      const uploadUrl = json.uploadUrl as string | null;

      if (uploadUrl) {
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': newDataset.file.type || 'application/octet-stream' },
          body: newDataset.file,
        });
        if (!uploadRes.ok) throw new Error('Falha no upload do arquivo');

        await fetch('/api/admin/fine-tuning/datasets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dataset.id, status: 'uploaded' }),
        });
        setMessage('Conjunto de dados enviado com sucesso.');
      } else {
        setMessage('Storage indisponível. Conjunto de dados registrado, envio pendente.');
      }

      setNewDataset({ name: '', file: null });
      await fetchDatasets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDataset) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/fine-tuning/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: selectedDataset, epochs, learningRate }),
      });
      if (!res.ok) throw new Error('Falha ao iniciar treinamento');
      setMessage('Tarefa de ajuste fino criada.');
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar treinamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ajuste fino detalhado</h1>
          <p className="text-sm text-gray-500">Pipeline de conjuntos de dados e tarefas com auditoria.</p>
        </div>
        <button onClick={() => Promise.all([fetchDatasets(), fetchJobs()])} className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm">Atualizar</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4">{message}</div>}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Envio de conjunto de dados</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nome do conjunto de dados"
            value={newDataset.name}
            onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
            className="border p-2 flex-1"
          />
          <input
            type="file"
            onChange={(e) => {
              const files = (e.target as HTMLInputElement).files;
              setNewDataset({ ...newDataset, file: files && files[0] ? files[0] : null });
            }}
            className="border p-2"
          />
          <button onClick={handleUpload} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">Enviar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurações de treinamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Conjunto de dados</label>
            <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} className="border p-2 w-full">
              <option value="">Selecione</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Épocas</label>
            <input type="number" value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Taxa de aprendizado</label>
            <input type="number" step="0.001" value={learningRate} onChange={(e) => setLearningRate(Number(e.target.value))} className="border p-2 w-full" />
          </div>
        </div>
        <button onClick={handleStartTraining} disabled={loading || !selectedDataset} className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Iniciar treinamento</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Conjuntos de dados carregados</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando conjuntos de dados...</p>
        ) : (
          <ul>
            {datasets.map(dataset => (
              <li key={dataset.id} className="flex justify-between items-center p-2 border-b">
                <span>{dataset.name} - {(dataset.size / 1024 / 1024).toFixed(1)}MB</span>
                <span className="px-2 py-1 rounded text-xs bg-gray-100">{dataset.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Tarefas recentes</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma tarefa encontrada.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded p-3">
                <div className="font-medium">{job.dataset?.name || 'Conjunto de dados'}</div>
                <div className="text-sm text-gray-600">Status: {job.status} • Épocas: {job.epochs} • Taxa: {job.learningRate}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
