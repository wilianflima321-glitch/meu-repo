import React, { useState } from 'react';
import { DiffPreview } from '../editor/DiffPreview';

export function AIExecutionPanel({ runAgent }: any) {
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<string | null>(null);

  async function handleRun(prompt: string) {
    setLoading(true);
    const result = await runAgent({ goal: prompt });
    setDiff(result?.diff || null);
    setLoading(false);
  }

  return (
    <div className="p-4 border-l bg-neutral-950 text-white w-full">
      <input
        placeholder="Ask AI to modify your code..."
        className="w-full p-2 bg-neutral-800 rounded"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleRun((e.target as HTMLInputElement).value);
          }
        }}
      />

      {loading && <div className="mt-3 text-sm opacity-70">Running agent...</div>}

      {diff && (
        <div className="mt-4">
          <DiffPreview
            diff={diff}
            onApply={() => console.log('apply')}
            onReject={() => setDiff(null)}
          />
        </div>
      )}
    </div>
  );
}
