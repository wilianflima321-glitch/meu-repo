'use client';

/**
 * Level Editor Page
 * Página do editor de levels integrado
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import para evitar problemas de SSR com Three.js
const LevelEditor = dynamic(
  () => import('@/components/engine/LevelEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando editor de níveis...</div>
        </div>
      </div>
    )
  }
);

export default function LevelEditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <LevelEditor />
      </Suspense>
    </div>
  );
}
