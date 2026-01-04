/**
 * Aethel Engine - Terminal PTY Runtime
 * 
 * Servidor real de terminal com PTY usando node-pty.
 * Suporta múltiplas sessões, shells diferentes e streaming via WebSocket.
 */

import { spawn, type IPty } from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// ============================================================================
// Types
// ============================================================================

export interface TerminalSessionConfig {
  id: string;
  userId: string;
  name: string;
  cwd: string;
  shell?: string;
  args?: string[];
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export interface TerminalSession {
  id: string;
  userId: string;
  name: string;
  cwd: string;
  shell: string;
  pty: IPty;
  createdAt: number;
  lastActivity: number;
  isAlive: boolean;
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: number;
}

export interface TerminalResize {
  sessionId: string;
  cols: number;
  rows: number;
}

// ============================================================================
// Shell Detection
// ============================================================================

function getDefaultShell(): { shell: string; args: string[] } {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Try PowerShell first, then cmd
    const pwshPaths = [
      process.env.PWSH_PATH,
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ].filter(Boolean) as string[];
    
    for (const pwsh of pwshPaths) {
      try {
        if (pwsh && require('fs').existsSync(pwsh)) {
          return { shell: pwsh, args: ['-NoLogo'] };
        }
      } catch {}
    }
    
    return { shell: 'cmd.exe', args: [] };
  }
  
  // Unix-like systems
  const userShell = process.env.SHELL || '/bin/bash';
  return { shell: userShell, args: ['--login'] };
}

async function resolveShell(shellPath?: string): Promise<{ shell: string; args: string[] }> {
  if (!shellPath) {
    return getDefaultShell();
  }
  
  // Verify shell exists
  try {
    await fs.access(shellPath);
    return { shell: shellPath, args: [] };
  } catch {
    console.warn(`Shell not found: ${shellPath}, using default`);
    return getDefaultShell();
  }
}

// ============================================================================
// Session Store
// ============================================================================

function getGlobalSessions(): Map<string, TerminalSession> {
  const g = globalThis as any;
  if (!g.__AETHEL_TERMINAL_SESSIONS__) {
    g.__AETHEL_TERMINAL_SESSIONS__ = new Map();
  }
  return g.__AETHEL_TERMINAL_SESSIONS__;
}

// ============================================================================
// Terminal PTY Manager
// ============================================================================

export class TerminalPtyManager extends EventEmitter {
  private sessions: Map<string, TerminalSession>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxIdleTime = 30 * 60 * 1000; // 30 minutes
  private readonly maxSessions = 50;
  
  constructor() {
    super();
    this.sessions = getGlobalSessions();
    this.startCleanupInterval();
  }
  
  // ==========================================================================
  // Session Management
  // ==========================================================================
  
  async createSession(config: TerminalSessionConfig): Promise<TerminalSession> {
    // Check session limit
    const userSessions = this.getSessionsByUser(config.userId);
    if (userSessions.length >= 10) {
      // Kill oldest session
      const oldest = userSessions.sort((a, b) => a.lastActivity - b.lastActivity)[0];
      if (oldest) {
        await this.killSession(oldest.id);
      }
    }
    
    if (this.sessions.size >= this.maxSessions) {
      throw new Error('Maximum terminal sessions reached');
    }
    
    // Resolve working directory
    let cwd = config.cwd || os.homedir();
    try {
      const stat = await fs.stat(cwd);
      if (!stat.isDirectory()) {
        cwd = os.homedir();
      }
    } catch {
      cwd = os.homedir();
    }
    
    // Resolve shell
    const { shell, args } = await resolveShell(config.shell);
    const shellArgs = config.args || args;
    
    // Build environment
    const env = {
      ...process.env,
      ...config.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
      HOME: os.homedir(),
      AETHEL_TERMINAL: '1',
      AETHEL_SESSION_ID: config.id,
    };
    
    // Create PTY
    const pty = spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cwd,
      env: env as Record<string, string>,
      cols: config.cols || 120,
      rows: config.rows || 30,
    });
    
    const session: TerminalSession = {
      id: config.id,
      userId: config.userId,
      name: config.name || `Terminal ${this.sessions.size + 1}`,
      cwd,
      shell,
      pty,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isAlive: true,
    };
    
    // Setup event handlers
    pty.onData((data: string) => {
      session.lastActivity = Date.now();
      this.emit('data', {
        sessionId: session.id,
        data,
        timestamp: Date.now(),
      } as TerminalOutput);
    });
    
    pty.onExit(({ exitCode, signal }) => {
      session.isAlive = false;
      this.emit('exit', {
        sessionId: session.id,
        exitCode,
        signal,
      });
      // Don't remove immediately, allow reconnect
      setTimeout(() => {
        if (!session.isAlive) {
          this.sessions.delete(session.id);
        }
      }, 5000);
    });
    
    this.sessions.set(config.id, session);
    this.emit('created', { sessionId: session.id });
    
    return session;
  }
  
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getSessionsByUser(userId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }
  
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }
  
  async killSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    try {
      session.pty.kill();
      session.isAlive = false;
    } catch (error) {
      console.error(`Failed to kill session ${sessionId}:`, error);
    }
    
    this.sessions.delete(sessionId);
    this.emit('killed', { sessionId });
    
    return true;
  }
  
  // ==========================================================================
  // PTY Operations
  // ==========================================================================
  
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isAlive) return false;
    
    try {
      session.pty.write(data);
      session.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`Write failed for session ${sessionId}:`, error);
      return false;
    }
  }
  
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isAlive) return false;
    
    try {
      session.pty.resize(cols, rows);
      this.emit('resized', { sessionId, cols, rows } as TerminalResize);
      return true;
    } catch (error) {
      console.error(`Resize failed for session ${sessionId}:`, error);
      return false;
    }
  }
  
  // ==========================================================================
  // Shell Operations
  // ==========================================================================
  
  async executeCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isAlive) {
      throw new Error('Session not found or not alive');
    }
    
    // Write command with newline
    session.pty.write(command + '\r');
    session.lastActivity = Date.now();
  }
  
  sendSignal(sessionId: string, signal: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isAlive) return false;
    
    try {
      // Send signal as control character
      switch (signal.toUpperCase()) {
        case 'SIGINT':
        case 'INT':
          session.pty.write('\x03'); // Ctrl+C
          break;
        case 'SIGTSTP':
        case 'TSTP':
          session.pty.write('\x1a'); // Ctrl+Z
          break;
        case 'SIGQUIT':
        case 'QUIT':
          session.pty.write('\x1c'); // Ctrl+\
          break;
        case 'EOF':
          session.pty.write('\x04'); // Ctrl+D
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Signal failed for session ${sessionId}:`, error);
      return false;
    }
  }
  
  clearScreen(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isAlive) return false;
    
    // Send clear screen escape sequence
    session.pty.write('\x1b[2J\x1b[H');
    return true;
  }
  
  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [id, session] of this.sessions) {
        // Clean up dead sessions
        if (!session.isAlive) {
          this.sessions.delete(id);
          continue;
        }
        
        // Clean up idle sessions
        if (now - session.lastActivity > this.maxIdleTime) {
          console.log(`Cleaning up idle terminal session: ${id}`);
          this.killSession(id);
        }
      }
    }, 60000); // Check every minute
  }
  
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  async shutdown(): Promise<void> {
    this.stopCleanup();
    
    const killPromises = Array.from(this.sessions.keys()).map(id => this.killSession(id));
    await Promise.all(killPromises);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _manager: TerminalPtyManager | null = null;

export function getTerminalPtyManager(): TerminalPtyManager {
  if (!_manager) {
    _manager = new TerminalPtyManager();
  }
  return _manager;
}

export async function createTerminalSession(
  config: TerminalSessionConfig
): Promise<TerminalSession> {
  const manager = getTerminalPtyManager();
  return manager.createSession(config);
}

export function writeToTerminal(sessionId: string, data: string): boolean {
  const manager = getTerminalPtyManager();
  return manager.write(sessionId, data);
}

export function resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
  const manager = getTerminalPtyManager();
  return manager.resize(sessionId, cols, rows);
}

export function killTerminalSession(sessionId: string): Promise<boolean> {
  const manager = getTerminalPtyManager();
  return manager.killSession(sessionId);
}

export default getTerminalPtyManager;
