/**
 * Aethel Route Maturity Registry
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 * 
 * Controls which routes are visible based on maturity level.
 * Routes below BETA should be hidden from production unless
 * NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true
 */

export type MaturityLevel = 'GA' | 'BETA' | 'ALPHA' | 'PROTOTYPE' | 'ASPIRATIONAL';

export interface RouteEntry {
  path: string;
  maturity: MaturityLevel;
  label: string;
  notes?: string;
}

export const ROUTE_MATURITY_REGISTRY: RouteEntry[] = [
  // GA - Generally Available (production ready)
  { path: '/', maturity: 'GA', label: 'Landing Page' },
  { path: '/login', maturity: 'GA', label: 'Login' },
  { path: '/register', maturity: 'GA', label: 'Register' },
  { path: '/dashboard', maturity: 'GA', label: 'Studio Home' },
  { path: '/ide', maturity: 'GA', label: 'Workbench IDE' },
  { path: '/pricing', maturity: 'GA', label: 'Pricing' },
  { path: '/docs', maturity: 'GA', label: 'Documentation' },
  { path: '/settings', maturity: 'GA', label: 'Settings' },
  { path: '/profile', maturity: 'GA', label: 'Profile' },
  { path: '/billing', maturity: 'GA', label: 'Billing' },
  { path: '/contact', maturity: 'GA', label: 'Contact' },
  { path: '/status', maturity: 'GA', label: 'Status Page' },
  { path: '/health', maturity: 'GA', label: 'Health Check' },
  { path: '/honest-status', maturity: 'GA', label: 'Honest Status' },
  { path: '/privacy', maturity: 'GA', label: 'Privacy' },
  { path: '/terms', maturity: 'GA', label: 'Terms' },

  // BETA - Feature complete but needs polish
  { path: '/chat', maturity: 'BETA', label: 'AI Chat', notes: 'Falta streaming com syntax highlighting' },
  { path: '/admin', maturity: 'BETA', label: 'Admin Panel', notes: 'Precisa convergir visual com Studio' },
  { path: '/marketplace', maturity: 'BETA', label: 'Marketplace', notes: 'Parcialmente funcional' },
  { path: '/team', maturity: 'BETA', label: 'Team Management' },
  { path: '/studio', maturity: 'BETA', label: 'Creative Studio', notes: 'Mission-first creative hub for game, film, VFX, material, animation, and audio routes' },
  { path: '/studio/level', maturity: 'BETA', label: 'Level Studio', notes: 'Wires the existing LevelEditor into the canonical Studio shell' },
  { path: '/studio/scene', maturity: 'BETA', label: 'Scene Studio', notes: 'Wires the existing SceneEditor into the canonical Studio shell' },
  { path: '/studio/material', maturity: 'BETA', label: 'Material Studio', notes: 'Wires the existing MaterialEditor into the canonical Studio shell' },

  { path: '/studio/terrain', maturity: 'BETA', label: 'Terrain Studio', notes: 'Wires TerrainSculptingEditor into the canonical Studio shell' },
  { path: '/studio/landscape', maturity: 'BETA', label: 'Landscape Studio', notes: 'Wires LandscapeEditor into the canonical Studio shell' },

  // ALPHA - Core functionality works but incomplete
  { path: '/nexus', maturity: 'ALPHA', label: 'Nexus 3D Viewport', notes: 'Sem selecao, gizmos, hierarquia' },
  { path: '/preview', maturity: 'ALPHA', label: 'Live Preview', notes: 'Sem HMR confiavel' },
  { path: '/search', maturity: 'ALPHA', label: 'Global Search' },
  { path: '/terminal', maturity: 'ALPHA', label: 'Terminal' },
  { path: '/git', maturity: 'ALPHA', label: 'Git Panel' },
  { path: '/testing', maturity: 'ALPHA', label: 'Test Runner' },
  { path: '/studio/animation', maturity: 'ALPHA', label: 'Animation Studio', notes: 'Wires the existing AnimationBlueprint into the canonical Studio shell' },
  { path: '/studio/vfx', maturity: 'ALPHA', label: 'VFX Studio', notes: 'Wires the existing NiagaraVFX editor into the canonical Studio shell' },
  { path: '/studio/quest', maturity: 'ALPHA', label: 'Quest Studio', notes: 'Wires QuestEditor into the canonical Studio shell for branching mission design' },
  { path: '/studio/film', maturity: 'ALPHA', label: 'Film Studio', notes: 'Wires DirectorMode and VideoTimelineEditor into one progressive film surface' },
  { path: '/studio/audio', maturity: 'ALPHA', label: 'Audio Studio', notes: 'Wires SoundCueEditor into the canonical Studio shell' },

  { path: '/studio/cloth', maturity: 'ALPHA', label: 'Cloth Studio', notes: 'Wires ClothSimulationEditor into the canonical Studio shell' },
  { path: '/studio/facial', maturity: 'ALPHA', label: 'Facial Studio', notes: 'Wires FacialAnimationEditor into the canonical Studio shell' },
  { path: '/studio/fluid', maturity: 'ALPHA', label: 'Fluid Studio', notes: 'Wires FluidSimulationEditor into the canonical Studio shell' },
  { path: '/studio/foliage', maturity: 'ALPHA', label: 'Foliage Studio', notes: 'Wires FoliagePainter into the canonical Studio shell' },
  { path: '/studio/hair', maturity: 'ALPHA', label: 'Hair & Fur Studio', notes: 'Wires HairFurEditor into the canonical Studio shell' },
  { path: '/studio/rig', maturity: 'ALPHA', label: 'Control Rig Studio', notes: 'Wires ControlRigEditor into the canonical Studio shell' },
  { path: '/studio/water', maturity: 'ALPHA', label: 'Water Studio', notes: 'Wires WaterEditor into the canonical Studio shell' },
  { path: '/studio/sprite', maturity: 'ALPHA', label: 'Sprite Studio', notes: 'Wires SpriteEditor into the canonical Studio shell' },

  // PROTOTYPE - Shell exists but minimal functionality
  { path: '/debugger', maturity: 'PROTOTYPE', label: 'Debugger', notes: 'Sem conexao DAP real' },
  { path: '/playground', maturity: 'PROTOTYPE', label: 'Playground', notes: 'Proposito ambiguo' },
  { path: '/explorer', maturity: 'PROTOTYPE', label: 'File Explorer', notes: 'Duplica funcionalidade do IDE' },
  { path: '/design-system-demo', maturity: 'PROTOTYPE', label: 'Design System Demo' },

  // ASPIRATIONAL - Route exists but no real functionality
  { path: '/animation-blueprint', maturity: 'ASPIRATIONAL', label: 'Animation Blueprint', notes: 'Shell sem funcionalidade' },
  { path: '/blueprint-editor', maturity: 'ASPIRATIONAL', label: 'Blueprint Editor', notes: 'Prototipo sem uso real' },
  { path: '/landscape-editor', maturity: 'ASPIRATIONAL', label: 'Landscape Editor', notes: 'Prototipo sem uso real' },
  { path: '/level-editor', maturity: 'ASPIRATIONAL', label: 'Level Editor', notes: 'Prototipo sem uso real' },
  { path: '/niagara-editor', maturity: 'ASPIRATIONAL', label: 'Niagara Editor', notes: 'Prototipo sem uso real' },
  { path: '/vr-preview', maturity: 'ASPIRATIONAL', label: 'VR Preview', notes: 'Prototipo sem uso real' },
  { path: '/ai-command', maturity: 'ASPIRATIONAL', label: 'AI Command', notes: 'Funcionalidade ambigua' },
  { path: '/editor-hub', maturity: 'ASPIRATIONAL', label: 'Editor Hub', notes: 'Ja redirecionado' },
  { path: '/live-preview', maturity: 'ASPIRATIONAL', label: 'Live Preview Alt', notes: 'Duplica preview do IDE' },
  { path: '/contact-sales', maturity: 'ASPIRATIONAL', label: 'Contact Sales' },
];

/**
 * Check if a route should be visible in the current environment.
 * ASPIRATIONAL and PROTOTYPE routes are hidden unless env flag is set.
 */
export function isRouteVisible(path: string): boolean {
  const showAspirations = process.env.NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES === 'true';
  const entry = ROUTE_MATURITY_REGISTRY.find(r => r.path === path);
  
  if (!entry) return true; // Unknown route = allow by default
  
  if (showAspirations) return true;
  
  return entry.maturity === 'GA' || entry.maturity === 'BETA';
}

/**
 * Get all routes filtered by minimum maturity level
 */
export function getRoutesByMinMaturity(minMaturity: MaturityLevel): RouteEntry[] {
  const order: MaturityLevel[] = ['GA', 'BETA', 'ALPHA', 'PROTOTYPE', 'ASPIRATIONAL'];
  const minIndex = order.indexOf(minMaturity);
  return ROUTE_MATURITY_REGISTRY.filter(r => order.indexOf(r.maturity) <= minIndex);
}

export function getRouteMaturityEntry(path: string): RouteEntry | undefined {
  return ROUTE_MATURITY_REGISTRY.find((route) => route.path === path);
}

/**
 * Get maturity badge info for displaying in UI
 */
export function getMaturityBadge(maturity: MaturityLevel): { label: string; color: string } {
  const badges: Record<MaturityLevel, { label: string; color: string }> = {
    GA: { label: '', color: '' },
    BETA: { label: 'Beta', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    ALPHA: { label: 'Alpha', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    PROTOTYPE: { label: 'Prototype', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    ASPIRATIONAL: { label: 'Labs', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  };
  return badges[maturity];
}
