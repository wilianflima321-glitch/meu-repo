'use client';

/**
 * Content Browser Page
 * Browser avançado de assets do projeto
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ContentBrowser = dynamic(
  () => import('@/components/assets/ContentBrowser'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Content Browser...</div>
        </div>
      </div>
    )
  }
);

export default function ContentBrowserPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <ContentBrowser />
      </Suspense>
    </div>
  );
}
