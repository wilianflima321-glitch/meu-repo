'use client';

import React, { useState } from 'react';

export default function AIAgentsPage() {
  const [agents, setAgents] = useState([
    { id: 1, name: 'Code Reviewer', description: 'Revisa código automaticamente', status: 'Active' },
    { id: 2, name: 'Data Analyzer', description: 'Analisa datasets', status: 'Inactive' }
  ]);

  const [newAgent, setNewAgent] = useState({ name: '', description: '', prompt: '' });

  const handleCreate = () => {
    if (newAgent.name && newAgent.description) {
      setAgents([...agents, {
        id: agents.length + 1,
        name: newAgent.name,
        description: newAgent.description,
        status: 'Inactive'
      }]);
      setNewAgent({ name: '', description: '', prompt: '' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Agent Workflows</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Agente</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nome do Agente"
            value={newAgent.name}
            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
            className="border p-2 w-full"
          />
          <textarea
            placeholder="Descrição"
            value={newAgent.description}
            onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
            className="border p-2 w-full"
            rows={3}
          />
          <textarea
            placeholder="Prompt Customizado"
            value={newAgent.prompt}
            onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
            className="border p-2 w-full"
            rows={5}
          />
          <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded">Criar Agente</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Agentes Existentes</h2>
        <ul>
          {agents.map(agent => (
            <li key={agent.id} className="flex justify-between items-center p-2 border-b">
              <div>
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded">{agent.status}</span>
                <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Editar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
