'use client';

import GitPanel from '../../components/GitPanel';

export default function GitPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Git Integration</h1>
      <GitPanel />
    </div>
  );
}
