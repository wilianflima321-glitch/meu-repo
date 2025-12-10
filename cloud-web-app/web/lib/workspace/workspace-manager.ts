/**
 * Workspace Manager
 * Manages multi-root workspaces, trust, and recommendations
 */

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface WorkspaceConfiguration {
  folders: WorkspaceFolder[];
  settings: Record<string, any>;
  extensions?: {
    recommendations?: string[];
    unwantedRecommendations?: string[];
  };
}

export interface ExtensionRecommendation {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export class WorkspaceManager {
  private folders: WorkspaceFolder[] = [];
  private trusted: boolean = false;
  private configuration: WorkspaceConfiguration | null = null;
  private listeners: Set<() => void> = new Set();
  private readonly STORAGE_KEY_TRUST = 'workspace-trust';
  private readonly STORAGE_KEY_RECENT = 'recent-workspaces';

  /**
   * Initialize workspace
   */
  async initialize(workspaceUri: string): Promise<void> {
    // Load workspace configuration
    await this.loadConfiguration(workspaceUri);

    // Check trust status
    this.loadTrustStatus(workspaceUri);

    console.log(`[Workspace] Initialized: ${workspaceUri}`);
  }

  /**
   * Get workspace folders
   */
  getWorkspaceFolders(): WorkspaceFolder[] {
    return [...this.folders];
  }

  /**
   * Add workspace folder
   */
  async addWorkspaceFolder(folder: Omit<WorkspaceFolder, 'index'>): Promise<void> {
    const newFolder: WorkspaceFolder = {
      ...folder,
      index: this.folders.length,
    };

    this.folders.push(newFolder);
    await this.saveConfiguration();
    this.notifyListeners();

    console.log(`[Workspace] Added folder: ${folder.name}`);
  }

  /**
   * Remove workspace folder
   */
  async removeWorkspaceFolder(index: number): Promise<void> {
    if (index < 0 || index >= this.folders.length) {
      throw new Error(`Invalid folder index: ${index}`);
    }

    const removed = this.folders.splice(index, 1)[0];
    
    // Reindex remaining folders
    this.folders.forEach((folder, i) => {
      folder.index = i;
    });

    await this.saveConfiguration();
    this.notifyListeners();

    console.log(`[Workspace] Removed folder: ${removed.name}`);
  }

  /**
   * Update workspace folder
   */
  async updateWorkspaceFolder(index: number, updates: Partial<WorkspaceFolder>): Promise<void> {
    if (index < 0 || index >= this.folders.length) {
      throw new Error(`Invalid folder index: ${index}`);
    }

    Object.assign(this.folders[index], updates);
    await this.saveConfiguration();
    this.notifyListeners();

    console.log(`[Workspace] Updated folder at index ${index}`);
  }

  /**
   * Get workspace folder by URI
   */
  getWorkspaceFolder(uri: string): WorkspaceFolder | undefined {
    return this.folders.find(folder => uri.startsWith(folder.uri));
  }

  /**
   * Check if workspace is trusted
   */
  isTrusted(): boolean {
    return this.trusted;
  }

  /**
   * Set workspace trust
   */
  setTrust(trusted: boolean): void {
    this.trusted = trusted;
    this.saveTrustStatus();
    this.notifyListeners();

    console.log(`[Workspace] Trust ${trusted ? 'granted' : 'revoked'}`);
  }

  /**
   * Get workspace configuration
   */
  getConfiguration(): WorkspaceConfiguration | null {
    return this.configuration;
  }

  /**
   * Update workspace settings
   */
  async updateSettings(settings: Record<string, any>): Promise<void> {
    if (!this.configuration) {
      this.configuration = {
        folders: this.folders,
        settings: {},
      };
    }

    this.configuration.settings = {
      ...this.configuration.settings,
      ...settings,
    };

    await this.saveConfiguration();
    this.notifyListeners();

    console.log('[Workspace] Updated settings');
  }

  /**
   * Get workspace setting
   */
  getSetting<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.configuration) return defaultValue;
    return this.configuration.settings[key] ?? defaultValue;
  }

  /**
   * Get extension recommendations
   */
  getRecommendations(): ExtensionRecommendation[] {
    const recommendations: ExtensionRecommendation[] = [];

    if (!this.configuration?.extensions?.recommendations) {
      return recommendations;
    }

    // Built-in recommendations based on workspace content
    const builtIn = this.detectRecommendations();
    recommendations.push(...builtIn);

    // User-defined recommendations
    for (const id of this.configuration.extensions.recommendations) {
      if (!recommendations.find(r => r.id === id)) {
        recommendations.push({
          id,
          name: id,
          description: 'Recommended by workspace',
          reason: 'Workspace recommendation',
        });
      }
    }

    return recommendations;
  }

  /**
   * Add extension recommendation
   */
  async addRecommendation(extensionId: string): Promise<void> {
    if (!this.configuration) {
      this.configuration = {
        folders: this.folders,
        settings: {},
        extensions: {},
      };
    }

    if (!this.configuration.extensions) {
      this.configuration.extensions = {};
    }

    if (!this.configuration.extensions.recommendations) {
      this.configuration.extensions.recommendations = [];
    }

    if (!this.configuration.extensions.recommendations.includes(extensionId)) {
      this.configuration.extensions.recommendations.push(extensionId);
      await this.saveConfiguration();
      this.notifyListeners();

      console.log(`[Workspace] Added recommendation: ${extensionId}`);
    }
  }

  /**
   * Remove extension recommendation
   */
  async removeRecommendation(extensionId: string): Promise<void> {
    if (!this.configuration?.extensions?.recommendations) return;

    const index = this.configuration.extensions.recommendations.indexOf(extensionId);
    if (index > -1) {
      this.configuration.extensions.recommendations.splice(index, 1);
      await this.saveConfiguration();
      this.notifyListeners();

      console.log(`[Workspace] Removed recommendation: ${extensionId}`);
    }
  }

  /**
   * Get recent workspaces
   */
  getRecentWorkspaces(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RECENT);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Workspace] Failed to load recent workspaces:', error);
      return [];
    }
  }

  /**
   * Add to recent workspaces
   */
  addToRecent(workspaceUri: string): void {
    try {
      let recent = this.getRecentWorkspaces();
      
      // Remove if already exists
      recent = recent.filter(uri => uri !== workspaceUri);
      
      // Add to front
      recent.unshift(workspaceUri);
      
      // Limit to 10
      if (recent.length > 10) {
        recent = recent.slice(0, 10);
      }

      localStorage.setItem(this.STORAGE_KEY_RECENT, JSON.stringify(recent));
    } catch (error) {
      console.error('[Workspace] Failed to save recent workspace:', error);
    }
  }

  /**
   * Create workspace file
   */
  async createWorkspaceFile(name: string, folders: WorkspaceFolder[]): Promise<string> {
    const workspace: WorkspaceConfiguration = {
      folders,
      settings: {},
    };

    const content = JSON.stringify(workspace, null, 2);
    const fileName = `${name}.code-workspace`;

    // Save workspace file
    const response = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: fileName,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create workspace file');
    }

    console.log(`[Workspace] Created workspace file: ${fileName}`);
    return fileName;
  }

  /**
   * Load workspace from file
   */
  async loadWorkspaceFile(path: string): Promise<WorkspaceConfiguration> {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      throw new Error('Failed to load workspace file');
    }

    const content = await response.text();
    const workspace = JSON.parse(content) as WorkspaceConfiguration;

    this.configuration = workspace;
    this.folders = workspace.folders;
    this.notifyListeners();

    console.log(`[Workspace] Loaded workspace file: ${path}`);
    return workspace;
  }

  /**
   * Listen to changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Load workspace configuration
   */
  private async loadConfiguration(workspaceUri: string): Promise<void> {
    try {
      // Try to load .code-workspace file
      const workspaceFile = `${workspaceUri}/.code-workspace`;
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(workspaceFile)}`);
      
      if (response.ok) {
        const content = await response.text();
        this.configuration = JSON.parse(content);
        this.folders = this.configuration.folders;
      } else {
        // Single folder workspace
        this.folders = [{
          uri: workspaceUri,
          name: workspaceUri.split('/').pop() || 'Workspace',
          index: 0,
        }];
      }
    } catch (error) {
      console.warn('[Workspace] Failed to load configuration:', error);
      
      // Fallback to single folder
      this.folders = [{
        uri: workspaceUri,
        name: workspaceUri.split('/').pop() || 'Workspace',
        index: 0,
      }];
    }
  }

  /**
   * Save workspace configuration
   */
  private async saveConfiguration(): Promise<void> {
    if (!this.configuration) return;

    this.configuration.folders = this.folders;

    const content = JSON.stringify(this.configuration, null, 2);
    
    try {
      await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '.code-workspace',
          content,
        }),
      });
    } catch (error) {
      console.error('[Workspace] Failed to save configuration:', error);
    }
  }

  /**
   * Load trust status
   */
  private loadTrustStatus(workspaceUri: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_TRUST);
      if (stored) {
        const trustedWorkspaces = JSON.parse(stored) as string[];
        this.trusted = trustedWorkspaces.includes(workspaceUri);
      }
    } catch (error) {
      console.error('[Workspace] Failed to load trust status:', error);
    }
  }

  /**
   * Save trust status
   */
  private saveTrustStatus(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_TRUST);
      let trustedWorkspaces = stored ? JSON.parse(stored) as string[] : [];

      if (this.trusted) {
        // Add current workspace
        const currentUri = this.folders[0]?.uri;
        if (currentUri && !trustedWorkspaces.includes(currentUri)) {
          trustedWorkspaces.push(currentUri);
        }
      } else {
        // Remove current workspace
        const currentUri = this.folders[0]?.uri;
        trustedWorkspaces = trustedWorkspaces.filter(uri => uri !== currentUri);
      }

      localStorage.setItem(this.STORAGE_KEY_TRUST, JSON.stringify(trustedWorkspaces));
    } catch (error) {
      console.error('[Workspace] Failed to save trust status:', error);
    }
  }

  /**
   * Detect extension recommendations based on workspace content
   */
  private detectRecommendations(): ExtensionRecommendation[] {
    const recommendations: ExtensionRecommendation[] = [];

    // This would analyze workspace files and suggest extensions
    // For now, return empty array
    // TODO: Implement file analysis

    return recommendations;
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
let workspaceManagerInstance: WorkspaceManager | null = null;

export function getWorkspaceManager(): WorkspaceManager {
  if (!workspaceManagerInstance) {
    workspaceManagerInstance = new WorkspaceManager();
  }
  return workspaceManagerInstance;
}
