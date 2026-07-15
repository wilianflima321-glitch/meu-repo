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
  { path: '/status', maturity: 'GA', label: 'Status Page' },
  { path: '/honest-status', maturity: 'GA', label: 'Honest Status' },
  { path: '/evidence', maturity: 'GA', label: 'Evidence Center', notes: 'Live production-state and release evidence packages' },
  { path: '/privacy', maturity: 'GA', label: 'Privacy' },
  { path: '/terms', maturity: 'GA', label: 'Terms' },

  // BETA - Feature complete but needs polish
  { path: '/chat', maturity: 'BETA', label: 'AI Chat', notes: 'Converges into the IDE agent sidecar' },
  { path: '/admin', maturity: 'BETA', label: 'Admin Panel', notes: 'Visible navigation is compressed to six operator areas' },
  { path: '/marketplace', maturity: 'BETA', label: 'Marketplace', notes: 'Parcialmente funcional' },
  {
    path: '/arcade',
    maturity: 'BETA',
    label: 'Game Hub · Arcade',
    notes:
      'Hub RTv1 Showcase + F2P taxonomy; F.2 playtime + I.2 GameReview (2h / 30m EA opt-in) + helpful votes + I.1 discovery + 2k impression ledger + AI-mod gate + I.4 Report/Block/COPPA + presence/party invite/deep-link + I.7 crossSavePolicy + I.8 cross-play honesty + F.1 durable GameSave (disk slots/sync API) + Prisma GameSave model/provider (letter cz `gameSaveCloudMarketingReady` fail-closed without proven Prisma path; R2 CAS optional); Prisma/R2 cloud GameSave marketing / cloud immortal actors / Agones session / Promoted / Hub checkout [HELD] until DB proof',
  },
  {
    path: '/hub',
    maturity: 'BETA',
    label: 'Game Hub',
    notes: 'Alias of /arcade — Hub RTv1 I.5/I.6; no parallel fake store',
  },
  { path: '/team', maturity: 'BETA', label: 'Team Management' },
  { path: '/studio', maturity: 'BETA', label: 'Creative Studio', notes: 'Mission-first creative hub for game, film, VFX, material, animation, and audio routes' },
  { path: '/studio/level', maturity: 'BETA', label: 'Level Studio', notes: 'Wires the existing LevelEditor into the canonical Studio shell' },
  { path: '/studio/scene', maturity: 'BETA', label: 'Scene', notes: 'Compatibility URL; opens World Studio with the Scene tool selected' },
  { path: '/studio/material', maturity: 'BETA', label: 'Material', notes: 'Compatibility URL; opens World Studio with the Material tool selected' },

  { path: '/studio/terrain', maturity: 'BETA', label: 'Terrain', notes: 'Compatibility URL; opens World Studio with the Terrain tool selected' },
  { path: '/studio/landscape', maturity: 'BETA', label: 'Landscape', notes: 'World Studio Landscape — sculpt+paint+foliage+erosion+seeded-noise→heightfield/splat/foliage authority→viewport sync (an/be/bf/bg/bh); World Forge IDE wire CLOSED (cd); LoRA/Partition/GPU Recast [HELD]; Rapier playtest loop [HELD]' },
  { path: '/studio/gen-world', maturity: 'BETA', label: 'Generate world', notes: 'World Forge → Studio IDE (cd) — selectWorldForgeRoute + generateWorldForge → SDF/biome/PCG/CPU NavMesh + FusionTx; math-pcg ready; loraClayReady / GPU Recast / Partition [HELD]' },
  { path: '/studio/game-ready-gen', maturity: 'ALPHA', label: 'Generate character', notes: 'Native Gen IDE (cb) — text→native pager or BYOK clay→conveyor+FusionTx; nativeOnnxReady [HELD] (da fixture honesty — no redistributable text-to-3d .onnx; cu protocol CLOSED)' },

  // ALPHA - Core functionality works but incomplete
  { path: '/nexus', maturity: 'ALPHA', label: 'Nexus 3D Viewport', notes: 'Routes through the canonical canvas and research workspace' },
  { path: '/preview', maturity: 'ALPHA', label: 'Live Preview', notes: 'Legacy preview path; canonical work happens in the IDE preview pane' },
  { path: '/search', maturity: 'ALPHA', label: 'Global Search' },
  { path: '/terminal', maturity: 'ALPHA', label: 'Terminal' },
  { path: '/git', maturity: 'ALPHA', label: 'Git Panel' },
  { path: '/testing', maturity: 'ALPHA', label: 'Test Runner' },
  { path: '/studio/animation', maturity: 'ALPHA', label: 'Animation Studio', notes: 'Wires the existing AnimationBlueprint into the canonical Studio shell' },
  { path: '/studio/vfx', maturity: 'ALPHA', label: 'VFX Studio', notes: 'Wires the existing NiagaraVFX editor into the canonical Studio shell' },
  { path: '/studio/quest', maturity: 'ALPHA', label: 'Quest Studio', notes: 'Wires QuestEditor into the canonical Studio shell for branching mission design' },
  { path: '/studio/film', maturity: 'ALPHA', label: 'Film Studio', notes: 'Wires DirectorMode, VideoTimelineEditor, SoundCueEditor, and governed Cloud Stream review into one progressive film surface' },
  { path: '/studio/cinematic', maturity: 'ALPHA', label: 'Cinematic Cloud Stream', notes: 'Compatibility URL; opens Film Studio with governed Cloud Stream review selected and held unless signaling, cost, teardown, and session evidence exist' },
  { path: '/studio/audio', maturity: 'ALPHA', label: 'Audio Studio', notes: 'Compatibility URL; opens Film Studio with the Audio tool selected' },

  { path: '/studio/cloth', maturity: 'ALPHA', label: 'Cloth', notes: 'Compatibility URL; opens Character Studio with the Cloth tool selected' },
  { path: '/studio/facial', maturity: 'ALPHA', label: 'Facial', notes: 'Compatibility URL; opens Character Studio with the Facial tool selected' },
  { path: '/studio/fluid', maturity: 'ALPHA', label: 'Fluid', notes: 'Compatibility URL; opens FX Studio with the Fluid tool selected' },
  { path: '/studio/foliage', maturity: 'ALPHA', label: 'Foliage', notes: 'Compatibility URL; opens World Studio with the Foliage tool selected' },
  { path: '/studio/hair', maturity: 'ALPHA', label: 'Hair', notes: 'Compatibility URL; opens Character Studio with the Hair tool selected' },
  { path: '/studio/rig', maturity: 'ALPHA', label: 'Rig', notes: 'Compatibility URL; opens Character Studio with the Rig tool selected' },
  { path: '/studio/water', maturity: 'ALPHA', label: 'Water', notes: 'Compatibility URL; opens World Studio with the Water tool selected' },
  { path: '/studio/sprite', maturity: 'ALPHA', label: 'Sprite', notes: 'Compatibility URL; opens FX Studio with the Sprite tool selected' },

  // PROTOTYPE - Shell exists but minimal functionality
  { path: '/debugger', maturity: 'PROTOTYPE', label: 'Debugger', notes: 'Legacy path; debugger UX belongs inside the IDE' },
  { path: '/playground', maturity: 'PROTOTYPE', label: 'Playground', notes: 'Legacy path; experiments should enter through Workspace or IDE' },
  { path: '/explorer', maturity: 'PROTOTYPE', label: 'File Explorer', notes: 'Legacy path; file browsing belongs inside the IDE' },
  { path: '/design-system-demo', maturity: 'PROTOTYPE', label: 'Design System Demo', notes: 'Dev-only compatibility URL; redirects to docs in the product shell' },

  // ASPIRATIONAL - Route exists but no real functionality
  { path: '/animation-blueprint', maturity: 'ASPIRATIONAL', label: 'Animation Blueprint', notes: 'Legacy shell; use Studio Character or Film groups' },
  { path: '/blueprint-editor', maturity: 'ASPIRATIONAL', label: 'Blueprint Editor', notes: 'Legacy shell; use IDE proposals and Studio Logic' },
  { path: '/landscape-editor', maturity: 'ASPIRATIONAL', label: 'Landscape Editor', notes: 'Legacy shell; durable path lives in Studio World /studio/landscape' },
  { path: '/level-editor', maturity: 'ASPIRATIONAL', label: 'Level Editor', notes: 'Legacy shell; use Studio World' },
  { path: '/niagara-editor', maturity: 'ASPIRATIONAL', label: 'Niagara Editor', notes: 'Legacy shell; use Studio FX' },
  { path: '/vr-preview', maturity: 'ASPIRATIONAL', label: 'VR Preview', notes: 'Held until device capability and runtime evidence exist' },
  { path: '/ai-command', maturity: 'ASPIRATIONAL', label: 'AI Command', notes: 'Legacy path; use IDE command palette' },
  { path: '/editor-hub', maturity: 'ASPIRATIONAL', label: 'Editor Hub', notes: 'Redirected into the IDE' },
  { path: '/live-preview', maturity: 'ASPIRATIONAL', label: 'Live Preview Alt', notes: 'Legacy path; use the IDE preview pane' },
  { path: '/contact-sales', maturity: 'BETA', label: 'Contact Sales', notes: 'Compact enterprise intake with procurement evidence' },
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
 * Get maturity badge info for displaying in UI.
 * Block 7B.4 — token classes + [HELD] for ASPIRATIONAL (no Tailwind palette hex).
 */
export function getMaturityBadge(maturity: MaturityLevel): { label: string; color: string } {
  const badges: Record<MaturityLevel, { label: string; color: string }> = {
    GA: { label: '', color: '' },
    BETA: {
      label: 'Beta',
      color:
        'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info)] border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
    },
    ALPHA: {
      label: 'Alpha',
      color:
        'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)] border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
    },
    PROTOTYPE: {
      label: 'Prototype',
      color:
        'bg-[color-mix(in_srgb,var(--aethel-accent)_12%,transparent)] text-[var(--aethel-accent)] border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)]',
    },
    ASPIRATIONAL: {
      label: '[HELD]',
      color:
        'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)] text-[var(--aethel-text-secondary)] border-[color-mix(in_srgb,var(--aethel-text-tertiary)_40%,transparent)]',
    },
  };
  return badges[maturity];
}
