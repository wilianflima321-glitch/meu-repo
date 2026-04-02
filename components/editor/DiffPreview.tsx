import React from 'react';

export function DiffPreview({ diff, onApply, onReject }: any) {
  return (
    <div className="border rounded p-3 bg-neutral-900 text-white">
      <div className="mb-2 text-sm opacity-70">Proposed Changes</div>
      <pre className="text-xs overflow-auto max-h-64">{diff}</pre>
      <div className="flex gap-2 mt-3">
        <button onClick={onApply} className="px-3 py-1 bg-green-600 rounded">Apply</button>
        <button onClick={onReject} className="px-3 py-1 bg-red-600 rounded">Reject</button>
      </div>
    </div>
  );
}
