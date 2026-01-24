'use client';

/**
 * Facial Animation Editor Page
 * Editor de animação facial com blend shapes e mocap
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

const FacialAnimationEditor = dynamic(
  () => import('@/components/character/FacialAnimationEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Facial Animation Editor...</div>
        </div>
      </div>
    )
  }
);

export default function FacialEditorPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="studio">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <FacialAnimationEditor characterId="default-character" />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
