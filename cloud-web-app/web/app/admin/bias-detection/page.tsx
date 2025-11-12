'use client';

import React, { useState } from 'react';

export default function BiasDetectionPage() {
  const [outputs, setOutputs] = useState([
    { id: 1, text: 'Sample output 1', biasScore: 0.2, status: 'Low Bias' },
    { id: 2, text: 'Sample output 2', biasScore: 0.8, status: 'High Bias' }
  ]);

  const [newOutput, setNewOutput] = useState('');

  const handleAnalyze = () => {
    if (newOutput) {
      const biasScore = Math.random(); // Simulate bias detection
      const status = biasScore > 0.7 ? 'High Bias' : biasScore > 0.4 ? 'Medium Bias' : 'Low Bias';
      setOutputs([...outputs, {
        id: outputs.length + 1,
        text: newOutput,
        biasScore: biasScore,
        status: status
      }]);
      setNewOutput('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bias Detection e Ética</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Auditar Output da IA</h2>
        <div className="space-y-4">
          <textarea
            placeholder="Cole o output da IA aqui para auditoria"
            value={newOutput}
            onChange={(e) => setNewOutput(e.target.value)}
            className="border p-2 w-full"
            rows={5}
          />
          <button onClick={handleAnalyze} className="bg-blue-500 text-white px-4 py-2 rounded">Analisar Bias</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Relatórios Éticos</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Total Audits</h3>
            <p className="text-2xl font-bold text-blue-600">{outputs.length}</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">High Bias</h3>
            <p className="text-2xl font-bold text-red-600">{outputs.filter(o => o.status === 'High Bias').length}</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Low Bias</h3>
            <p className="text-2xl font-bold text-green-600">{outputs.filter(o => o.status === 'Low Bias').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Outputs Auditados</h2>
        <ul>
          {outputs.map(output => (
            <li key={output.id} className="p-4 border-b">
              <p className="mb-2">{output.text}</p>
              <div className="flex justify-between items-center">
                <span>Bias Score: {(output.biasScore * 100).toFixed(1)}%</span>
                <span className="px-2 py-1 rounded">{output.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
