'use client';

/**
 * Niagara VFX Editor Page
 * Página do editor de partículas Niagara
 * 
 * NOTA: Esta é uma feature Pro - requer plano Pro ou superior
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PremiumLock } from '@/components/billing/PremiumLock';

// Dynamic import para evitar problemas de SSR com ReactFlow/Three.js
const NiagaraVFX = dynamic(
  () => import('@/components/engine/NiagaraVFX'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando editor Niagara VFX...</div>
        </div>
      </div>
    )
  }
);

export default function NiagaraEditorPage() {
  return (
    <PremiumLock feature="agents" requiredPlan="pro">
      <div className="h-screen w-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <NiagaraVFX />
        </Suspense>
      </div>
    </PremiumLock>
  );
}
