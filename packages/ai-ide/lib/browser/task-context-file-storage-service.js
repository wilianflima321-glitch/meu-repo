"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskContextFileStorageService = void 0;
const tslib_1 = require("tslib");
const task_context_storage_service_1 = require("@theia/ai-chat/lib/browser/task-context-storage-service");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const browser_2 = require("@theia/workspace/lib/browser");
const yaml = require("js-yaml");
const workspace_preferences_1 = require("../common/workspace-preferences");
const buffer_1 = require("@theia/core/lib/common/buffer");
let TaskContextFileStorageService = class TaskContextFileStorageService {
    inMemoryStorage;
    preferenceService;
    workspaceService;
    fileService;
    openerService;
    logger;
    onDidChangeEmitter = new core_1.Emitter();
    onDidChange = this.onDidChangeEmitter.event;
    sanitizeLabel(label) {
        return label.replace(/^[^\p{L}\p{N}]+/vg, '');
    }
    getStorageLocation() {
        if (!this.workspaceService.opened) {
            return;
        }
        const values = this.preferenceService.inspect(workspace_preferences_1.TASK_CONTEXT_STORAGE_DIRECTORY_PREF);
        const configuredPath = values?.globalValue === undefined ? values?.defaultValue : values?.globalValue;
        if (!configuredPath || typeof configuredPath !== 'string') {
            return;
        }
        const asPath = new core_1.Path(configuredPath);
        return asPath.isAbsolute ? new core_1.URI(configuredPath) : this.workspaceService.tryGetRoots().at(0)?.resource.resolve(configuredPath);
    }
    init() {
        this.doInit();
    }
    get ready() {
        return Promise.all([
            this.workspaceService.ready,
            this.preferenceService.ready,
        ]).then(() => undefined);
    }
    async doInit() {
        await this.ready;
        this.watchStorage();
        this.preferenceService.onPreferenceChanged(e => {
            if (e.preferenceName === workspace_preferences_1.TASK_CONTEXT_STORAGE_DIRECTORY_PREF) {
                this.watchStorage().catch(error => this.logger.error(error));
            }
        });
    }
    toDisposeOnStorageChange;
    async watchStorage() {
        const newStorage = await this.getStorageLocation();
        this.toDisposeOnStorageChange?.dispose();
        this.toDisposeOnStorageChange = undefined;
        if (!newStorage) {
            return;
        }
        this.toDisposeOnStorageChange = new core_1.DisposableCollection();
        // push disposables after constructing to avoid relying on constructor overloads
        this.toDisposeOnStorageChange.push(this.fileService.watch(newStorage, { recursive: true, excludes: [] }), this.fileService.onDidFilesChange(event => {
            const relevantChanges = event.changes.filter(candidate => newStorage.isEqualOrParent(candidate.resource));
            this.handleChanges(relevantChanges);
        }), { dispose: () => this.clearInMemoryStorage() });
        this.cacheNewTasks(newStorage).catch(this.logger.error.bind(this.logger));
    }
    async handleChanges(changes) {
        await Promise.all(changes.map(change => {
            switch (change.type) {
                case 2 /* FileChangeType.DELETED */: return this.deleteFileReference(change.resource);
                case 1 /* FileChangeType.ADDED */:
                case 0 /* FileChangeType.UPDATED */:
                    return this.readFile(change.resource);
                default: return (0, core_1.unreachable)(change.type);
            }
        }));
    }
    clearInMemoryStorage() {
        this.inMemoryStorage.clear();
    }
    deleteFileReference(uri) {
        if (this.inMemoryStorage.delete(uri.path.base)) {
            return true;
        }
        for (const summary of this.inMemoryStorage.getAll()) {
            if (summary.uri?.isEqual(uri)) {
                return this.inMemoryStorage.delete(summary.id);
            }
        }
        return false;
    }
    async cacheNewTasks(storageLocation) {
        const contents = await this.fileService.resolve(storageLocation).catch(() => undefined);
        if (!contents?.children?.length) {
            return;
        }
        await Promise.all(contents.children.map(child => this.readFile(child.resource)));
        this.onDidChangeEmitter.fire();
    }
    async readFile(uri) {
        const content = await this.fileService.read(uri).then(read => read.value).catch(() => undefined);
        if (content === undefined) {
            return;
        }
        const { frontmatter, body } = this.maybeReadFrontmatter(content);
        const rawLabel = frontmatter?.label || uri.path.base.slice(0, (-1 * uri.path.ext.length) || uri.path.base.length);
        const summary = {
            ...frontmatter,
            summary: body,
            label: this.sanitizeLabel(rawLabel),
            uri,
            id: frontmatter?.sessionId || uri.path.base
        };
        const existingSummary = summary.sessionId && this.getAll().find(candidate => candidate.sessionId === summary.sessionId);
        if (existingSummary) {
            summary.id = existingSummary.id;
        }
        this.inMemoryStorage.store(summary);
    }
    async store(summary) {
        await this.ready;
        const label = this.sanitizeLabel(summary.label);
        const storageLocation = this.getStorageLocation();
        if (storageLocation) {
            const frontmatter = {
                sessionId: summary.sessionId,
                date: new Date().toISOString(),
                label,
            };
            const derivedName = label.trim().replace(/[^\p{L}\p{N}]/vg, '-').replace(/^-+|-+$/g, '');
            const filename = (derivedName.length > 32 ? derivedName.slice(0, derivedName.indexOf('-', 32)) : derivedName) + '.md';
            const content = yaml.dump(frontmatter).trim() + `${core_1.EOL}---${core_1.EOL}` + summary.summary;
            const uri = storageLocation.resolve(filename);
            summary.uri = uri;
            await this.fileService.writeFile(uri, buffer_1.BinaryBuffer.fromString(content));
        }
        this.inMemoryStorage.store({ ...summary, label });
        this.onDidChangeEmitter.fire();
    }
    getAll() {
        return this.inMemoryStorage.getAll();
    }
    get(identifier) {
        return this.inMemoryStorage.get(identifier);
    }
    async delete(identifier) {
        const summary = this.inMemoryStorage.get(identifier);
        if (summary?.uri) {
            await this.fileService.delete(summary.uri);
        }
        this.inMemoryStorage.delete(identifier);
        if (summary) {
            this.onDidChangeEmitter.fire();
        }
        return !!summary;
    }
    maybeReadFrontmatter(content) {
        const frontmatterEnd = content.indexOf('---');
        if (frontmatterEnd !== -1) {
            try {
                const frontmatter = yaml.load(content.slice(0, frontmatterEnd));
                if (this.hasLabel(frontmatter)) {
                    return { frontmatter, body: content.slice(frontmatterEnd + 3).trim() };
                }
            }
            catch { /* Probably not frontmatter, then. */ }
        }
        return { body: content, frontmatter: undefined };
    }
    hasLabel(candidate) {
        return !!candidate && typeof candidate === 'object' && !Array.isArray(candidate) && 'label' in candidate && typeof candidate.label === 'string';
    }
    async open(identifier) {
        const summary = this.get(identifier);
        if (!summary) {
            throw new Error('Unable to open requested task context: none found with specified identifier.');
        }
        await (summary.uri ? (0, browser_1.open)(this.openerService, summary.uri) : this.inMemoryStorage.open(identifier));
    }
};
exports.TaskContextFileStorageService = TaskContextFileStorageService;
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_storage_service_1.InMemoryTaskContextStorage),
    tslib_1.__metadata("design:type", task_context_storage_service_1.InMemoryTaskContextStorage)
], TaskContextFileStorageService.prototype, "inMemoryStorage", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], TaskContextFileStorageService.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], TaskContextFileStorageService.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], TaskContextFileStorageService.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], TaskContextFileStorageService.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], TaskContextFileStorageService.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], TaskContextFileStorageService.prototype, "init", null);
exports.TaskContextFileStorageService = TaskContextFileStorageService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskContextFileStorageService);
//# sourceMappingURL=task-context-file-storage-service.js.map