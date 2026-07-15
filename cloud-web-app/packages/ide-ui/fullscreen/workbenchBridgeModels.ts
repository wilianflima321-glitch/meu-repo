'use client';

import type {
  FullscreenIDEWorkspaceBridgeFileProps,
  FullscreenIDEWorkspaceBridgeProps,
} from './FullscreenIDEWorkspaceBridge.types';
import type { WorkbenchPreviewPaneProps } from './WorkbenchPreviewPane';
import type { UseFullscreenIDEBridgePropsArgs } from './useFullscreenIDEBridgeProps.types';

export function buildFullscreenIDEBridgeFileProps(
  args: UseFullscreenIDEBridgePropsArgs,
): FullscreenIDEWorkspaceBridgeFileProps {
  return {
    activeFile: args.activeFile,
    bridgeActiveFile: args.bridgeActiveFile,
    editorRef: args.editorRef,
    nextOpenTarget: args.nextOpenTarget,
    readFile: args.readFile,
    writeFile: args.writeFile,
    setLastAiApply: args.setLastAiApply,
    emitLayoutEvent: args.emitLayoutEvent,
  };
}

export function buildFullscreenIDEBridgePreviewProps(
  args: UseFullscreenIDEBridgePropsArgs,
): WorkbenchPreviewPaneProps {
  return {
    activeFile: args.activeFile,
    previewMode: args.previewMode,
    previewRefreshTick: args.previewRefreshTick,
    previewRuntimeUrl: args.previewRuntimeUrl,
    previewRuntimeInput: args.previewRuntimeInput,
    showRuntimeSettings: args.showRuntimeSettings,
    runtimeHealth: args.runtimeHealth,
    runtimeHealthCheckedAt: args.runtimeHealthCheckedAt,
    runtimeHealthHint: args.runtimeHealthHint,
    runtimeReadiness: args.runtimeReadiness,
    runtimePrimaryAction: args.runtimePrimaryAction,
    runtimePrimaryActionLabel: args.runtimePrimaryActionLabel,
    runtimeActionBlockedReason: args.runtimeActionBlockedReason,
    runtimeAutomationPlacement: args.runtimeAutomationPlacement,
    runtimeAutomationRequiresConfirmation: args.runtimeAutomationRequiresConfirmation,
    runtimeStrategyLabel: args.runtimeStrategyLabel,
    runtimeStrategyHint: args.runtimeStrategyHint,
    runtimeDiscoveryMessage: args.runtimeDiscoveryMessage,
    runtimeDiscoveryTone: args.runtimeDiscoveryTone,
    isDiscoveringRuntime: args.isDiscoveringRuntime,
    isProvisioningRuntime: args.isProvisioningRuntime,
    isSyncingRuntime: args.isSyncingRuntime,
    syncRuntimeBlockedReason: args.syncRuntimeBlockedReason,
    previewSandboxId: args.previewSandboxId,
    forceInlinePreviewFallback: args.forceInlinePreviewFallback,
    isSavingFile: args.isSavingFile,
    projectId: args.projectId,
    setPreviewMode: args.setPreviewMode,
    setPreviewRuntimeInput: args.setPreviewRuntimeInput,
    setShowRuntimeSettings: args.setShowRuntimeSettings,
    setPreviewRefreshTick: args.setPreviewRefreshTick,
    applyRuntimeUrl: args.applyRuntimeUrl,
    handleUseInlineFallback: args.handleUseInlineFallback,
    refreshRuntimeReadiness: args.refreshRuntimeReadiness,
    discoverRuntime: args.discoverRuntime,
    provisionRuntime: args.provisionRuntime,
    syncRuntime: args.syncRuntime,
    checkRuntimeHealth: args.checkRuntimeHealth,
  };
}

export type FullscreenIDEBridgeEditorProps = FullscreenIDEWorkspaceBridgeProps['editor'];
