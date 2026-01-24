'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL STUDIO PRO - Unified Professional Development Environment
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "A ferramenta deve ser tão invisível quanto o pensamento do criador."
 * - Aethel Design Manifesto 2026
 * 
 * Industry-leading unified editor superior to:
 * - Unreal Engine 5 Editor
 * - Unity 6 Editor
 * - Adobe Creative Cloud
 * - Blender 4
 * 
 * @version 4.0.0 AAA
 */

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { AETHEL_COLORS, AETHEL_TYPOGRAPHY } from '@/lib/design/aethel-design-system';

// Dynamic import with SSR disabled for 3D components
const AethelStudioPro = dynamic(
  () => import('@/components/studio/AethelStudioPro'),
  {
    ssr: false,
    loading: () => <StudioLoadingScreen />,
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO LOADING SCREEN - AAA Quality
// ═══════════════════════════════════════════════════════════════════════════════

function StudioLoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  
  useEffect(() => {
    const stages = [
      { progress: 15, status: 'Loading core systems...' },
      { progress: 30, status: 'Initializing 3D viewport...' },
      { progress: 45, status: 'Loading shaders...' },
      { progress: 60, status: 'Preparing asset browser...' },
      { progress: 75, status: 'Loading AI systems...' },
      { progress: 90, status: 'Finalizing...' },
      { progress: 100, status: 'Ready!' },
    ];
    
    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setStatus(stages[currentStage].status);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: AETHEL_COLORS.bg.deep,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background effects */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, 
            ${AETHEL_COLORS.accent.primary[900]}20 0%, 
            transparent 70%
          )`,
        }}
      />
      
      {/* Grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(${AETHEL_COLORS.border.subtle} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          opacity: 0.3,
        }}
      />
      
      {/* Logo */}
      <div
        style={{
          width: '100px',
          height: '100px',
          position: 'relative',
          marginBottom: '40px',
          zIndex: 1,
        }}
      >
        {/* Outer rotating ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '20px',
            background: `linear-gradient(135deg, 
              ${AETHEL_COLORS.accent.primary[500]} 0%, 
              ${AETHEL_COLORS.accent.secondary[500]} 50%, 
              ${AETHEL_COLORS.accent.tertiary[500]} 100%
            )`,
            animation: 'spin 4s linear infinite',
            boxShadow: `0 0 40px ${AETHEL_COLORS.accent.primary.glow}`,
          }}
        />
        
        {/* Inner background */}
        <div
          style={{
            position: 'absolute',
            inset: '4px',
            borderRadius: '16px',
            background: AETHEL_COLORS.bg.deep,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#studio-gradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <defs>
              <linearGradient id="studio-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={AETHEL_COLORS.accent.primary[400]} />
                <stop offset="50%" stopColor={AETHEL_COLORS.accent.secondary[400]} />
                <stop offset="100%" stopColor={AETHEL_COLORS.accent.tertiary[400]} />
              </linearGradient>
            </defs>
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <polyline points="22 8.5 12 15.5 2 8.5" />
            <line x1="12" y1="2" x2="12" y2="8.5" />
          </svg>
        </div>
      </div>
      
      {/* Title */}
      <h1
        style={{
          fontSize: AETHEL_TYPOGRAPHY.fontSize['4xl'],
          fontWeight: 700,
          fontFamily: AETHEL_TYPOGRAPHY.fontFamily.display,
          color: AETHEL_COLORS.text.primary,
          marginBottom: '8px',
          letterSpacing: '-0.02em',
          zIndex: 1,
        }}
      >
        AETHEL{' '}
        <span
          style={{
            background: `linear-gradient(135deg, 
              ${AETHEL_COLORS.accent.primary[400]} 0%, 
              ${AETHEL_COLORS.accent.secondary[400]} 50%,
              ${AETHEL_COLORS.accent.tertiary[400]} 100%
            )`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          STUDIO
        </span>
      </h1>
      
      {/* Subtitle */}
      <p
        style={{
          fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
          color: AETHEL_COLORS.text.tertiary,
          marginBottom: '48px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          zIndex: 1,
        }}
      >
        Professional Game Development Environment
      </p>
      
      {/* Progress container */}
      <div style={{ width: '320px', zIndex: 1 }}>
        {/* Progress label */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
          }}
        >
          <span style={{ color: AETHEL_COLORS.text.secondary }}>{status}</span>
          <span 
            style={{ 
              color: AETHEL_COLORS.text.tertiary,
              fontFamily: AETHEL_TYPOGRAPHY.fontFamily.mono,
            }}
          >
            {progress}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div
          style={{
            height: '4px',
            background: AETHEL_COLORS.bg.hover,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, 
                ${AETHEL_COLORS.accent.primary[500]} 0%, 
                ${AETHEL_COLORS.accent.secondary[500]} 50%,
                ${AETHEL_COLORS.accent.tertiary[500]} 100%
              )`,
              borderRadius: '2px',
              transition: 'width 300ms ease-out',
              boxShadow: `0 0 12px ${AETHEL_COLORS.accent.primary.glow}`,
            }}
          />
        </div>
      </div>
      
      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
          gap: '16px',
          fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
          color: AETHEL_COLORS.text.disabled,
          zIndex: 1,
        }}
      >
        <span>v4.0.0</span>
        <span>•</span>
        <span>© 2026 Aethel Studios</span>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioLoadingScreen />}>
      <AethelStudioPro />
    </Suspense>
  );
}
