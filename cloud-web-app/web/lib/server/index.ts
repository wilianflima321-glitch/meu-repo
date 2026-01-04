/**
 * Aethel Engine - Server Runtime Index
 * 
 * Exportação centralizada de todos os serviços server-side.
 * Use este módulo para importar qualquer runtime do servidor.
 */

// ============================================================================
// Terminal PTY
// ============================================================================

export {
  TerminalPtyManager,
  getTerminalPtyManager,
  writeToTerminal,
  resizeTerminal,
  killTerminalSession,
  type TerminalSession,
  type TerminalSessionConfig,
  type TerminalOutput,
  type TerminalResize,
} from './terminal-pty-runtime';

// ============================================================================
// WebSocket Server
// ============================================================================

export {
  AethelWebSocketServer,
  getWebSocketServer,
  startWebSocketServer,
  WS_MESSAGE_TYPES,
  type WsMessage,
  type WsClient,
  type WsChannel,
} from './websocket-server';

// ============================================================================
// File Watcher
// ============================================================================

export {
  FileWatcherManager,
  getFileWatcherManager,
  type FileWatcherConfig,
  type WatcherOptions,
  type FileChangeEvent,
  type FileStats,
  type WatchedWorkspace,
} from './file-watcher-runtime';

// ============================================================================
// Hot Reload / HMR
// ============================================================================

export {
  HotReloadManager,
  getHotReloadManager,
  disableHotReload,
  type HotReloadConfig,
  type ModuleUpdate,
  type HotReloadState,
} from './hot-reload-runtime';

// ============================================================================
// Git Service
// ============================================================================

export {
  GitService,
  getGitService,
  destroyGitService,
  type GitStatus,
  type GitCommit,
  type GitBranch,
  type GitRemote,
  type GitStash,
  type GitDiff,
  type GitBlame,
} from './git-service';

// ============================================================================
// Extension Host
// ============================================================================

export {
  ExtensionHostRuntime,
  getExtensionHost,
  destroyExtensionHost,
  type ExtensionManifest,
  type Extension,
  type ExtensionContext,
  type ExtensionContributes,
  type ContributedCommand,
  type ContributedMenu,
  type ContributedKeybinding,
  type ContributedConfiguration,
  type ConfigurationProperty,
  type ContributedTheme,
  type ContributedIconTheme,
  type ContributedLanguage,
  type ContributedGrammar,
  type ContributedSnippet,
  type ContributedView,
  type ContributedViewContainer,
  type ContributedTaskDefinition,
  type ContributedDebugger,
  type ContributedBreakpoint,
  type ContributedCustomEditor,
  type ContributedWebviewPanel,
} from './extension-host-runtime';

// ============================================================================
// LSP Runtime
// ============================================================================

export {
  getOrCreateLspSession,
  type LspSessionKey,
} from './lsp-runtime';

// ============================================================================
// DAP Runtime
// ============================================================================

export {
  startDapSession,
  getDapSession,
  stopDapSession,
  drainDapEvents,
  dapRequest,
  type DapSessionId,
  type DapSession,
} from './dap-runtime';

// ============================================================================
// Bootstrap
// ============================================================================

export {
  bootstrap,
  shutdown,
  getStatus,
} from './bootstrap';

// ============================================================================
// Search Runtime
// ============================================================================

export {
  SearchRuntime,
  getSearchRuntime,
  type SearchOptions,
  type SearchMatch,
  type SearchResult,
  type ReplaceOptions,
  type ReplaceResult,
  type FileSearchOptions,
  type FileMatch,
} from './search-runtime';

// ============================================================================
// Build Runtime
// ============================================================================

export {
  BuildRuntime,
  getBuildRuntime,
  type BuildConfig,
  type BuildTool,
  type BuildPlatform,
  type BuildProgress,
  type BuildDiagnostic,
  type BuildArtifact,
  type BuildResult,
  type EsbuildOptions,
  type TypeScriptOptions,
  type WebpackOptions,
  type ViteOptions,
  type CargoOptions,
} from './build-runtime';

// ============================================================================
// File System Runtime
// ============================================================================

export {
  FileSystemRuntime,
  getFileSystemRuntime,
  type FileInfo,
  type DirectoryListing,
  type FileContent,
  type WriteOptions,
  type CopyOptions,
  type MoveOptions,
  type WatchOptions,
  type FileChange,
} from './filesystem-runtime';

// ============================================================================
// Extension Marketplace Runtime
// ============================================================================

export {
  ExtensionMarketplaceRuntime,
  getMarketplaceRuntime,
  type Extension as MarketplaceExtension,
  type ExtensionVersion,
  type InstalledExtension,
  type ExtensionManifest as MarketplaceManifest,
  type SearchResult as MarketplaceSearchResult,
  type InstallResult,
} from './marketplace-runtime';

// ============================================================================
// Workspace Path Utility
// ============================================================================

export { resolveWorkspaceRoot } from './workspace-path';
