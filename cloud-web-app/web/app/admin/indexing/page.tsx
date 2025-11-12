'use client';

import React, { useState } from 'react';

export default function IndexingPage() {
  type FileEntry = { id: number; name: string; path: string; indexed: boolean; context: string };
  const [files, setFiles] = useState<FileEntry[]>([
    { id: 1, name: 'main.py', path: '/project/src/main.py', indexed: true, context: 'Function definitions' },
    { id: 2, name: 'utils.js', path: '/project/utils.js', indexed: false, context: 'Helper functions' }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);

  const handleSearch = () => {
    if (searchQuery) {
      const results = files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.context.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    }
  };

  const toggleIndex = (id: number) => {
    setFiles(files.map(file => 
      file.id === id ? { ...file, indexed: !file.indexed } : file
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Indexing Avançado</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Busca Projeto-Wide</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Buscar por arquivo ou contexto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 flex-1"
          />
          <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded">Buscar</button>
        </div>
        {searchResults.length > 0 && (
          <ul className="mt-4">
            {searchResults.map(result => (
              <li key={result.id} className="p-2 border-b">
                <strong>{result.name}</strong> - {result.path} ({result.context})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurações de Context Awareness</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Depth Level</label>
            <input type="number" defaultValue={3} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Max File Size</label>
            <input type="text" defaultValue="10MB" className="border p-2 w-full" />
          </div>
        </div>
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">Atualizar Configurações</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Arquivos Indexados</h2>
        <ul>
          {files.map(file => (
            <li key={file.id} className="flex justify-between items-center p-2 border-b">
              <div>
                <h3 className="font-semibold">{file.name}</h3>
                <p className="text-sm text-gray-600">{file.path}</p>
                <p className="text-sm">{file.context}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded">{file.indexed ? 'Indexado' : 'Não Indexado'}</span>
                <button onClick={() => toggleIndex(file.id)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Toggle</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
