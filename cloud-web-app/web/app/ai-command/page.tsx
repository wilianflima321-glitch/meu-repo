'use client';

import dynamic from 'next/dynamic';

// Dynamic import para evitar SSR issues com componentes que usam localStorage/window
const AICommandCenter = dynamic(
  () => import('@/components/ai/AICommandCenter'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Carregando AI Command Center...</p>
        </div>
      </div>
    ),
  }
);

export default function AICommandPage() {
  return (
    <div className="h-screen w-full">
      <AICommandCenter />
    </div>
  );
}
