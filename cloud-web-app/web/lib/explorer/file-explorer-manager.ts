/**
 * File Explorer Manager
 * Advanced file explorer with drag & drop, multi-select, and context menu
 */

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileNode[];
  expanded?: boolean;
}

export interface FileOperation {
  type: 'copy' | 'move' | 'delete' | 'rename' | 'create';
  sources: string[];
  destination?: string;
  newName?: string;
}

export interface FileWatchEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
}

export type FileChangeCallback = (event: FileWatchEvent) => void;

export interface Disposable {
  dispose(): void;
}

export class FileExplorerManager {
  private root: FileNode | null = null;
  private selectedPaths: Set<string> = new Set();
  private watchers: Map<string, FileChangeCallback[]> = new Map();
  private clipboard: { operation: 'copy' | 'cut'; paths: string[] } | null = null;

  /**
   * Initialize explorer with workspace root
   */
  async initialize(workspaceRoot: string): Promise<void> {
    this.root = await this.loadDirectory(workspaceRoot);
    console.log(`[File Explorer] Initialized with root: ${workspaceRoot}`);
  }

  /**
   * Get root node
   */
  getRoot(): FileNode | null {
    return this.root;
  }

  /**
   * Refresh entire tree
   */
  async refresh(): Promise<void> {
    if (!this.root) return;
    this.root = await this.loadDirectory(this.root.path);
    console.log('[File Explorer] Refreshed');
  }

  /**
   * Refresh specific path
   */
  async refreshPath(path: string): Promise<void> {
    if (!this.root) return;
    
    const node = this.findNode(this.root, path);
    if (node && node.type === 'directory') {
      node.children = await this.loadChildren(path);
      console.log(`[File Explorer] Refreshed: ${path}`);
    }
  }

  /**
   * Expand directory
   */
  async expand(path: string): Promise<void> {
    if (!this.root) return;
    
    const node = this.findNode(this.root, path);
    if (node && node.type === 'directory') {
      if (!node.children) {
        node.children = await this.loadChildren(path);
      }
      node.expanded = true;
      console.log(`[File Explorer] Expanded: ${path}`);
    }
  }

  /**
   * Collapse directory
   */
  collapse(path: string): void {
    if (!this.root) return;
    
    const node = this.findNode(this.root, path);
    if (node && node.type === 'directory') {
      node.expanded = false;
      console.log(`[File Explorer] Collapsed: ${path}`);
    }
  }

  /**
   * Select file/directory
   */
  select(path: string, multiSelect: boolean = false): void {
    if (!multiSelect) {
      this.selectedPaths.clear();
    }
    this.selectedPaths.add(path);
    console.log(`[File Explorer] Selected: ${path}`);
  }

  /**
   * Deselect file/directory
   */
  deselect(path: string): void {
    this.selectedPaths.delete(path);
    console.log(`[File Explorer] Deselected: ${path}`);
  }

  /**
   * Get selected paths
   */
  getSelection(): string[] {
    return Array.from(this.selectedPaths);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedPaths.clear();
  }

  /**
   * Reveal file in explorer
   */
  async revealFile(path: string): Promise<void> {
    if (!this.root) return;

    // Expand all parent directories
    const parts = path.split('/');
    let currentPath = '';
    
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += (i > 0 ? '/' : '') + parts[i];
      await this.expand(currentPath);
    }

    // Select the file
    this.select(path);
    console.log(`[File Explorer] Revealed: ${path}`);
  }

  /**
   * Copy files to clipboard
   */
  copy(paths: string[]): void {
    this.clipboard = { operation: 'copy', paths };
    console.log(`[File Explorer] Copied ${paths.length} items`);
  }

  /**
   * Cut files to clipboard
   */
  cut(paths: string[]): void {
    this.clipboard = { operation: 'cut', paths };
    console.log(`[File Explorer] Cut ${paths.length} items`);
  }

  /**
   * Paste files from clipboard
   */
  async paste(destination: string): Promise<void> {
    if (!this.clipboard) {
      throw new Error('Clipboard is empty');
    }

    const { operation, paths } = this.clipboard;

    if (operation === 'copy') {
      await this.copyFiles(paths, destination);
    } else {
      await this.moveFiles(paths, destination);
    }

    this.clipboard = null;
    await this.refreshPath(destination);
  }

  /**
   * Copy files
   */
  async copyFiles(sources: string[], destination: string): Promise<void> {
    const response = await fetch('/api/files/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, destination }),
    });

    if (!response.ok) {
      throw new Error('Failed to copy files');
    }

    console.log(`[File Explorer] Copied ${sources.length} files to ${destination}`);
  }

  /**
   * Move files
   */
  async moveFiles(sources: string[], destination: string): Promise<void> {
    const response = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, destination }),
    });

    if (!response.ok) {
      throw new Error('Failed to move files');
    }

    // Refresh source directories
    for (const source of sources) {
      const parentPath = source.substring(0, source.lastIndexOf('/'));
      await this.refreshPath(parentPath);
    }

    console.log(`[File Explorer] Moved ${sources.length} files to ${destination}`);
  }

  /**
   * Delete files
   */
  async deleteFiles(paths: string[]): Promise<void> {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete files');
    }

    // Refresh parent directories
    for (const path of paths) {
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      await this.refreshPath(parentPath);
    }

    console.log(`[File Explorer] Deleted ${paths.length} files`);
  }

  /**
   * Rename file
   */
  async renameFile(path: string, newName: string): Promise<void> {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const newPath = `${parentPath}/${newName}`;

    const response = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, newPath }),
    });

    if (!response.ok) {
      throw new Error('Failed to rename file');
    }

    await this.refreshPath(parentPath);
    console.log(`[File Explorer] Renamed: ${path} → ${newPath}`);
  }

  /**
   * Create new file
   */
  async createFile(parentPath: string, name: string): Promise<void> {
    const path = `${parentPath}/${name}`;

    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type: 'file' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create file');
    }

    await this.refreshPath(parentPath);
    console.log(`[File Explorer] Created file: ${path}`);
  }

  /**
   * Create new directory
   */
  async createDirectory(parentPath: string, name: string): Promise<void> {
    const path = `${parentPath}/${name}`;

    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type: 'directory' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create directory');
    }

    await this.refreshPath(parentPath);
    console.log(`[File Explorer] Created directory: ${path}`);
  }

  /**
   * Watch files for changes
   */
  watchFiles(pattern: string, callback: FileChangeCallback): Disposable {
    if (!this.watchers.has(pattern)) {
      this.watchers.set(pattern, []);
    }
    
    this.watchers.get(pattern)!.push(callback);

    // Start watching on backend
    this.startWatching(pattern);

    return {
      dispose: () => {
        const callbacks = this.watchers.get(pattern);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
          if (callbacks.length === 0) {
            this.watchers.delete(pattern);
            this.stopWatching(pattern);
          }
        }
      },
    };
  }

  /**
   * Handle file change event
   */
  private handleFileChange(event: FileWatchEvent): void {
    // Notify watchers
    for (const [pattern, callbacks] of this.watchers) {
      if (this.matchesPattern(event.path, pattern)) {
        callbacks.forEach(callback => callback(event));
      }
    }

    // Auto-refresh affected directories
    const parentPath = event.path.substring(0, event.path.lastIndexOf('/'));
    this.refreshPath(parentPath);
  }

  /**
   * Start watching pattern
   */
  private async startWatching(pattern: string): Promise<void> {
    await fetch('/api/files/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern }),
    });
  }

  /**
   * Stop watching pattern
   */
  private async stopWatching(pattern: string): Promise<void> {
    await fetch('/api/files/unwatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern }),
    });
  }

  /**
   * Load directory
   */
  private async loadDirectory(path: string): Promise<FileNode> {
    const response = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load directory: ${path}`);
    }

    const data = await response.json();
    return {
      path,
      name: path.split('/').pop() || path,
      type: 'directory',
      children: data.children || [],
      expanded: true,
    };
  }

  /**
   * Load children of directory
   */
  private async loadChildren(path: string): Promise<FileNode[]> {
    const response = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load children: ${path}`);
    }

    const data = await response.json();
    return data.children || [];
  }

  /**
   * Find node by path
   */
  private findNode(root: FileNode, path: string): FileNode | null {
    if (root.path === path) return root;
    
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, path);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Check if path matches pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching (can be enhanced)
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(path);
  }
}

// Singleton instance
let fileExplorerManagerInstance: FileExplorerManager | null = null;

export function getFileExplorerManager(): FileExplorerManager {
  if (!fileExplorerManagerInstance) {
    fileExplorerManagerInstance = new FileExplorerManager();
  }
  return fileExplorerManagerInstance;
}
