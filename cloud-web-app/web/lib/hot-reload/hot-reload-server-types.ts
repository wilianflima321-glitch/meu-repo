import type { WebSocket } from 'ws';

/** Supported file types for hot reload */
export type HotReloadFileType =
  | 'css'
  | 'js'
  | 'ts'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'html'
  | 'vue'
  | 'svelte'
  | 'unknown';

/** Hot reload update strategies */
export type UpdateStrategy = 'hmr' | 'css-inject' | 'full-reload';

/** Connection state of a WebSocket client */
export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected';

/** Bundler types supported for integration */
export type BundlerType = 'webpack' | 'vite' | 'esbuild' | 'rollup' | 'parcel' | 'custom';

/** Event types emitted by the server */
export type HotReloadEventType =
  | 'update'
  | 'reload'
  | 'error'
  | 'connected'
  | 'disconnected'
  | 'file-changed'
  | 'build-start'
  | 'build-end';

/** File change event data */
export interface FileChangeEvent {
  path: string;
  relativePath: string;
  type: 'add' | 'change' | 'unlink';
  fileType: HotReloadFileType;
  timestamp: number;
  hash?: string;
  size?: number;
}

/** Update message sent to clients */
export interface UpdateMessage {
  type: 'update';
  strategy: UpdateStrategy;
  files: FileUpdateInfo[];
  timestamp: number;
  buildId?: string;
}

/** File update information */
export interface FileUpdateInfo {
  path: string;
  fileType: HotReloadFileType;
  hash: string;
  content?: string;
  acceptsHMR: boolean;
  dependencies?: string[];
}

/** Reload message for full page refresh */
export interface ReloadMessage {
  type: 'reload';
  reason: string;
  timestamp: number;
}

/** Error message with overlay data */
export interface ErrorMessage {
  type: 'error';
  error: ErrorInfo;
  timestamp: number;
}

/** Detailed error information */
export interface ErrorInfo {
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  frame?: string;
  plugin?: string;
  id?: string;
}

/** Connected message */
export interface ConnectedMessage {
  type: 'connected';
  clientId: string;
  serverVersion: string;
  timestamp: number;
}

/** Ping/Pong messages for keep-alive */
export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

/** Union type for all message types */
export type HotReloadMessage =
  | UpdateMessage
  | ReloadMessage
  | ErrorMessage
  | ConnectedMessage
  | PingMessage
  | PongMessage;

/** Client information */
export interface ClientInfo {
  id: string;
  socket: WebSocket;
  state: ConnectionState;
  connectedAt: number;
  lastPing: number;
  userAgent?: string;
  acceptedTypes: HotReloadFileType[];
}

/** Server configuration options */
export interface HotReloadServerOptions {
  /** Port for the WebSocket server */
  port: number;
  /** Host to bind to */
  host: string;
  /** Root directory to watch */
  root: string;
  /** File patterns to watch (glob patterns) */
  watchPatterns: string[];
  /** File patterns to ignore */
  ignorePatterns: string[];
  /** Debounce delay in milliseconds */
  debounceDelay: number;
  /** Enable CSS hot reload without refresh */
  cssHotReload: boolean;
  /** Enable JS/TS HMR */
  jsHMR: boolean;
  /** Fallback to full reload if HMR fails */
  fullReloadFallback: boolean;
  /** Enable error overlay in browser */
  errorOverlay: boolean;
  /** Ping interval for keep-alive (ms) */
  pingInterval: number;
  /** Client timeout (ms) */
  clientTimeout: number;
  /** Bundler integration */
  bundler?: BundlerType;
  /** Custom bundler adapter */
  bundlerAdapter?: BundlerAdapter;
  /** Public path for assets */
  publicPath: string;
  /** Enable logging */
  logging: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** HTTPS configuration */
  https?: HttpsConfig;
  /** Maximum payload size */
  maxPayloadSize: number;
  /** Enable file content in updates */
  sendFileContent: boolean;
}

/** HTTPS configuration */
export interface HttpsConfig {
  key: string;
  cert: string;
  ca?: string;
}

/** Bundler adapter interface for custom integrations */
export interface BundlerAdapter {
  name: string;
  onBuildStart?: () => void | Promise<void>;
  onBuildEnd?: (result: BuildResult) => void | Promise<void>;
  transformUpdate?: (files: FileUpdateInfo[]) => FileUpdateInfo[] | Promise<FileUpdateInfo[]>;
  getModuleDependencies?: (modulePath: string) => string[] | Promise<string[]>;
  acceptsHMR?: (filePath: string) => boolean;
}

/** Build result from bundler */
export interface BuildResult {
  success: boolean;
  errors: ErrorInfo[];
  warnings: string[];
  duration: number;
  outputFiles?: string[];
}

/** Event types emitted by the server API surface */
export interface HotReloadServerEvents {
  update: (message: UpdateMessage) => void;
  reload: (message: ReloadMessage) => void;
  error: (error: ErrorInfo) => void;
  connected: (client: ClientInfo) => void;
  disconnected: (clientId: string) => void;
  'file-changed': (event: FileChangeEvent) => void;
  'build-start': () => void;
  'build-end': (result: BuildResult) => void;
  'server-start': (port: number) => void;
  'server-stop': () => void;
}
