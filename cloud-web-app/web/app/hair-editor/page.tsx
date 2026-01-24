'use client';

/**
 * Hair & Fur Editor Page
 * Editor de cabelo e pelos com simulação física
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

const HairFurEditor = dynamic(
  () => import('@/components/character/HairFurEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Hair & Fur Editor...</div>
        </div>
      </div>
    )
  }
);

export default function HairEditorPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="studio">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <HairFurEditor characterId="default-character" />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
