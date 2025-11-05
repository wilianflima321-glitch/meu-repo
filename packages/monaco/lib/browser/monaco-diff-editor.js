"use strict";
// *****************************************************************************
// Copyright (C) 2018 TypeFox and others.
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
exports.MonacoDiffEditor = void 0;
const uri_1 = require("@theia/core/lib/common/uri");
const monaco_editor_1 = require("./monaco-editor");
const diff_uris_1 = require("@theia/core/lib/browser/diff-uris");
const standaloneCodeEditor_1 = require("@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneCodeEditor");
const embeddedDiffEditorWidget_1 = require("@theia/monaco-editor-core/esm/vs/editor/browser/widget/diffEditor/embeddedDiffEditorWidget");
const editorContextKeys_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/editorContextKeys");
class MonacoDiffEditor extends monaco_editor_1.MonacoEditor {
    constructor(uri, node, originalModel, modifiedModel, services, diffNavigatorFactory, options, override, parentEditor) {
        super(uri, modifiedModel, node, services, options, override, parentEditor);
        this.originalModel = originalModel;
        this.modifiedModel = modifiedModel;
        this.diffNavigatorFactory = diffNavigatorFactory;
        this.lastReachedSideBySideBreakpoint = true;
        this.onShouldDisplayDirtyDiffChanged = undefined;
        this.originalTextModel = originalModel.textEditorModel;
        this.modifiedTextModel = modifiedModel.textEditorModel;
        this.documents.add(originalModel);
        const original = originalModel.textEditorModel;
        const modified = modifiedModel.textEditorModel;
        this.wordWrapOverride = options === null || options === void 0 ? void 0 : options.wordWrapOverride2;
        this._diffNavigator = diffNavigatorFactory.createdDiffNavigator(this._diffEditor);
        this._diffEditor.setModel({ original, modified });
    }
    get diffEditor() {
        return this._diffEditor;
    }
    get diffNavigator() {
        return this._diffNavigator;
    }
    get diffInformation() {
        return this._diffEditor.getLineChanges() || [];
    }
    create(options, override) {
        options = { ...options, fixedOverflowWidgets: true };
        const instantiator = this.getInstantiatorWithOverrides(override);
        /**
         *  @monaco-uplift. Should be guaranteed to work.
         *  Incomparable enums prevent TypeScript from believing that public IStandaloneDiffEditor is satisfied by private StandaloneDiffEditor
         */
        this._diffEditor = this.parentEditor ?
            instantiator.createInstance(EmbeddedDiffEditor, this.node, options, {}, this.parentEditor.getControl()) :
            instantiator.createInstance(standaloneCodeEditor_1.StandaloneDiffEditor2, this.node, options);
        this.editor = this._diffEditor.getModifiedEditor();
        return this._diffEditor;
    }
    resize(dimension) {
        var _a;
        if (this.node) {
            const layoutSize = this.computeLayoutSize(this.node, dimension);
            this._diffEditor.layout(layoutSize);
            // Workaround for https://github.com/microsoft/vscode/issues/217386#issuecomment-2711750462
            const leftEditor = this._diffEditor.getOriginalEditor();
            const hasReachedSideBySideBreakpoint = leftEditor.contextKeyService
                .getContextKeyValue(editorContextKeys_1.EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached.key);
            if (hasReachedSideBySideBreakpoint !== this.lastReachedSideBySideBreakpoint) {
                leftEditor.updateOptions({ wordWrapOverride2: ((_a = this.wordWrapOverride) !== null && _a !== void 0 ? _a : hasReachedSideBySideBreakpoint) ? 'off' : 'inherit' });
            }
            this.lastReachedSideBySideBreakpoint = !!hasReachedSideBySideBreakpoint;
        }
    }
    isActionSupported(id) {
        const action = this._diffEditor.getSupportedActions().find(a => a.id === id);
        return !!action && action.isSupported() && super.isActionSupported(id);
    }
    deltaDecorations(params) {
        console.warn('`deltaDecorations` should be called on either the original, or the modified editor.');
        return [];
    }
    getResourceUri() {
        return new uri_1.default(this.originalModel.uri);
    }
    createMoveToUri(resourceUri) {
        const [left, right] = diff_uris_1.DiffUris.decode(this.uri);
        return diff_uris_1.DiffUris.encode(left.withPath(resourceUri.path), right.withPath(resourceUri.path));
    }
    shouldDisplayDirtyDiff() {
        return false;
    }
    setShouldDisplayDirtyDiff(value) {
        // no op
    }
    handleVisibilityChanged(nowVisible) {
        if (nowVisible) {
            this.diffEditor.setModel({ original: this.originalTextModel, modified: this.modifiedTextModel });
            this.diffEditor.restoreViewState(this.savedDiffState);
            this.diffEditor.focus();
        }
        else {
            const originalModel = this.diffEditor.getOriginalEditor().getModel();
            if (originalModel) {
                this.originalTextModel = originalModel;
            }
            const modifiedModel = this.diffEditor.getModifiedEditor().getModel();
            if (modifiedModel) {
                this.modifiedTextModel = modifiedModel;
            }
            this.savedDiffState = this.diffEditor.saveViewState();
            // eslint-disable-next-line no-null/no-null
            this.diffEditor.setModel(null);
        }
    }
}
exports.MonacoDiffEditor = MonacoDiffEditor;
class EmbeddedDiffEditor extends embeddedDiffEditorWidget_1.EmbeddedDiffEditorWidget {
    _createInnerEditor(instantiationService, container, options) {
        return instantiationService.createInstance(standaloneCodeEditor_1.StandaloneCodeEditor, container, options);
    }
    getOriginalEditor() {
        return super.getOriginalEditor();
    }
    getModifiedEditor() {
        return super.getModifiedEditor();
    }
    addCommand(keybinding, handler, context) {
        return this.getModifiedEditor().addCommand(keybinding, handler, context);
    }
    createContextKey(key, defaultValue) {
        return this.getModifiedEditor().createContextKey(key, defaultValue);
    }
    addAction(descriptor) {
        return this.getModifiedEditor().addAction(descriptor);
    }
}
//# sourceMappingURL=monaco-diff-editor.js.map