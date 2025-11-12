'use client';

import { useState } from 'react';
import { demoCreateGame } from '../../lib/api-client';

export default function AIDemoPage() {
  const [title, setTitle] = useState('Aethel Chronicles');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDemo = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await demoCreateGame(title, 'rpg');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Orchestration Demo</h1>
      <div className="flex gap-2 mb-4">
        <input className="border px-2 py-1 rounded flex-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button onClick={runDemo} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded">
          {loading ? 'Gerando...' : 'Criar Jogo Demo'}
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {result && (
        <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
