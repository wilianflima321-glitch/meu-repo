import type {
  NativeKernelManifest,
  RuntimeAdapter,
  RuntimeLane,
  RuntimeProbe,
} from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types';

export type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export type StudioLocalRouteJobResult = {
  lane: RuntimeLane;
  reason: string;
  jobId: string;
  state: 'queued' | 'running' | 'held' | 'needs-review' | 'complete' | 'blocked' | 'cancelled';
  requiresHumanApproval: boolean;
};

export type StudioLocalAiCompleteResult = {
  text: string;
  costUsd?: number;
  state: 'provider_unavailable';
  reason: string;
};

const unavailableInvoke: TauriInvoke = async (command) => {
  throw new Error(`Studio Local bridge command is unavailable outside Tauri: ${command}`);
};

export function createDesktopAdapter(invoke: TauriInvoke = unavailableInvoke): RuntimeAdapter {
  return {
    fs: {
      read: (path) => invoke<string>('fs_read', { path }),
      write: (path, content) => invoke<void>('fs_write', { path, content }),
      list: (path) => invoke<Array<{ path: string; type: 'file' | 'folder' }>>('fs_list', { path }),
      tree: (path, maxDepth = 6) =>
        invoke<
          Array<{
            name: string
            path: string
            type: string
            children?: unknown[]
          }>
        >('fs_tree', { path, maxDepth }),
      watch: (path) => invoke<{ state: string; reason: string }>('fs_watch', { path }),
      setProjectRoot: (path) => invoke<string>('set_project_root', { path }),
      getProjectRoot: () => invoke<string | null>('get_project_root'),
    },
    terminal: {
      createSession: (cwd) =>
        invoke<{ id: string }>('terminal_create', { cwd, callerKind: 'user' }),
      write: (sessionId, input) =>
        invoke<void>('terminal_write', { sessionId, input, callerKind: 'user' }),
      close: (sessionId) =>
        invoke<void>('terminal_close', { sessionId, callerKind: 'user' }),
    },
    runtime: {
      probe: () => invoke<RuntimeProbe>('local_runtime_probe'),
      routeJob: (kind) => invoke<StudioLocalRouteJobResult>('jobs_route', { kind }),
      nativeKernelManifest: () => invoke<NativeKernelManifest>('native_kernel_manifest'),
    },
    ai: {
      complete: (input) => invoke<StudioLocalAiCompleteResult>('ai_complete', input),
    },
    notifications: {
      notify: (input) => {
        void invoke('notify_native', { input });
      },
    },
    window: {
      minimize: () => invoke<void>('window_minimize'),
      maximize: () => invoke<void>('window_toggle_maximize'),
      close: () => invoke<void>('window_close'),
    },
  };
}
