'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [isProposalPreviewing, setIsProposalPreviewing] = useState(false)
  const showProposalOverlay = previewMode !== 'console' && Boolean(pendingDiff)
  const canPreviewProposalArtifact = useMemo(
    () =>
      (previewMode === 'runtime' || previewMode === 'device') &&
      Boolean(activeFile) &&
      Boolean(pendingDiff) &&
      pendingDiff?.path === activeFile?.path,
    [activeFile, pendingDiff, previewMode],
  )
  const proposalContent =
    canPreviewProposalArtifact && isProposalPreviewing && pendingDiff ? pendingDiff.newContent : null

  useEffect(() => {
    setIsProposalPreviewing(canPreviewProposalArtifact)
  }, [canPreviewProposalArtifact, pendingDiff?.newContent])

  const handleOpenReview = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('aethel.ide.openChatDiff'))
    }
  }, [])

  const handleToggleProposalPreview = useCallback(() => {
    if (!canPreviewProposalArtifact) {
      return
    }

    setIsProposalPreviewing((current) => !current)
  }, [canPreviewProposalArtifact])

  const handleApplyProposal = useCallback(() => {
    if (!editorBridge || !pendingDiff) {
      return
    }

    const result = editorBridge.replaceEntireFile(pendingDiff.newContent)
    if (!result.ok) {
      toast.warning('Could not apply the proposal', result.message)
      return
    }

    editorBridge.clearPendingDiff()
    setIsProposalPreviewing(false)
    toast.success('Proposal applied', 'The patch was promoted to the active editor.')
  }, [editorBridge, pendingDiff, toast])

  const handleRejectProposal = useCallback(() => {
    if (!editorBridge?.pendingDiff) {
      return
    }

    editorBridge.clearPendingDiff()
    setIsProposalPreviewing(false)
    toast.info('Proposal discarded', 'The patch preview was removed.')
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
            canPreviewArtifact={canPreviewProposalArtifact}
            isPreviewingProposal={isProposalPreviewing}
            onOpenReview={handleOpenReview}
            onTogglePreview={handleToggleProposalPreview}
            onApply={handleApplyProposal}
            onReject={handleRejectProposal}
          />
        ) : null}
        {previewMode === 'console' && <ConsoleIntegration />}
        {previewMode === 'viewport3d' && <CanonicalPreviewSurface variant="scene" renderMode="draft" projectId={runtimeSurfaceProps.projectId} />}
        {previewMode === 'canvas' && <CanonicalPreviewSurface variant="canvas" renderMode="draft" />}
        {(previewMode === 'runtime' || previewMode === 'device') && (
          <WorkbenchPreviewRuntimeSurface
            {...runtimeSurfaceProps}
            activeFile={activeFile}
            mode={previewMode}
            proposalContent={proposalContent}
            isProposalPreviewing={canPreviewProposalArtifact && isProposalPreviewing}
          />
        )}
      </div>
    </div>
  );
}

export default WorkbenchPreviewPane;
export type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';
