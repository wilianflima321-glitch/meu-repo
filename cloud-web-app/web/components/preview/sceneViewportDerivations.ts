'use client';

import type { VisualScript } from '@/components/visual-scripting/VisualScriptEditor';
import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { GameplayAbilitySpec } from '@/lib/gameplay-ability-system';

export const INITIAL_VIEWPORT_VISUAL_SCRIPT: VisualScript = {
  id: 'viewport-script',
  name: 'Viewport Logic',
  nodes: [],
  edges: [],
  variables: [],
};

export function cloneViewportObject(object: ViewportSceneObject): ViewportSceneObject {
  return {
    ...object,
    position: [...object.position] as [number, number, number],
    rotation: [...object.rotation] as [number, number, number],
    scale: [...object.scale] as [number, number, number],
  };
}

export function deriveVisualScriptPreviewPatch(
  script: VisualScript,
  anchor: ViewportSceneObject,
): Partial<ViewportSceneObject> {
  const moveNodes = script.nodes.filter((node) => node.data.definition.type === 'action_move').length;
  const rotateNodes = script.nodes.filter((node) => node.data.definition.type === 'action_rotate').length;
  const forceNodes = script.nodes.filter((node) => node.data.definition.type === 'physics_add_force').length;
  const spawnNodes = script.nodes.filter((node) => node.data.definition.type === 'action_spawn').length;

  return {
    position: [
      anchor.position[0] + forceNodes * 0.18,
      anchor.position[1] + moveNodes * 0.12,
      anchor.position[2] - forceNodes * 0.16,
    ],
    rotation: [anchor.rotation[0], anchor.rotation[1] + rotateNodes * 0.12, anchor.rotation[2]],
    scale: [
      anchor.scale[0] + spawnNodes * 0.03,
      anchor.scale[1] + spawnNodes * 0.03,
      anchor.scale[2] + spawnNodes * 0.03,
    ],
  };
}

export function deriveVfxGlowIntensity(graph: VFXGraph | null): number {
  if (!graph) return 0;
  const emitterCount = graph.nodes.filter((node) => node.type === 'emitter').length;
  const rendererCount = graph.nodes.filter((node) => node.type === 'renderer').length;
  const turbulenceCount = graph.nodes.filter((node) => node.name.toLowerCase().includes('turbulence')).length;
  return Math.min(1.4, emitterCount * 0.18 + rendererCount * 0.16 + turbulenceCount * 0.12);
}

export function deriveAbilityAccent(
  ability: GameplayAbilitySpec | null,
): { color: string | null; label: string } {
  if (!ability) return { color: null, label: 'No ability in focus' };
  const normalized = `${ability.name} ${ability.description}`.toLowerCase();
  if (normalized.includes('fire')) return { color: '#f97316', label: ability.name };
  if (normalized.includes('heal')) return { color: '#22c55e', label: ability.name };
  if (normalized.includes('shield')) return { color: '#60a5fa', label: ability.name };
  return { color: '#a78bfa', label: ability.name };
}

export function deriveFacialExpressionIntensity(blendShapes: Record<string, number>): number {
  const values = Object.values(blendShapes);
  if (values.length === 0) return 0;
  const active = values.filter((value) => value > 0.01);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, value) => sum + value, 0);
  return Math.min(1.2, total / Math.max(active.length, 1));
}

export function deriveHairPreviewSignature(
  hairData:
    | {
        gradient?: Array<{ color: string }>;
        strandCount?: number;
        curl?: { intensity?: number };
        preset?: string;
      }
    | null,
) {
  if (!hairData) return { color: null, density: 0, label: 'Sem preset' };
  const tipColor = hairData.gradient?.[hairData.gradient.length - 1]?.color ?? null;
  const density = Math.min(
    1.2,
    (hairData.strandCount ?? 0) / 12000 + (hairData.curl?.intensity ?? 0) * 0.2,
  );

  return {
    color: tipColor,
    density,
    label: hairData.preset ?? 'custom',
  };
}
