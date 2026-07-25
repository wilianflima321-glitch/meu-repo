'use client';

import {
  Box,
  Bone,
  Square,
  Circle,
  Pill,
  Zap,
  Lightbulb,
  Camera,
  Volume2,
  Sparkles,
  FileCode,
  Clapperboard,
  Compass,
  Footprints,
  type LucideIcon,
} from 'lucide-react';

/**
 * Semantic component/object icon keys resolved to Lucide SVG icons — replaces
 * raw emoji glyphs (design system rule: 0% emoji, 100% vector SVG icons).
 */
export const COMPONENT_ICON_MAP: Record<string, LucideIcon> = {
  blueprint: Box,
  mesh: Box,
  skeletal_mesh: Bone,
  collider: Pill,
  collider_box: Square,
  collider_sphere: Circle,
  collider_capsule: Pill,
  rigidbody: Zap,
  character: Footprints,
  light: Lightbulb,
  camera: Camera,
  audio: Volume2,
  particle: Sparkles,
  script: FileCode,
  animator: Clapperboard,
  nav_agent: Compass,
};

export function ComponentIcon({ iconKey, size = 16 }: { iconKey: string; size?: number }) {
  const Icon = COMPONENT_ICON_MAP[iconKey] ?? Box;
  return <Icon size={size} aria-hidden="true" />;
}
