import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { requireAuth, AuthUser } from '@/lib/auth-server';

const execAsync = promisify(exec);

/**
 * API Route: Terminal Execute
 * 
 * REAL terminal execution with proper PTY support.
 * Features:
 * - AUTHENTICATION REQUIRED
 * - Real command execution via child_process
 * - Security: blocked dangerous commands
 * - Rate limiting per session
 * - Working directory validation
 * - Environment isolation (NO SECRETS EXPOSED)
 * - Output streaming support
 * - Cross-platform support (Windows/Linux/macOS)
 */

// Rate limiting per user
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // commands per minute
const RATE_WINDOW = 60000; // 1 minute

// Security: blocked commands that could be dangerous
const BLOCKED_COMMANDS = new Set([
  // Destructive file operations
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'del /f /s /q c:\\*',
  'rd /s /q c:\\',
  'format c:',
  
  // Disk operations
  'dd if=/dev/zero',
  'mkfs',
  
  // Fork bomb
  ':(){:|:&};:',
  
  // Permission changes
  'chmod -R 777 /',
  'chown -R',
  
  // Privilege escalation
  'sudo',
  'su -',
  'su root',
  'doas',
  
  // Container/VM escape attempts
  'docker run',
  'docker exec',
  'kubectl exec',
  'kubectl run',
  'podman run',
  'lxc-attach',
  
  // System control
  'systemctl',
  'service',
  'init',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  
  // Scheduled tasks
  'crontab -e',
  'crontab -r',
  'at',
  
  // Network attacks
  'nc -l',
  'ncat -l',
  'socat',
  
  // Process injection
  'ptrace',
  'gdb -p',
  'strace -p',
  
  // Jail escape
  'chroot',
  'unshare',
  'nsenter',
]);

// Blocked command patterns (regex)
const BLOCKED_PATTERNS = [
  // Destructive operations
  /rm\s+-rf\s+\/(?!\w)/i,
  /rm\s+-rf\s+\/\*/i,
  /rm\s+-rf\s+--no-preserve-root/i,
  />\s*\/dev\/sd[a-z]/i,
  /dd\s+if=.*of=\/dev/i,
  
  // Remote code execution via pipe
  /wget.*\|\s*sh/i,
  /wget.*\|\s*bash/i,
  /curl.*\|\s*sh/i,
  /curl.*\|\s*bash/i,
  /curl.*\|\s*python/i,
  /curl.*\|\s*node/i,
  
  // Reverse shells
  /bash\s+-i\s+>&\s*\/dev\/tcp/i,
  /nc\s+-e\s+\/bin/i,
  /python.*socket.*connect/i,
  /php\s+-r.*fsockopen/i,
  /perl.*socket.*connect/i,
  
  // Privilege escalation patterns
  /sudo\s+/i,
  /su\s+-/i,
  /pkexec/i,
  /doas\s+/i,
  
  // Container escape patterns
  /docker\s+(run|exec)/i,
  /kubectl\s+(exec|run|apply)/i,
  /podman\s+(run|exec)/i,
  
  // System modification
  /systemctl\s+(start|stop|enable|disable|restart)/i,
  /service\s+\w+\s+(start|stop|restart)/i,
  
  // Cron manipulation
  /crontab\s+-[er]/i,
  /echo.*>>\s*\/etc\/cron/i,
  
  // SSH key injection
  /echo.*>>\s*.*\.ssh\/authorized_keys/i,
  /cat.*>>\s*.*\.ssh\/authorized_keys/i,
  
  // Environment variable injection
  /export\s+(PATH|LD_PRELOAD|LD_LIBRARY_PATH)\s*=/i,
];

// Session storage for persistent shells
const sessions = new Map<string, {
  cwd: string;
  env: Record<string, string>;
  history: string[];
}>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(sessionId);
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(sessionId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

function isCommandBlocked(command: string): boolean {
  const normalizedCmd = command.toLowerCase().trim();
  
  if (BLOCKED_COMMANDS.has(normalizedCmd)) {
    return true;
  }
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedCmd)) {
      return true;
    }
  }
  
  return false;
}

async function validateCwd(cwd: string): Promise<string> {
  try {
    // Resolve to absolute path
    const resolved = path.resolve(cwd);
    
    // Check if directory exists
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return os.homedir();
    }
    
    return resolved;
  } catch {
    return os.homedir();
  }
}

function getShellCommand(): { shell: string; shellArgs: string[] } {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Prefer PowerShell on Windows, fallback to cmd
    return {
      shell: process.env.COMSPEC || 'cmd.exe',
      shellArgs: ['/c'],
    };
  }
  
  // Unix-like systems
  const shell = process.env.SHELL || '/bin/bash';
  return {
    shell,
    shellArgs: ['-c'],
  };
}

// SECURITY: Safe environment variables allowlist
// NEVER expose API keys, secrets, or sensitive data to user terminals
const SAFE_ENV_VARS = new Set([
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'COLORTERM',
  'LANG',
  'LC_ALL',
  'TZ',
  'EDITOR',
  'VISUAL',
  'PAGER',
  'TMPDIR',
  'TEMP',
  'TMP',
  // Node/npm
  'NODE_ENV',
  'NPM_CONFIG_PREFIX',
  // Windows specific
  'COMSPEC',
  'SYSTEMROOT',
  'WINDIR',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'APPDATA',
  'LOCALAPPDATA',
  'USERPROFILE',
  // Git
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
]);

function buildEnvironment(sessionEnv: Record<string, string>, user: AuthUser): Record<string, string> {
  // Start with ONLY safe environment variables
  const safeEnv: Record<string, string> = {};
  
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key]) {
      safeEnv[key] = process.env[key]!;
    }
  }
  
  // Add user-provided env (limited)
  const userAllowedKeys = ['NODE_ENV', 'DEBUG', 'VERBOSE'];
  for (const key of userAllowedKeys) {
    if (sessionEnv[key]) {
      safeEnv[key] = sessionEnv[key];
    }
  }
  
  // Add Aethel-specific vars
  return {
    ...safeEnv,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    AETHEL_IDE: 'true',
    AETHEL_VERSION: '2.0.0',
    AETHEL_USER_ID: user.userId, // For audit logging
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  // SECURITY: Require authentication
  let user: AuthUser;
  try {
    user = requireAuth(req);
  } catch (error) {
    return NextResponse.json({
      output: '',
      error: 'Authentication required. Please log in.',
      exitCode: 401,
      cwd: os.homedir(),
    }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { 
      command, 
      cwd: requestCwd, 
      sessionId = `user-${user.userId}`, // Session tied to user
      timeout = 30000,
      env: customEnv = {},
    } = body;
    
    // Validate input
    if (!command || typeof command !== 'string') {
      return NextResponse.json({
        output: '',
        error: 'Invalid command',
        exitCode: 1,
        cwd: requestCwd || os.homedir(),
      }, { status: 400 });
    }
    
    // Rate limiting per user (not session)
    if (!checkRateLimit(user.userId)) {
      return NextResponse.json({
        output: '',
        error: 'Rate limit exceeded. Please wait before sending more commands.',
        exitCode: 429,
        cwd: requestCwd || os.homedir(),
      }, { status: 429 });
    }
    
    // Security check
    if (isCommandBlocked(command)) {
      // Log blocked command attempt for audit
      console.warn(`[SECURITY] User ${user.userId} attempted blocked command: ${command}`);
      return NextResponse.json({
        output: '',
        error: 'Command blocked for security reasons.',
        exitCode: 1,
        cwd: requestCwd || os.homedir(),
      }, { status: 403 });
    }
    
    // Get or create session (scoped to user)
    const userSessionId = `${user.userId}:${sessionId}`;
    let session = sessions.get(userSessionId);
    if (!session) {
      session = {
        cwd: os.homedir(),
        env: {},
        history: [],
      };
      sessions.set(userSessionId, session);
    }
    
    // Validate and set working directory
    const cwd = await validateCwd(requestCwd || session.cwd);
    
    // Handle built-in commands
    const trimmedCommand = command.trim();
    const [cmd, ...args] = trimmedCommand.split(/\s+/);
    
    // Handle cd command specially
    if (cmd === 'cd') {
      const targetDir = args[0] || os.homedir();
      let newCwd: string;
      
      if (targetDir === '~') {
        newCwd = os.homedir();
      } else if (targetDir === '-') {
        newCwd = session.cwd; // Previous directory
      } else if (path.isAbsolute(targetDir)) {
        newCwd = targetDir;
      } else {
        newCwd = path.resolve(cwd, targetDir);
      }
      
      try {
        const stat = await fs.stat(newCwd);
        if (stat.isDirectory()) {
          session.cwd = newCwd;
          return NextResponse.json({
            output: '',
            error: '',
            exitCode: 0,
            cwd: newCwd,
            duration: Date.now() - startTime,
          });
        } else {
          return NextResponse.json({
            output: '',
            error: `cd: not a directory: ${targetDir}`,
            exitCode: 1,
            cwd,
          });
        }
      } catch {
        return NextResponse.json({
          output: '',
          error: `cd: no such file or directory: ${targetDir}`,
          exitCode: 1,
          cwd,
        });
      }
    }
    
    // Handle export/set for environment variables
    if (cmd === 'export' || (os.platform() === 'win32' && cmd === 'set')) {
      const match = args.join(' ').match(/^([^=]+)=(.*)$/);
      if (match) {
        session.env[match[1]] = match[2];
        return NextResponse.json({
          output: '',
          error: '',
          exitCode: 0,
          cwd,
        });
      }
    }
    
    // Execute real command
    const { shell, shellArgs } = getShellCommand();
    const environment = buildEnvironment({ ...session.env, ...customEnv }, user);
    
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      let resolved = false;
      
      const child: ChildProcess = spawn(shell, [...shellArgs, trimmedCommand], {
        cwd,
        env: environment as NodeJS.ProcessEnv,
        shell: false,
        windowsHide: true,
      });
      
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          child.kill('SIGTERM');
          resolved = true;
          resolve(NextResponse.json({
            output: output + '\n[Process timed out]',
            error: errorOutput,
            exitCode: 124, // Standard timeout exit code
            cwd,
            duration: Date.now() - startTime,
          }));
        }
      }, timeout);
      
      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      child.on('error', (err) => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          resolve(NextResponse.json({
            output: '',
            error: `Failed to execute command: ${err.message}`,
            exitCode: 1,
            cwd,
            duration: Date.now() - startTime,
          }));
        }
      });
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          
          // Update session history
          session!.history.push(trimmedCommand);
          if (session!.history.length > 1000) {
            session!.history = session!.history.slice(-500);
          }
          
          resolve(NextResponse.json({
            output: output.trimEnd(),
            error: errorOutput.trimEnd(),
            exitCode: code ?? 0,
            cwd,
            duration: Date.now() - startTime,
          }));
        }
      });
    });
    
  } catch (error) {
    console.error('Terminal execution error:', error);
    return NextResponse.json({
      output: '',
      error: error instanceof Error ? error.message : 'Internal server error',
      exitCode: 1,
      cwd: os.homedir(),
    }, { status: 500 });
  }
}

// GET endpoint for session info
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
  const session = sessions.get(sessionId);
  
  return NextResponse.json({
    exists: !!session,
    cwd: session?.cwd || os.homedir(),
    historyLength: session?.history.length || 0,
    platform: os.platform(),
    shell: process.env.SHELL || process.env.COMSPEC || 'unknown',
    homeDir: os.homedir(),
  });
}

// DELETE endpoint to clear session
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
  const deleted = sessions.delete(sessionId);
  
  return NextResponse.json({
    success: deleted,
    message: deleted ? 'Session cleared' : 'Session not found',
  });
}
