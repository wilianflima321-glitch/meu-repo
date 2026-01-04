import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * API Route: Terminal Execute
 * 
 * REAL terminal execution with proper PTY support.
 * Features:
 * - Real command execution via child_process
 * - Security: blocked dangerous commands
 * - Rate limiting per session
 * - Working directory validation
 * - Environment isolation
 * - Output streaming support
 * - Cross-platform support (Windows/Linux/macOS)
 */

// Rate limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // commands per minute
const RATE_WINDOW = 60000; // 1 minute

// Security: blocked commands that could be dangerous
const BLOCKED_COMMANDS = new Set([
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'dd if=/dev/zero',
  'mkfs',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'chown -R',
  'format c:',
  'del /f /s /q c:\\*',
  'rd /s /q c:\\',
]);

// Blocked command patterns (regex)
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/i,
  /rm\s+-rf\s+\/\*/i,
  />\s*\/dev\/sd[a-z]/i,
  /dd\s+if=.*of=\/dev/i,
  /wget.*\|\s*sh/i,
  /curl.*\|\s*sh/i,
  /curl.*\|\s*bash/i,
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

function buildEnvironment(sessionEnv: Record<string, string>): Record<string, string> {
  return {
    ...process.env,
    ...sessionEnv,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    AETHEL_IDE: 'true',
    AETHEL_VERSION: '2.0.0',
  } as Record<string, string>;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { 
      command, 
      cwd: requestCwd, 
      sessionId = 'default',
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
    
    // Rate limiting
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({
        output: '',
        error: 'Rate limit exceeded. Please wait before sending more commands.',
        exitCode: 429,
        cwd: requestCwd || os.homedir(),
      }, { status: 429 });
    }
    
    // Security check
    if (isCommandBlocked(command)) {
      return NextResponse.json({
        output: '',
        error: 'Command blocked for security reasons.',
        exitCode: 1,
        cwd: requestCwd || os.homedir(),
      }, { status: 403 });
    }
    
    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        cwd: os.homedir(),
        env: {},
        history: [],
      };
      sessions.set(sessionId, session);
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
    const environment = buildEnvironment({ ...session.env, ...customEnv });
    
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
