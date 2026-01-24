'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MATERIAL EDITOR - Professional PBR Material Authoring
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Industry-leading material editor with node-based shader graph.
 * Superior to Unreal Material Editor, Unity Shader Graph, and Substance Designer.
 * 
 * @version 4.0.0 AAA
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AETHEL_COLORS, AETHEL_TYPOGRAPHY } from '@/lib/design/aethel-design-system';

const MaterialEditor = dynamic(
  () => import('@/components/materials/MaterialEditor'),
  { 
    ssr: false,
    loading: () => (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: AETHEL_COLORS.bg.deep,
        }}
      >
        {/* Animated Logo */}
        <div 
          style={{
            width: '80px',
            height: '80px',
            position: 'relative',
            marginBottom: '32px',
          }}
        >
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '16px',
              background: `linear-gradient(135deg, 
                ${AETHEL_COLORS.accent.primary[500]} 0%, 
                ${AETHEL_COLORS.accent.secondary[500]} 50%,
                #ec4899 100%
              )`,
              animation: 'spin 3s linear infinite',
            }}
          />
          <div 
            style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: '12px',
              background: AETHEL_COLORS.bg.deep,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg 
              width="36" 
              height="36" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="url(#material-gradient)"
              strokeWidth="1.5"
            >
              <defs>
                <linearGradient id="material-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={AETHEL_COLORS.accent.primary[400]} />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <h1 
          style={{
            fontSize: AETHEL_TYPOGRAPHY.fontSize['2xl'],
            fontWeight: 700,
            fontFamily: AETHEL_TYPOGRAPHY.fontFamily.display,
            color: AETHEL_COLORS.text.primary,
            marginBottom: '8px',
          }}
        >
          Material Editor
        </h1>
        
        {/* Subtitle */}
        <p 
          style={{
            fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
            color: AETHEL_COLORS.text.tertiary,
            marginBottom: '32px',
          }}
        >
          Node-based PBR shader authoring
        </p>
        
        {/* Loading bar */}
        <div 
          style={{
            width: '240px',
            height: '3px',
            background: AETHEL_COLORS.bg.hover,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div 
            style={{
              width: '60%',
              height: '100%',
              background: `linear-gradient(90deg, 
                ${AETHEL_COLORS.accent.primary[500]} 0%, 
                #ec4899 100%
              )`,
              borderRadius: '2px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
        
        <p 
          style={{
            marginTop: '16px',
            fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
            color: AETHEL_COLORS.text.disabled,
          }}
        >
          Loading shader compiler...
        </p>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }
);

export default function MaterialEditorPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Suspense fallback={
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: AETHEL_COLORS.bg.deep,
            color: AETHEL_COLORS.text.secondary,
          }}
        >
          Initializing Material Editor...
        </div>
      }>
        <MaterialEditor />
      </Suspense>
    </div>
  );
}
