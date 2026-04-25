'use client';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import { ConsoleIntegration } from '@/components/ide/ConsoleIntegration';
import { WorkbenchPreviewModeHeader } from './WorkbenchPreviewModeHeader';
import { WorkbenchPreviewRuntimeControls } from './WorkbenchPreviewRuntimeControls';
import { WorkbenchPreviewRuntimeSurface } from './WorkbenchPreviewRuntimeSurface';
import type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';

export function WorkbenchPreviewPane({
  previewMode,
  activeFile,
  setPreviewMode,
  ...runtimeSurfaceProps
}: WorkbenchPreviewPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--aethel-surface-primary)]">
      {(previewMode === 'runtime' || previewMode === 'device') && (
        <WorkbenchPreviewRuntimeControls {...runtimeSurfaceProps} />
      )}

      <WorkbenchPreviewModeHeader
        activeFile={activeFile}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
      />

      <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-primary)_100%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent))]">
        {previewMode === 'console' && <ConsoleIntegration />}
        {previewMode === 'viewport3d' && <CanonicalPreviewSurface variant="scene" renderMode="draft" />}
        {previewMode === 'canvas' && <CanonicalPreviewSurface variant="canvas" renderMode="draft" />}
        {(previewMode === 'runtime' || previewMode === 'device') && (
          <WorkbenchPreviewRuntimeSurface
            {...runtimeSurfaceProps}
            activeFile={activeFile}
            mode={previewMode}
          />
        )}
      </div>
    </div>
  );
}

export default WorkbenchPreviewPane;
export type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';
