/**
 * Output Manager
 * Manages multiple output channels for logs and messages
 */

export interface OutputChannel {
  name: string;
  append(text: string): void;
  appendLine(text: string): void;
  clear(): void;
  show(): void;
  hide(): void;
  dispose(): void;
}

export class OutputChannelImpl implements OutputChannel {
  private buffer: string[] = [];
  private visible: boolean = false;
  private disposed: boolean = false;
  private readonly MAX_LINES = 10000;
  private listeners: Set<() => void> = new Set();

  constructor(public readonly name: string) {}

  /**
   * Append text
   */
  append(text: string): void {
    if (this.disposed) return;

    // Add to buffer
    if (this.buffer.length === 0) {
      this.buffer.push(text);
    } else {
      this.buffer[this.buffer.length - 1] += text;
    }

    // Trim buffer if too large
    this.trimBuffer();
    this.notifyListeners();
  }

  /**
   * Append line
   */
  appendLine(text: string): void {
    if (this.disposed) return;

    this.buffer.push(text);
    this.trimBuffer();
    this.notifyListeners();
  }

  /**
   * Clear output
   */
  clear(): void {
    if (this.disposed) return;

    this.buffer = [];
    this.notifyListeners();
    console.log(`[Output] Cleared channel: ${this.name}`);
  }

  /**
   * Show channel
   */
  show(): void {
    if (this.disposed) return;

    this.visible = true;
    console.log(`[Output] Showing channel: ${this.name}`);
  }

  /**
   * Hide channel
   */
  hide(): void {
    if (this.disposed) return;

    this.visible = false;
    console.log(`[Output] Hiding channel: ${this.name}`);
  }

  /**
   * Dispose channel
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.buffer = [];
    this.listeners.clear();
    console.log(`[Output] Disposed channel: ${this.name}`);
  }

  /**
   * Get content
   */
  getContent(): string {
    return this.buffer.join('\n');
  }

  /**
   * Get lines
   */
  getLines(): string[] {
    return [...this.buffer];
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Check if disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Listen to changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Trim buffer to max lines
   */
  private trimBuffer(): void {
    if (this.buffer.length > this.MAX_LINES) {
      const excess = this.buffer.length - this.MAX_LINES;
      this.buffer.splice(0, excess);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export class OutputManager {
  private channels: Map<string, OutputChannelImpl> = new Map();
  private activeChannel: string | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Create output channel
   */
  createChannel(name: string): OutputChannel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!;
    }

    const channel = new OutputChannelImpl(name);
    this.channels.set(name, channel);

    // Listen to channel changes
    channel.onChange(() => this.notifyListeners());

    console.log(`[Output Manager] Created channel: ${name}`);
    return channel;
  }

  /**
   * Get channel
   */
  getChannel(name: string): OutputChannel | undefined {
    return this.channels.get(name);
  }

  /**
   * Get all channels
   */
  getChannels(): OutputChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channel names
   */
  getChannelNames(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Show channel
   */
  showChannel(name: string): void {
    const channel = this.channels.get(name);
    if (!channel) {
      throw new Error(`Channel not found: ${name}`);
    }

    // Hide current active channel
    if (this.activeChannel && this.activeChannel !== name) {
      const current = this.channels.get(this.activeChannel);
      if (current) {
        current.hide();
      }
    }

    // Show new channel
    channel.show();
    this.activeChannel = name;
    this.notifyListeners();

    console.log(`[Output Manager] Showing channel: ${name}`);
  }

  /**
   * Get active channel
   */
  getActiveChannel(): OutputChannel | null {
    if (!this.activeChannel) return null;
    return this.channels.get(this.activeChannel) || null;
  }

  /**
   * Get active channel name
   */
  getActiveChannelName(): string | null {
    return this.activeChannel;
  }

  /**
   * Delete channel
   */
  deleteChannel(name: string): void {
    const channel = this.channels.get(name);
    if (!channel) return;

    channel.dispose();
    this.channels.delete(name);

    if (this.activeChannel === name) {
      this.activeChannel = null;
    }

    this.notifyListeners();
    console.log(`[Output Manager] Deleted channel: ${name}`);
  }

  /**
   * Clear all channels
   */
  clearAll(): void {
    for (const channel of this.channels.values()) {
      channel.clear();
    }
    console.log('[Output Manager] Cleared all channels');
  }

  /**
   * Listen to changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Create standard channels
   */
  createStandardChannels(): void {
    this.createChannel('Extension Host');
    this.createChannel('Tasks');
    this.createChannel('Git');
    this.createChannel('Debug Console');
    this.createChannel('Language Server');
    console.log('[Output Manager] Created standard channels');
  }
}

// Singleton instance
let outputManagerInstance: OutputManager | null = null;

export function getOutputManager(): OutputManager {
  if (!outputManagerInstance) {
    outputManagerInstance = new OutputManager();
    outputManagerInstance.createStandardChannels();
  }
  return outputManagerInstance;
}

/**
 * ANSI Color Formatter
 * Converts ANSI escape codes to HTML/CSS
 */
export class ANSIFormatter {
  private static readonly ANSI_COLORS: Record<number, string> = {
    30: '#000000', // Black
    31: '#cd3131', // Red
    32: '#0dbc79', // Green
    33: '#e5e510', // Yellow
    34: '#2472c8', // Blue
    35: '#bc3fbc', // Magenta
    36: '#11a8cd', // Cyan
    37: '#e5e5e5', // White
    90: '#666666', // Bright Black (Gray)
    91: '#f14c4c', // Bright Red
    92: '#23d18b', // Bright Green
    93: '#f5f543', // Bright Yellow
    94: '#3b8eea', // Bright Blue
    95: '#d670d6', // Bright Magenta
    96: '#29b8db', // Bright Cyan
    97: '#ffffff', // Bright White
  };

  /**
   * Format ANSI text to HTML
   */
  static formatToHTML(text: string): string {
    let html = '';
    let currentColor: string | null = null;
    let currentBold = false;
    let currentItalic = false;
    let currentUnderline = false;

    // Split by ANSI escape codes
    const parts = text.split(/\x1b\[([0-9;]+)m/);

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Text part
        if (parts[i]) {
          let styles: string[] = [];
          
          if (currentColor) {
            styles.push(`color: ${currentColor}`);
          }
          if (currentBold) {
            styles.push('font-weight: bold');
          }
          if (currentItalic) {
            styles.push('font-style: italic');
          }
          if (currentUnderline) {
            styles.push('text-decoration: underline');
          }

          if (styles.length > 0) {
            html += `<span style="${styles.join('; ')}">${this.escapeHTML(parts[i])}</span>`;
          } else {
            html += this.escapeHTML(parts[i]);
          }
        }
      } else {
        // ANSI code part
        const codes = parts[i].split(';').map(Number);
        
        for (const code of codes) {
          if (code === 0) {
            // Reset
            currentColor = null;
            currentBold = false;
            currentItalic = false;
            currentUnderline = false;
          } else if (code === 1) {
            currentBold = true;
          } else if (code === 3) {
            currentItalic = true;
          } else if (code === 4) {
            currentUnderline = true;
          } else if (code === 22) {
            currentBold = false;
          } else if (code === 23) {
            currentItalic = false;
          } else if (code === 24) {
            currentUnderline = false;
          } else if (this.ANSI_COLORS[code]) {
            currentColor = this.ANSI_COLORS[code];
          } else if (code === 39) {
            currentColor = null; // Default foreground
          }
        }
      }
    }

    return html;
  }

  /**
   * Strip ANSI codes
   */
  static stripANSI(text: string): string {
    return text.replace(/\x1b\[[0-9;]+m/g, '');
  }

  /**
   * Escape HTML
   */
  private static escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
