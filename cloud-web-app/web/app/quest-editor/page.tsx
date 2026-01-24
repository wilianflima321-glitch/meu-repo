'use client';

/**
 * Quest Editor Page
 * Editor de missões e objetivos de gameplay
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const QuestEditor = dynamic(
  () => import('@/components/narrative/QuestEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Quest Editor...</div>
        </div>
      </div>
    )
  }
);

export default function QuestEditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <QuestEditor />
      </Suspense>
    </div>
  );
}
