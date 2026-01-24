/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL DESIGN SYSTEM - Main Entry Point
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Single import for all design tokens and components.
 * 
 * Usage:
 * ```tsx
 * import { AETHEL_COLORS, ProButton, AethelSplashScreen } from '@/lib/design';
 * ```
 */

// Design Tokens
export {
  AETHEL_COLORS,
  AETHEL_TYPOGRAPHY,
  AETHEL_SPACING,
  AETHEL_SIZING,
  AETHEL_RADIUS,
  AETHEL_SHADOWS,
  AETHEL_ANIMATION,
  AETHEL_Z_INDEX,
  AETHEL_BREAKPOINTS,
  AETHEL_PRESETS,
  AethelDesignSystem,
  withOpacity,
  glassmorphism,
  gradient,
  generateCSSVariables,
} from './aethel-design-system';

// Re-export type
export type { default as AethelDesignSystemType } from './aethel-design-system';
