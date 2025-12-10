/**
 * Keyboard Manager
 * Manages global keyboard shortcuts for IDE
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void | Promise<void>;
  description: string;
  category: string;
}

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregister(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow some shortcuts even in input fields
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
    }

    const key = this.getEventKey(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }
}

// Singleton instance
let keyboardManagerInstance: KeyboardManager | null = null;

export function getKeyboardManager(): KeyboardManager {
  if (!keyboardManagerInstance) {
    keyboardManagerInstance = new KeyboardManager();
  }
  return keyboardManagerInstance;
}

export function resetKeyboardManager(): void {
  keyboardManagerInstance = null;
}

// Default IDE shortcuts
export function registerDefaultShortcuts(manager: KeyboardManager, router: any): void {
  // Command Palette
  manager.register({
    key: 'k',
    ctrl: true,
    action: () => {
      // Open command palette
      const event = new CustomEvent('open-command-palette');
      window.dispatchEvent(event);
    },
    description: 'Open Command Palette',
    category: 'General'
  });

  // Quick Open
  manager.register({
    key: 'p',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('quick-open');
      window.dispatchEvent(event);
    },
    description: 'Quick Open File',
    category: 'General'
  });

  // Save
  manager.register({
    key: 's',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('save-file');
      window.dispatchEvent(event);
    },
    description: 'Save File',
    category: 'File'
  });

  // Find
  manager.register({
    key: 'f',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('find');
      window.dispatchEvent(event);
    },
    description: 'Find',
    category: 'Search'
  });

  // Replace
  manager.register({
    key: 'h',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('replace');
      window.dispatchEvent(event);
    },
    description: 'Replace',
    category: 'Search'
  });

  // Go to Line
  manager.register({
    key: 'g',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('go-to-line');
      window.dispatchEvent(event);
    },
    description: 'Go to Line',
    category: 'Navigation'
  });

  // Toggle Terminal
  manager.register({
    key: '`',
    ctrl: true,
    action: () => {
      router.push('/terminal');
    },
    description: 'Toggle Terminal',
    category: 'View'
  });

  // Toggle Git
  manager.register({
    key: 'g',
    ctrl: true,
    shift: true,
    action: () => {
      router.push('/git');
    },
    description: 'Open Git Panel',
    category: 'View'
  });

  // Toggle Testing
  manager.register({
    key: 't',
    ctrl: true,
    shift: true,
    action: () => {
      router.push('/testing');
    },
    description: 'Open Test Explorer',
    category: 'View'
  });

  // Toggle Debugger
  manager.register({
    key: 'd',
    ctrl: true,
    shift: true,
    action: () => {
      router.push('/debugger');
    },
    description: 'Open Debugger',
    category: 'View'
  });

  // Toggle Marketplace
  manager.register({
    key: 'x',
    ctrl: true,
    shift: true,
    action: () => {
      router.push('/marketplace');
    },
    description: 'Open Extension Marketplace',
    category: 'View'
  });

  // Start Debugging
  manager.register({
    key: 'F5',
    action: () => {
      const event = new CustomEvent('start-debugging');
      window.dispatchEvent(event);
    },
    description: 'Start Debugging',
    category: 'Debug'
  });

  // Stop Debugging
  manager.register({
    key: 'F5',
    shift: true,
    action: () => {
      const event = new CustomEvent('stop-debugging');
      window.dispatchEvent(event);
    },
    description: 'Stop Debugging',
    category: 'Debug'
  });

  // Step Over
  manager.register({
    key: 'F10',
    action: () => {
      const event = new CustomEvent('debug-step-over');
      window.dispatchEvent(event);
    },
    description: 'Step Over',
    category: 'Debug'
  });

  // Step Into
  manager.register({
    key: 'F11',
    action: () => {
      const event = new CustomEvent('debug-step-into');
      window.dispatchEvent(event);
    },
    description: 'Step Into',
    category: 'Debug'
  });

  // Step Out
  manager.register({
    key: 'F11',
    shift: true,
    action: () => {
      const event = new CustomEvent('debug-step-out');
      window.dispatchEvent(event);
    },
    description: 'Step Out',
    category: 'Debug'
  });

  // Run Tests
  manager.register({
    key: 'F6',
    action: () => {
      const event = new CustomEvent('run-tests');
      window.dispatchEvent(event);
    },
    description: 'Run Tests',
    category: 'Test'
  });

  // Comment Line
  manager.register({
    key: '/',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('toggle-comment');
      window.dispatchEvent(event);
    },
    description: 'Toggle Line Comment',
    category: 'Edit'
  });

  // Format Document
  manager.register({
    key: 'f',
    ctrl: true,
    shift: true,
    action: () => {
      const event = new CustomEvent('format-document');
      window.dispatchEvent(event);
    },
    description: 'Format Document',
    category: 'Edit'
  });

  // Zoom In
  manager.register({
    key: '=',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('zoom-in');
      window.dispatchEvent(event);
    },
    description: 'Zoom In',
    category: 'View'
  });

  // Zoom Out
  manager.register({
    key: '-',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('zoom-out');
      window.dispatchEvent(event);
    },
    description: 'Zoom Out',
    category: 'View'
  });

  // Reset Zoom
  manager.register({
    key: '0',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('zoom-reset');
      window.dispatchEvent(event);
    },
    description: 'Reset Zoom',
    category: 'View'
  });
}
