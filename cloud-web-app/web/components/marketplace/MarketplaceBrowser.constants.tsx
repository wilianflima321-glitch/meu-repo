import React from 'react';
import {
  Box,
  Code,
  Crown,
  FileImage,
  Music,
  Package,
  Palette,
  Zap,
} from 'lucide-react';

export type AssetCategory =
  | '3d-models'
  | 'textures'
  | 'materials'
  | 'audio'
  | 'scripts'
  | 'animations'
  | 'particles'
  | 'shaders'
  | 'prefabs'
  | 'complete-projects';

export const CATEGORIES: { id: AssetCategory; name: string; icon: React.ReactNode }[] = [
  { id: '3d-models', name: 'Modelos 3D', icon: <Box className="w-4 h-4" /> },
  { id: 'textures', name: 'Texturas', icon: <FileImage className="w-4 h-4" /> },
  { id: 'materials', name: 'Materiais', icon: <Palette className="w-4 h-4" /> },
  { id: 'audio', name: 'Audio', icon: <Music className="w-4 h-4" /> },
  { id: 'scripts', name: 'Scripts', icon: <Code className="w-4 h-4" /> },
  { id: 'animations', name: 'Animacoes', icon: <Zap className="w-4 h-4" /> },
  { id: 'particles', name: 'Particulas', icon: <Zap className="w-4 h-4" /> },
  { id: 'shaders', name: 'Shaders', icon: <Code className="w-4 h-4" /> },
  { id: 'prefabs', name: 'Prefabs', icon: <Package className="w-4 h-4" /> },
  { id: 'complete-projects', name: 'Projetos', icon: <Crown className="w-4 h-4" /> },
];

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Mais Populares' },
  { value: 'newest', label: 'Mais Recentes' },
  { value: 'rating', label: 'Melhor Avaliados' },
  { value: 'price-asc', label: 'Preco: Menor para Maior' },
  { value: 'price-desc', label: 'Preco: Maior para Menor' },
] as const;

export const LICENSE_OPTIONS = [
  { value: 'standard', label: 'Licenca Padrao' },
  { value: 'extended', label: 'Licenca Estendida' },
  { value: 'exclusive', label: 'Licenca Exclusiva' },
] as const;
