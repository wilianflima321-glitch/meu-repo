import type { MaterialPreset } from './material-editor.types';

export const DEFAULT_PRESETS: MaterialPreset[] = [
  {
    id: 'plastic_shiny',
    name: 'Shiny Plastic',
    category: 'Plastic',
    settings: {
      color: { r: 0.8, g: 0.1, b: 0.1 },
      metalness: 0,
      roughness: 0.1,
    },
  },
  {
    id: 'plastic_matte',
    name: 'Matte Plastic',
    category: 'Plastic',
    settings: {
      color: { r: 0.2, g: 0.2, b: 0.8 },
      metalness: 0,
      roughness: 0.8,
    },
  },
  {
    id: 'metal_gold',
    name: 'Gold',
    category: 'Metal',
    settings: {
      color: { r: 1, g: 0.843, b: 0 },
      metalness: 1,
      roughness: 0.3,
    },
  },
  {
    id: 'metal_silver',
    name: 'Silver',
    category: 'Metal',
    settings: {
      color: { r: 0.753, g: 0.753, b: 0.753 },
      metalness: 1,
      roughness: 0.2,
    },
  },
  {
    id: 'metal_copper',
    name: 'Copper',
    category: 'Metal',
    settings: {
      color: { r: 0.722, g: 0.451, b: 0.2 },
      metalness: 1,
      roughness: 0.4,
    },
  },
  {
    id: 'metal_brushed',
    name: 'Brushed Metal',
    category: 'Metal',
    settings: {
      color: { r: 0.6, g: 0.6, b: 0.6 },
      metalness: 0.9,
      roughness: 0.5,
    },
  },
  {
    id: 'wood_oak',
    name: 'Oak Wood',
    category: 'Wood',
    settings: {
      color: { r: 0.6, g: 0.4, b: 0.2 },
      metalness: 0,
      roughness: 0.7,
    },
  },
  {
    id: 'wood_dark',
    name: 'Dark Wood',
    category: 'Wood',
    settings: {
      color: { r: 0.2, g: 0.15, b: 0.1 },
      metalness: 0,
      roughness: 0.6,
    },
  },
  {
    id: 'glass_clear',
    name: 'Clear Glass',
    category: 'Glass',
    settings: {
      color: { r: 1, g: 1, b: 1 },
      metalness: 0,
      roughness: 0,
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      ior: 1.5,
    },
  },
  {
    id: 'glass_tinted',
    name: 'Tinted Glass',
    category: 'Glass',
    settings: {
      color: { r: 0.2, g: 0.5, b: 0.8 },
      metalness: 0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.5,
      transmission: 0.7,
      ior: 1.5,
    },
  },
  {
    id: 'stone_marble',
    name: 'Marble',
    category: 'Stone',
    settings: {
      color: { r: 0.95, g: 0.95, b: 0.95 },
      metalness: 0,
      roughness: 0.3,
    },
  },
  {
    id: 'stone_concrete',
    name: 'Concrete',
    category: 'Stone',
    settings: {
      color: { r: 0.5, g: 0.5, b: 0.5 },
      metalness: 0,
      roughness: 0.9,
    },
  },
  {
    id: 'fabric_cloth',
    name: 'Cloth',
    category: 'Fabric',
    settings: {
      color: { r: 0.3, g: 0.3, b: 0.6 },
      metalness: 0,
      roughness: 1,
      sheen: 0.3,
      sheenRoughness: 0.8,
    },
  },
  {
    id: 'fabric_velvet',
    name: 'Velvet',
    category: 'Fabric',
    settings: {
      color: { r: 0.5, g: 0.1, b: 0.2 },
      metalness: 0,
      roughness: 0.9,
      sheen: 0.8,
      sheenRoughness: 0.3,
    },
  },
  {
    id: 'emissive_neon',
    name: 'Neon',
    category: 'Emissive',
    settings: {
      color: { r: 0.1, g: 1, b: 0.5 },
      metalness: 0,
      roughness: 0.5,
      emissive: { r: 0.1, g: 1, b: 0.5 },
      emissiveIntensity: 2,
    },
  },
  {
    id: 'skin_human',
    name: 'Human Skin',
    category: 'Organic',
    settings: {
      color: { r: 0.9, g: 0.7, b: 0.6 },
      metalness: 0,
      roughness: 0.5,
    },
  },
];
