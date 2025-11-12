'use client';

import React, { useState } from 'react';

export default function FineTuningPage() {
  const [datasets, setDatasets] = useState([
    { id: 1, name: 'Dataset 1', size: '10MB', status: 'Uploaded' },
    { id: 2, name: 'Dataset 2', size: '25MB', status: 'Processing' }
  ]);

  const [newDataset, setNewDataset] = useState<{ name: string; file: File | null }>({ name: '', file: null });

  const handleUpload = () => {
    if (newDataset.name && newDataset.file) {
      setDatasets([...datasets, {
        id: datasets.length + 1,
        name: newDataset.name,
        size: `${Math.round(newDataset.file.size / 1024 / 1024)}MB`,
        status: 'Uploaded'
      }]);
      setNewDataset({ name: '', file: null });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fine-Tuning Detalhado</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload de Dataset</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nome do Dataset"
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
          <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded">Upload</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurações de Treino</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Epochs</label>
            <input type="number" defaultValue={5} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Learning Rate</label>
            <input type="number" step="0.001" defaultValue={0.001} className="border p-2 w-full" />
          </div>
        </div>
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">Iniciar Treino</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Datasets Carregados</h2>
        <ul>
          {datasets.map(dataset => (
            <li key={dataset.id} className="flex justify-between items-center p-2 border-b">
              <span>{dataset.name} - {dataset.size}</span>
              <span className="px-2 py-1 rounded">{dataset.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
