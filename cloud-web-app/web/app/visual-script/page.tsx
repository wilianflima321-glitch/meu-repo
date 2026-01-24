'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with complex component
const VisualScriptEditor = dynamic(
  () => import('@/components/visual-scripting/VisualScriptEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-xl animate-pulse">
          Loading Visual Script Editor...
        </div>
      </div>
    ),
  }
);

export default function VisualScriptPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black"><span className="text-white">Loading...</span></div>}>
      <VisualScriptEditor />
    </Suspense>
  );
}
