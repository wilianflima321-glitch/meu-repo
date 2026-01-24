/**
 * Studio Module - Componentes Unificados AAA
 * 
 * Este módulo centraliza todos os componentes reutilizáveis
 * da interface de estúdio do Aethel Engine.
 * 
 * "A ferramenta deve ser tão invisível quanto o pensamento do criador."
 * - Aethel Design Manifesto 2026
 */

// Main Studio Components
export { default as AethelStudioPro } from './AethelStudioPro';
export { default as UnifiedStudio } from './UnifiedStudio';

// Shared Components
export { SharedViewport3D } from './SharedViewport3D';

// Types
export type { 
  ViewportSettings, 
  ViewportObject, 
  SharedViewportProps,
  ViewportMode,
  TransformMode,
  RenderMode,
} from './SharedViewport3D';
