'use client';

import React, { useState } from 'react';

export default function RateLimitingPage() {
  const [limits, setLimits] = useState([
    { id: 1, endpoint: '/api/generate', plan: 'Free', requestsPerMinute: 10, currentUsage: 8 },
    { id: 2, endpoint: '/api/generate', plan: 'Pro', requestsPerMinute: 100, currentUsage: 45 },
    { id: 3, endpoint: '/api/chat', plan: 'Enterprise', requestsPerMinute: 1000, currentUsage: 200 }
  ]);

  const [newLimit, setNewLimit] = useState({ endpoint: '', plan: 'Free', requestsPerMinute: '' });

  const handleCreate = () => {
    if (newLimit.endpoint && newLimit.requestsPerMinute) {
      setLimits([...limits, {
        id: limits.length + 1,
        endpoint: newLimit.endpoint,
        plan: newLimit.plan,
        requestsPerMinute: parseInt(newLimit.requestsPerMinute),
        currentUsage: 0
      }]);
      setNewLimit({ endpoint: '', plan: 'Free', requestsPerMinute: '' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Rate Limiting Global</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurar Novo Limite</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Endpoint (ex: /api/generate)"
            value={newLimit.endpoint}
            onChange={(e) => setNewLimit({ ...newLimit, endpoint: e.target.value })}
            className="border p-2"
          />
          <select
            value={newLimit.plan}
            onChange={(e) => setNewLimit({ ...newLimit, plan: e.target.value })}
            className="border p-2"
          >
            <option value="Free">Free</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <input
            type="number"
            placeholder="Requests/Minute"
            value={newLimit.requestsPerMinute}
            onChange={(e) => setNewLimit({ ...newLimit, requestsPerMinute: e.target.value })}
            className="border p-2"
          />
          <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded col-span-3">Configurar Limite</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Limites Ativos</h2>
        <ul>
          {limits.map(limit => (
            <li key={limit.id} className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{limit.endpoint} - {limit.plan}</h3>
                <span className="px-2 py-1 rounded">
                  {limit.currentUsage}/{limit.requestsPerMinute}/min
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(limit.currentUsage / limit.requestsPerMinute) * 100}%` }}
                ></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
