'use client';

// @aethel-heavy-async-boundary: light Studio adapter; runtime lives in lib/environment.
export { default } from '@/lib/environment/FoliagePainterRuntime';
export type {
  FoliageBrushSettings,
  FoliageCamada,
  FoliageInstance,
  FoliageToolType,
  FoliageType,
} from '@/lib/environment/FoliagePainterRuntime';
export type { FoliagePintarerProps } from './FoliagePainter.defaults';
