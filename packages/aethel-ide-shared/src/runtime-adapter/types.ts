export type RuntimeLane = 'browser-preview' | 'local-native' | 'cloud-sandbox';

export type RuntimeProbe = {
  lane: RuntimeLane;
  available: boolean;
  reason?: string;
  checkedAt: string;
};

export type FileSystemAdapter = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(path: string): Promise<Array<{ path: string; type: 'file' | 'folder' }>>;
};

export type TerminalAdapter = {
  createSession(cwd?: string): Promise<{ id: string }>;
  write(sessionId: string, input: string): Promise<void>;
  close(sessionId: string): Promise<void>;
};

export type RuntimeAPIAdapter = {
  probe(): Promise<RuntimeProbe>;
  routeJob(kind: string): Promise<{ lane: RuntimeLane; reason: string }>;
};

export type AIAdapter = {
  complete(input: { prompt: string; model?: string }): Promise<{ text: string; costUsd?: number }>;
};

export type NotificationAdapter = {
  notify(input: { title: string; body?: string; tone?: 'info' | 'success' | 'warning' | 'error' }): void;
};

export type WindowAdapter = {
  minimize(): Promise<void> | void;
  maximize(): Promise<void> | void;
  close(): Promise<void> | void;
};

export type RuntimeAdapter = {
  fs: FileSystemAdapter;
  terminal: TerminalAdapter;
  runtime: RuntimeAPIAdapter;
  ai: AIAdapter;
  notifications: NotificationAdapter;
  window: WindowAdapter;
};
