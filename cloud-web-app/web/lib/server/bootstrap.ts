/**
 * Aethel Engine - Server Bootstrap
 * 
 * Script de inicialização do servidor de runtime.
 * Inicia WebSocket server, file watcher e hot reload.
 */

import { startWebSocketServer, AethelWebSocketServer } from './websocket-server';
import { getFileWatcherManager, FileWatcherManager } from './file-watcher-runtime';
import { getHotReloadManager, HotReloadManager } from './hot-reload-runtime';
import { getTerminalPtyManager, TerminalPtyManager } from './terminal-pty-runtime';
import * as path from 'path';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('server/bootstrap')

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  wsPort?: number;
  workspacePath?: string;
  enableHotReload?: boolean;
  enableFileWatcher?: boolean;
  debug?: boolean;
}

const defaultConfig: Required<ServerConfig> = {
  wsPort: parseInt(process.env.AETHEL_WS_PORT || '3001'),
  workspacePath: process.env.AETHEL_WORKSPACE_PATH || process.cwd(),
  enableHotReload: process.env.AETHEL_HOT_RELOAD !== 'false',
  enableFileWatcher: process.env.AETHEL_FILE_WATCHER !== 'false',
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================================
// Server State
// ============================================================================

interface ServerState {
  wsServer: AethelWebSocketServer | null;
  fileWatcher: FileWatcherManager | null;
  hotReload: HotReloadManager | null;
  terminalManager: TerminalPtyManager | null;
  isRunning: boolean;
  startTime: number | null;
}

const state: ServerState = {
  wsServer: null,
  fileWatcher: null,
  hotReload: null,
  terminalManager: null,
  isRunning: false,
  startTime: null,
};

// ============================================================================
// Bootstrap
// ============================================================================

export async function bootstrap(config: ServerConfig = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };
  
  log.info('═'.repeat(60));
  log.info('  🚀 Aethel Engine Runtime Server');
  log.info('═'.repeat(60));
  log.info(`  Port: ${finalConfig.wsPort}`);
  log.info(`  Workspace: ${finalConfig.workspacePath}`);
  log.info(`  Hot Reload: ${finalConfig.enableHotReload ? 'Enabled' : 'Disabled'}`);
  log.info(`  File Watcher: ${finalConfig.enableFileWatcher ? 'Enabled' : 'Disabled'}`);
  log.info('═'.repeat(60));
  
  try {
    // 1. Start WebSocket Server
    log.info('\n📡 Starting WebSocket server...');
    state.wsServer = await startWebSocketServer(finalConfig.wsPort);
    log.info(`   ✓ WebSocket server running on port ${finalConfig.wsPort}`);
    
    // 2. Initialize Terminal PTY Manager
    log.info('\n💻 Initializing Terminal PTY Manager...');
    state.terminalManager = getTerminalPtyManager();
    log.info('   ✓ Terminal PTY Manager ready');
    
    // 3. Initialize File Watcher
    if (finalConfig.enableFileWatcher) {
      log.info('\n👁️  Initializing File Watcher...');
      state.fileWatcher = getFileWatcherManager();
      
      // Watch workspace
      await state.fileWatcher.watch({
        workspaceId: 'main',
        paths: [finalConfig.workspacePath],
        options: {
          ignoreInitial: true,
          depth: 10,
        },
      });
      
      log.info('   ✓ File Watcher active');
    }
    
    // 4. Initialize Hot Reload
    if (finalConfig.enableHotReload) {
      log.info('\n🔥 Initializing Hot Reload...');
      state.hotReload = getHotReloadManager();
      
      await state.hotReload.enable({
        workspaceId: 'main',
        workspacePath: finalConfig.workspacePath,
        watchPaths: ['src', 'app', 'pages', 'components', 'lib', 'styles'],
        hmrEnabled: true,
        fastRefresh: true,
      });
      
      log.info('   ✓ Hot Reload enabled');
    }
    
    state.isRunning = true;
    state.startTime = Date.now();
    
    log.info('\n' + '═'.repeat(60));
    log.info('  ✅ Aethel Engine Runtime Server is ready!');
    log.info('═'.repeat(60));
    log.info(`\n  WebSocket: ws://localhost:${finalConfig.wsPort}`);
    log.info(`  Health: http://localhost:${finalConfig.wsPort}/health`);
    log.info('\n  Press Ctrl+C to stop the server.\n');
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    await shutdown();
    throw error;
  }
}

// ============================================================================
// Shutdown
// ============================================================================

export async function shutdown(): Promise<void> {
  log.info('\n🛑 Shutting down Aethel Engine Runtime Server...');
  
  // Stop hot reload
  if (state.hotReload) {
    log.info('   Stopping Hot Reload...');
    state.hotReload.shutdown();
    state.hotReload = null;
  }
  
  // Stop file watcher
  if (state.fileWatcher) {
    log.info('   Stopping File Watcher...');
    await state.fileWatcher.unwatchAll();
    state.fileWatcher = null;
  }
  
  // Stop terminal manager
  if (state.terminalManager) {
    log.info('   Stopping Terminal Manager...');
    await state.terminalManager.shutdown();
    state.terminalManager = null;
  }
  
  // Stop WebSocket server
  if (state.wsServer) {
    log.info('   Stopping WebSocket Server...');
    await state.wsServer.stop();
    state.wsServer = null;
  }
  
  state.isRunning = false;
  state.startTime = null;
  
  log.info('   ✓ Server stopped.\n');
}

// ============================================================================
// Status
// ============================================================================

export function getStatus(): {
  isRunning: boolean;
  uptime: number;
  wsClients: number;
  activeTerminals: number;
  watchedFiles: number;
  hotReloadUpdates: number;
} {
  return {
    isRunning: state.isRunning,
    uptime: state.startTime ? Date.now() - state.startTime : 0,
    wsClients: state.wsServer?.getStats().clients || 0,
    activeTerminals: state.terminalManager?.getAllSessions().length || 0,
    watchedFiles: state.fileWatcher?.getStats().totalPaths || 0,
    hotReloadUpdates: state.hotReload?.getState().updateCount || 0,
  };
}

// ============================================================================
// Process Handlers
// ============================================================================

function setupProcessHandlers(): void {
  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });
  
  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown().then(() => process.exit(1));
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Auto-start if run directly
if (require.main === module) {
  setupProcessHandlers();
  
  bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  });
}

export default bootstrap;
