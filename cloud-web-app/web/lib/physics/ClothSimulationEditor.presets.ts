import type { ClothPreset } from '@/lib/physics/ClothSimulationEditor.types';

export const CLOTH_PRESETS: ClothPreset[] = [
  {
    id: 'silk',
    name: 'Silk',
    description: 'Light and flowing fabric',
    config: {
      mass: 0.3,
      stiffness: 0.6,
      damping: 0.02,
      iterations: 15,
      tearThreshold: 0.8,
    },
  },
  {
    id: 'cotton',
    name: 'Cotton',
    description: 'Medium fabric with natural behavior',
    config: {
      mass: 0.5,
      stiffness: 0.8,
      damping: 0.05,
      iterations: 12,
      tearThreshold: 1.2,
    },
  },
  {
    id: 'denim',
    name: 'Denim',
    description: 'Heavy and rigid fabric',
    config: {
      mass: 0.8,
      stiffness: 0.95,
      damping: 0.1,
      iterations: 10,
      tearThreshold: 2.0,
    },
  },
  {
    id: 'leather',
    name: 'Leather',
    description: 'Rigid material with low flexibility',
    config: {
      mass: 1.0,
      stiffness: 0.98,
      damping: 0.15,
      iterations: 8,
      tearThreshold: 3.0,
    },
  },
  {
    id: 'rubber',
    name: 'Rubber',
    description: 'Elastic material',
    config: {
      mass: 0.6,
      stiffness: 0.4,
      damping: 0.08,
      iterations: 20,
      tearThreshold: 5.0,
    },
  },
  {
    id: 'flag',
    name: 'Flag',
    description: 'Optimized for wind-driven flags',
    config: {
      mass: 0.2,
      stiffness: 0.7,
      damping: 0.03,
      iterations: 12,
      tearThreshold: 1.5,
      windVariation: 0.3,
    },
  },
  {
    id: 'cape',
    name: 'Cape',
    description: 'Designed for character capes',
    config: {
      mass: 0.4,
      stiffness: 0.75,
      damping: 0.04,
      iterations: 14,
      tearThreshold: 1.8,
    },
  },
  {
    id: 'curtain',
    name: 'Curtain',
    description: 'Heavy fabric for curtains',
    config: {
      mass: 0.7,
      stiffness: 0.85,
      damping: 0.12,
      iterations: 10,
      tearThreshold: 2.5,
    },
  },
];
