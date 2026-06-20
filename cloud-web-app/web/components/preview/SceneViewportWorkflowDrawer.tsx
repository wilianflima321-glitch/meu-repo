'use client';

import dynamic from 'next/dynamic';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { GameplayAbilitySpec } from '@/lib/gameplay-ability-system';
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome';
import {
  deriveFacialExpressionIntensity,
  deriveHairPreviewSignature,
} from '@/components/preview/sceneViewportDerivations';
import type { VisualScript } from '@/components/visual-scripting/VisualScriptEditor';

const FacialAnimationEditor = dynamic(
  () => import('@/components/character/FacialAnimationEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const HairFurEditor = dynamic(
  () => import('@/components/character/HairFurEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const VisualScriptEditor = dynamic(
  () => import('@/components/visual-scripting/VisualScriptEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const VFXGraphEditor = dynamic(
  () => import('@/components/editors/VFXGraphEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const AbilityEditor = dynamic(
  () => import('@/components/engine/AbilityEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

export type ViewportWorkflowTool = 'facial' | 'hair' | 'visual-script' | 'vfx' | 'ability';

type SceneViewportWorkflowDrawerProps = {
  workflowTool: ViewportWorkflowTool;
  selectedObjectId?: string | null;
  visualScript: VisualScript;
  onClose: () => void;
  onAbilityChange: (ability: GameplayAbilitySpec | null) => void;
  onFacialMetricsChange: (blendShapeCount: number, expressionIntensity: number) => void;
  onHairSignatureChange: (label: string, color: string | null, density: number) => void;
  onVfxGraphChange: (graph: VFXGraph | null) => void;
  onVisualScriptChange: (script: VisualScript) => void;
};

function getWorkflowTitle(workflowTool: ViewportWorkflowTool): string {
  switch (workflowTool) {
    case 'facial':
      return 'Facial Animation Editor';
    case 'hair':
      return 'Hair & Fur Editor';
    case 'visual-script':
      return 'Visual Script Editor';
    case 'vfx':
      return 'VFX Graph Editor';
    case 'ability':
      return 'Ability Editor';
  }
}

function getWorkflowDescription(workflowTool: ViewportWorkflowTool): string {
  switch (workflowTool) {
    case 'visual-script':
      return 'Node logic updates the selected object live.';
    case 'vfx':
      return 'Tune cinematic feedback on the active object.';
    case 'ability':
      return 'Shape playtest behavior for the selection.';
    default:
      return 'Character tools stay tied to the selection.';
  }
}

export function getViewportWorkflowLabel(workflowTool: ViewportWorkflowTool | null): string {
  switch (workflowTool) {
    case 'visual-script':
      return 'Visual Script';
    case 'vfx':
      return 'VFX Graph';
    case 'ability':
      return 'Ability';
    case 'facial':
      return 'Facial';
    case 'hair':
      return 'Hair';
    default:
      return 'No';
  }
}

export default function SceneViewportWorkflowDrawer({
  workflowTool,
  selectedObjectId,
  visualScript,
  onClose,
  onAbilityChange,
  onFacialMetricsChange,
  onHairSignatureChange,
  onVfxGraphChange,
  onVisualScriptChange,
}: SceneViewportWorkflowDrawerProps) {
  return (
    <div className="absolute inset-0 z-30 bg-[rgba(4,8,16,0.82)] backdrop-blur-sm">
      <div className="flex h-full flex-col overflow-hidden border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
        <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              Edit tool
            </p>
            <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
              {getWorkflowTitle(workflowTool)}
            </h3>
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">
              {getWorkflowDescription(workflowTool)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewport contextual tool"
            className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {workflowTool === 'facial' ? (
            <FacialAnimationEditor
              characterId={selectedObjectId ?? 'viewport-character'}
              onBlendShapeUpdate={(blendShapes) => {
                const activeCount = Object.values(blendShapes).filter((value) => (value as number) > 0.01).length;
                onFacialMetricsChange(activeCount, deriveFacialExpressionIntensity(blendShapes));
              }}
            />
          ) : workflowTool === 'hair' ? (
            <HairFurEditor
              characterId={selectedObjectId ?? 'viewport-character'}
              onHairUpdate={(hairData) => {
                const signature = deriveHairPreviewSignature(hairData);
                onHairSignatureChange(signature.label, signature.color, signature.density);
              }}
            />
          ) : workflowTool === 'visual-script' ? (
            <VisualScriptEditor script={visualScript} onChange={onVisualScriptChange} />
          ) : workflowTool === 'vfx' ? (
            <VFXGraphEditor onGraphChange={onVfxGraphChange} />
          ) : (
            <AbilityEditor
              entityId={selectedObjectId ?? 'viewport-entity'}
              onAbilityChange={onAbilityChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
