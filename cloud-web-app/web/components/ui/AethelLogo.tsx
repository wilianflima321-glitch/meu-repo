'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL ENGINE - Professional Logo Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Logo profissional com variações para diferentes contextos:
 * - Full: Logo + Nome
 * - Icon: Apenas ícone
 * - Text: Apenas nome
 */

import { motion } from 'framer-motion';
import Image from 'next/image';

interface AethelLogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
  xl: { icon: 56, text: 'text-3xl' },
};

export function AethelLogo({ 
  variant = 'full', 
  size = 'md', 
  animated = true,
  className = '' 
}: AethelLogoProps) {
  const sizeConfig = sizes[size];
  
  const LogoIcon = () => (
    <motion.div
      initial={animated ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={animated ? { scale: 1.05, rotate: 5 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative"
      style={{ width: sizeConfig.icon, height: sizeConfig.icon }}
    >
      {/* Glow effect background */}
      <div 
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/50 via-purple-500/50 to-pink-500/50 blur-lg opacity-60"
        style={{ transform: 'scale(1.2)' }}
      />
      
      {/* Main icon container */}
      <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden shadow-lg shadow-purple-500/25">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* "A" Symbol */}
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4 relative z-10"
        >
          {/* Triangle A */}
          <path 
            d="M16 4L28 26H4L16 4Z" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          {/* Crossbar */}
          <line x1="9" y1="20" x2="23" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Energy core */}
          <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.9"/>
          {/* Energy lines */}
          <line x1="16" y1="12" x2="16" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="12" y1="16" x2="9" y2="16" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="20" y1="16" x2="23" y2="16" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        </svg>
      </div>
    </motion.div>
  );

  const LogoText = () => (
    <motion.div
      initial={animated ? { x: -10, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col"
    >
      <span className={`font-bold tracking-tight text-white ${sizeConfig.text}`}>
        Aethel
      </span>
      {size === 'xl' && (
        <span className="text-xs text-gray-400 tracking-wider uppercase">
          Game Engine
        </span>
      )}
    </motion.div>
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {(variant === 'full' || variant === 'icon') && <LogoIcon />}
      {(variant === 'full' || variant === 'text') && <LogoText />}
    </div>
  );
}

/**
 * Logo animado para splash screens e loading
 */
export function AethelLogoAnimated({ size = 'xl' }: { size?: 'lg' | 'xl' }) {
  const iconSize = size === 'xl' ? 80 : 56;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative"
        style={{ width: iconSize, height: iconSize }}
      >
        {/* Animated glow rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-2xl border border-purple-500/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
        
        {/* Main logo */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/50">
          <svg 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4"
          >
            <motion.path 
              d="M16 4L28 26H4L16 4Z" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
            <motion.line 
              x1="9" y1="20" x2="23" y2="20" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            />
            <motion.circle 
              cx="16" cy="16" r="2.5" 
              fill="white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: 'spring' }}
            />
          </svg>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">Aethel</h1>
        <p className="text-sm text-gray-400 tracking-wider uppercase">Game Engine</p>
      </motion.div>
    </div>
  );
}

export default AethelLogo;
