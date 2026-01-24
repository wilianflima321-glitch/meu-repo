'use client';

/**
 * Sound Cue Editor Page
 * Editor de sound cues e áudio 3D
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const SoundCueEditor = dynamic(
  () => import('@/components/audio/SoundCueEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Sound Cue Editor...</div>
        </div>
      </div>
    )
  }
);

export default function SoundEditorPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <SoundCueEditor />
      </Suspense>
    </div>
  );
}
