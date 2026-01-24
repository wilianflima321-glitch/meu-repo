'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AETHEL_COLORS } from '@/lib/design/aethel-design-system';

const VFXGraphEditor = dynamic(
  () => import('@/components/editors/VFXGraphEditor').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: AETHEL_COLORS.bg.deep 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: `4px solid ${AETHEL_COLORS.accent.secondary[500]}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div style={{ color: 'white', fontSize: '20px' }}>Loading VFX Graph Editor...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
);

export default function VFXEditorPage() {
  return (
    <Suspense fallback={<div style={{ background: 'black', height: '100vh' }} />}>
      <VFXGraphEditor />
    </Suspense>
  );
}
