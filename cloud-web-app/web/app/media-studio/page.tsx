'use client';

/**
 * Media Studio Page
 * Estúdio completo de criação de mídia (áudio, vídeo, imagens)
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

const MediaStudio = dynamic(
  () => import('@/components/media/MediaStudio'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Media Studio...</div>
        </div>
      </div>
    )
  }
);

export default function MediaStudioPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="pro">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <MediaStudio />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
