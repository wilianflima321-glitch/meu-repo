'use client';

/**
 * Terrain Sculpting Editor Page
 * Editor avançado de escultura de terrenos
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

const TerrainSculptingEditor = dynamic(
  () => import('@/components/terrain/TerrainSculptingEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Terrain Sculpting Editor...</div>
        </div>
      </div>
    )
  }
);

export default function TerrainSculptingPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="pro">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <TerrainSculptingEditor />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
