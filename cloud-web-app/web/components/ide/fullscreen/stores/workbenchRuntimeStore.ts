import { create } from 'zustand';

export type WorkbenchRuntimeState = {
  previewEnabled: boolean;
  previewRuntimeUrl: string | null;
  previewSandboxId: string | null;
  runtimeStatus: 'idle' | 'starting' | 'warming' | 'ready' | 'blocked' | 'error';
  lastSyncAt: number | null;
  setPreviewEnabled: (enabled: boolean) => void;
  setPreviewRuntime: (payload: { url: string | null; sandboxId: string | null }) => void;
  setRuntimeStatus: (status: WorkbenchRuntimeState['runtimeStatus']) => void;
  markSynced: (timestamp?: number) => void;
};

export const useWorkbenchRuntimeStore = create<WorkbenchRuntimeState>()((set) => ({
  previewEnabled: true,
  previewRuntimeUrl: null,
  previewSandboxId: null,
  runtimeStatus: 'idle',
  lastSyncAt: null,
  setPreviewEnabled: (previewEnabled) => set({ previewEnabled }),
  setPreviewRuntime: ({ url, sandboxId }) =>
    set({ previewRuntimeUrl: url, previewSandboxId: sandboxId }),
  setRuntimeStatus: (runtimeStatus) => set({ runtimeStatus }),
  markSynced: (timestamp = Date.now()) => set({ lastSyncAt: timestamp }),
}));
