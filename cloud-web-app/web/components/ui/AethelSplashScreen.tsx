/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL SPLASH SCREEN - AAA Professional Loading Experience
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ultra-premium loading screens that rivals:
 * - Unreal Engine 5 splash
 * - AAA Game Studios intros
 * - Hollywood-grade VFX software
 * 
 * @version 4.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AETHEL_COLORS, AETHEL_TYPOGRAPHY, AETHEL_SHADOWS } from '@/lib/design/aethel-design-system';

// ═══════════════════════════════════════════════════════════════════════════════
// AETHEL LOGO ANIMATED
// ═══════════════════════════════════════════════════════════════════════════════

interface AethelLogoProps {
  size?: number;
  animated?: boolean;
}

export const AethelLogo: React.FC<AethelLogoProps> = ({ size = 80, animated = true }) => {
  return (
    <motion.div
      initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
    >
      {/* Outer glow ring */}
      <motion.div
        animate={animated ? { 
          rotate: 360,
          boxShadow: [
            AETHEL_SHADOWS.glow.blue,
            AETHEL_SHADOWS.glow.purple,
            AETHEL_SHADOWS.glow.cyan,
            AETHEL_SHADOWS.glow.blue,
          ],
        } : undefined}
        transition={{ 
          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          boxShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '20%',
          background: `linear-gradient(135deg, 
            ${AETHEL_COLORS.accent.primary[500]} 0%, 
            ${AETHEL_COLORS.accent.secondary[500]} 50%, 
            ${AETHEL_COLORS.accent.tertiary[500]} 100%
          )`,
          padding: '3px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: AETHEL_COLORS.bg.deep,
            borderRadius: '18%',
          }}
        />
      </motion.div>
      
      {/* Inner icon */}
      <motion.div
        animate={animated ? { rotate: -360 } : undefined}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: size * 0.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#aethel-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="aethel-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={AETHEL_COLORS.accent.primary[400]} />
              <stop offset="50%" stopColor={AETHEL_COLORS.accent.secondary[400]} />
              <stop offset="100%" stopColor={AETHEL_COLORS.accent.tertiary[400]} />
            </linearGradient>
          </defs>
          {/* Hexagonal crystal shape */}
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="15.5" />
          <polyline points="22 8.5 12 15.5 2 8.5" />
          <polyline points="2 15.5 12 8.5 22 15.5" />
          <line x1="12" y1="2" x2="12" y2="8.5" />
        </svg>
      </motion.div>
      
      {/* Center glow */}
      <motion.div
        animate={animated ? { 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: size * 0.3,
          borderRadius: '50%',
          background: `radial-gradient(circle, 
            ${AETHEL_COLORS.accent.primary[500]}40 0%, 
            transparent 70%
          )`,
        }}
      />
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingProgressProps {
  progress: number;
  label?: string;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({ 
  progress, 
  label = 'Loading...' 
}) => {
  return (
    <div style={{ width: '320px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
          color: AETHEL_COLORS.text.tertiary,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: AETHEL_TYPOGRAPHY.fontFamily.mono }}>
          {Math.round(progress)}%
        </span>
      </div>
      
      <div
        style={{
          height: '3px',
          background: AETHEL_COLORS.bg.hover,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, 
              ${AETHEL_COLORS.accent.primary[500]} 0%, 
              ${AETHEL_COLORS.accent.secondary[500]} 50%,
              ${AETHEL_COLORS.accent.tertiary[500]} 100%
            )`,
            borderRadius: '2px',
            boxShadow: `0 0 10px ${AETHEL_COLORS.accent.primary.glow}`,
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

interface SplashScreenProps {
  onComplete?: () => void;
  minimumDuration?: number;
  showProgress?: boolean;
  subtitle?: string;
  version?: string;
}

export const AethelSplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 2000,
  showProgress = true,
  subtitle = 'Professional Game Development Environment',
  version = '4.0.0',
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('Initializing...');
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const tasks = [
      { name: 'Initializing core systems...', duration: 300 },
      { name: 'Loading design tokens...', duration: 200 },
      { name: 'Preparing 3D viewport...', duration: 400 },
      { name: 'Loading shaders...', duration: 300 },
      { name: 'Initializing AI systems...', duration: 400 },
      { name: 'Loading asset library...', duration: 300 },
      { name: 'Finalizing...', duration: 200 },
    ];
    
    const totalDuration = tasks.reduce((acc, t) => acc + t.duration, 0);
    let elapsed = 0;
    let taskIndex = 0;
    
    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min(100, (elapsed / Math.max(totalDuration, minimumDuration)) * 100);
      setProgress(newProgress);
      
      // Update task label
      let taskElapsed = 0;
      for (let i = 0; i < tasks.length; i++) {
        taskElapsed += tasks[i].duration;
        if (elapsed < taskElapsed) {
          if (i !== taskIndex) {
            taskIndex = i;
            setCurrentTask(tasks[i].name);
          }
          break;
        }
      }
      
      if (newProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => onComplete?.(), 300);
        }, 500);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [minimumDuration, onComplete]);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: AETHEL_COLORS.bg.deep,
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at center, 
                ${AETHEL_COLORS.accent.primary[900]}30 0%, 
                transparent 70%
              )`,
              pointerEvents: 'none',
            }}
          />
          
          {/* Particle grid (subtle) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `radial-gradient(${AETHEL_COLORS.border.subtle} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          />
          
          {/* Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            {/* Logo */}
            <AethelLogo size={100} />
            
            {/* Title */}
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{
                marginTop: '32px',
                fontSize: AETHEL_TYPOGRAPHY.fontSize['4xl'],
                fontWeight: 700,
                fontFamily: AETHEL_TYPOGRAPHY.fontFamily.display,
                letterSpacing: '-0.02em',
                color: AETHEL_COLORS.text.primary,
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
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{
                marginTop: '8px',
                fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
                color: AETHEL_COLORS.text.tertiary,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </motion.p>
            
            {/* Progress */}
            {showProgress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                style={{ marginTop: '48px' }}
              >
                <LoadingProgress progress={progress} label={currentTask} />
              </motion.div>
            )}
          </motion.div>
          
          {/* Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
              color: AETHEL_COLORS.text.disabled,
            }}
          >
            <span>Version {version}</span>
            <span style={{ color: AETHEL_COLORS.border.default }}>•</span>
            <span>© 2026 Aethel Studios</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SPINNER VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

interface SpinnerProps {
  size?: number;
  variant?: 'default' | 'dots' | 'ring' | 'pulse';
  color?: string;
}

export const ProSpinner: React.FC<SpinnerProps> = ({
  size = 24,
  variant = 'default',
  color = AETHEL_COLORS.accent.primary[500],
}) => {
  switch (variant) {
    case 'dots':
      return (
        <div style={{ display: 'flex', gap: size * 0.2 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              style={{
                width: size * 0.25,
                height: size * 0.25,
                borderRadius: '50%',
                background: color,
              }}
            />
          ))}
        </div>
      );
      
    case 'ring':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: size,
            height: size,
            border: `2px solid ${AETHEL_COLORS.bg.hover}`,
            borderTopColor: color,
            borderRadius: '50%',
          }}
        />
      );
      
    case 'pulse':
      return (
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
          }}
        />
      );
      
    default:
      return (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke={AETHEL_COLORS.bg.hover}
            strokeWidth="3"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </motion.svg>
      );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMAL LOADING OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  blur = true,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: blur ? 'rgba(9, 9, 11, 0.8)' : 'rgba(9, 9, 11, 0.95)',
            backdropFilter: blur ? 'blur(8px)' : undefined,
            zIndex: 100,
          }}
        >
          <ProSpinner size={32} variant="ring" />
          <span
            style={{
              fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
              color: AETHEL_COLORS.text.secondary,
            }}
          >
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default AethelSplashScreen;
