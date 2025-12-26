import { injectable } from 'inversify';

/**
 * PROJECT MANAGER - Gerenciador Unificado de Projetos
 * 
 * Sistema central para:
 * - Criação e gerenciamento de projetos
 * - Múltiplos tipos de projeto (código, arte, vídeo, música, etc.)
 * - Histórico e versionamento
 * - Templates e presets
 * - Autosave e recovery
 * - Colaboração
 */

// ============================================================================
// TIPOS DE PROJETO
// ============================================================================

export type ProjectType = 
    | 'code'
    | 'visual-script'
    | 'game'
    | 'video'
    | 'audio'
    | 'image'
    | '3d-scene'
    | 'animation'
    | 'document'
    | 'mixed';

export type ProjectStatus = 
    | 'draft'
    | 'active'
    | 'reviewing'
    | 'completed'
    | 'archived';

// ============================================================================
// PROJECT CORE
// ============================================================================

export interface Project {
    id: string;
    name: string;
    type: ProjectType;
    status: ProjectStatus;
    
    // Metadados
    metadata: ProjectMetadata;
    
    // Estrutura
    rootFolder: ProjectFolder;
    
    // Documentos abertos
    openDocuments: string[];
    activeDocumentId?: string;
    
    // Configurações
    settings: ProjectSettings;
    
    // Histórico
    history: ProjectHistory;
    
    // Versionamento
    version: SemanticVersion;
    
    // Timestamps
    created: number;
    modified: number;
    lastOpened: number;
    
    // Cloud sync
    syncStatus?: SyncStatus;
    
    // Colaboradores
    collaborators: Collaborator[];
}

export interface ProjectMetadata {
    description?: string;
    author: string;
    tags: string[];
    thumbnail?: string;
    
    // Licença
    license?: string;
    
    // Links
    repository?: string;
    website?: string;
    documentation?: string;
    
    // Estatísticas
    stats: ProjectStats;
    
    // Custom
    custom: Record<string, unknown>;
}

export interface ProjectStats {
    totalFiles: number;
    totalSize: number;
    codeLines?: number;
    assetCount?: number;
    lastBuildTime?: number;
    buildCount: number;
}

export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
}

// ============================================================================
// PROJECT STRUCTURE
// ============================================================================

export interface ProjectFolder {
    id: string;
    name: string;
    path: string;
    
    // Conteúdo
    folders: ProjectFolder[];
    files: ProjectFile[];
    
    // Metadados
    expanded: boolean;
    color?: string;
    icon?: string;
    
    // Ordem
    sortOrder: number;
}

export interface ProjectFile {
    id: string;
    name: string;
    path: string;
    
    // Tipo
    type: FileType;
    mimeType?: string;
    
    // Estado
    modified: boolean;
    readonly: boolean;
    
    // Conteúdo (pode ser lazy loaded)
    content?: FileContent;
    
    // Metadados
    metadata: FileMetadata;
    
    // Ordem
    sortOrder: number;
}

export type FileType = 
    | 'source'
    | 'asset'
    | 'config'
    | 'document'
    | 'binary'
    | 'unknown';

export interface FileContent {
    text?: string;
    binary?: ArrayBuffer;
    json?: unknown;
}

export interface FileMetadata {
    size: number;
    created: number;
    modified: number;
    hash?: string;
    encoding?: string;
    lineCount?: number;
}

// ============================================================================
// PROJECT SETTINGS
// ============================================================================

export interface ProjectSettings {
    // Editor
    editor: EditorSettings;
    
    // Build
    build: BuildSettings;
    
    // Formatação
    formatting: FormattingSettings;
    
    // Linting
    linting: LintingSettings;
    
    // Runtime
    runtime: RuntimeSettings;
    
    // Output
    output: OutputSettings;
    
    // Custom
    custom: Record<string, unknown>;
}

export interface EditorSettings {
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
    fontSize: number;
    fontFamily: string;
    theme: string;
    autoSave: boolean;
    autoSaveDelay: number;
}

export interface BuildSettings {
    buildCommand?: string;
    buildDir: string;
    sourceMaps: boolean;
    minify: boolean;
    target?: string;
    env: Record<string, string>;
}

export interface FormattingSettings {
    enabled: boolean;
    formatOnSave: boolean;
    formatter?: string;
    rules: Record<string, unknown>;
}

export interface LintingSettings {
    enabled: boolean;
    lintOnSave: boolean;
    linter?: string;
    rules: Record<string, unknown>;
}

export interface RuntimeSettings {
    runtime?: string;
    version?: string;
    env: Record<string, string>;
    args: string[];
}

export interface OutputSettings {
    outputDir: string;
    format: string;
    quality: number;
    optimization: 'none' | 'speed' | 'size' | 'balanced';
}

// ============================================================================
// PROJECT HISTORY
// ============================================================================

export interface ProjectHistory {
    // Undo/Redo stacks globais
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    
    // Histórico de versões
    versions: ProjectVersion[];
    
    // Checkpoints
    checkpoints: Checkpoint[];
    
    // Limite de histórico
    maxEntries: number;
}

export interface HistoryEntry {
    id: string;
    timestamp: number;
    type: HistoryEntryType;
    description: string;
    documentId?: string;
    
    // Para undo
    undo: HistoryAction;
    
    // Para redo
    redo: HistoryAction;
}

export type HistoryEntryType = 
    | 'edit'
    | 'create'
    | 'delete'
    | 'rename'
    | 'move'
    | 'settings'
    | 'batch';

export interface HistoryAction {
    type: string;
    payload: unknown;
}

export interface ProjectVersion {
    id: string;
    version: SemanticVersion;
    name: string;
    description?: string;
    timestamp: number;
    author: string;
    
    // Snapshot completo (comprimido)
    snapshotId?: string;
    
    // Diff do anterior
    diffId?: string;
    
    // Tags
    tags: string[];
}

export interface Checkpoint {
    id: string;
    name: string;
    timestamp: number;
    description?: string;
    
    // Referência ao snapshot
    snapshotId: string;
    
    // Auto ou manual
    auto: boolean;
}

// ============================================================================
// SYNC & COLLABORATION
// ============================================================================

export interface SyncStatus {
    enabled: boolean;
    provider: 'cloud' | 'git' | 'custom';
    
    // Estado
    lastSync: number;
    pending: number;
    
    // Conflitos
    conflicts: SyncConflict[];
    
    // Remote
    remoteUrl?: string;
    remoteBranch?: string;
}

export interface SyncConflict {
    fileId: string;
    path: string;
    localVersion: string;
    remoteVersion: string;
    timestamp: number;
}

export interface Collaborator {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    
    // Permissões
    role: CollaboratorRole;
    permissions: Permission[];
    
    // Presença
    online: boolean;
    lastSeen: number;
    
    // Cursor (para edição colaborativa)
    cursor?: CursorPosition;
}

export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type Permission = 
    | 'read'
    | 'write'
    | 'delete'
    | 'settings'
    | 'share'
    | 'admin';

export interface CursorPosition {
    documentId: string;
    line: number;
    column: number;
    selection?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
}

// ============================================================================
// TEMPLATE
// ============================================================================

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    type: ProjectType;
    
    // Preview
    thumbnail?: string;
    screenshots?: string[];
    
    // Estrutura inicial
    structure: TemplateStructure;
    
    // Configurações padrão
    defaultSettings: Partial<ProjectSettings>;
    
    // Dependências
    dependencies?: string[];
    
    // Tags
    tags: string[];
    
    // Autor
    author: string;
    version: string;
}

export interface TemplateStructure {
    folders: TemplateFolderDef[];
    files: TemplateFileDef[];
}

export interface TemplateFolderDef {
    name: string;
    path: string;
    children?: TemplateFolderDef[];
}

export interface TemplateFileDef {
    name: string;
    path: string;
    content?: string;
    templateUrl?: string;
}

// ============================================================================
// PROJECT MANAGER
// ============================================================================

@injectable()
export class ProjectManager {
    private projects: Map<string, Project> = new Map();
    private activeProjectId?: string;
    private templates: Map<string, ProjectTemplate> = new Map();
    private recentProjects: string[] = [];
    private autosaveInterval?: ReturnType<typeof setInterval>;
    private listeners: Map<string, Set<(event: ProjectEvent) => void>> = new Map();

    constructor() {
        this.registerBuiltInTemplates();
    }

    // ========================================================================
    // PROJECT LIFECYCLE
    // ========================================================================

    /**
     * Cria novo projeto
     */
    create(
        name: string,
        type: ProjectType,
        options: CreateProjectOptions = {}
    ): Project {
        const id = this.generateId();
        const now = Date.now();

        // Estrutura inicial
        let rootFolder: ProjectFolder;
        
        if (options.template) {
            const template = this.templates.get(options.template);
            rootFolder = template 
                ? this.buildFromTemplate(template.structure, name)
                : this.createDefaultStructure(name, type);
        } else {
            rootFolder = this.createDefaultStructure(name, type);
        }

        const project: Project = {
            id,
            name,
            type,
            status: 'draft',
            
            metadata: {
                author: options.author || 'Unknown',
                tags: options.tags || [],
                stats: {
                    totalFiles: 0,
                    totalSize: 0,
                    buildCount: 0,
                },
                custom: {},
            },
            
            rootFolder,
            openDocuments: [],
            
            settings: this.getDefaultSettings(type),
            
            history: {
                undoStack: [],
                redoStack: [],
                versions: [],
                checkpoints: [],
                maxEntries: 1000,
            },
            
            version: { major: 0, minor: 1, patch: 0 },
            
            created: now,
            modified: now,
            lastOpened: now,
            
            collaborators: [],
        };

        // Aplicar template se houver
        if (options.template) {
            const template = this.templates.get(options.template);
            if (template?.defaultSettings) {
                project.settings = { 
                    ...project.settings, 
                    ...template.defaultSettings 
                };
            }
        }

        this.projects.set(id, project);
        this.updateRecentProjects(id);
        this.emit('created', { projectId: id, project });

        return project;
    }

    /**
     * Abre projeto existente
     */
    async open(projectId: string): Promise<Project> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        this.activeProjectId = projectId;
        project.lastOpened = Date.now();
        this.updateRecentProjects(projectId);

        // Iniciar autosave se configurado
        if (project.settings.editor.autoSave) {
            this.startAutosave(project);
        }

        this.emit('opened', { projectId, project });
        return project;
    }

    /**
     * Fecha projeto
     */
    async close(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        // Salvar alterações pendentes
        await this.save(projectId);

        if (this.activeProjectId === projectId) {
            this.activeProjectId = undefined;
            this.stopAutosave();
        }

        this.emit('closed', { projectId });
    }

    /**
     * Salva projeto
     */
    async save(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        project.modified = Date.now();

        // Salvar todos os documentos modificados
        for (const fileId of project.openDocuments) {
            const file = this.findFile(project.rootFolder, fileId);
            if (file?.modified) {
                await this.saveFile(project, file);
            }
        }

        // Atualizar estatísticas
        this.updateProjectStats(project);

        this.emit('saved', { projectId, project });
    }

    /**
     * Exclui projeto
     */
    delete(projectId: string): void {
        if (this.activeProjectId === projectId) {
            this.activeProjectId = undefined;
        }

        this.projects.delete(projectId);
        this.recentProjects = this.recentProjects.filter(id => id !== projectId);

        this.emit('deleted', { projectId });
    }

    /**
     * Duplica projeto
     */
    duplicate(projectId: string, newName: string): Project {
        const original = this.projects.get(projectId);
        if (!original) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const newProject = this.create(newName, original.type, {
            author: original.metadata.author,
            tags: [...original.metadata.tags],
        });

        // Copiar estrutura
        newProject.rootFolder = this.cloneFolder(original.rootFolder);
        newProject.settings = JSON.parse(JSON.stringify(original.settings));

        return newProject;
    }

    // ========================================================================
    // FILE OPERATIONS
    // ========================================================================

    /**
     * Cria arquivo no projeto
     */
    createFile(
        projectId: string,
        path: string,
        content?: FileContent
    ): ProjectFile {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const parts = path.split('/');
        const fileName = parts.pop()!;
        const folderPath = parts.join('/');

        // Encontrar ou criar pasta
        const folder = this.ensureFolder(project.rootFolder, folderPath);

        const file: ProjectFile = {
            id: this.generateId(),
            name: fileName,
            path,
            type: this.inferFileType(fileName),
            modified: false,
            readonly: false,
            content,
            metadata: {
                size: 0,
                created: Date.now(),
                modified: Date.now(),
            },
            sortOrder: folder.files.length,
        };

        folder.files.push(file);

        // Registrar na história
        this.addHistoryEntry(project, {
            type: 'create',
            description: `Created file: ${path}`,
            undo: { type: 'deleteFile', payload: { fileId: file.id } },
            redo: { type: 'createFile', payload: { path, content } },
        });

        this.emit('fileCreated', { projectId, file });
        return file;
    }

    /**
     * Exclui arquivo
     */
    deleteFile(projectId: string, fileId: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        const { folder, file, index } = this.findFileWithParent(project.rootFolder, fileId) || {};
        if (!folder || !file || index === undefined) return;

        folder.files.splice(index, 1);

        // Registrar na história
        this.addHistoryEntry(project, {
            type: 'delete',
            description: `Deleted file: ${file.path}`,
            undo: { type: 'createFile', payload: { path: file.path, content: file.content } },
            redo: { type: 'deleteFile', payload: { fileId } },
        });

        // Fechar se estiver aberto
        project.openDocuments = project.openDocuments.filter(id => id !== fileId);

        this.emit('fileDeleted', { projectId, fileId, path: file.path });
    }

    /**
     * Renomeia arquivo
     */
    renameFile(projectId: string, fileId: string, newName: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        const file = this.findFile(project.rootFolder, fileId);
        if (!file) return;

        const oldPath = file.path;
        const parts = file.path.split('/');
        parts[parts.length - 1] = newName;
        
        const oldName = file.name;
        file.name = newName;
        file.path = parts.join('/');
        file.metadata.modified = Date.now();

        this.addHistoryEntry(project, {
            type: 'rename',
            description: `Renamed: ${oldName} → ${newName}`,
            undo: { type: 'renameFile', payload: { fileId, newName: oldName } },
            redo: { type: 'renameFile', payload: { fileId, newName } },
        });

        this.emit('fileRenamed', { projectId, fileId, oldPath, newPath: file.path });
    }

    /**
     * Move arquivo
     */
    moveFile(projectId: string, fileId: string, newPath: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        const result = this.findFileWithParent(project.rootFolder, fileId);
        if (!result) return;

        const { folder: oldFolder, file, index } = result;
        const oldPath = file.path;

        // Remover da pasta antiga
        oldFolder.files.splice(index, 1);

        // Adicionar na nova pasta
        const parts = newPath.split('/');
        const fileName = parts.pop()!;
        const folderPath = parts.join('/');
        const newFolder = this.ensureFolder(project.rootFolder, folderPath);

        file.name = fileName;
        file.path = newPath;
        file.metadata.modified = Date.now();
        newFolder.files.push(file);

        this.addHistoryEntry(project, {
            type: 'move',
            description: `Moved: ${oldPath} → ${newPath}`,
            undo: { type: 'moveFile', payload: { fileId, newPath: oldPath } },
            redo: { type: 'moveFile', payload: { fileId, newPath } },
        });

        this.emit('fileMoved', { projectId, fileId, oldPath, newPath });
    }

    /**
     * Atualiza conteúdo do arquivo
     */
    updateFile(
        projectId: string,
        fileId: string,
        content: FileContent,
        options: { recordHistory?: boolean } = {}
    ): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        const file = this.findFile(project.rootFolder, fileId);
        if (!file) return;

        const oldContent = file.content;
        file.content = content;
        file.modified = true;
        file.metadata.modified = Date.now();

        if (options.recordHistory !== false) {
            this.addHistoryEntry(project, {
                type: 'edit',
                description: `Edited: ${file.name}`,
                documentId: fileId,
                undo: { type: 'updateFile', payload: { fileId, content: oldContent } },
                redo: { type: 'updateFile', payload: { fileId, content } },
            });
        }

        this.emit('fileUpdated', { projectId, fileId });
    }

    /**
     * Salva arquivo individual
     */
    private async saveFile(project: Project, file: ProjectFile): Promise<void> {
        file.modified = false;
        
        if (file.content?.text) {
            file.metadata.size = new TextEncoder().encode(file.content.text).length;
            file.metadata.lineCount = file.content.text.split('\n').length;
        } else if (file.content?.binary) {
            file.metadata.size = file.content.binary.byteLength;
        }

        file.metadata.modified = Date.now();
    }

    // ========================================================================
    // FOLDER OPERATIONS
    // ========================================================================

    /**
     * Cria pasta
     */
    createFolder(projectId: string, path: string): ProjectFolder {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        return this.ensureFolder(project.rootFolder, path);
    }

    /**
     * Exclui pasta
     */
    deleteFolder(projectId: string, folderId: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        const result = this.findFolderWithParent(project.rootFolder, folderId);
        if (!result || !result.parent) return;

        const { parent, folder, index } = result;
        parent.folders.splice(index, 1);

        this.emit('folderDeleted', { projectId, folderId, path: folder.path });
    }

    private ensureFolder(root: ProjectFolder, path: string): ProjectFolder {
        if (!path) return root;

        const parts = path.split('/').filter(Boolean);
        let current = root;

        for (const part of parts) {
            let folder = current.folders.find(f => f.name === part);
            
            if (!folder) {
                folder = {
                    id: this.generateId(),
                    name: part,
                    path: current.path ? `${current.path}/${part}` : part,
                    folders: [],
                    files: [],
                    expanded: false,
                    sortOrder: current.folders.length,
                };
                current.folders.push(folder);
            }
            
            current = folder;
        }

        return current;
    }

    // ========================================================================
    // DOCUMENT MANAGEMENT
    // ========================================================================

    /**
     * Abre documento para edição
     */
    openDocument(projectId: string, fileId: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        if (!project.openDocuments.includes(fileId)) {
            project.openDocuments.push(fileId);
        }

        project.activeDocumentId = fileId;
        this.emit('documentOpened', { projectId, fileId });
    }

    /**
     * Fecha documento
     */
    closeDocument(projectId: string, fileId: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        project.openDocuments = project.openDocuments.filter(id => id !== fileId);

        if (project.activeDocumentId === fileId) {
            project.activeDocumentId = project.openDocuments[0];
        }

        this.emit('documentClosed', { projectId, fileId });
    }

    /**
     * Define documento ativo
     */
    setActiveDocument(projectId: string, fileId: string): void {
        const project = this.projects.get(projectId);
        if (!project) return;

        if (project.openDocuments.includes(fileId)) {
            project.activeDocumentId = fileId;
            this.emit('activeDocumentChanged', { projectId, fileId });
        }
    }

    // ========================================================================
    // HISTORY (UNDO/REDO)
    // ========================================================================

    /**
     * Desfaz última ação
     */
    undo(projectId: string): boolean {
        const project = this.projects.get(projectId);
        if (!project || project.history.undoStack.length === 0) {
            return false;
        }

        const entry = project.history.undoStack.pop()!;
        project.history.redoStack.push(entry);

        this.applyHistoryAction(project, entry.undo);
        this.emit('undo', { projectId, entry });

        return true;
    }

    /**
     * Refaz ação desfeita
     */
    redo(projectId: string): boolean {
        const project = this.projects.get(projectId);
        if (!project || project.history.redoStack.length === 0) {
            return false;
        }

        const entry = project.history.redoStack.pop()!;
        project.history.undoStack.push(entry);

        this.applyHistoryAction(project, entry.redo);
        this.emit('redo', { projectId, entry });

        return true;
    }

    private addHistoryEntry(
        project: Project,
        entry: Omit<HistoryEntry, 'id' | 'timestamp'>
    ): void {
        const fullEntry: HistoryEntry = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...entry,
        };

        project.history.undoStack.push(fullEntry);
        project.history.redoStack = []; // Limpa redo ao fazer nova ação

        // Limitar tamanho
        while (project.history.undoStack.length > project.history.maxEntries) {
            project.history.undoStack.shift();
        }
    }

    private applyHistoryAction(project: Project, action: HistoryAction): void {
        // Aplicar ação sem registrar na história
        switch (action.type) {
            case 'updateFile':
                const { fileId, content } = action.payload as { fileId: string; content: FileContent };
                this.updateFile(project.id, fileId, content, { recordHistory: false });
                break;
            // Adicionar outros tipos conforme necessário
        }
    }

    // ========================================================================
    // CHECKPOINTS & VERSIONS
    // ========================================================================

    /**
     * Cria checkpoint
     */
    async createCheckpoint(
        projectId: string,
        name: string,
        description?: string
    ): Promise<Checkpoint> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const checkpoint: Checkpoint = {
            id: this.generateId(),
            name,
            timestamp: Date.now(),
            description,
            snapshotId: await this.createSnapshot(project),
            auto: false,
        };

        project.history.checkpoints.push(checkpoint);
        this.emit('checkpointCreated', { projectId, checkpoint });

        return checkpoint;
    }

    /**
     * Restaura checkpoint
     */
    async restoreCheckpoint(projectId: string, checkpointId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        const checkpoint = project.history.checkpoints.find(c => c.id === checkpointId);
        if (!checkpoint) return;

        await this.restoreSnapshot(project, checkpoint.snapshotId);
        this.emit('checkpointRestored', { projectId, checkpointId });
    }

    /**
     * Cria nova versão
     */
    async createVersion(
        projectId: string,
        version: SemanticVersion,
        name: string,
        description?: string
    ): Promise<ProjectVersion> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const projectVersion: ProjectVersion = {
            id: this.generateId(),
            version,
            name,
            description,
            timestamp: Date.now(),
            author: project.metadata.author,
            snapshotId: await this.createSnapshot(project),
            tags: [],
        };

        project.history.versions.push(projectVersion);
        project.version = version;

        this.emit('versionCreated', { projectId, version: projectVersion });
        return projectVersion;
    }

    private async createSnapshot(project: Project): Promise<string> {
        // Placeholder - criar snapshot serializado
        const snapshotId = this.generateId();
        return snapshotId;
    }

    private async restoreSnapshot(project: Project, snapshotId: string): Promise<void> {
        // Placeholder - restaurar do snapshot
    }

    // ========================================================================
    // AUTOSAVE
    // ========================================================================

    private startAutosave(project: Project): void {
        this.stopAutosave();

        const delay = project.settings.editor.autoSaveDelay;
        this.autosaveInterval = setInterval(() => {
            this.save(project.id);
        }, delay);
    }

    private stopAutosave(): void {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = undefined;
        }
    }

    // ========================================================================
    // TEMPLATES
    // ========================================================================

    /**
     * Registra template
     */
    registerTemplate(template: ProjectTemplate): void {
        this.templates.set(template.id, template);
    }

    /**
     * Lista templates
     */
    getTemplates(type?: ProjectType): ProjectTemplate[] {
        const templates = Array.from(this.templates.values());
        if (type) {
            return templates.filter(t => t.type === type);
        }
        return templates;
    }

    private buildFromTemplate(structure: TemplateStructure, projectName: string): ProjectFolder {
        const root: ProjectFolder = {
            id: this.generateId(),
            name: projectName,
            path: '',
            folders: [],
            files: [],
            expanded: true,
            sortOrder: 0,
        };

        // Criar pastas
        for (const folderDef of structure.folders) {
            this.createFolderFromDef(root, folderDef);
        }

        // Criar arquivos
        for (const fileDef of structure.files) {
            this.createFileFromDef(root, fileDef);
        }

        return root;
    }

    private createFolderFromDef(parent: ProjectFolder, def: TemplateFolderDef): ProjectFolder {
        const folder: ProjectFolder = {
            id: this.generateId(),
            name: def.name,
            path: def.path,
            folders: [],
            files: [],
            expanded: false,
            sortOrder: parent.folders.length,
        };

        parent.folders.push(folder);

        if (def.children) {
            for (const child of def.children) {
                this.createFolderFromDef(folder, child);
            }
        }

        return folder;
    }

    private createFileFromDef(root: ProjectFolder, def: TemplateFileDef): void {
        const parts = def.path.split('/');
        const fileName = parts.pop()!;
        const folderPath = parts.join('/');

        const folder = this.ensureFolder(root, folderPath);

        const file: ProjectFile = {
            id: this.generateId(),
            name: fileName,
            path: def.path,
            type: this.inferFileType(fileName),
            modified: false,
            readonly: false,
            content: def.content ? { text: def.content } : undefined,
            metadata: {
                size: def.content?.length || 0,
                created: Date.now(),
                modified: Date.now(),
            },
            sortOrder: folder.files.length,
        };

        folder.files.push(file);
    }

    private registerBuiltInTemplates(): void {
        // Code project template
        this.registerTemplate({
            id: 'code-basic',
            name: 'Basic Code Project',
            description: 'A simple code project with standard structure',
            type: 'code',
            tags: ['code', 'basic'],
            author: 'Aethel',
            version: '1.0.0',
            structure: {
                folders: [
                    { name: 'src', path: 'src' },
                    { name: 'tests', path: 'tests' },
                    { name: 'docs', path: 'docs' },
                ],
                files: [
                    { name: 'README.md', path: 'README.md', content: '# Project\n\nDescription here.' },
                    { name: '.gitignore', path: '.gitignore', content: 'node_modules/\ndist/\n.env' },
                ],
            },
            defaultSettings: {},
        });

        // Game project template
        this.registerTemplate({
            id: 'game-basic',
            name: 'Basic Game Project',
            description: 'A game project with assets and scripts folders',
            type: 'game',
            tags: ['game', 'basic'],
            author: 'Aethel',
            version: '1.0.0',
            structure: {
                folders: [
                    { name: 'assets', path: 'assets', children: [
                        { name: 'textures', path: 'assets/textures' },
                        { name: 'models', path: 'assets/models' },
                        { name: 'audio', path: 'assets/audio' },
                        { name: 'fonts', path: 'assets/fonts' },
                    ]},
                    { name: 'scripts', path: 'scripts' },
                    { name: 'scenes', path: 'scenes' },
                    { name: 'prefabs', path: 'prefabs' },
                ],
                files: [
                    { name: 'project.json', path: 'project.json', content: '{}' },
                ],
            },
            defaultSettings: {},
        });

        // Video project template
        this.registerTemplate({
            id: 'video-basic',
            name: 'Basic Video Project',
            description: 'A video editing project',
            type: 'video',
            tags: ['video', 'editing'],
            author: 'Aethel',
            version: '1.0.0',
            structure: {
                folders: [
                    { name: 'footage', path: 'footage' },
                    { name: 'audio', path: 'audio' },
                    { name: 'graphics', path: 'graphics' },
                    { name: 'exports', path: 'exports' },
                ],
                files: [
                    { name: 'timeline.json', path: 'timeline.json', content: '{}' },
                ],
            },
            defaultSettings: {
                output: {
                    outputDir: 'exports',
                    format: 'mp4',
                    quality: 100,
                    optimization: 'balanced',
                },
            },
        });
    }

    // ========================================================================
    // QUERIES & GETTERS
    // ========================================================================

    /**
     * Obtém projeto ativo
     */
    getActiveProject(): Project | undefined {
        return this.activeProjectId 
            ? this.projects.get(this.activeProjectId) 
            : undefined;
    }

    /**
     * Obtém projeto por ID
     */
    get(projectId: string): Project | undefined {
        return this.projects.get(projectId);
    }

    /**
     * Lista todos os projetos
     */
    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    /**
     * Lista projetos recentes
     */
    getRecentProjects(): Project[] {
        return this.recentProjects
            .map(id => this.projects.get(id))
            .filter(Boolean) as Project[];
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private generateId(): string {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private updateRecentProjects(projectId: string): void {
        this.recentProjects = this.recentProjects.filter(id => id !== projectId);
        this.recentProjects.unshift(projectId);
        this.recentProjects = this.recentProjects.slice(0, 10);
    }

    private inferFileType(filename: string): FileType {
        const ext = filename.split('.').pop()?.toLowerCase();
        
        const sourceExts = ['ts', 'js', 'py', 'java', 'cpp', 'c', 'cs', 'rs', 'go', 'rb', 'php'];
        const configExts = ['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env'];
        const docExts = ['md', 'txt', 'rst', 'doc', 'docx', 'pdf'];
        const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'mp3', 'wav', 'mp4', 'mov', 'obj', 'fbx', 'glb'];

        if (sourceExts.includes(ext || '')) return 'source';
        if (configExts.includes(ext || '')) return 'config';
        if (docExts.includes(ext || '')) return 'document';
        if (assetExts.includes(ext || '')) return 'asset';

        return 'unknown';
    }

    private findFile(folder: ProjectFolder, fileId: string): ProjectFile | undefined {
        for (const file of folder.files) {
            if (file.id === fileId) return file;
        }

        for (const subFolder of folder.folders) {
            const found = this.findFile(subFolder, fileId);
            if (found) return found;
        }

        return undefined;
    }

    private findFileWithParent(
        folder: ProjectFolder,
        fileId: string
    ): { folder: ProjectFolder; file: ProjectFile; index: number } | undefined {
        for (let i = 0; i < folder.files.length; i++) {
            if (folder.files[i].id === fileId) {
                return { folder, file: folder.files[i], index: i };
            }
        }

        for (const subFolder of folder.folders) {
            const found = this.findFileWithParent(subFolder, fileId);
            if (found) return found;
        }

        return undefined;
    }

    private findFolderWithParent(
        parent: ProjectFolder,
        folderId: string,
        parentRef?: ProjectFolder
    ): { parent: ProjectFolder | null; folder: ProjectFolder; index: number } | undefined {
        if (parent.id === folderId) {
            return { parent: parentRef || null, folder: parent, index: -1 };
        }

        for (let i = 0; i < parent.folders.length; i++) {
            if (parent.folders[i].id === folderId) {
                return { parent, folder: parent.folders[i], index: i };
            }

            const found = this.findFolderWithParent(parent.folders[i], folderId, parent);
            if (found) return found;
        }

        return undefined;
    }

    private cloneFolder(folder: ProjectFolder): ProjectFolder {
        return {
            ...folder,
            id: this.generateId(),
            folders: folder.folders.map(f => this.cloneFolder(f)),
            files: folder.files.map(f => ({ ...f, id: this.generateId() })),
        };
    }

    private createDefaultStructure(name: string, type: ProjectType): ProjectFolder {
        const root: ProjectFolder = {
            id: this.generateId(),
            name,
            path: '',
            folders: [],
            files: [],
            expanded: true,
            sortOrder: 0,
        };

        // Adicionar estrutura base por tipo
        switch (type) {
            case 'code':
                root.folders.push(
                    { id: this.generateId(), name: 'src', path: 'src', folders: [], files: [], expanded: true, sortOrder: 0 },
                    { id: this.generateId(), name: 'tests', path: 'tests', folders: [], files: [], expanded: false, sortOrder: 1 }
                );
                break;
            case 'game':
                root.folders.push(
                    { id: this.generateId(), name: 'assets', path: 'assets', folders: [], files: [], expanded: true, sortOrder: 0 },
                    { id: this.generateId(), name: 'scripts', path: 'scripts', folders: [], files: [], expanded: true, sortOrder: 1 },
                    { id: this.generateId(), name: 'scenes', path: 'scenes', folders: [], files: [], expanded: false, sortOrder: 2 }
                );
                break;
            case 'video':
                root.folders.push(
                    { id: this.generateId(), name: 'footage', path: 'footage', folders: [], files: [], expanded: true, sortOrder: 0 },
                    { id: this.generateId(), name: 'audio', path: 'audio', folders: [], files: [], expanded: false, sortOrder: 1 },
                    { id: this.generateId(), name: 'exports', path: 'exports', folders: [], files: [], expanded: false, sortOrder: 2 }
                );
                break;
        }

        return root;
    }

    private getDefaultSettings(type: ProjectType): ProjectSettings {
        return {
            editor: {
                tabSize: 4,
                insertSpaces: true,
                wordWrap: true,
                lineNumbers: true,
                minimap: true,
                fontSize: 14,
                fontFamily: 'monospace',
                theme: 'dark',
                autoSave: true,
                autoSaveDelay: 30000,
            },
            build: {
                buildDir: 'dist',
                sourceMaps: true,
                minify: false,
                env: {},
            },
            formatting: {
                enabled: true,
                formatOnSave: true,
                rules: {},
            },
            linting: {
                enabled: true,
                lintOnSave: true,
                rules: {},
            },
            runtime: {
                env: {},
                args: [],
            },
            output: {
                outputDir: 'output',
                format: 'default',
                quality: 100,
                optimization: 'balanced',
            },
            custom: {},
        };
    }

    private updateProjectStats(project: Project): void {
        let totalFiles = 0;
        let totalSize = 0;

        const countFolder = (folder: ProjectFolder) => {
            for (const file of folder.files) {
                totalFiles++;
                totalSize += file.metadata.size;
            }
            for (const subFolder of folder.folders) {
                countFolder(subFolder);
            }
        };

        countFolder(project.rootFolder);

        project.metadata.stats.totalFiles = totalFiles;
        project.metadata.stats.totalSize = totalSize;
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (event: ProjectEvent) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (event: ProjectEvent) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: ProjectEvent): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export interface CreateProjectOptions {
    author?: string;
    tags?: string[];
    template?: string;
    path?: string;
}

export interface ProjectEvent {
    projectId?: string;
    project?: Project;
    fileId?: string;
    file?: ProjectFile;
    folderId?: string;
    path?: string;
    oldPath?: string;
    newPath?: string;
    entry?: HistoryEntry;
    checkpoint?: Checkpoint;
    checkpointId?: string;
    version?: ProjectVersion;
}
