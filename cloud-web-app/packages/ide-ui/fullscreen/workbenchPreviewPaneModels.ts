'use client';

import type {
  PreviewRuntimeHealthState,
  PreviewRuntimeReadinessResponse,
} from '../../../web/lib/preview/runtime-manager';

import type {
  ActiveFileState,
  PreviewMode,
} from './types';
import { PREVIEW_SURFACE_REGISTRY } from '../../../web/components/preview/previewSurfaceRegistry';

export type WorkbenchPreviewModeOption = {
  id: PreviewMode;
  label: string;
  description: string;
};

export const PREVIEW_MODES: WorkbenchPreviewModeOption[] = PREVIEW_SURFACE_REGISTRY.map(
  ({ id, label, description }) => ({ id, label, description }),
);

export type WorkbenchPreviewPaneProps = {
  activeFile: ActiveFileState | null;
  previewMode: PreviewMode;
  previewRefreshTick: number;
  previewRuntimeUrl: string | null;
  previewRuntimeInput: string;
  showRuntimeSettings: boolean;
  runtimeHealth: PreviewRuntimeHealthState;
  runtimeHealthCheckedAt: Date | null;
  runtimeHealthHint: string;
  runtimeReadiness: PreviewRuntimeReadinessResponse | null;
  runtimePrimaryAction: 'provision' | 'discover' | 'inline' | string | null;
  runtimePrimaryActionLabel: string;
  runtimeActionBlockedReason: string | null;
  runtimeAutomationPlacement: string | null;
  runtimeAutomationRequiresConfirmation: boolean;
  runtimeStrategyLabel: string;
  runtimeStrategyHint: string;
  runtimeDiscoveryMessage: string | null;
  runtimeDiscoveryTone: 'info' | 'success' | 'warning';
  isDiscoveringRuntime: boolean;
  isProvisioningRuntime: boolean;
  isSyncingRuntime: boolean;
  syncRuntimeBlockedReason: string | null;
  previewSandboxId: string | null;
  forceInlinePreviewFallback: boolean;
  isSavingFile: boolean;
  projectId: string;
  setPreviewMode: (mode: PreviewMode) => void;
  setPreviewRuntimeInput: (value: string) => void;
  setShowRuntimeSettings: (value: boolean | ((current: boolean) => boolean)) => void;
  setPreviewRefreshTick: (value: number | ((current: number) => number)) => void;
  applyRuntimeUrl: () => void;
  handleUseInlineFallback: () => void;
  refreshRuntimeReadiness: () => Promise<PreviewRuntimeReadinessResponse | null>;
  discoverRuntime: (trigger?: 'auto' | 'manual') => Promise<boolean>;
  provisionRuntime: (trigger?: 'auto' | 'manual') => Promise<boolean>;
  syncRuntime: () => Promise<boolean>;
  checkRuntimeHealth: (url: string) => Promise<void>;
};
