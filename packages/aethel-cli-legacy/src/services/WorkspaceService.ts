/**
 * @file WorkspaceService.ts
 * @description Gerenciamento de workspaces e projetos da IDE
 */

import { EventBus, IDE_EVENTS } from './EventBus';
import { StorageService } from './StorageService';

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface WorkspaceConfig {
  folders: WorkspaceFolder[];
  settings: Record<string, any>;
  extensions: string[];
  launch?: Record<string, any>;
  tasks?: Record<string, any>;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: Date;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: WorkspaceFile[];
}

/**
 * WorkspaceService - Gerencia workspaces e projetos
 */
export class WorkspaceService {
  private static instance: WorkspaceService;
  private eventBus: EventBus;
  private storage: StorageService;
  private currentWorkspace: WorkspaceConfig | null = null;
  private workspacePath: string | null = null;
  private fileCache: Map<string, WorkspaceFile> = new Map();
  private fileWatchers: Map<string, () => void> = new Map();

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.storage = StorageService.getInstance();
    this.loadRecentWorkspaces();
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  /**
   * Abre um workspace a partir do caminho
   */
  public async openWorkspace(path: string): Promise<WorkspaceConfig> {
    try {
      // Carregar configuração do workspace
      const config = await this.loadWorkspaceConfig(path);
      
      this.currentWorkspace = config;
      this.workspacePath = path;
      
      // Salvar nos recentes
      this.addToRecentWorkspaces(path, this.getWorkspaceName(path));
      
      // Emitir evento
      this.eventBus.emit(IDE_EVENTS.WORKSPACE_OPENED, {
        path,
        config
      });

      return config;
    } catch (error) {
      console.error('Erro ao abrir workspace:', error);
      throw error;
    }
  }

  /**
   * Fecha o workspace atual
   */
  public closeWorkspace(): void {
    if (this.currentWorkspace) {
      const path = this.workspacePath;
      this.currentWorkspace = null;
      this.workspacePath = null;
      this.fileCache.clear();
      
      // Limpar file watchers
      this.fileWatchers.forEach(unwatch => unwatch());
      this.fileWatchers.clear();
      
      this.eventBus.emit(IDE_EVENTS.WORKSPACE_CLOSED, { path });
    }
  }

  /**
   * Obtém o workspace atual
   */
  public getCurrentWorkspace(): WorkspaceConfig | null {
    return this.currentWorkspace;
  }

  /**
   * Obtém o caminho do workspace atual
   */
  public getWorkspacePath(): string | null {
    return this.workspacePath;
  }

  /**
   * Verifica se há workspace aberto
   */
  public hasWorkspace(): boolean {
    return this.currentWorkspace !== null;
  }

  /**
   * Carrega configuração do workspace
   */
  private async loadWorkspaceConfig(path: string): Promise<WorkspaceConfig> {
    // Tentar carregar .aethel-workspace ou .vscode
    const configPaths = [
      `${path}/.aethel-workspace`,
      `${path}/.vscode/workspace.json`,
      `${path}/.code-workspace`
    ];

    // Configuração padrão se nenhum arquivo encontrado
    const defaultConfig: WorkspaceConfig = {
      folders: [{
        uri: path,
        name: this.getWorkspaceName(path),
        index: 0
      }],
      settings: {},
      extensions: []
    };

    // Em produção, isso carregaria do filesystem
    // Por enquanto retornamos configuração padrão
    return defaultConfig;
  }

  /**
   * Extrai nome do workspace do caminho
   */
  private getWorkspaceName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Workspace';
  }

  /**
   * Lista arquivos do workspace
   */
  public async listFiles(dirPath?: string): Promise<WorkspaceFile[]> {
    const basePath = dirPath || this.workspacePath;
    if (!basePath) return [];

    // Verificar cache
    const cached = this.fileCache.get(basePath);
    if (cached && cached.children) {
      return cached.children;
    }

    // Em produção, isso listaria do filesystem
    // Por enquanto retornamos estrutura básica
    return [];
  }

  /**
   * Busca arquivos por pattern
   */
  public async findFiles(
    pattern: string, 
    exclude?: string[],
    maxResults?: number
  ): Promise<string[]> {
    if (!this.workspacePath) return [];
    
    // Implementação de glob matching
    // Por enquanto retorna array vazio
    return [];
  }

  /**
   * Busca texto em arquivos
   */
  public async searchInFiles(
    query: string,
    options?: {
      include?: string[];
      exclude?: string[];
      regex?: boolean;
      caseSensitive?: boolean;
      wholeWord?: boolean;
      maxResults?: number;
    }
  ): Promise<SearchResult[]> {
    if (!this.workspacePath) return [];
    
    // Implementação de search
    return [];
  }

  /**
   * Adiciona workspace aos recentes
   */
  private addToRecentWorkspaces(path: string, name: string): void {
    const recents = this.getRecentWorkspaces();
    
    // Remove se já existe
    const filtered = recents.filter(r => r.path !== path);
    
    // Adiciona no início
    filtered.unshift({
      path,
      name,
      lastOpened: new Date()
    });
    
    // Manter apenas os últimos 10
    const limited = filtered.slice(0, 10);
    
    this.storage.set('recentWorkspaces', limited);
  }

  /**
   * Obtém workspaces recentes
   */
  public getRecentWorkspaces(): RecentWorkspace[] {
    return this.storage.get<RecentWorkspace[]>('recentWorkspaces', []) || [];
  }

  /**
   * Carrega workspaces recentes do storage
   */
  private loadRecentWorkspaces(): void {
    // Já carregado pelo get
  }

  /**
   * Limpa workspaces recentes
   */
  public clearRecentWorkspaces(): void {
    this.storage.remove('recentWorkspaces');
  }

  /**
   * Salva configurações do workspace
   */
  public async saveWorkspaceSettings(settings: Record<string, any>): Promise<void> {
    if (!this.currentWorkspace) return;
    
    this.currentWorkspace.settings = {
      ...this.currentWorkspace.settings,
      ...settings
    };
    
    this.eventBus.emit(IDE_EVENTS.WORKSPACE_CHANGED, {
      path: this.workspacePath,
      settings
    });
  }

  /**
   * Obtém configuração específica do workspace
   */
  public getWorkspaceSetting<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.currentWorkspace) return defaultValue;
    return this.currentWorkspace.settings[key] ?? defaultValue;
  }

  /**
   * Adiciona folder ao workspace
   */
  public addFolder(folderPath: string): void {
    if (!this.currentWorkspace) return;
    
    const exists = this.currentWorkspace.folders.some(
      f => f.uri === folderPath
    );
    
    if (!exists) {
      this.currentWorkspace.folders.push({
        uri: folderPath,
        name: this.getWorkspaceName(folderPath),
        index: this.currentWorkspace.folders.length
      });
      
      this.eventBus.emit(IDE_EVENTS.WORKSPACE_CHANGED, {
        action: 'folderAdded',
        folder: folderPath
      });
    }
  }

  /**
   * Remove folder do workspace
   */
  public removeFolder(folderPath: string): void {
    if (!this.currentWorkspace) return;
    
    this.currentWorkspace.folders = this.currentWorkspace.folders.filter(
      f => f.uri !== folderPath
    );
    
    // Reindexar
    this.currentWorkspace.folders.forEach((f, i) => f.index = i);
    
    this.eventBus.emit(IDE_EVENTS.WORKSPACE_CHANGED, {
      action: 'folderRemoved',
      folder: folderPath
    });
  }

  /**
   * Obtém folders do workspace
   */
  public getFolders(): WorkspaceFolder[] {
    return this.currentWorkspace?.folders || [];
  }

  /**
   * Resolve caminho relativo ao workspace
   */
  public resolvePath(relativePath: string): string | null {
    if (!this.workspacePath) return null;
    return `${this.workspacePath}/${relativePath}`;
  }

  /**
   * Converte caminho absoluto para relativo
   */
  public relativePath(absolutePath: string): string | null {
    if (!this.workspacePath) return null;
    if (!absolutePath.startsWith(this.workspacePath)) return null;
    return absolutePath.slice(this.workspacePath.length + 1);
  }
}

export interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

// Exportar instância global
export const workspaceService = WorkspaceService.getInstance();
