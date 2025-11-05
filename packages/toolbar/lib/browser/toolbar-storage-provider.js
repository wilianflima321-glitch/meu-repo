"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
exports.ToolbarStorageProvider = exports.TOOLBAR_BAD_JSON_ERROR_MESSAGE = void 0;
const tslib_1 = require("tslib");
const jsoncParser = require("jsonc-parser");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const monaco_workspace_1 = require("@theia/monaco/lib/browser/monaco-workspace");
const monaco = require("@theia/monaco-editor-core");
const frontend_application_state_1 = require("@theia/core/lib/browser/frontend-application-state");
const browser_1 = require("@theia/editor/lib/browser");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const uri_1 = require("@theia/core/lib/common/uri");
const toolbar_interfaces_1 = require("./toolbar-interfaces");
const toolbar_constants_1 = require("./toolbar-constants");
const toolbar_preference_schema_1 = require("./toolbar-preference-schema");
const toolbar_defaults_1 = require("./toolbar-defaults");
exports.TOOLBAR_BAD_JSON_ERROR_MESSAGE = 'There was an error reading your toolbar.json file. Please check if it is corrupt'
    + ' by right-clicking the toolbar and selecting "Customize Toolbar". You can also reset it to its defaults by selecting'
    + ' "Restore Toolbar Defaults"';
let ToolbarStorageProvider = class ToolbarStorageProvider {
    constructor() {
        this._ready = new promise_util_1.Deferred();
        this.toDispose = new core_1.DisposableCollection();
        this.toolbarItemsUpdatedEmitter = new core_1.Emitter();
        this.onToolbarItemsChanged = this.toolbarItemsUpdatedEmitter.event;
    }
    get ready() {
        return this._ready.promise;
    }
    get toolbarItems() {
        return this._toolbarItems;
    }
    init() {
        this.doInit();
    }
    async doInit() {
        const reference = await this.textModelService.createModelReference(this.USER_TOOLBAR_URI);
        this.model = reference.object;
        this.toDispose.push(reference);
        this.toDispose.push(core_1.Disposable.create(() => this.model = undefined));
        this.readConfiguration();
        if (this.model) {
            this.toDispose.push(this.model.onDidChangeContent(() => this.readConfiguration()));
            this.toDispose.push(this.model.onDirtyChanged(() => this.readConfiguration()));
            this.toDispose.push(this.model.onDidChangeValid(() => this.readConfiguration()));
        }
        this.toDispose.push(this.toolbarItemsUpdatedEmitter);
        await this.appState.reachedState('ready');
        this.monacoWorkspace = this.lateInjector(monaco_workspace_1.MonacoWorkspace);
        this.editorManager = this.lateInjector(browser_1.EditorManager);
        this._ready.resolve();
    }
    readConfiguration() {
        if (!this.model || this.model.dirty) {
            return;
        }
        try {
            if (this.model.valid) {
                const content = this.model.getText();
                this._toolbarItems = this.parseContent(content);
            }
            else {
                this._toolbarItems = undefined;
            }
            this.toolbarItemsUpdatedEmitter.fire();
        }
        catch (e) {
            console.error(`Failed to load toolbar config from '${this.USER_TOOLBAR_URI}'.`, e);
        }
    }
    async removeItem(position) {
        if (this.toolbarItems) {
            const { alignment, groupIndex, itemIndex } = position;
            const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
            modifiedConfiguration.items[alignment][groupIndex].splice(itemIndex, 1);
            const sanitizedConfiguration = this.removeEmptyGroupsFromToolbar(modifiedConfiguration);
            return this.writeToFile([], sanitizedConfiguration);
        }
        return false;
    }
    async addItem(command, alignment) {
        var _a, _b;
        if (this.toolbarItems) {
            const itemFromCommand = {
                id: command.id,
                command: command.id,
                icon: command.iconClass,
            };
            const groupIndex = (_a = this.toolbarItems) === null || _a === void 0 ? void 0 : _a.items[alignment].length;
            if (groupIndex) {
                const lastItemIndex = (_b = this.toolbarItems) === null || _b === void 0 ? void 0 : _b.items[alignment][groupIndex - 1].length;
                const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
                modifiedConfiguration.items[alignment][groupIndex - 1].push(itemFromCommand);
                return !!lastItemIndex && this.writeToFile([], modifiedConfiguration);
            }
            return this.addItemToEmptyColumn(itemFromCommand, alignment);
        }
        return false;
    }
    async swapValues(oldPosition, newPosition, direction) {
        var _a;
        if (this.toolbarItems) {
            const { alignment, groupIndex, itemIndex } = oldPosition;
            const draggedItem = (_a = this.toolbarItems) === null || _a === void 0 ? void 0 : _a.items[alignment][groupIndex][itemIndex];
            const newItemIndex = direction === 'location-right' ? newPosition.itemIndex + 1 : newPosition.itemIndex;
            const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
            if (newPosition.alignment === oldPosition.alignment && newPosition.groupIndex === oldPosition.groupIndex) {
                modifiedConfiguration.items[newPosition.alignment][newPosition.groupIndex].splice(newItemIndex, 0, draggedItem);
                if (newPosition.itemIndex > oldPosition.itemIndex) {
                    modifiedConfiguration.items[oldPosition.alignment][oldPosition.groupIndex].splice(oldPosition.itemIndex, 1);
                }
                else {
                    modifiedConfiguration.items[oldPosition.alignment][oldPosition.groupIndex].splice(oldPosition.itemIndex + 1, 1);
                }
            }
            else {
                modifiedConfiguration.items[oldPosition.alignment][oldPosition.groupIndex].splice(oldPosition.itemIndex, 1);
                modifiedConfiguration.items[newPosition.alignment][newPosition.groupIndex].splice(newItemIndex, 0, draggedItem);
            }
            const sanitizedConfiguration = this.removeEmptyGroupsFromToolbar(modifiedConfiguration);
            return this.writeToFile([], sanitizedConfiguration);
        }
        return false;
    }
    async addItemToEmptyColumn(item, alignment) {
        if (this.toolbarItems) {
            const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
            modifiedConfiguration.items[alignment].push([item]);
            return this.writeToFile([], modifiedConfiguration);
        }
        return false;
    }
    async moveItemToEmptySpace(oldPosition, newAlignment, centerPosition) {
        const { alignment: oldAlignment, itemIndex: oldItemIndex } = oldPosition;
        let oldGroupIndex = oldPosition.groupIndex;
        if (this.toolbarItems) {
            const draggedItem = this.toolbarItems.items[oldAlignment][oldGroupIndex][oldItemIndex];
            const newGroupIndex = this.toolbarItems.items[oldAlignment].length;
            const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
            if (newAlignment === toolbar_interfaces_1.ToolbarAlignment.LEFT) {
                modifiedConfiguration.items[newAlignment].push([draggedItem]);
            }
            else if (newAlignment === toolbar_interfaces_1.ToolbarAlignment.CENTER) {
                if (centerPosition === 'left') {
                    modifiedConfiguration.items[newAlignment].unshift([draggedItem]);
                    if (newAlignment === oldAlignment) {
                        oldGroupIndex = oldGroupIndex + 1;
                    }
                }
                else if (centerPosition === 'right') {
                    modifiedConfiguration.items[newAlignment].splice(newGroupIndex + 1, 0, [draggedItem]);
                }
            }
            else if (newAlignment === toolbar_interfaces_1.ToolbarAlignment.RIGHT) {
                modifiedConfiguration.items[newAlignment].unshift([draggedItem]);
                if (newAlignment === oldAlignment) {
                    oldGroupIndex = oldGroupIndex + 1;
                }
            }
            modifiedConfiguration.items[oldAlignment][oldGroupIndex].splice(oldItemIndex, 1);
            const sanitizedConfiguration = this.removeEmptyGroupsFromToolbar(modifiedConfiguration);
            return this.writeToFile([], sanitizedConfiguration);
        }
        return false;
    }
    async insertGroup(position, insertDirection) {
        if (this.toolbarItems) {
            const { alignment, groupIndex, itemIndex } = position;
            const modifiedConfiguration = (0, core_1.deepClone)(this.toolbarItems);
            const originalColumn = modifiedConfiguration.items[alignment];
            if (originalColumn) {
                const existingGroup = originalColumn[groupIndex];
                const existingGroupLength = existingGroup.length;
                let poppedGroup = [];
                let numItemsToRemove;
                if (insertDirection === 'left' && itemIndex !== 0) {
                    numItemsToRemove = existingGroupLength - itemIndex;
                    poppedGroup = existingGroup.splice(itemIndex, numItemsToRemove);
                    originalColumn.splice(groupIndex, 1, existingGroup, poppedGroup);
                }
                else if (insertDirection === 'right' && itemIndex !== existingGroupLength - 1) {
                    numItemsToRemove = itemIndex + 1;
                    poppedGroup = existingGroup.splice(0, numItemsToRemove);
                    originalColumn.splice(groupIndex, 1, poppedGroup, existingGroup);
                }
                const sanitizedConfiguration = this.removeEmptyGroupsFromToolbar(modifiedConfiguration);
                return this.writeToFile([], sanitizedConfiguration);
            }
        }
        return false;
    }
    removeEmptyGroupsFromToolbar(toolbarItems) {
        if (toolbarItems) {
            const modifiedConfiguration = (0, core_1.deepClone)(toolbarItems);
            const columns = [toolbar_interfaces_1.ToolbarAlignment.LEFT, toolbar_interfaces_1.ToolbarAlignment.CENTER, toolbar_interfaces_1.ToolbarAlignment.RIGHT];
            columns.forEach(column => {
                const groups = toolbarItems.items[column];
                groups.forEach((group, index) => {
                    if (group.length === 0) {
                        modifiedConfiguration.items[column].splice(index, 1);
                    }
                });
            });
            return modifiedConfiguration;
        }
        return undefined;
    }
    async restoreToolbarDefaults() {
        this._toolbarItems = this.defaultsFactory();
        return this.writeToFile([], this._toolbarItems);
    }
    async writeToFile(path, value, insertion = false) {
        if (this.model) {
            try {
                const content = this.model.getText().trim();
                const textModel = this.model.textEditorModel;
                const editOperations = [];
                const { insertSpaces, tabSize, defaultEOL } = textModel.getOptions();
                for (const edit of jsoncParser.modify(content, path, value, {
                    isArrayInsertion: insertion,
                    formattingOptions: {
                        insertSpaces,
                        tabSize,
                        eol: defaultEOL === monaco.editor.DefaultEndOfLine.LF ? '\n' : '\r\n',
                    },
                })) {
                    const start = textModel.getPositionAt(edit.offset);
                    const end = textModel.getPositionAt(edit.offset + edit.length);
                    editOperations.push({
                        range: monaco.Range.fromPositions(start, end),
                        // eslint-disable-next-line no-null/no-null
                        text: edit.content || null,
                        forceMoveMarkers: false,
                    });
                }
                await this.monacoWorkspace.applyBackgroundEdit(this.model, editOperations, false);
                await this.model.save();
                return true;
            }
            catch (e) {
                const message = core_1.nls.localize('theia/toolbar/failedUpdate', "Failed to update the value of '{0}' in '{1}'.", path.join('.'), this.USER_TOOLBAR_URI.path.toString());
                this.messageService.error(core_1.nls.localize('theia/toolbar/jsonError', exports.TOOLBAR_BAD_JSON_ERROR_MESSAGE));
                console.error(`${message}`, e);
                return false;
            }
        }
        return false;
    }
    parseContent(fileContent) {
        const rawConfig = this.parse(fileContent);
        if (!(0, toolbar_preference_schema_1.isToolbarPreferences)(rawConfig)) {
            return undefined;
        }
        return rawConfig;
    }
    parse(fileContent) {
        let strippedContent = fileContent.trim();
        if (!strippedContent) {
            return undefined;
        }
        strippedContent = jsoncParser.stripComments(strippedContent);
        return jsoncParser.parse(strippedContent);
    }
    async openOrCreateJSONFile(state, doOpen = false) {
        const fileExists = await this.fileService.exists(this.USER_TOOLBAR_URI);
        let doWriteStateToFile = false;
        if (fileExists) {
            const fileContent = await this.fileService.read(this.USER_TOOLBAR_URI);
            if (fileContent.value.trim() === '') {
                doWriteStateToFile = true;
            }
        }
        else {
            await this.fileService.create(this.USER_TOOLBAR_URI);
            doWriteStateToFile = true;
        }
        if (doWriteStateToFile) {
            await this.writeToFile([], state);
        }
        this.readConfiguration();
        if (doOpen) {
            const widget = await this.editorManager.open(this.USER_TOOLBAR_URI);
            return widget;
        }
        return undefined;
    }
    dispose() {
        this.toDispose.dispose();
    }
};
exports.ToolbarStorageProvider = ToolbarStorageProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_application_state_1.FrontendApplicationStateService),
    tslib_1.__metadata("design:type", frontend_application_state_1.FrontendApplicationStateService)
], ToolbarStorageProvider.prototype, "appState", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_text_model_service_1.MonacoTextModelService),
    tslib_1.__metadata("design:type", monaco_text_model_service_1.MonacoTextModelService)
], ToolbarStorageProvider.prototype, "textModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ToolbarStorageProvider.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], ToolbarStorageProvider.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(toolbar_interfaces_1.LateInjector),
    tslib_1.__metadata("design:type", Function)
], ToolbarStorageProvider.prototype, "lateInjector", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(toolbar_constants_1.UserToolbarURI),
    tslib_1.__metadata("design:type", uri_1.default)
], ToolbarStorageProvider.prototype, "USER_TOOLBAR_URI", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(toolbar_defaults_1.ToolbarDefaultsFactory),
    tslib_1.__metadata("design:type", Function)
], ToolbarStorageProvider.prototype, "defaultsFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ToolbarStorageProvider.prototype, "init", null);
exports.ToolbarStorageProvider = ToolbarStorageProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ToolbarStorageProvider);
//# sourceMappingURL=toolbar-storage-provider.js.map