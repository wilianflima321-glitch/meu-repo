'use client';

import type {
  PreviewRuntimeHealthState,
  PreviewRuntimeReadinessResponse,
} from '@/lib/preview/runtime-manager';

import type {
  ActiveFileState,
  PreviewMode,
} from '@/components/ide/fullscreen/types';

export type WorkbenchPreviewModeOption = {
  id: PreviewMode;
  label: string;
  description: string;
};

export const PREVIEW_MODES: WorkbenchPreviewModeOption[] = [
  { id: 'viewport3d', label: 'Visual (3D)', description: 'Scene-oriented preview' },
  { id: 'canvas', label: 'Visual (UI)', description: 'Canvas-oriented artifact view' },
  { id: 'runtime', label: 'App Preview', description: 'Live runtime surface' },
  { id: 'device', label: 'Devices', description: 'Responsive framing' },
  { id: 'console', label: 'Console', description: 'Logs and runtime output' },
];

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
