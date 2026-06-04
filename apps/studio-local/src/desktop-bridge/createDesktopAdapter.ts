import type { RuntimeAdapter } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types';

export type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export function createDesktopAdapter(invoke: TauriInvoke): RuntimeAdapter {
  return {
    fs: {
      read: (path) => invoke<string>('fs_read', { path }),
      write: (path, content) => invoke<void>('fs_write', { path, content }),
      list: (path) => invoke<Array<{ path: string; type: 'file' | 'folder' }>>('fs_list', { path }),
    },
    terminal: {
      createSession: (cwd) => invoke<{ id: string }>('terminal_create', { cwd }),
      write: (sessionId, input) => invoke<void>('terminal_write', { sessionId, input }),
      close: (sessionId) => invoke<void>('terminal_close', { sessionId }),
    },
    runtime: {
      probe: () => invoke('local_runtime_health'),
      routeJob: (kind) => invoke('jobs_route', { kind }),
    },
    ai: {
      complete: (input) => invoke('ai_complete', input),
    },
    notifications: {
      notify: (input) => {
        void invoke('notify_native', input);
      },
    },
    window: {
      minimize: () => invoke<void>('window_minimize'),
      maximize: () => invoke<void>('window_toggle_maximize'),
      close: () => invoke<void>('window_close'),
    },
  };
}
