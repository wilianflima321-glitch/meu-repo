'use client';

/**
 * Cloth Simulation Editor Page
 * Editor de simulação de tecidos com física realista
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

const ClothSimulationEditor = dynamic(
  () => import('@/components/physics/ClothSimulationEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Cloth Simulation Editor...</div>
        </div>
      </div>
    )
  }
);

export default function ClothEditorPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="studio">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <ClothSimulationEditor />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
