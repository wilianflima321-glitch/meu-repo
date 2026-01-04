'use client';

/**
 * Blueprint Editor Page
 * Página do editor de blueprints
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import para evitar problemas de SSR com ReactFlow
const BlueprintEditor = dynamic(
  () => import('@/components/engine/BlueprintEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Loading Blueprint Editor...</div>
        </div>
      </div>
    )
  }
);

export default function BlueprintEditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Loading...</div>
        </div>
      }>
        <BlueprintEditor />
      </Suspense>
    </div>
  );
}
