import type { CopilotContext } from '@/lib/copilot/context-store';

export type CopilotContextPatch = {
  livePreview?: {
    selectedPoint?: { x: number; y: number; z: number };
    camera?: { x: number; y: number; z: number };
  };
  // Extensível: arquivos abertos, seleção do editor, etc.
  editor?: {
    activeFilePath?: string;
    selection?: { start: number; end: number };
  };
  openFiles?: string[];
};

export function mergeCopilotContext(existing: CopilotContext | null, projectId: string, patch: CopilotContextPatch): CopilotContext {
  const now = new Date().toISOString();

  const next: CopilotContext = {
    projectId,
    livePreview: patch.livePreview
      ? {
          selectedPoint: patch.livePreview.selectedPoint ?? existing?.livePreview?.selectedPoint,
          camera: patch.livePreview.camera ?? existing?.livePreview?.camera,
          version: (existing?.livePreview?.version ?? 0) + 1,
          updatedAt: now,
        }
      : existing?.livePreview,
  };

  // Campos extras ficam em `context` como JSON, sem quebrar o tipo atual.
  // (CopilotContext hoje é mínimo; o workflow guarda o JSON completo.)
  return next;
}
