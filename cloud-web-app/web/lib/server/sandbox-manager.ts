/**
 * Docker Container Sandbox Manager
 * 
 * Security-critical component that creates isolated containers for each terminal session.
 * Each user gets their own ephemeral container with resource limits and network isolation.
 * 
 * SECURITY MODEL:
 * - Each terminal session = 1 ephemeral container
 * - Container is destroyed on disconnect
 * - Resource limits enforced (CPU, memory, pids)
 * - Network isolation (no direct external access)
 * - Read-only root filesystem
 * - No privileged operations
 */

import { spawn, ChildProcess, execFile } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

export interface SandboxConfig {
  userId: string;
  workspaceId: string;
  workspacePath: string;
  sessionId?: string;
  image?: string;
  cpuLimit?: string;      // e.g., "0.5" = 50% of 1 CPU
  memoryLimit?: string;   // e.g., "512m"
  pidsLimit?: number;     // Max processes
  timeout?: number;       // Container lifetime in seconds
  networkMode?: 'none' | 'isolated' | 'bridge';
}

export interface SandboxSession {
  containerId: string;
  containerName: string;
  userId: string;
  workspaceId: string;
  sessionId: string;
  createdAt: Date;
  process?: ChildProcess;
  isActive: boolean;
}

const DEFAULT_IMAGE = 'ghcr.io/aethel-engine/sandbox:latest';
const CONTAINER_PREFIX = 'aethel-sandbox';
const MAX_SESSIONS_PER_USER = 5;
const DEFAULT_TIMEOUT = 3600; // 1 hour
const CLEANUP_INTERVAL = 60000; // 1 minute

// Resource limits by tier
const RESOURCE_LIMITS = {
  free: {
    cpu: '0.25',
    memory: '256m',
    pids: 50,
    timeout: 1800, // 30 minutes
  },
  pro: {
    cpu: '1.0',
    memory: '1g',
    pids: 200,
    timeout: 7200, // 2 hours
  },
  enterprise: {
    cpu: '2.0',
    memory: '4g',
    pids: 500,
    timeout: 28800, // 8 hours
  },
};

class DockerSandboxManager extends EventEmitter {
  private sessions: Map<string, SandboxSession> = new Map();
  private userSessionCount: Map<string, number> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private isAvailable: boolean = false;

  constructor() {
    super();
    this.checkDockerAvailability();
    this.startCleanupLoop();
  }

  /**
   * Check if Docker daemon is available
   */
  private async checkDockerAvailability(): Promise<void> {
    try {
      await execFileAsync('docker', ['info'], { timeout: 5000 });
      this.isAvailable = true;
      console.log('[Sandbox] Docker daemon is available');
    } catch (error) {
      this.isAvailable = false;
      console.warn('[Sandbox] Docker not available, falling back to direct execution');
    }
  }

  /**
   * Get resource limits based on user tier
   */
  private getLimitsForTier(tier: 'free' | 'pro' | 'enterprise' = 'free') {
    return RESOURCE_LIMITS[tier] || RESOURCE_LIMITS.free;
  }

  /**
   * Generate a unique container name
   */
  private generateContainerName(userId: string, workspaceId: string): string {
    const suffix = randomBytes(4).toString('hex');
    // Sanitize IDs for Docker naming rules
    const safeUser = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return `${CONTAINER_PREFIX}-${safeUser}-${safeWorkspace}-${suffix}`;
  }

  /**
   * Create a new sandboxed container for terminal session
   */
  async createSandbox(config: SandboxConfig, tier: 'free' | 'pro' | 'enterprise' = 'free'): Promise<SandboxSession> {
    // Check user session limit
    const currentCount = this.userSessionCount.get(config.userId) || 0;
    if (currentCount >= MAX_SESSIONS_PER_USER) {
      throw new Error(`Maximum sessions (${MAX_SESSIONS_PER_USER}) reached for user`);
    }

    const sessionId = config.sessionId || randomBytes(16).toString('hex');
    const containerName = this.generateContainerName(config.userId, config.workspaceId);
    const limits = this.getLimitsForTier(tier);

    // Build Docker run arguments
    const dockerArgs = [
      'run',
      '--rm',                                    // Auto-remove on exit
      '-d',                                      // Detached mode for creation
      '--name', containerName,
      
      // Resource limits
      '--cpus', config.cpuLimit || limits.cpu,
      '--memory', config.memoryLimit || limits.memory,
      '--pids-limit', String(config.pidsLimit || limits.pids),
      
      // Security
      '--read-only',                             // Read-only root filesystem
      '--security-opt', 'no-new-privileges',     // No privilege escalation
      '--cap-drop', 'ALL',                       // Drop all capabilities
      '--cap-add', 'CHOWN',                      // Allow chown for npm/pip
      '--cap-add', 'SETUID',                     // Allow setuid for su
      '--cap-add', 'SETGID',                     // Allow setgid
      
      // Network isolation
      '--network', config.networkMode === 'bridge' ? 'bridge' : 'none',
      
      // User namespace mapping
      '--userns', 'host',                        // Or configure user namespace
      
      // Tmpfs for writable directories
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m',
      '--tmpfs', '/home/sandbox:rw,noexec,nosuid,size=500m',
      
      // Mount workspace (read-write)
      '-v', `${config.workspacePath}:/workspace:rw`,
      
      // Working directory
      '-w', '/workspace',
      
      // Labels for management
      '--label', `aethel.userId=${config.userId}`,
      '--label', `aethel.workspaceId=${config.workspaceId}`,
      '--label', `aethel.sessionId=${sessionId}`,
      '--label', `aethel.createdAt=${new Date().toISOString()}`,
      
      // Timeout (kill container after timeout)
      '--stop-timeout', '10',
      
      // Environment
      '-e', 'HOME=/home/sandbox',
      '-e', 'USER=sandbox',
      '-e', 'TERM=xterm-256color',
      '-e', `AETHEL_SESSION_ID=${sessionId}`,
      '-e', `AETHEL_WORKSPACE_ID=${config.workspaceId}`,
      
      // Image
      config.image || DEFAULT_IMAGE,
      
      // Keep container alive
      'sleep', String(config.timeout || limits.timeout),
    ];

    try {
      // Create the container
      const { stdout } = await execFileAsync('docker', dockerArgs, {
        timeout: 30000,
      });

      const containerId = stdout.trim();

      const session: SandboxSession = {
        containerId,
        containerName,
        userId: config.userId,
        workspaceId: config.workspaceId,
        sessionId,
        createdAt: new Date(),
        isActive: true,
      };

      this.sessions.set(sessionId, session);
      this.userSessionCount.set(config.userId, currentCount + 1);

      console.log(`[Sandbox] Created container ${containerName} for user ${config.userId}`);
      this.emit('sandbox:created', session);

      // Set timeout to destroy container
      setTimeout(() => {
        this.destroySandbox(sessionId).catch(console.error);
      }, (config.timeout || limits.timeout) * 1000);

      return session;
    } catch (error) {
      console.error('[Sandbox] Failed to create container:', error);
      throw new Error('Failed to create sandbox container');
    }
  }

  /**
   * Execute a command in a sandbox container
   */
  async executeInSandbox(
    sessionId: string,
    command: string,
    onData: (data: string) => void,
    onError: (error: string) => void,
    onExit: (code: number) => void
  ): Promise<ChildProcess> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Sandbox session not found or inactive');
    }

    // Execute command inside the container
    const dockerExec = spawn('docker', [
      'exec',
      '-i',                          // Interactive mode
      '-e', 'TERM=xterm-256color',   // Terminal type
      session.containerName,
      '/bin/bash', '-c', command,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    session.process = dockerExec;

    dockerExec.stdout.on('data', (data) => onData(data.toString()));
    dockerExec.stderr.on('data', (data) => onError(data.toString()));
    dockerExec.on('exit', (code) => {
      session.process = undefined;
      onExit(code || 0);
    });

    return dockerExec;
  }

  /**
   * Get an interactive shell in the sandbox
   */
  async getInteractiveShell(sessionId: string): Promise<ChildProcess> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Sandbox session not found or inactive');
    }

    // Start interactive bash shell
    const shell = spawn('docker', [
      'exec',
      '-it',
      '-e', 'TERM=xterm-256color',
      session.containerName,
      '/bin/bash',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    session.process = shell;

    shell.on('exit', () => {
      session.process = undefined;
    });

    return shell;
  }

  /**
   * Write data to the sandbox's stdin
   */
  writeToSandbox(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.process?.stdin?.writable) {
      return false;
    }
    return session.process.stdin.write(data);
  }

  /**
   * Resize the terminal in the sandbox
   */
  async resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return;
    }

    // Note: Docker exec resize requires the container to have stty
    try {
      await execFileAsync('docker', [
        'exec', session.containerName,
        'stty', 'cols', String(cols), 'rows', String(rows),
      ], { timeout: 5000 });
    } catch (error) {
      // Resize is best-effort, don't throw
      console.warn('[Sandbox] Failed to resize terminal:', error);
    }
  }

  /**
   * Destroy a sandbox container
   */
  async destroySandbox(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.isActive = false;

    // Kill any running process
    if (session.process) {
      session.process.kill('SIGTERM');
    }

    // Stop and remove container
    try {
      await execFileAsync('docker', ['stop', '-t', '5', session.containerName], {
        timeout: 10000,
      });
    } catch (error) {
      // Container might already be stopped
      console.warn('[Sandbox] Container already stopped:', session.containerName);
    }

    // Update tracking
    this.sessions.delete(sessionId);
    const currentCount = this.userSessionCount.get(session.userId) || 1;
    this.userSessionCount.set(session.userId, Math.max(0, currentCount - 1));

    console.log(`[Sandbox] Destroyed container ${session.containerName}`);
    this.emit('sandbox:destroyed', session);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SandboxSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): SandboxSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if sandbox mode is available
   */
  get isSandboxAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Periodic cleanup of stale containers
   */
  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(async () => {
      if (!this.isAvailable) return;

      try {
        // List all aethel sandbox containers
        const { stdout } = await execFileAsync('docker', [
          'ps', '-a',
          '--filter', `name=${CONTAINER_PREFIX}`,
          '--format', '{{.Names}} {{.Status}}',
        ], { timeout: 10000 });

        const lines = stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const [name, ...statusParts] = line.split(' ');
          const status = statusParts.join(' ');

          // Find session by container name
          const session = Array.from(this.sessions.values())
            .find(s => s.containerName === name);

          // If container exists but not in our sessions, or if it's exited, clean up
          if (!session || status.includes('Exited')) {
            try {
              await execFileAsync('docker', ['rm', '-f', name], { timeout: 5000 });
              console.log(`[Sandbox] Cleaned up orphaned container: ${name}`);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      } catch (error) {
        console.error('[Sandbox] Cleanup error:', error);
      }
    }, CLEANUP_INTERVAL);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destroy all active sessions
    const sessions = Array.from(this.sessions.keys());
    await Promise.all(sessions.map(id => this.destroySandbox(id)));

    console.log('[Sandbox] Manager shut down');
  }
}

// Singleton instance
export const sandboxManager = new DockerSandboxManager();

// Graceful shutdown on process exit
process.on('SIGTERM', () => sandboxManager.shutdown());
process.on('SIGINT', () => sandboxManager.shutdown());
