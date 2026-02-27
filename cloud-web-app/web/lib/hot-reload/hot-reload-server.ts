/**
 * Aethel Engine - Hot Reload Server
 * 
 * Professional WebSocket-based Hot Module Replacement (HMR) server
 * for the Aethel IDE with full TypeScript support.
 * 
 * @module hot-reload-server
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { readFile, stat } from 'fs/promises';
import { createServer, Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { watch, FSWatcher, WatchOptions } from 'chokidar';
import { extname, relative, resolve, normalize } from 'path';
import { parse as parseUrl } from 'url';
import { Debouncer, FileHashCache, Logger } from './hot-reload-server-runtime-helpers';
import { generateHotReloadClientScript } from './hot-reload-client-script';
import type {
  BuildResult,
  BundlerAdapter,
  ClientInfo,
  ConnectedMessage,
  ErrorInfo,
  ErrorMessage,
  FileChangeEvent,
  FileUpdateInfo,
  HotReloadFileType,
  HotReloadMessage,
  HotReloadServerOptions,
  PingMessage,
  PongMessage,
  ReloadMessage,
  UpdateMessage,
  UpdateStrategy,
} from './hot-reload-server-types';
export type {
  BuildResult,
  BundlerAdapter,
  BundlerType,
  ClientInfo,
  ConnectedMessage,
  ConnectionState,
  ErrorInfo,
  ErrorMessage,
  FileChangeEvent,
  FileUpdateInfo,
  HotReloadEventType,
  HotReloadFileType,
  HotReloadMessage,
  HotReloadServerEvents,
  HotReloadServerOptions,
  HttpsConfig,
  PingMessage,
  PongMessage,
  ReloadMessage,
  UpdateMessage,
  UpdateStrategy,
} from './hot-reload-server-types';

/** Default configuration */
const DEFAULT_OPTIONS: HotReloadServerOptions = {
  port: 24678,
  host: 'localhost',
  root: process.cwd(),
  watchPatterns: [
    '**/*.css',
    '**/*.scss',
    '**/*.sass',
    '**/*.less',
    '**/*.js',
    '**/*.ts',
    '**/*.jsx',
    '**/*.tsx',
    '**/*.vue',
    '**/*.svelte',
    '**/*.json',
    '**/*.html'
  ],
  ignorePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.map',
    '**/.DS_Store',
    '**/Thumbs.db'
  ],
  debounceDelay: 100,
  cssHotReload: true,
  jsHMR: true,
  fullReloadFallback: true,
  errorOverlay: true,
  pingInterval: 30000,
  clientTimeout: 60000,
  publicPath: '/',
  logging: true,
  logLevel: 'info',
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  sendFileContent: true
};

// ============================================================================
// Hot Reload Server
// ============================================================================

export class HotReloadServer extends EventEmitter {
  private options: HotReloadServerOptions;
  private httpServer: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private watcher: FSWatcher | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private debouncer: Debouncer;
  private hashCache: FileHashCache;
  private logger: Logger;
  private pingIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentBuildId = '';
  private serverVersion = '1.0.0';

  constructor(options: Partial<HotReloadServerOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.debouncer = new Debouncer(this.options.debounceDelay);
    this.hashCache = new FileHashCache();
    this.logger = new Logger(this.options.logging, this.options.logLevel);
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /** Start the hot reload server */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Server is already running');
      return;
    }

    try {
      // Create HTTP server
      this.httpServer = createServer(this.handleHttpRequest.bind(this));

      // Create WebSocket server
      this.wss = new WebSocketServer({
        server: this.httpServer,
        maxPayload: this.options.maxPayloadSize,
        perMessageDeflate: true
      });

      this.setupWebSocketServer();

      // Start file watcher
      await this.startFileWatcher();

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.options.port, this.options.host, () => {
          resolve();
        });
        this.httpServer!.on('error', reject);
      });

      // Start ping interval
      this.startPingInterval();

      this.isRunning = true;
      this.logger.info(`Hot Reload Server started at ws://${this.options.host}:${this.options.port}`);
      this.emit('server-start', this.options.port);
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /** Stop the hot reload server */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Hot Reload Server...');

    // Stop ping interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Clear debouncer
    this.debouncer.clear();

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Stop file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }

    // Clear hash cache
    this.hashCache.clear();

    this.isRunning = false;
    this.emit('server-stop');
    this.logger.info('Hot Reload Server stopped');
  }

  /** Send update to all connected clients */
  async sendUpdate(files: FileUpdateInfo[], strategy?: UpdateStrategy): Promise<void> {
    const determinedStrategy = strategy || this.determineUpdateStrategy(files);
    
    const message: UpdateMessage = {
      type: 'update',
      strategy: determinedStrategy,
      files,
      timestamp: Date.now(),
      buildId: this.currentBuildId
    };

    this.broadcast(message);
    this.emit('update', message);
    this.logger.info(`Sent update (${determinedStrategy}) for ${files.length} file(s)`);
  }

  /** Trigger a full page reload for all clients */
  sendReload(reason: string): void {
    const message: ReloadMessage = {
      type: 'reload',
      reason,
      timestamp: Date.now()
    };

    this.broadcast(message);
    this.emit('reload', message);
    this.logger.info(`Triggered full reload: ${reason}`);
  }

  /** Send error to all clients for overlay display */
  sendError(error: ErrorInfo): void {
    const message: ErrorMessage = {
      type: 'error',
      error,
      timestamp: Date.now()
    };

    this.broadcast(message);
    this.emit('error', error);
    this.logger.error(`Sent error to clients: ${error.message}`);
  }

  /** Clear error overlay on all clients */
  clearError(): void {
    this.broadcast({ type: 'clear-error', timestamp: Date.now() } as any);
  }

  /** Notify build started */
  notifyBuildStart(): void {
    this.currentBuildId = this.generateBuildId();
    this.emit('build-start');
    this.broadcast({ type: 'build-start', buildId: this.currentBuildId, timestamp: Date.now() } as any);
    this.logger.debug('Build started');
  }

  /** Notify build completed */
  notifyBuildEnd(result: BuildResult): void {
    this.emit('build-end', result);
    
    if (result.errors.length > 0) {
      this.sendError(result.errors[0]);
    } else {
      this.clearError();
    }

    this.broadcast({
      type: 'build-end',
      buildId: this.currentBuildId,
      success: result.success,
      duration: result.duration,
      timestamp: Date.now()
    } as any);

    this.logger.info(`Build completed in ${result.duration}ms (${result.success ? 'success' : 'failed'})`);
  }

  /** Get connected clients count */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /** Get all connected client IDs */
  getConnectedClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /** Check if server is running */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /** Get server address */
  getAddress(): { host: string; port: number } | null {
    if (!this.isRunning) return null;
    return { host: this.options.host, port: this.options.port };
  }

  // ==========================================================================
  // Bundler Integration
  // ==========================================================================

  /** Set bundler adapter for custom integration */
  setBundlerAdapter(adapter: BundlerAdapter): void {
    this.options.bundlerAdapter = adapter;
    this.logger.info(`Bundler adapter set: ${adapter.name}`);
  }

  /** Create Webpack integration */
  static createWebpackAdapter(): BundlerAdapter {
    return {
      name: 'webpack',
      acceptsHMR: (filePath: string) => {
        const ext = extname(filePath).toLowerCase();
        return ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss', '.sass', '.less'].includes(ext);
      }
    };
  }

  /** Create Vite integration */
  static createViteAdapter(): BundlerAdapter {
    return {
      name: 'vite',
      acceptsHMR: (filePath: string) => {
        const ext = extname(filePath).toLowerCase();
        return ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.css', '.scss', '.sass', '.less'].includes(ext);
      }
    };
  }

  /** Create esbuild integration */
  static createEsbuildAdapter(): BundlerAdapter {
    return {
      name: 'esbuild',
      acceptsHMR: (filePath: string) => {
        const ext = extname(filePath).toLowerCase();
        return ['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext);
      }
    };
  }

  // ==========================================================================
  // Private Methods - WebSocket
  // ==========================================================================

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleClientConnection(socket, request);
    });

    this.wss.on('error', (error: Error) => {
      this.logger.error('WebSocket server error:', error);
    });
  }

  private handleClientConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const userAgent = request.headers['user-agent'];

    const clientInfo: ClientInfo = {
      id: clientId,
      socket,
      state: 'connected',
      connectedAt: Date.now(),
      lastPing: Date.now(),
      userAgent,
      acceptedTypes: ['css', 'js', 'ts', 'jsx', 'tsx', 'json', 'html']
    };

    this.clients.set(clientId, clientInfo);
    this.logger.info(`Client connected: ${clientId}`);

    // Send connected message
    const connectedMessage: ConnectedMessage = {
      type: 'connected',
      clientId,
      serverVersion: this.serverVersion,
      timestamp: Date.now()
    };
    this.sendToClient(clientInfo, connectedMessage);
    this.emit('connected', clientInfo);

    // Handle incoming messages
    socket.on('message', (data: RawData) => {
      this.handleClientMessage(clientInfo, data);
    });

    // Handle client disconnect
    socket.on('close', (code: number, reason: Buffer) => {
      this.handleClientDisconnect(clientInfo, code, reason.toString());
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      this.logger.error(`Client ${clientId} error:`, error);
    });
  }

  private handleClientMessage(client: ClientInfo, data: RawData): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'pong':
          client.lastPing = Date.now();
          break;

        case 'accept-types':
          if (Array.isArray(message.types)) {
            client.acceptedTypes = message.types;
          }
          break;

        case 'hmr-accept':
          this.logger.debug(`Client ${client.id} accepted HMR for: ${message.path}`);
          break;

        case 'hmr-decline':
          this.logger.debug(`Client ${client.id} declined HMR for: ${message.path}`);
          if (this.options.fullReloadFallback) {
            this.sendToClient(client, {
              type: 'reload',
              reason: 'HMR declined',
              timestamp: Date.now()
            });
          }
          break;

        case 'error':
          this.logger.error(`Client ${client.id} reported error:`, message.error);
          break;

        default:
          this.logger.debug(`Unknown message type from ${client.id}:`, message.type);
      }
    } catch (error) {
      this.logger.error(`Failed to parse message from ${client.id}:`, error);
    }
  }

  private handleClientDisconnect(client: ClientInfo, code: number, reason: string): void {
    client.state = 'disconnected';
    this.clients.delete(client.id);
    this.emit('disconnected', client.id);
    this.logger.info(`Client disconnected: ${client.id} (code: ${code}, reason: ${reason || 'none'})`);
  }

  private sendToClient(client: ClientInfo, message: HotReloadMessage | object): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error(`Failed to send message to ${client.id}:`, error);
      }
    }
  }

  private broadcast(message: HotReloadMessage | object): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(data);
        } catch (error) {
          this.logger.error(`Failed to broadcast to ${client.id}:`, error);
        }
      }
    }
  }

  private startPingInterval(): void {
    this.pingIntervalId = setInterval(() => {
      const now = Date.now();
      const pingMessage: PingMessage = { type: 'ping', timestamp: now };
      const data = JSON.stringify(pingMessage);

      for (const client of this.clients.values()) {
        // Check for timeout
        if (now - client.lastPing > this.options.clientTimeout) {
          this.logger.warn(`Client ${client.id} timed out`);
          client.socket.close(1000, 'Ping timeout');
          continue;
        }

        // Send ping
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(data);
        }
      }
    }, this.options.pingInterval);
  }

  // ==========================================================================
  // Private Methods - File Watching
  // ==========================================================================

  private async startFileWatcher(): Promise<void> {
    const watchOptions: WatchOptions = {
      ignored: this.options.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10
      },
      usePolling: false,
      interval: 100,
      binaryInterval: 300
    };

    const watchPaths = this.options.watchPatterns.map(pattern => 
      resolve(this.options.root, pattern)
    );

    this.watcher = watch(watchPaths, watchOptions);

    this.watcher.on('add', (path) => this.handleFileChange(path, 'add'));
    this.watcher.on('change', (path) => this.handleFileChange(path, 'change'));
    this.watcher.on('unlink', (path) => this.handleFileChange(path, 'unlink'));
    this.watcher.on('error', (error) => {
      this.logger.error('File watcher error:', error);
    });

    this.logger.info(`File watcher started for: ${this.options.root}`);
  }

  private async handleFileChange(filePath: string, type: 'add' | 'change' | 'unlink'): Promise<void> {
    const normalizedPath = normalize(filePath);
    const relativePath = relative(this.options.root, normalizedPath);
    const fileType = this.getFileType(normalizedPath);

    // Invalidate hash cache
    this.hashCache.invalidate(normalizedPath);

    const event: FileChangeEvent = {
      path: normalizedPath,
      relativePath,
      type,
      fileType,
      timestamp: Date.now()
    };

    // Get hash for changed/added files
    if (type !== 'unlink') {
      event.hash = await this.hashCache.getHash(normalizedPath) || undefined;
      try {
        const stats = await stat(normalizedPath);
        event.size = stats.size;
      } catch {
        // File might have been deleted
      }
    }

    this.emit('file-changed', event);
    this.logger.debug(`File ${type}: ${relativePath}`);

    // Debounce the update
    this.debouncer.debounce('file-changes', event, (events) => {
      this.processFileChanges(events);
    });
  }

  private async processFileChanges(events: FileChangeEvent[]): Promise<void> {
    if (events.length === 0) return;

    // Deduplicate by path, keeping latest event
    const uniqueEvents = new Map<string, FileChangeEvent>();
    for (const event of events) {
      uniqueEvents.set(event.path, event);
    }

    const fileUpdates: FileUpdateInfo[] = [];
    let requiresFullReload = false;
    let fullReloadReason = '';

    for (const event of uniqueEvents.values()) {
      // Check if file type supports HMR
      const acceptsHMR = this.checkHMRSupport(event);

      if (event.type === 'unlink') {
        // Deleted files typically require full reload
        requiresFullReload = true;
        fullReloadReason = `File deleted: ${event.relativePath}`;
        continue;
      }

      // Get file content if enabled
      let content: string | undefined;
      if (this.options.sendFileContent && acceptsHMR) {
        try {
          content = await readFile(event.path, 'utf-8');
        } catch {
          // File might have been deleted
        }
      }

      // Get dependencies if bundler adapter supports it
      let dependencies: string[] | undefined;
      if (this.options.bundlerAdapter?.getModuleDependencies) {
        try {
          dependencies = await this.options.bundlerAdapter.getModuleDependencies(event.path);
        } catch {
          // Ignore dependency resolution errors
        }
      }

      fileUpdates.push({
        path: event.relativePath,
        fileType: event.fileType,
        hash: event.hash || '',
        content,
        acceptsHMR,
        dependencies
      });

      // Check if this file type requires full reload
      if (!acceptsHMR && this.options.fullReloadFallback) {
        requiresFullReload = true;
        fullReloadReason = `HMR not supported for: ${event.relativePath}`;
      }
    }

    // Transform updates if bundler adapter provides transformer
    let transformedUpdates = fileUpdates;
    if (this.options.bundlerAdapter?.transformUpdate) {
      try {
        transformedUpdates = await this.options.bundlerAdapter.transformUpdate(fileUpdates);
      } catch (error) {
        this.logger.error('Bundler transform error:', error);
      }
    }

    // Determine strategy and send update
    if (requiresFullReload && this.options.fullReloadFallback) {
      this.sendReload(fullReloadReason);
    } else if (transformedUpdates.length > 0) {
      await this.sendUpdate(transformedUpdates);
    }
  }

  // ==========================================================================
  // Private Methods - Utilities
  // ==========================================================================

  private getFileType(filePath: string): HotReloadFileType {
    const ext = extname(filePath).toLowerCase();
    const typeMap: Record<string, HotReloadFileType> = {
      '.css': 'css',
      '.scss': 'css',
      '.sass': 'css',
      '.less': 'css',
      '.js': 'js',
      '.mjs': 'js',
      '.cjs': 'js',
      '.ts': 'ts',
      '.mts': 'ts',
      '.cts': 'ts',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.json': 'json',
      '.html': 'html',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };
    return typeMap[ext] || 'unknown';
  }

  private checkHMRSupport(event: FileChangeEvent): boolean {
    // CSS always supports hot reload
    if (event.fileType === 'css' && this.options.cssHotReload) {
      return true;
    }

    // Check bundler adapter
    if (this.options.bundlerAdapter?.acceptsHMR) {
      return this.options.bundlerAdapter.acceptsHMR(event.path);
    }

    // JS/TS HMR depends on configuration
    if (this.options.jsHMR) {
      return ['js', 'ts', 'jsx', 'tsx', 'vue', 'svelte'].includes(event.fileType);
    }

    return false;
  }

  private determineUpdateStrategy(files: FileUpdateInfo[]): UpdateStrategy {
    // If all files are CSS and CSS hot reload is enabled
    const allCSS = files.every(f => f.fileType === 'css');
    if (allCSS && this.options.cssHotReload) {
      return 'css-inject';
    }

    // If all files accept HMR
    const allAcceptHMR = files.every(f => f.acceptsHMR);
    if (allAcceptHMR && this.options.jsHMR) {
      return 'hmr';
    }

    // Fallback to full reload
    return 'full-reload';
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateBuildId(): string {
    return `build-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleHttpRequest(req: IncomingMessage, res: any): void {
    const url = parseUrl(req.url || '', true);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        clients: this.clients.size,
        uptime: process.uptime()
      }));
      return;
    }

    // Client script endpoint
    if (url.pathname === '/hot-reload-client.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache'
      });
      res.end(this.getClientScript());
      return;
    }

    // 404 for other requests
    res.writeHead(404);
    res.end('Not Found');
  }

  // ==========================================================================
  // Client Script
  // ==========================================================================

  /** Get the hot reload client script */
  getClientScript(): string {
    return generateHotReloadClientScript(this.options.port);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new Hot Reload Server instance */
export function createHotReloadServer(options?: Partial<HotReloadServerOptions>): HotReloadServer {
  return new HotReloadServer(options);
}

/** Create a Hot Reload Server with Webpack integration */
export function createWebpackHotReloadServer(options?: Partial<HotReloadServerOptions>): HotReloadServer {
  const server = new HotReloadServer({
    ...options,
    bundler: 'webpack'
  });
  server.setBundlerAdapter(HotReloadServer.createWebpackAdapter());
  return server;
}

/** Create a Hot Reload Server with Vite integration */
export function createViteHotReloadServer(options?: Partial<HotReloadServerOptions>): HotReloadServer {
  const server = new HotReloadServer({
    ...options,
    bundler: 'vite'
  });
  server.setBundlerAdapter(HotReloadServer.createViteAdapter());
  return server;
}

/** Create a Hot Reload Server with esbuild integration */
export function createEsbuildHotReloadServer(options?: Partial<HotReloadServerOptions>): HotReloadServer {
  const server = new HotReloadServer({
    ...options,
    bundler: 'esbuild'
  });
  server.setBundlerAdapter(HotReloadServer.createEsbuildAdapter());
  return server;
}

// ============================================================================
// Exports
// ============================================================================

export default HotReloadServer;
