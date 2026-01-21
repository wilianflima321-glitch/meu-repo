'use client';

/**
 * Project Settings Page
 * Página de configurações do projeto
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import para consistência
const ProjectSettings = dynamic(
  () => import('@/components/engine/ProjectSettings'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando configurações do projeto...</div>
        </div>
      </div>
    )
  }
);

export default function ProjectSettingsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <ProjectSettings />
      </Suspense>
    </div>
  );
}
