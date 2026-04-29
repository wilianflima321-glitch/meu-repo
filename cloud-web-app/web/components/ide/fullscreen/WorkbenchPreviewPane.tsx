'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useEditorApplyBridge } from '@/components/ide/EditorApplyBridgeContext';
import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import { ConsoleIntegration } from '@/components/ide/ConsoleIntegration';
import { WorkbenchPreviewModeHeader } from './WorkbenchPreviewModeHeader';
import WorkbenchPreviewProposalOverlay from './WorkbenchPreviewProposalOverlay';
import { WorkbenchPreviewRuntimeControls } from './WorkbenchPreviewRuntimeControls';
import { WorkbenchPreviewRuntimeSurface } from './WorkbenchPreviewRuntimeSurface';
import type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';

export function WorkbenchPreviewPane({
  previewMode,
  activeFile,
  setPreviewMode,
  ...runtimeSurfaceProps
}: WorkbenchPreviewPaneProps) {
  const editorBridge = useEditorApplyBridge()
  const toast = useToast()
  const pendingDiff = editorBridge?.pendingDiff ?? null
  const showProposalOverlay = previewMode !== 'console' && Boolean(pendingDiff)

  const handleOpenReview = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('aethel.ide.openChatDiff'))
    }
  }, [])

  const handleApplyProposal = useCallback(() => {
    if (!editorBridge || !pendingDiff) {
      return
    }

    const result = editorBridge.replaceEntireFile(pendingDiff.newContent)
    if (!result.ok) {
      toast.warning('Nao foi possivel aplicar a proposta', result.message)
      return
    }

    editorBridge.clearPendingDiff()
    toast.success('Proposta aplicada', 'O patch foi promovido para o editor ativo.')
  }, [editorBridge, pendingDiff, toast])

  const handleRejectProposal = useCallback(() => {
    if (!editorBridge?.pendingDiff) {
      return
    }

    editorBridge.clearPendingDiff()
    toast.info('Proposta descartada', 'A previa de patch foi removida do cockpit.')
  }, [editorBridge, toast])

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

      <div className="relative min-h-0 flex-1 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-primary)_100%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent))]">
        {showProposalOverlay && pendingDiff ? (
          <WorkbenchPreviewProposalOverlay
            pendingDiff={pendingDiff}
            onOpenReview={handleOpenReview}
            onApply={handleApplyProposal}
            onReject={handleRejectProposal}
          />
        ) : null}
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
