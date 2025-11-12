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
exports.FileChatVariableContribution = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const browser_1 = require("@theia/ai-core/lib/browser");
const file_variable_contribution_1 = require("@theia/ai-core/lib/browser/file-variable-contribution");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const monaco = require("@theia/monaco-editor-core");
const quick_file_select_service_1 = require("@theia/file-search/lib/browser/quick-file-select-service");
const browser_2 = require("@theia/workspace/lib/browser");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const ai_chat_frontend_contribution_1 = require("./ai-chat-frontend-contribution");
const image_context_variable_1 = require("../common/image-context-variable");
const browser_3 = require("@theia/core/lib/browser");
let FileChatVariableContribution = class FileChatVariableContribution {
    registerVariables(service) {
        service.registerArgumentPicker(file_variable_contribution_1.FILE_VARIABLE, this.triggerArgumentPicker.bind(this));
        service.registerArgumentPicker(image_context_variable_1.IMAGE_CONTEXT_VARIABLE, this.imageArgumentPicker.bind(this));
        service.registerArgumentCompletionProvider(file_variable_contribution_1.FILE_VARIABLE, this.provideArgumentCompletionItems.bind(this));
        service.registerDropHandler(this.handleDrop.bind(this));
    }
    async triggerArgumentPicker() {
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.items = await this.quickFileSelectService.getPicks();
        const updateItems = async (value) => {
            quickPick.items = await this.quickFileSelectService.getPicks(value, core_1.CancellationToken.None);
        };
        const onChangeListener = quickPick.onDidChangeValue(updateItems);
        quickPick.show();
        return new Promise(resolve => {
            quickPick.onDispose(onChangeListener.dispose);
            quickPick.onDidAccept(async () => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem && quick_file_select_service_1.FileQuickPickItem.is(selectedItem)) {
                    quickPick.dispose();
                    resolve(await this.wsService.getWorkspaceRelativePath(selectedItem.uri));
                }
            });
        });
    }
    async imageArgumentPicker() {
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.title = 'Select an image file';
        // Get all files and filter only image files
        const allPicks = await this.quickFileSelectService.getPicks();
        quickPick.items = allPicks.filter(item => {
            if (quick_file_select_service_1.FileQuickPickItem.is(item)) {
                return this.isImageFile(item.uri.path.toString());
            }
            return false;
        });
        const updateItems = async (value) => {
            const filteredPicks = await this.quickFileSelectService.getPicks(value, core_1.CancellationToken.None);
            quickPick.items = filteredPicks.filter(item => {
                if (quick_file_select_service_1.FileQuickPickItem.is(item)) {
                    return this.isImageFile(item.uri.path.toString());
                }
                return false;
            });
        };
        const onChangeListener = quickPick.onDidChangeValue(updateItems);
        quickPick.show();
        return new Promise(resolve => {
            quickPick.onDispose(onChangeListener.dispose);
            quickPick.onDidAccept(async () => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem && quick_file_select_service_1.FileQuickPickItem.is(selectedItem)) {
                    quickPick.dispose();
                    const filePath = await this.wsService.getWorkspaceRelativePath(selectedItem.uri);
                    const fileName = selectedItem.uri.displayName;
                    const base64Data = await this.fileToBase64(selectedItem.uri);
                    const mimeType = this.getMimeTypeFromExtension(selectedItem.uri.path.toString());
                    // Create the argument string in the required format
                    const imageVarArgs = {
                        name: fileName,
                        wsRelativePath: filePath,
                        data: base64Data,
                        mimeType: mimeType
                    };
                    resolve(image_context_variable_1.ImageContextVariable.createArgString(imageVarArgs));
                }
            });
        });
    }
    async provideArgumentCompletionItems(model, position, matchString) {
        const context = browser_1.AIVariableCompletionContext.get(file_variable_contribution_1.FILE_VARIABLE.name, model, position, matchString);
        if (!context) {
            return undefined;
        }
        const { userInput, range, prefix } = context;
        const picks = await this.quickFileSelectService.getPicks(userInput, core_1.CancellationToken.None);
        return Promise.all(picks
            .filter(quick_file_select_service_1.FileQuickPickItem.is)
            // only show files with highlights, if the user started typing to filter down the results
            .filter(p => { var _a; return !userInput || ((_a = p.highlights) === null || _a === void 0 ? void 0 : _a.label); })
            .map(async (pick, index) => {
            const relativePath = await this.wsService.getWorkspaceRelativePath(pick.uri);
            return {
                label: pick.label,
                kind: monaco.languages.CompletionItemKind.File,
                range,
                insertText: `${prefix}${relativePath}`,
                detail: await this.wsService.getWorkspaceRelativePath(pick.uri.parent),
                // don't let monaco filter the items, as we only return picks that are filtered
                filterText: userInput,
                // keep the order of the items, but move them to the end of the list
                sortText: `ZZ${index.toString().padStart(4, '0')}_${pick.label}`,
                command: {
                    title: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.label,
                    id: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.id,
                    arguments: [file_variable_contribution_1.FILE_VARIABLE.name, relativePath]
                }
            };
        }));
    }
    /**
     * Checks if a file is an image based on its extension.
     */
    isImageFile(filePath) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return imageExtensions.includes(extension);
    }
    /**
     * Determines the MIME type based on file extension.
     */
    getMimeTypeFromExtension(filePath) {
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }
    /**
     * Converts a file to base64 data URL.
     */
    async fileToBase64(uri) {
        try {
            const fileContent = await this.fileService.readFile(uri);
            const uint8Array = new Uint8Array(fileContent.value.buffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            return btoa(binary);
        }
        catch (error) {
            this.logger.error('Error reading file content:', error);
            return '';
        }
    }
    async handleDrop(event, _) {
        if (!event.dataTransfer) {
            return undefined;
        }
        const uris = browser_3.ApplicationShell.getDraggedEditorUris(event.dataTransfer);
        if (!uris.length) {
            return undefined;
        }
        try {
            const variables = [];
            const texts = [];
            for (const uri of uris) {
                if (await this.fileService.exists(uri)) {
                    const wsRelativePath = await this.wsService.getWorkspaceRelativePath(uri);
                    const fileName = uri.displayName;
                    if (this.isImageFile(wsRelativePath)) {
                        const base64Data = await this.fileToBase64(uri);
                        const mimeType = this.getMimeTypeFromExtension(wsRelativePath);
                        variables.push(image_context_variable_1.ImageContextVariable.createRequest({
                            [image_context_variable_1.ImageContextVariable.name]: fileName,
                            [image_context_variable_1.ImageContextVariable.wsRelativePath]: wsRelativePath,
                            [image_context_variable_1.ImageContextVariable.data]: base64Data,
                            [image_context_variable_1.ImageContextVariable.mimeType]: mimeType
                        }));
                        // we do not want to push a text for image variables
                    }
                    else {
                        variables.push({
                            variable: file_variable_contribution_1.FILE_VARIABLE,
                            arg: wsRelativePath
                        });
                        texts.push(`${ai_core_1.PromptText.VARIABLE_CHAR}${file_variable_contribution_1.FILE_VARIABLE.name}${ai_core_1.PromptText.VARIABLE_SEPARATOR_CHAR}${wsRelativePath}`);
                    }
                }
            }
            return { variables, text: texts.length ? texts.join(' ') : undefined };
        }
        catch {
            return undefined;
        }
    }
};
exports.FileChatVariableContribution = FileChatVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], FileChatVariableContribution.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], FileChatVariableContribution.prototype, "wsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], FileChatVariableContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(quick_file_select_service_1.QuickFileSelectService),
    tslib_1.__metadata("design:type", quick_file_select_service_1.QuickFileSelectService)
], FileChatVariableContribution.prototype, "quickFileSelectService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], FileChatVariableContribution.prototype, "logger", void 0);
exports.FileChatVariableContribution = FileChatVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FileChatVariableContribution);
//# sourceMappingURL=file-chat-variable-contribution.js.map