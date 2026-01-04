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
export type ProjectType = 'code' | 'visual-script' | 'game' | 'video' | 'audio' | 'image' | '3d-scene' | 'animation' | 'document' | 'mixed';
export type ProjectStatus = 'draft' | 'active' | 'reviewing' | 'completed' | 'archived';
export interface Project {
    id: string;
    name: string;
    type: ProjectType;
    status: ProjectStatus;
    metadata: ProjectMetadata;
    rootFolder: ProjectFolder;
    openDocuments: string[];
    activeDocumentId?: string;
    settings: ProjectSettings;
    history: ProjectHistory;
    version: SemanticVersion;
    created: number;
    modified: number;
    lastOpened: number;
    syncStatus?: SyncStatus;
    collaborators: Collaborator[];
}
export interface ProjectMetadata {
    description?: string;
    author: string;
    tags: string[];
    thumbnail?: string;
    license?: string;
    repository?: string;
    website?: string;
    documentation?: string;
    stats: ProjectStats;
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
export interface ProjectFolder {
    id: string;
    name: string;
    path: string;
    folders: ProjectFolder[];
    files: ProjectFile[];
    expanded: boolean;
    color?: string;
    icon?: string;
    sortOrder: number;
}
export interface ProjectFile {
    id: string;
    name: string;
    path: string;
    type: FileType;
    mimeType?: string;
    modified: boolean;
    readonly: boolean;
    content?: FileContent;
    metadata: FileMetadata;
    sortOrder: number;
}
export type FileType = 'source' | 'asset' | 'config' | 'document' | 'binary' | 'unknown';
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
export interface ProjectSettings {
    editor: EditorSettings;
    build: BuildSettings;
    formatting: FormattingSettings;
    linting: LintingSettings;
    runtime: RuntimeSettings;
    output: OutputSettings;
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
export interface ProjectHistory {
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    versions: ProjectVersion[];
    checkpoints: Checkpoint[];
    maxEntries: number;
}
export interface HistoryEntry {
    id: string;
    timestamp: number;
    type: HistoryEntryType;
    description: string;
    documentId?: string;
    undo: HistoryAction;
    redo: HistoryAction;
}
export type HistoryEntryType = 'edit' | 'create' | 'delete' | 'rename' | 'move' | 'settings' | 'batch';
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
    snapshotId?: string;
    diffId?: string;
    tags: string[];
}
export interface Checkpoint {
    id: string;
    name: string;
    timestamp: number;
    description?: string;
    snapshotId: string;
    auto: boolean;
}
export interface SyncStatus {
    enabled: boolean;
    provider: 'cloud' | 'git' | 'custom';
    lastSync: number;
    pending: number;
    conflicts: SyncConflict[];
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
    role: CollaboratorRole;
    permissions: Permission[];
    online: boolean;
    lastSeen: number;
    cursor?: CursorPosition;
}
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type Permission = 'read' | 'write' | 'delete' | 'settings' | 'share' | 'admin';
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
export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    type: ProjectType;
    thumbnail?: string;
    screenshots?: string[];
    structure: TemplateStructure;
    defaultSettings: Partial<ProjectSettings>;
    dependencies?: string[];
    tags: string[];
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
export declare class ProjectManager {
    private projects;
    private activeProjectId?;
    private templates;
    private recentProjects;
    private autosaveInterval?;
    private listeners;
    constructor();
    /**
     * Cria novo projeto
     */
    create(name: string, type: ProjectType, options?: CreateProjectOptions): Project;
    /**
     * Abre projeto existente
     */
    open(projectId: string): Promise<Project>;
    /**
     * Fecha projeto
     */
    close(projectId: string): Promise<void>;
    /**
     * Salva projeto
     */
    save(projectId: string): Promise<void>;
    /**
     * Exclui projeto
     */
    delete(projectId: string): void;
    /**
     * Duplica projeto
     */
    duplicate(projectId: string, newName: string): Project;
    /**
     * Cria arquivo no projeto
     */
    createFile(projectId: string, path: string, content?: FileContent): ProjectFile;
    /**
     * Exclui arquivo
     */
    deleteFile(projectId: string, fileId: string): void;
    /**
     * Renomeia arquivo
     */
    renameFile(projectId: string, fileId: string, newName: string): void;
    /**
     * Move arquivo
     */
    moveFile(projectId: string, fileId: string, newPath: string): void;
    /**
     * Atualiza conteúdo do arquivo
     */
    updateFile(projectId: string, fileId: string, content: FileContent, options?: {
        recordHistory?: boolean;
    }): void;
    /**
     * Salva arquivo individual
     */
    private saveFile;
    /**
     * Cria pasta
     */
    createFolder(projectId: string, path: string): ProjectFolder;
    /**
     * Exclui pasta
     */
    deleteFolder(projectId: string, folderId: string): void;
    private ensureFolder;
    /**
     * Abre documento para edição
     */
    openDocument(projectId: string, fileId: string): void;
    /**
     * Fecha documento
     */
    closeDocument(projectId: string, fileId: string): void;
    /**
     * Define documento ativo
     */
    setActiveDocument(projectId: string, fileId: string): void;
    /**
     * Desfaz última ação
     */
    undo(projectId: string): boolean;
    /**
     * Refaz ação desfeita
     */
    redo(projectId: string): boolean;
    private addHistoryEntry;
    private applyHistoryAction;
    /**
     * Cria checkpoint
     */
    createCheckpoint(projectId: string, name: string, description?: string): Promise<Checkpoint>;
    /**
     * Restaura checkpoint
     */
    restoreCheckpoint(projectId: string, checkpointId: string): Promise<void>;
    /**
     * Cria nova versão
     */
    createVersion(projectId: string, version: SemanticVersion, name: string, description?: string): Promise<ProjectVersion>;
    private createSnapshot;
    private restoreSnapshot;
    private startAutosave;
    private stopAutosave;
    /**
     * Registra template
     */
    registerTemplate(template: ProjectTemplate): void;
    /**
     * Lista templates
     */
    getTemplates(type?: ProjectType): ProjectTemplate[];
    private buildFromTemplate;
    private createFolderFromDef;
    private createFileFromDef;
    private registerBuiltInTemplates;
    /**
     * Obtém projeto ativo
     */
    getActiveProject(): Project | undefined;
    /**
     * Obtém projeto por ID
     */
    get(projectId: string): Project | undefined;
    /**
     * Lista todos os projetos
     */
    getAll(): Project[];
    /**
     * Lista projetos recentes
     */
    getRecentProjects(): Project[];
    private generateId;
    private updateRecentProjects;
    private inferFileType;
    private findFile;
    private findFileWithParent;
    private findFolderWithParent;
    private cloneFolder;
    private createDefaultStructure;
    private getDefaultSettings;
    private updateProjectStats;
    on(event: string, callback: (event: ProjectEvent) => void): void;
    off(event: string, callback: (event: ProjectEvent) => void): void;
    private emit;
}
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
