'use client';

/**
 * Project Settings Page
 * Pagina de configuracoes do projeto
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import para consistencia
const ProjectSettings = dynamic(
  () => import('@/components/engine/ProjectSettings'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--aethel-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-[var(--aethel-text-primary)]">Loading project settings...</div>
        </div>
      </div>
    )
  }
);

export default function ProjectSettingsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
          <div className="text-[var(--aethel-text-primary)]">Loading...</div>
        </div>
      }>
        <ProjectSettings />
      </Suspense>
    </div>
  );
}
