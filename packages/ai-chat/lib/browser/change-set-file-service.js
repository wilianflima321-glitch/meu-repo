"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.ChangeSetFileService = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_2 = require("@theia/editor/lib/browser");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const monaco_workspace_1 = require("@theia/monaco/lib/browser/monaco-workspace");
const workspace_service_1 = require("@theia/workspace/lib/browser/workspace-service");
let ChangeSetFileService = class ChangeSetFileService {
    async read(uri) {
        const exists = await this.fileService.exists(uri);
        if (!exists) {
            return undefined;
        }
        try {
            const document = this.monacoWorkspace.getTextDocument(uri.toString());
            if (document) {
                return document.getText();
            }
            return (await this.fileService.readFile(uri)).value.toString();
        }
        catch (error) {
            this.logger.error('Failed to read original content of change set file element.', error);
            return undefined;
        }
    }
    getName(uri) {
        return this.labelProvider.getName(uri);
    }
    getIcon(uri) {
        return this.labelProvider.getIcon(uri);
    }
    getAdditionalInfo(uri) {
        const wsUri = this.wsService.getWorkspaceRootUri(uri);
        if (wsUri) {
            const wsRelative = wsUri.relative(uri);
            if (wsRelative === null || wsRelative === void 0 ? void 0 : wsRelative.hasDir) {
                return `${wsRelative.dir.toString()}`;
            }
            return '';
        }
        return this.labelProvider.getLongName(uri.parent);
    }
    async open(element) {
        const exists = await this.fileService.exists(element.uri);
        if (exists) {
            await (0, browser_1.open)(this.openerService, element.uri);
            return;
        }
        await this.editorManager.open(element.changedUri, {
            mode: 'reveal'
        });
    }
    async openDiff(originalUri, suggestedUri) {
        const diffUri = this.getDiffUri(originalUri, suggestedUri);
        (0, browser_1.open)(this.openerService, diffUri);
    }
    getDiffUri(originalUri, suggestedUri) {
        return browser_1.DiffUris.encode(originalUri, suggestedUri, `AI Changes: ${this.labelProvider.getName(originalUri)}`);
    }
    async delete(uri) {
        const exists = await this.fileService.exists(uri);
        if (exists) {
            await this.fileService.delete(uri);
        }
    }
    /** Returns true if there was a document available to save for the specified URI. */
    async trySave(suggestedUri) {
        const openModel = this.monacoWorkspace.getTextDocument(suggestedUri.toString());
        if (openModel) {
            await openModel.save();
            return true;
        }
        else {
            return false;
        }
    }
    async writeFrom(from, to, fallbackContent) {
        var _a, _b;
        const authoritativeContent = (_b = (_a = this.monacoWorkspace.getTextDocument(from.toString())) === null || _a === void 0 ? void 0 : _a.getText()) !== null && _b !== void 0 ? _b : fallbackContent;
        await this.write(to, authoritativeContent);
    }
    async write(uri, text) {
        const document = this.monacoWorkspace.getTextDocument(uri.toString());
        if (document) {
            await this.monacoWorkspace.applyBackgroundEdit(document, [{
                    range: document.textEditorModel.getFullModelRange(),
                    text
                }], () => true);
        }
        else {
            await this.fileService.write(uri, text);
        }
    }
    closeDiffsForSession(sessionId, except) {
        const openEditors = this.shell.widgets.filter(widget => {
            const uri = browser_1.NavigatableWidget.getUri(widget);
            return uri && uri.authority === sessionId && !(except === null || except === void 0 ? void 0 : except.some(candidate => candidate.path.toString() === uri.path.toString()));
        });
        openEditors.forEach(editor => editor.close());
    }
    closeDiff(uri) {
        const openEditors = this.shell.widgets.filter(widget => { var _a; return (_a = browser_1.NavigatableWidget.getUri(widget)) === null || _a === void 0 ? void 0 : _a.isEqual(uri); });
        openEditors.forEach(editor => editor.close());
    }
};
exports.ChangeSetFileService = ChangeSetFileService;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileService.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(workspace_service_1.WorkspaceService),
    tslib_1.__metadata("design:type", workspace_service_1.WorkspaceService)
], ChangeSetFileService.prototype, "wsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LabelProvider),
    tslib_1.__metadata("design:type", browser_1.LabelProvider)
], ChangeSetFileService.prototype, "labelProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileService.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.EditorManager),
    tslib_1.__metadata("design:type", browser_2.EditorManager)
], ChangeSetFileService.prototype, "editorManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ApplicationShell),
    tslib_1.__metadata("design:type", browser_1.ApplicationShell)
], ChangeSetFileService.prototype, "shell", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_workspace_1.MonacoWorkspace),
    tslib_1.__metadata("design:type", monaco_workspace_1.MonacoWorkspace)
], ChangeSetFileService.prototype, "monacoWorkspace", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ChangeSetFileService.prototype, "fileService", void 0);
exports.ChangeSetFileService = ChangeSetFileService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetFileService);
//# sourceMappingURL=change-set-file-service.js.map