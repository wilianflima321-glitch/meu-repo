'use client';

/**
 * Dialogue Editor Page
 * Editor de diálogos com árvores de conversação
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const DialogueEditor = dynamic(
  () => import('@/components/narrative/DialogueEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Dialogue Editor...</div>
        </div>
      </div>
    )
  }
);

export default function DialogueEditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <DialogueEditor />
      </Suspense>
    </div>
  );
}
