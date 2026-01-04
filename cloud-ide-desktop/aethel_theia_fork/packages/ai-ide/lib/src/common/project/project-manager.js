"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManager = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// PROJECT MANAGER
// ============================================================================
let ProjectManager = class ProjectManager {
    constructor() {
        this.projects = new Map();
        this.templates = new Map();
        this.recentProjects = [];
        this.listeners = new Map();
        this.registerBuiltInTemplates();
    }
    // ========================================================================
    // PROJECT LIFECYCLE
    // ========================================================================
    /**
     * Cria novo projeto
     */
    create(name, type, options = {}) {
        const id = this.generateId();
        const now = Date.now();
        // Estrutura inicial
        let rootFolder;
        if (options.template) {
            const template = this.templates.get(options.template);
            rootFolder = template
                ? this.buildFromTemplate(template.structure, name)
                : this.createDefaultStructure(name, type);
        }
        else {
            rootFolder = this.createDefaultStructure(name, type);
        }
        const project = {
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
    async open(projectId) {
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
    async close(projectId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
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
    async save(projectId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
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
    delete(projectId) {
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
    duplicate(projectId, newName) {
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
    createFile(projectId, path, content) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const parts = path.split('/');
        const fileName = parts.pop();
        const folderPath = parts.join('/');
        // Encontrar ou criar pasta
        const folder = this.ensureFolder(project.rootFolder, folderPath);
        const file = {
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
    deleteFile(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const { folder, file, index } = this.findFileWithParent(project.rootFolder, fileId) || {};
        if (!folder || !file || index === undefined)
            return;
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
    renameFile(projectId, fileId, newName) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const file = this.findFile(project.rootFolder, fileId);
        if (!file)
            return;
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
    moveFile(projectId, fileId, newPath) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const result = this.findFileWithParent(project.rootFolder, fileId);
        if (!result)
            return;
        const { folder: oldFolder, file, index } = result;
        const oldPath = file.path;
        // Remover da pasta antiga
        oldFolder.files.splice(index, 1);
        // Adicionar na nova pasta
        const parts = newPath.split('/');
        const fileName = parts.pop();
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
    updateFile(projectId, fileId, content, options = {}) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const file = this.findFile(project.rootFolder, fileId);
        if (!file)
            return;
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
    async saveFile(project, file) {
        file.modified = false;
        if (file.content?.text) {
            file.metadata.size = new TextEncoder().encode(file.content.text).length;
            file.metadata.lineCount = file.content.text.split('\n').length;
        }
        else if (file.content?.binary) {
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
    createFolder(projectId, path) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }
        return this.ensureFolder(project.rootFolder, path);
    }
    /**
     * Exclui pasta
     */
    deleteFolder(projectId, folderId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const result = this.findFolderWithParent(project.rootFolder, folderId);
        if (!result || !result.parent)
            return;
        const { parent, folder, index } = result;
        parent.folders.splice(index, 1);
        this.emit('folderDeleted', { projectId, folderId, path: folder.path });
    }
    ensureFolder(root, path) {
        if (!path)
            return root;
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
    openDocument(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        if (!project.openDocuments.includes(fileId)) {
            project.openDocuments.push(fileId);
        }
        project.activeDocumentId = fileId;
        this.emit('documentOpened', { projectId, fileId });
    }
    /**
     * Fecha documento
     */
    closeDocument(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        project.openDocuments = project.openDocuments.filter(id => id !== fileId);
        if (project.activeDocumentId === fileId) {
            project.activeDocumentId = project.openDocuments[0];
        }
        this.emit('documentClosed', { projectId, fileId });
    }
    /**
     * Define documento ativo
     */
    setActiveDocument(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
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
    undo(projectId) {
        const project = this.projects.get(projectId);
        if (!project || project.history.undoStack.length === 0) {
            return false;
        }
        const entry = project.history.undoStack.pop();
        project.history.redoStack.push(entry);
        this.applyHistoryAction(project, entry.undo);
        this.emit('undo', { projectId, entry });
        return true;
    }
    /**
     * Refaz ação desfeita
     */
    redo(projectId) {
        const project = this.projects.get(projectId);
        if (!project || project.history.redoStack.length === 0) {
            return false;
        }
        const entry = project.history.redoStack.pop();
        project.history.undoStack.push(entry);
        this.applyHistoryAction(project, entry.redo);
        this.emit('redo', { projectId, entry });
        return true;
    }
    addHistoryEntry(project, entry) {
        const fullEntry = {
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
    applyHistoryAction(project, action) {
        // Aplicar ação sem registrar na história
        switch (action.type) {
            case 'updateFile':
                const { fileId, content } = action.payload;
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
    async createCheckpoint(projectId, name, description) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const checkpoint = {
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
    async restoreCheckpoint(projectId, checkpointId) {
        const project = this.projects.get(projectId);
        if (!project)
            return;
        const checkpoint = project.history.checkpoints.find(c => c.id === checkpointId);
        if (!checkpoint)
            return;
        await this.restoreSnapshot(project, checkpoint.snapshotId);
        this.emit('checkpointRestored', { projectId, checkpointId });
    }
    /**
     * Cria nova versão
     */
    async createVersion(projectId, version, name, description) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const projectVersion = {
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
    async createSnapshot(project) {
        // Placeholder - criar snapshot serializado
        const snapshotId = this.generateId();
        return snapshotId;
    }
    async restoreSnapshot(project, snapshotId) {
        // Placeholder - restaurar do snapshot
    }
    // ========================================================================
    // AUTOSAVE
    // ========================================================================
    startAutosave(project) {
        this.stopAutosave();
        const delay = project.settings.editor.autoSaveDelay;
        this.autosaveInterval = setInterval(() => {
            this.save(project.id);
        }, delay);
    }
    stopAutosave() {
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
    registerTemplate(template) {
        this.templates.set(template.id, template);
    }
    /**
     * Lista templates
     */
    getTemplates(type) {
        const templates = Array.from(this.templates.values());
        if (type) {
            return templates.filter(t => t.type === type);
        }
        return templates;
    }
    buildFromTemplate(structure, projectName) {
        const root = {
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
    createFolderFromDef(parent, def) {
        const folder = {
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
    createFileFromDef(root, def) {
        const parts = def.path.split('/');
        const fileName = parts.pop();
        const folderPath = parts.join('/');
        const folder = this.ensureFolder(root, folderPath);
        const file = {
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
    registerBuiltInTemplates() {
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
                        ] },
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
    getActiveProject() {
        return this.activeProjectId
            ? this.projects.get(this.activeProjectId)
            : undefined;
    }
    /**
     * Obtém projeto por ID
     */
    get(projectId) {
        return this.projects.get(projectId);
    }
    /**
     * Lista todos os projetos
     */
    getAll() {
        return Array.from(this.projects.values());
    }
    /**
     * Lista projetos recentes
     */
    getRecentProjects() {
        return this.recentProjects
            .map(id => this.projects.get(id))
            .filter(Boolean);
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    generateId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    updateRecentProjects(projectId) {
        this.recentProjects = this.recentProjects.filter(id => id !== projectId);
        this.recentProjects.unshift(projectId);
        this.recentProjects = this.recentProjects.slice(0, 10);
    }
    inferFileType(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const sourceExts = ['ts', 'js', 'py', 'java', 'cpp', 'c', 'cs', 'rs', 'go', 'rb', 'php'];
        const configExts = ['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env'];
        const docExts = ['md', 'txt', 'rst', 'doc', 'docx', 'pdf'];
        const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'mp3', 'wav', 'mp4', 'mov', 'obj', 'fbx', 'glb'];
        if (sourceExts.includes(ext || ''))
            return 'source';
        if (configExts.includes(ext || ''))
            return 'config';
        if (docExts.includes(ext || ''))
            return 'document';
        if (assetExts.includes(ext || ''))
            return 'asset';
        return 'unknown';
    }
    findFile(folder, fileId) {
        for (const file of folder.files) {
            if (file.id === fileId)
                return file;
        }
        for (const subFolder of folder.folders) {
            const found = this.findFile(subFolder, fileId);
            if (found)
                return found;
        }
        return undefined;
    }
    findFileWithParent(folder, fileId) {
        for (let i = 0; i < folder.files.length; i++) {
            if (folder.files[i].id === fileId) {
                return { folder, file: folder.files[i], index: i };
            }
        }
        for (const subFolder of folder.folders) {
            const found = this.findFileWithParent(subFolder, fileId);
            if (found)
                return found;
        }
        return undefined;
    }
    findFolderWithParent(parent, folderId, parentRef) {
        if (parent.id === folderId) {
            return { parent: parentRef || null, folder: parent, index: -1 };
        }
        for (let i = 0; i < parent.folders.length; i++) {
            if (parent.folders[i].id === folderId) {
                return { parent, folder: parent.folders[i], index: i };
            }
            const found = this.findFolderWithParent(parent.folders[i], folderId, parent);
            if (found)
                return found;
        }
        return undefined;
    }
    cloneFolder(folder) {
        return {
            ...folder,
            id: this.generateId(),
            folders: folder.folders.map(f => this.cloneFolder(f)),
            files: folder.files.map(f => ({ ...f, id: this.generateId() })),
        };
    }
    createDefaultStructure(name, type) {
        const root = {
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
                root.folders.push({ id: this.generateId(), name: 'src', path: 'src', folders: [], files: [], expanded: true, sortOrder: 0 }, { id: this.generateId(), name: 'tests', path: 'tests', folders: [], files: [], expanded: false, sortOrder: 1 });
                break;
            case 'game':
                root.folders.push({ id: this.generateId(), name: 'assets', path: 'assets', folders: [], files: [], expanded: true, sortOrder: 0 }, { id: this.generateId(), name: 'scripts', path: 'scripts', folders: [], files: [], expanded: true, sortOrder: 1 }, { id: this.generateId(), name: 'scenes', path: 'scenes', folders: [], files: [], expanded: false, sortOrder: 2 });
                break;
            case 'video':
                root.folders.push({ id: this.generateId(), name: 'footage', path: 'footage', folders: [], files: [], expanded: true, sortOrder: 0 }, { id: this.generateId(), name: 'audio', path: 'audio', folders: [], files: [], expanded: false, sortOrder: 1 }, { id: this.generateId(), name: 'exports', path: 'exports', folders: [], files: [], expanded: false, sortOrder: 2 });
                break;
        }
        return root;
    }
    getDefaultSettings(type) {
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
    updateProjectStats(project) {
        let totalFiles = 0;
        let totalSize = 0;
        const countFolder = (folder) => {
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
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
};
exports.ProjectManager = ProjectManager;
exports.ProjectManager = ProjectManager = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ProjectManager);
