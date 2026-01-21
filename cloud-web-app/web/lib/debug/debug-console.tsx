/**
 * Debug Console System - Console de Debug Profissional
 * 
 * Sistema completo com:
 * - Command execution
 * - Variable watching
 * - Performance monitoring
 * - Log filtering
 * - Command history
 * - Auto-completion
 * - Cheat commands
 * - Stats overlay
 * - Object inspection
 * 
 * @module lib/debug/debug-console
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
  stack?: string;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  handler: CommandHandler;
  aliases?: string[];
  category?: string;
  hidden?: boolean;
}

export type CommandHandler = (args: string[], context: CommandContext) => string | void | Promise<string | void>;

export interface CommandContext {
  console: DebugConsole;
  log: (message: string, level?: LogLevel) => void;
  getVariable: (name: string) => unknown;
  setVariable: (name: string, value: unknown) => void;
}

export interface WatchedVariable {
  name: string;
  getter: () => unknown;
  formatter?: (value: unknown) => string;
  category?: string;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  drawCalls: number;
  triangles: number;
  textures: number;
  custom: Map<string, number>;
}

export interface DebugConsoleConfig {
  maxLogEntries: number;
  maxHistorySize: number;
  defaultLogLevel: LogLevel;
  showTimestamp: boolean;
  showSource: boolean;
  persistHistory: boolean;
}

// ============================================================================
// DEBUG CONSOLE
// ============================================================================

export class DebugConsole extends EventEmitter {
  private static instance: DebugConsole | null = null;
  
  private config: DebugConsoleConfig;
  private logs: LogEntry[] = [];
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private variables: Map<string, unknown> = new Map();
  private watchedVariables: Map<string, WatchedVariable> = new Map();
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private isOpen = false;
  private minLogLevel: LogLevel = 'debug';
  private logIdCounter = 0;
  private filters: Set<string> = new Set();
  
  private static logLevelPriority: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };
  
  constructor(config: Partial<DebugConsoleConfig> = {}) {
    super();
    
    this.config = {
      maxLogEntries: 1000,
      maxHistorySize: 100,
      defaultLogLevel: 'info',
      showTimestamp: true,
      showSource: true,
      persistHistory: true,
      ...config,
    };
    
    this.registerBuiltInCommands();
    this.loadHistory();
  }
  
  static getInstance(): DebugConsole {
    if (!DebugConsole.instance) {
      DebugConsole.instance = new DebugConsole();
    }
    return DebugConsole.instance;
  }
  
  // ============================================================================
  // LOGGING
  // ============================================================================
  
  log(message: string, level: LogLevel = 'info', source?: string, data?: unknown): void {
    if (DebugConsole.logLevelPriority[level] < DebugConsole.logLevelPriority[this.minLogLevel]) {
      return;
    }
    
    const entry: LogEntry = {
      id: `log_${++this.logIdCounter}`,
      timestamp: Date.now(),
      level,
      message,
      source,
      data,
    };
    
    if (level === 'error' || level === 'fatal') {
      entry.stack = new Error().stack;
    }
    
    this.logs.push(entry);
    
    // Trim logs
    while (this.logs.length > this.config.maxLogEntries) {
      this.logs.shift();
    }
    
    this.emit('log', entry);
    
    // Also log to browser console
    const consoleMethod = level === 'fatal' ? 'error' : level;
    const prefix = source ? `[${source}]` : '';
    const logFn = console[consoleMethod as 'log' | 'debug' | 'info' | 'warn' | 'error'];
    if (typeof logFn === 'function') {
      logFn.call(console, `${prefix} ${message}`, data ?? '');
    }
  }
  
  trace(message: string, source?: string, data?: unknown): void {
    this.log(message, 'trace', source, data);
  }
  
  debug(message: string, source?: string, data?: unknown): void {
    this.log(message, 'debug', source, data);
  }
  
  info(message: string, source?: string, data?: unknown): void {
    this.log(message, 'info', source, data);
  }
  
  warn(message: string, source?: string, data?: unknown): void {
    this.log(message, 'warn', source, data);
  }
  
  error(message: string, source?: string, data?: unknown): void {
    this.log(message, 'error', source, data);
  }
  
  fatal(message: string, source?: string, data?: unknown): void {
    this.log(message, 'fatal', source, data);
  }
  
  // ============================================================================
  // LOG MANAGEMENT
  // ============================================================================
  
  getLogs(options?: {
    level?: LogLevel;
    source?: string;
    search?: string;
    limit?: number;
  }): LogEntry[] {
    let result = [...this.logs];
    
    if (options?.level) {
      const minPriority = DebugConsole.logLevelPriority[options.level];
      result = result.filter(
        (log) => DebugConsole.logLevelPriority[log.level] >= minPriority
      );
    }
    
    if (options?.source) {
      result = result.filter((log) => log.source === options.source);
    }
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(search) ||
          log.source?.toLowerCase().includes(search)
      );
    }
    
    if (this.filters.size > 0) {
      result = result.filter((log) => !this.filters.has(log.source || ''));
    }
    
    if (options?.limit) {
      result = result.slice(-options.limit);
    }
    
    return result;
  }
  
  clearLogs(): void {
    this.logs = [];
    this.emit('cleared');
  }
  
  setMinLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }
  
  addFilter(source: string): void {
    this.filters.add(source);
  }
  
  removeFilter(source: string): void {
    this.filters.delete(source);
  }
  
  clearFilters(): void {
    this.filters.clear();
  }
  
  // ============================================================================
  // COMMANDS
  // ============================================================================
  
  registerCommand(command: Command): void {
    this.commands.set(command.name.toLowerCase(), command);
    
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }
  }
  
  unregisterCommand(name: string): void {
    const command = this.commands.get(name.toLowerCase());
    if (!command) return;
    
    this.commands.delete(name.toLowerCase());
    
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias.toLowerCase());
      }
    }
  }
  
  async executeCommand(input: string): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) return '';
    
    // Add to history
    this.addToHistory(trimmed);
    
    // Parse command and arguments
    const parts = this.parseCommandLine(trimmed);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Resolve alias
    const resolvedName = this.aliases.get(commandName) || commandName;
    
    // Find command
    const command = this.commands.get(resolvedName);
    if (!command) {
      return `Unknown command: ${commandName}. Type 'help' for available commands.`;
    }
    
    // Create context
    const context: CommandContext = {
      console: this,
      log: (msg, level) => this.log(msg, level, 'console'),
      getVariable: (name) => this.variables.get(name),
      setVariable: (name, value) => this.variables.set(name, value),
    };
    
    try {
      const result = await command.handler(args, context);
      return result || '';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error executing command: ${message}`;
    }
  }
  
  private parseCommandLine(input: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (const char of input) {
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      parts.push(current);
    }
    
    return parts;
  }
  
  getCommands(includeHidden = false): Command[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => includeHidden || !cmd.hidden
    );
  }
  
  getAutoComplete(partial: string): string[] {
    const lower = partial.toLowerCase();
    const matches: string[] = [];
    
    for (const [name, command] of this.commands) {
      if (name.startsWith(lower) && !command.hidden) {
        matches.push(name);
      }
    }
    
    for (const [alias] of this.aliases) {
      if (alias.startsWith(lower)) {
        matches.push(alias);
      }
    }
    
    return matches.sort();
  }
  
  // ============================================================================
  // COMMAND HISTORY
  // ============================================================================
  
  private addToHistory(command: string): void {
    // Don't add duplicates at the end
    if (this.commandHistory[this.commandHistory.length - 1] === command) {
      return;
    }
    
    this.commandHistory.push(command);
    
    while (this.commandHistory.length > this.config.maxHistorySize) {
      this.commandHistory.shift();
    }
    
    this.historyIndex = this.commandHistory.length;
    this.saveHistory();
  }
  
  getHistoryPrevious(): string | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.commandHistory[this.historyIndex];
    }
    return null;
  }
  
  getHistoryNext(): string | null {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex];
    }
    this.historyIndex = this.commandHistory.length;
    return null;
  }
  
  getHistory(): string[] {
    return [...this.commandHistory];
  }
  
  clearHistory(): void {
    this.commandHistory = [];
    this.historyIndex = 0;
    this.saveHistory();
  }
  
  private saveHistory(): void {
    if (this.config.persistHistory && typeof localStorage !== 'undefined') {
      localStorage.setItem('debug_console_history', JSON.stringify(this.commandHistory));
    }
  }
  
  private loadHistory(): void {
    if (this.config.persistHistory && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('debug_console_history');
      if (saved) {
        this.commandHistory = JSON.parse(saved);
        this.historyIndex = this.commandHistory.length;
      }
    }
  }
  
  // ============================================================================
  // VARIABLES
  // ============================================================================
  
  setVariable(name: string, value: unknown): void {
    this.variables.set(name, value);
    this.emit('variableSet', { name, value });
  }
  
  getVariable(name: string): unknown {
    return this.variables.get(name);
  }
  
  deleteVariable(name: string): void {
    this.variables.delete(name);
  }
  
  getAllVariables(): Map<string, unknown> {
    return new Map(this.variables);
  }
  
  // ============================================================================
  // WATCHED VARIABLES
  // ============================================================================
  
  watch(name: string, getter: () => unknown, options?: { formatter?: (value: unknown) => string; category?: string }): void {
    this.watchedVariables.set(name, {
      name,
      getter,
      formatter: options?.formatter,
      category: options?.category,
    });
  }
  
  unwatch(name: string): void {
    this.watchedVariables.delete(name);
  }
  
  getWatchedVariables(): { name: string; value: unknown; formatted: string; category?: string }[] {
    const result: { name: string; value: unknown; formatted: string; category?: string }[] = [];
    
    for (const [name, watched] of this.watchedVariables) {
      try {
        const value = watched.getter();
        const formatted = watched.formatter ? watched.formatter(value) : String(value);
        result.push({ name, value, formatted, category: watched.category });
      } catch (error) {
        result.push({ name, value: undefined, formatted: '<error>', category: watched.category });
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // CONSOLE STATE
  // ============================================================================
  
  open(): void {
    this.isOpen = true;
    this.emit('opened');
  }
  
  close(): void {
    this.isOpen = false;
    this.emit('closed');
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  isConsoleOpen(): boolean {
    return this.isOpen;
  }
  
  // ============================================================================
  // BUILT-IN COMMANDS
  // ============================================================================
  
  private registerBuiltInCommands(): void {
    // Help command
    this.registerCommand({
      name: 'help',
      description: 'Show available commands',
      usage: 'help [command]',
      aliases: ['?', 'commands'],
      category: 'system',
      handler: (args, ctx) => {
        if (args.length > 0) {
          const cmd = this.commands.get(args[0].toLowerCase());
          if (cmd) {
            return `${cmd.name}: ${cmd.description}\nUsage: ${cmd.usage}`;
          }
          return `Unknown command: ${args[0]}`;
        }
        
        const commands = this.getCommands();
        const categories = new Map<string, Command[]>();
        
        for (const cmd of commands) {
          const cat = cmd.category || 'general';
          if (!categories.has(cat)) {
            categories.set(cat, []);
          }
          categories.get(cat)!.push(cmd);
        }
        
        let output = 'Available commands:\n';
        for (const [category, cmds] of categories) {
          output += `\n[${category}]\n`;
          for (const cmd of cmds) {
            output += `  ${cmd.name} - ${cmd.description}\n`;
          }
        }
        
        return output;
      },
    });
    
    // Clear command
    this.registerCommand({
      name: 'clear',
      description: 'Clear the console',
      usage: 'clear',
      aliases: ['cls'],
      category: 'system',
      handler: () => {
        this.clearLogs();
        return '';
      },
    });
    
    // Echo command
    this.registerCommand({
      name: 'echo',
      description: 'Print a message',
      usage: 'echo <message>',
      category: 'system',
      handler: (args) => args.join(' '),
    });
    
    // Set command
    this.registerCommand({
      name: 'set',
      description: 'Set a variable',
      usage: 'set <name> <value>',
      category: 'variables',
      handler: (args, ctx) => {
        if (args.length < 2) {
          return 'Usage: set <name> <value>';
        }
        
        const name = args[0];
        const value = args.slice(1).join(' ');
        
        // Try to parse as JSON
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
        
        ctx.setVariable(name, parsedValue);
        return `Set ${name} = ${JSON.stringify(parsedValue)}`;
      },
    });
    
    // Get command
    this.registerCommand({
      name: 'get',
      description: 'Get a variable value',
      usage: 'get <name>',
      category: 'variables',
      handler: (args, ctx) => {
        if (args.length === 0) {
          return 'Usage: get <name>';
        }
        
        const value = ctx.getVariable(args[0]);
        return `${args[0]} = ${JSON.stringify(value)}`;
      },
    });
    
    // List variables
    this.registerCommand({
      name: 'vars',
      description: 'List all variables',
      usage: 'vars',
      category: 'variables',
      handler: () => {
        const vars = this.getAllVariables();
        if (vars.size === 0) {
          return 'No variables set';
        }
        
        let output = 'Variables:\n';
        for (const [name, value] of vars) {
          output += `  ${name} = ${JSON.stringify(value)}\n`;
        }
        return output;
      },
    });
    
    // Log level command
    this.registerCommand({
      name: 'loglevel',
      description: 'Set minimum log level',
      usage: 'loglevel <trace|debug|info|warn|error|fatal>',
      category: 'logging',
      handler: (args) => {
        if (args.length === 0) {
          return `Current log level: ${this.minLogLevel}`;
        }
        
        const level = args[0].toLowerCase() as LogLevel;
        if (!['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)) {
          return 'Invalid log level. Use: trace, debug, info, warn, error, or fatal';
        }
        
        this.setMinLogLevel(level);
        return `Log level set to ${level}`;
      },
    });
    
    // History command
    this.registerCommand({
      name: 'history',
      description: 'Show command history',
      usage: 'history [clear]',
      category: 'system',
      handler: (args) => {
        if (args[0] === 'clear') {
          this.clearHistory();
          return 'History cleared';
        }
        
        const history = this.getHistory();
        if (history.length === 0) {
          return 'No command history';
        }
        
        return history.map((cmd, i) => `${i + 1}: ${cmd}`).join('\n');
      },
    });
    
    // Watch command
    this.registerCommand({
      name: 'watch',
      description: 'Show watched variables',
      usage: 'watch',
      category: 'debug',
      handler: () => {
        const watched = this.getWatchedVariables();
        if (watched.length === 0) {
          return 'No watched variables';
        }
        
        return watched.map((w) => `${w.name}: ${w.formatted}`).join('\n');
      },
    });
    
    // Performance command
    this.registerCommand({
      name: 'perf',
      description: 'Show performance info',
      usage: 'perf',
      category: 'debug',
      handler: () => {
        const perf = (window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } });
        const memory = perf.memory;
        
        let output = 'Performance:\n';
        
        if (memory) {
          output += `  Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
        }
        
        output += `  Timing entries: ${performance.getEntriesByType('navigation').length}\n`;
        
        return output;
      },
    });
    
    // Time command
    this.registerCommand({
      name: 'time',
      description: 'Show current time',
      usage: 'time',
      category: 'system',
      handler: () => new Date().toISOString(),
    });
    
    // Eval command (dangerous, can be disabled)
    this.registerCommand({
      name: 'eval',
      description: 'Evaluate JavaScript (use with caution)',
      usage: 'eval <code>',
      category: 'debug',
      hidden: true,
      handler: (args) => {
        const code = args.join(' ');
        try {
          // eslint-disable-next-line no-eval
          const result = eval(code);
          return String(result);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.saveHistory();
    this.logs = [];
    this.commands.clear();
    this.aliases.clear();
    this.variables.clear();
    this.watchedVariables.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

export class PerformanceMonitor extends EventEmitter {
  private fps = 0;
  private frameTime = 0;
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private customMetrics: Map<string, number> = new Map();
  private enabled = true;
  
  constructor() {
    super();
    this.lastFrameTime = performance.now();
  }
  
  update(): void {
    if (!this.enabled) return;
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
    
    this.frameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1000 / this.frameTime;
    
    this.emit('update', this.getMetrics());
  }
  
  getMetrics(): PerformanceMetrics {
    const perf = window.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    
    return {
      fps: Math.round(this.fps),
      frameTime: this.frameTime,
      memory: perf.memory ? {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      } : {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      },
      drawCalls: this.customMetrics.get('drawCalls') || 0,
      triangles: this.customMetrics.get('triangles') || 0,
      textures: this.customMetrics.get('textures') || 0,
      custom: new Map(this.customMetrics),
    };
  }
  
  setMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// ============================================================================
// STATS OVERLAY
// ============================================================================

export class StatsOverlay {
  private container: HTMLDivElement | null = null;
  private fpsElement: HTMLDivElement | null = null;
  private memoryElement: HTMLDivElement | null = null;
  private customElements: Map<string, HTMLDivElement> = new Map();
  private visible = false;
  
  create(parentElement?: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 9999;
      min-width: 150px;
      display: none;
    `;
    
    this.fpsElement = document.createElement('div');
    this.container.appendChild(this.fpsElement);
    
    this.memoryElement = document.createElement('div');
    this.memoryElement.style.marginTop = '5px';
    this.container.appendChild(this.memoryElement);
    
    (parentElement || document.body).appendChild(this.container);
  }
  
  update(metrics: PerformanceMetrics): void {
    if (!this.container || !this.visible) return;
    
    if (this.fpsElement) {
      const color = metrics.fps >= 55 ? '#0f0' : metrics.fps >= 30 ? '#ff0' : '#f00';
      this.fpsElement.innerHTML = `FPS: <span style="color: ${color}">${metrics.fps}</span> (${metrics.frameTime.toFixed(1)}ms)`;
    }
    
    if (this.memoryElement && metrics.memory.usedJSHeapSize > 0) {
      const usedMB = (metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const totalMB = (metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(1);
      this.memoryElement.textContent = `Memory: ${usedMB}/${totalMB} MB`;
    }
    
    // Update custom metrics
    for (const [name, value] of metrics.custom) {
      let element = this.customElements.get(name);
      if (!element) {
        element = document.createElement('div');
        element.style.marginTop = '2px';
        this.container?.appendChild(element);
        this.customElements.set(name, element);
      }
      element.textContent = `${name}: ${value}`;
    }
  }
  
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.visible = true;
    }
  }
  
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.visible = false;
    }
  }
  
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.fpsElement = null;
    this.memoryElement = null;
    this.customElements.clear();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface DebugContextValue {
  console: DebugConsole;
  perfMonitor: PerformanceMonitor;
  statsOverlay: StatsOverlay;
}

const DebugContext = createContext<DebugContextValue | null>(null);

export function DebugProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<DebugConsoleConfig>;
}) {
  const value = useMemo(() => ({
    console: new DebugConsole(config),
    perfMonitor: new PerformanceMonitor(),
    statsOverlay: new StatsOverlay(),
  }), []);
  
  useEffect(() => {
    value.statsOverlay.create();
    
    return () => {
      value.console.dispose();
      value.statsOverlay.destroy();
    };
  }, [value]);
  
  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebugConsole() {
  const context = useContext(DebugContext);
  if (!context) {
    // Return singleton if not in provider
    return DebugConsole.getInstance();
  }
  return context.console;
}

export function useConsoleLogs(options?: { level?: LogLevel; limit?: number }) {
  const console = useDebugConsole();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  useEffect(() => {
    const update = () => {
      setLogs(console.getLogs(options));
    };
    
    console.on('log', update);
    console.on('cleared', update);
    update();
    
    return () => {
      console.off('log', update);
      console.off('cleared', update);
    };
  }, [console, options?.level, options?.limit]);
  
  return logs;
}

export function useConsoleCommands() {
  const console = useDebugConsole();
  
  const execute = useCallback(async (input: string) => {
    return console.executeCommand(input);
  }, [console]);
  
  const getAutoComplete = useCallback((partial: string) => {
    return console.getAutoComplete(partial);
  }, [console]);
  
  return { execute, getAutoComplete };
}

export function usePerformanceMonitor() {
  const context = useContext(DebugContext);
  const monitor = context?.perfMonitor || new PerformanceMonitor();
  const [metrics, setMetrics] = useState<PerformanceMetrics>(monitor.getMetrics());
  
  useEffect(() => {
    const update = (m: PerformanceMetrics) => setMetrics(m);
    monitor.on('update', update);
    
    return () => {
      monitor.off('update', update);
    };
  }, [monitor]);
  
  return { monitor, metrics };
}

export function useWatchVariable(name: string, getter: () => unknown, deps: unknown[] = []) {
  const console = useDebugConsole();
  
  useEffect(() => {
    console.watch(name, getter);
    
    return () => {
      console.unwatch(name);
    };
  }, [console, name, ...deps]);
}

// ============================================================================
// CONSOLE UI COMPONENT HELPERS
// ============================================================================

export function formatLogEntry(entry: LogEntry, showTimestamp = true): string {
  const timestamp = showTimestamp 
    ? `[${new Date(entry.timestamp).toISOString().substr(11, 12)}]` 
    : '';
  const level = `[${entry.level.toUpperCase()}]`;
  const source = entry.source ? `[${entry.source}]` : '';
  
  return `${timestamp} ${level}${source} ${entry.message}`;
}

export function getLogLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    trace: '#888',
    debug: '#8cf',
    info: '#fff',
    warn: '#ff0',
    error: '#f88',
    fatal: '#f00',
  };
  return colors[level];
}

export default {
  DebugConsole,
  PerformanceMonitor,
  StatsOverlay,
  DebugProvider,
  useDebugConsole,
  useConsoleLogs,
  useConsoleCommands,
  usePerformanceMonitor,
  useWatchVariable,
  formatLogEntry,
  getLogLevelColor,
};
