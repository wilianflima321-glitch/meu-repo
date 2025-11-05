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
var ChangeSetFileElement_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeSetFileElement = exports.ChangeSetElementArgs = exports.ChangeSetFileElementFactory = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const editor_preferences_1 = require("@theia/editor/lib/common/editor-preferences");
const common_1 = require("@theia/filesystem/lib/common");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const trimTrailingWhitespaceCommand_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/commands/trimTrailingWhitespaceCommand");
const selection_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/core/selection");
const cursor_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/cursor/cursor");
const format_1 = require("@theia/monaco-editor-core/esm/vs/editor/contrib/format/browser/format");
const standaloneServices_1 = require("@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices");
const instantiation_1 = require("@theia/monaco-editor-core/esm/vs/platform/instantiation/common/instantiation");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const monaco_utilities_1 = require("@theia/monaco/lib/browser/monaco-utilities");
const change_set_file_resource_1 = require("./change-set-file-resource");
const change_set_file_service_1 = require("./change-set-file-service");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const browser_2 = require("@theia/monaco/lib/browser");
exports.ChangeSetFileElementFactory = Symbol('ChangeSetFileElementFactory');
exports.ChangeSetElementArgs = Symbol('ChangeSetElementArgs');
;
let ChangeSetFileElement = ChangeSetFileElement_1 = class ChangeSetFileElement {
    constructor() {
        this.toDispose = new core_1.DisposableCollection();
        this._initialized = false;
        this.onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    static toReadOnlyUri(baseUri, sessionId) {
        return baseUri.withScheme('change-set-immutable').withAuthority(sessionId);
    }
    init() {
        this._initializationPromise = this.initializeAsync();
        this.toDispose.push(this.onDidChangeEmitter);
    }
    async initializeAsync() {
        await this.obtainOriginalContent();
        this.listenForOriginalFileChanges();
        this._initialized = true;
    }
    /**
     * Ensures that the element is fully initialized before proceeding.
     * This includes loading the original content from the file system.
     */
    async ensureInitialized() {
        await this._initializationPromise;
    }
    /**
     * Returns true if the element has been fully initialized.
     */
    get isInitialized() {
        return this._initialized;
    }
    async obtainOriginalContent() {
        var _a, _b;
        this._originalContent = (_a = this.elementProps.originalState) !== null && _a !== void 0 ? _a : await this.changeSetFileService.read(this.uri);
        if (this._readOnlyResource) {
            this.readOnlyResource.update({ contents: (_b = this._originalContent) !== null && _b !== void 0 ? _b : '' });
        }
    }
    getInMemoryUri(uri) {
        try {
            return this.inMemoryResources.resolve(uri);
        }
        catch {
            return this.inMemoryResources.add(uri, { contents: '' });
        }
    }
    listenForOriginalFileChanges() {
        if (this.elementProps.originalState) {
            // if we have an original state, we are not interested in the original file on disk but always use `originalState`
            return;
        }
        this.toDispose.push(this.fileService.onDidFilesChange(async (event) => {
            if (!event.contains(this.uri)) {
                return;
            }
            if (!this._initialized && this._initializationPromise) {
                // make sure we are initialized
                await this._initializationPromise;
            }
            // If we are applied, the tricky thing becomes the question what to revert to; otherwise, what to apply.
            const newContent = await this.changeSetFileService.read(this.uri).catch(() => '');
            this.readOnlyResource.update({ contents: newContent });
            if (newContent === this._originalContent) {
                this.state = 'pending';
            }
            else if (newContent === this.targetState) {
                this.state = 'applied';
            }
            else {
                this.state = 'stale';
            }
        }));
    }
    get uri() {
        return this.elementProps.uri;
    }
    get readOnlyResource() {
        var _a, _b;
        if (!this._readOnlyResource) {
            this._readOnlyResource = this.getInMemoryUri(ChangeSetFileElement_1.toReadOnlyUri(this.uri, this.elementProps.chatSessionId));
            this._readOnlyResource.update({
                autosaveable: false,
                readOnly: true,
                contents: (_a = this._originalContent) !== null && _a !== void 0 ? _a : ''
            });
            this.toDispose.push(this._readOnlyResource);
            // If not yet initialized, update the resource once initialization completes
            if (!this._initialized) {
                (_b = this._initializationPromise) === null || _b === void 0 ? void 0 : _b.then(() => {
                    var _a, _b;
                    (_a = this._readOnlyResource) === null || _a === void 0 ? void 0 : _a.update({ contents: (_b = this._originalContent) !== null && _b !== void 0 ? _b : '' });
                });
            }
        }
        return this._readOnlyResource;
    }
    get readOnlyUri() {
        return this.readOnlyResource.uri;
    }
    get changeResource() {
        if (!this._changeResource) {
            this._changeResource = this.getInMemoryUri((0, change_set_file_resource_1.createChangeSetFileUri)(this.elementProps.chatSessionId, this.uri));
            this._changeResource.update({ autosaveable: false, contents: this.targetState });
            this.applyCodeActionsToTargetState();
            this.toDispose.push(this._changeResource);
        }
        return this._changeResource;
    }
    get changedUri() {
        return this.changeResource.uri;
    }
    get name() {
        var _a;
        return (_a = this.elementProps.name) !== null && _a !== void 0 ? _a : this.changeSetFileService.getName(this.uri);
    }
    get icon() {
        var _a;
        return (_a = this.elementProps.icon) !== null && _a !== void 0 ? _a : this.changeSetFileService.getIcon(this.uri);
    }
    get additionalInfo() {
        return this.changeSetFileService.getAdditionalInfo(this.uri);
    }
    get state() {
        var _a;
        return (_a = this._state) !== null && _a !== void 0 ? _a : this.elementProps.state;
    }
    set state(value) {
        if (this._state !== value) {
            this._state = value;
            this.onDidChangeEmitter.fire();
        }
    }
    get replacements() {
        return this.elementProps.replacements;
    }
    get type() {
        return this.elementProps.type;
    }
    get data() {
        return this.elementProps.data;
    }
    ;
    get originalContent() {
        if (!this._initialized && this._initializationPromise) {
            console.warn('Accessing originalContent before initialization is complete. Consider using async methods.');
        }
        return this._originalContent;
    }
    /**
     * Gets the original content of the file asynchronously.
     * Ensures initialization is complete before returning the content.
     */
    async getOriginalContent() {
        await this.ensureInitialized();
        return this._originalContent;
    }
    get targetState() {
        var _a, _b;
        return (_b = (_a = this._targetStateWithCodeActions) !== null && _a !== void 0 ? _a : this.elementProps.targetState) !== null && _b !== void 0 ? _b : '';
    }
    get originalTargetState() {
        var _a;
        return (_a = this.elementProps.targetState) !== null && _a !== void 0 ? _a : '';
    }
    async open() {
        await this.ensureInitialized();
        this.changeSetFileService.open(this);
    }
    async openChange() {
        await this.ensureInitialized();
        this.changeSetFileService.openDiff(this.readOnlyUri, this.changedUri);
    }
    async apply(contents) {
        await this.ensureInitialized();
        if (!await this.confirm('Apply')) {
            return;
        }
        if (this.type === 'delete') {
            await this.changeSetFileService.delete(this.uri);
            this.state = 'applied';
            this.changeSetFileService.closeDiff(this.readOnlyUri);
            return;
        }
        // Load Monaco model for the base file URI and apply changes
        await this.applyChangesWithMonaco(contents);
        this.changeSetFileService.closeDiff(this.readOnlyUri);
    }
    async writeChanges(contents) {
        await this.changeSetFileService.writeFrom(this.changedUri, this.uri, contents !== null && contents !== void 0 ? contents : this.targetState);
        this.state = 'applied';
    }
    /**
     * Applies changes using Monaco utilities, including loading the model for the base file URI,
     * setting the value to the intended state, and running code actions on save.
     */
    async applyChangesWithMonaco(contents) {
        let modelReference;
        try {
            modelReference = await this.monacoTextModelService.createModelReference(this.uri);
            const model = modelReference.object;
            const targetContent = contents !== null && contents !== void 0 ? contents : this.targetState;
            model.textEditorModel.setValue(targetContent);
            const languageId = model.languageId;
            const uriStr = this.uri.toString();
            await this.codeActionService.applyOnSaveCodeActions(model.textEditorModel, languageId, uriStr, core_1.CancellationToken.None);
            await this.applyFormatting(model, languageId, uriStr);
            await model.save();
            this.state = 'applied';
        }
        catch (error) {
            console.error('Failed to apply changes with Monaco:', error);
            await this.writeChanges(contents);
        }
        finally {
            modelReference === null || modelReference === void 0 ? void 0 : modelReference.dispose();
        }
    }
    applyCodeActionsToTargetState() {
        if (!this.codeActionDeferred) {
            this.codeActionDeferred = new promise_util_1.Deferred();
            this.codeActionDeferred.resolve(this.doApplyCodeActionsToTargetState());
        }
        return this.codeActionDeferred.promise;
    }
    async doApplyCodeActionsToTargetState() {
        var _a, _b;
        const targetState = this.originalTargetState;
        if (!targetState) {
            this._targetStateWithCodeActions = '';
            return this._targetStateWithCodeActions;
        }
        let tempResource;
        let tempModel;
        try {
            // Create a temporary model to apply code actions
            const tempUri = core_1.URI.fromComponents({
                scheme: 'untitled',
                path: this.uri.path.toString(),
                authority: `changeset-${this.elementProps.chatSessionId}`,
                query: '',
                fragment: ''
            });
            tempResource = this.getInMemoryUri(tempUri);
            tempResource.update({ contents: this.targetState });
            tempModel = await this.monacoTextModelService.createModelReference(tempUri);
            tempModel.object.suppressOpenEditorWhenDirty = true;
            tempModel.object.textEditorModel.setValue(this.targetState);
            const languageId = tempModel.object.languageId;
            const uriStr = this.uri.toString();
            await this.codeActionService.applyOnSaveCodeActions(tempModel.object.textEditorModel, languageId, uriStr, core_1.CancellationToken.None);
            // Apply formatting and other editor preferences
            await this.applyFormatting(tempModel.object, languageId, uriStr);
            this._targetStateWithCodeActions = tempModel.object.textEditorModel.getValue();
            if (((_a = this._changeResource) === null || _a === void 0 ? void 0 : _a.contents) === this.elementProps.targetState) {
                (_b = this._changeResource) === null || _b === void 0 ? void 0 : _b.update({ contents: this.targetState });
            }
        }
        catch (error) {
            console.warn('Failed to apply code actions to target state:', error);
            this._targetStateWithCodeActions = targetState;
        }
        finally {
            tempModel === null || tempModel === void 0 ? void 0 : tempModel.dispose();
            tempResource === null || tempResource === void 0 ? void 0 : tempResource.dispose();
        }
        return this.targetState;
    }
    /**
     * Applies formatting preferences like format on save, trim trailing whitespace, and insert final newline.
     */
    async applyFormatting(model, languageId, uriStr) {
        try {
            const formatOnSave = this.editorPreferences.get({ preferenceName: 'editor.formatOnSave', overrideIdentifier: languageId }, undefined, uriStr);
            if (formatOnSave) {
                const instantiation = standaloneServices_1.StandaloneServices.get(instantiation_1.IInstantiationService);
                await instantiation.invokeFunction(format_1.formatDocumentWithSelectedProvider, model.textEditorModel, 1 /* FormattingMode.Explicit */, { report() { } }, core_1.CancellationToken.None, true);
            }
            const trimTrailingWhitespace = this.fileSystemPreferences.get({ preferenceName: 'files.trimTrailingWhitespace', overrideIdentifier: languageId }, undefined, uriStr);
            if (trimTrailingWhitespace) {
                const ttws = new trimTrailingWhitespaceCommand_1.TrimTrailingWhitespaceCommand(new selection_1.Selection(1, 1, 1, 1), [], false);
                cursor_1.CommandExecutor.executeCommands(model.textEditorModel, [], [ttws]);
            }
            const shouldInsertFinalNewline = this.fileSystemPreferences.get({ preferenceName: 'files.insertFinalNewline', overrideIdentifier: languageId }, undefined, uriStr);
            if (shouldInsertFinalNewline) {
                (0, monaco_utilities_1.insertFinalNewline)(model);
            }
        }
        catch (error) {
            console.warn('Failed to apply formatting:', error);
        }
    }
    onShow() {
        this.changeResource.update({
            contents: this.targetState,
            onSave: async (content) => {
                // Use Monaco utilities when saving from the change resource
                await this.applyChangesWithMonaco(content);
            }
        });
    }
    async revert() {
        await this.ensureInitialized();
        if (!await this.confirm('Revert')) {
            return;
        }
        this.state = 'pending';
        if (this.type === 'add') {
            await this.changeSetFileService.delete(this.uri);
        }
        else if (this._originalContent) {
            await this.changeSetFileService.write(this.uri, this._originalContent);
        }
    }
    async confirm(verb) {
        if (this._state !== 'stale') {
            return true;
        }
        await this.openChange();
        const answer = await new browser_1.ConfirmDialog({
            title: `${verb} suggestion.`,
            msg: `The file ${this.uri.path.toString()} has changed since this suggestion was created. Are you certain you wish to ${verb.toLowerCase()} the change?`
        }).open(true);
        return !!answer;
    }
    dispose() {
        this.toDispose.dispose();
    }
};
exports.ChangeSetFileElement = ChangeSetFileElement;
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.ChangeSetElementArgs),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileElement.prototype, "elementProps", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_service_1.ChangeSetFileService),
    tslib_1.__metadata("design:type", change_set_file_service_1.ChangeSetFileService)
], ChangeSetFileElement.prototype, "changeSetFileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ChangeSetFileElement.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.ConfigurableInMemoryResources),
    tslib_1.__metadata("design:type", ai_core_1.ConfigurableInMemoryResources)
], ChangeSetFileElement.prototype, "inMemoryResources", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_text_model_service_1.MonacoTextModelService),
    tslib_1.__metadata("design:type", monaco_text_model_service_1.MonacoTextModelService)
], ChangeSetFileElement.prototype, "monacoTextModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(editor_preferences_1.EditorPreferences),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileElement.prototype, "editorPreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.FileSystemPreferences),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileElement.prototype, "fileSystemPreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.MonacoCodeActionService),
    tslib_1.__metadata("design:type", Object)
], ChangeSetFileElement.prototype, "codeActionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChangeSetFileElement.prototype, "init", null);
exports.ChangeSetFileElement = ChangeSetFileElement = ChangeSetFileElement_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetFileElement);
//# sourceMappingURL=change-set-file-element.js.map