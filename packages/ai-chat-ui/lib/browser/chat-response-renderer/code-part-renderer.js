"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeWrapper = exports.InsertCodeAtCursorButtonAction = exports.CopyToClipboardButtonAction = exports.CodePartRenderer = exports.CodePartRendererAction = void 0;
const tslib_1 = require("tslib");
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
const common_1 = require("@theia/ai-chat/lib/common");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const clipboard_service_1 = require("@theia/core/lib/browser/clipboard-service");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const nls_1 = require("@theia/core/lib/common/nls");
const browser_2 = require("@theia/editor/lib/browser");
const monaco_editor_provider_1 = require("@theia/monaco/lib/browser/monaco-editor-provider");
const monaco_languages_1 = require("@theia/monaco/lib/browser/monaco-languages");
const chat_view_tree_widget_1 = require("../chat-tree-view/chat-view-tree-widget");
exports.CodePartRendererAction = Symbol('CodePartRendererAction');
let CodePartRenderer = class CodePartRenderer {
    canHandle(response) {
        if (common_1.CodeChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response, parentNode) {
        const language = response.language ? this.languageService.getExtension(response.language) : undefined;
        return (React.createElement("div", { className: "theia-CodePartRenderer-root" },
            React.createElement("div", { className: "theia-CodePartRenderer-top" },
                React.createElement("div", { className: "theia-CodePartRenderer-left" }, this.renderTitle(response)),
                React.createElement("div", { className: "theia-CodePartRenderer-right theia-CodePartRenderer-actions" }, this.codePartRendererActions.getContributions()
                    .filter(action => action.canRender ? action.canRender(response, parentNode) : true)
                    .sort((a, b) => a.priority - b.priority)
                    .map(action => action.render(response, parentNode)))),
            React.createElement("div", { className: "theia-CodePartRenderer-separator" }),
            React.createElement("div", { className: "theia-CodePartRenderer-bottom" },
                React.createElement(exports.CodeWrapper, { content: response.code, language: language, editorProvider: this.editorProvider, untitledResourceResolver: this.untitledResourceResolver, contextMenuCallback: e => this.handleContextMenuEvent(parentNode, e, response.code) }))));
    }
    renderTitle(response) {
        var _a, _b, _c, _d;
        const uri = (_a = response.location) === null || _a === void 0 ? void 0 : _a.uri;
        const position = (_b = response.location) === null || _b === void 0 ? void 0 : _b.position;
        if (uri && position) {
            return React.createElement("a", { onClick: this.openFileAtPosition.bind(this, uri, position) }, this.getTitle((_c = response.location) === null || _c === void 0 ? void 0 : _c.uri, response.language));
        }
        return this.getTitle((_d = response.location) === null || _d === void 0 ? void 0 : _d.uri, response.language);
    }
    getTitle(uri, language) {
        var _a, _b, _c;
        // If there is a URI, use the file name as the title. Otherwise, use the language as the title.
        // If there is no language, use a generic fallback title.
        return (_c = (_b = (_a = uri === null || uri === void 0 ? void 0 : uri.path) === null || _a === void 0 ? void 0 : _a.toString().split('/').pop()) !== null && _b !== void 0 ? _b : language) !== null && _c !== void 0 ? _c : nls_1.nls.localize('theia/ai/chat-ui/code-part-renderer/generatedCode', 'Generated Code');
    }
    /**
     * Opens a file and moves the cursor to the specified position.
     *
     * @param uri - The URI of the file to open.
     * @param position - The position to move the cursor to, specified as {line, character}.
     */
    async openFileAtPosition(uri, position) {
        const editorWidget = await this.editorManager.open(uri);
        if (editorWidget) {
            const editor = editorWidget.editor;
            editor.revealPosition(position);
            editor.focus();
            editor.cursor = position;
        }
    }
    handleContextMenuEvent(node, event, code) {
        this.contextMenuRenderer.render({
            menuPath: chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU,
            anchor: { x: event.posx, y: event.posy },
            args: [node, { code }],
            context: event.target
        });
        event.preventDefault();
    }
};
exports.CodePartRenderer = CodePartRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.EditorManager),
    tslib_1.__metadata("design:type", browser_2.EditorManager)
], CodePartRenderer.prototype, "editorManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.UntitledResourceResolver),
    tslib_1.__metadata("design:type", core_1.UntitledResourceResolver)
], CodePartRenderer.prototype, "untitledResourceResolver", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_editor_provider_1.MonacoEditorProvider),
    tslib_1.__metadata("design:type", monaco_editor_provider_1.MonacoEditorProvider)
], CodePartRenderer.prototype, "editorProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_languages_1.MonacoLanguages),
    tslib_1.__metadata("design:type", monaco_languages_1.MonacoLanguages)
], CodePartRenderer.prototype, "languageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_1.ContextMenuRenderer)
], CodePartRenderer.prototype, "contextMenuRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(exports.CodePartRendererAction),
    tslib_1.__metadata("design:type", Object)
], CodePartRenderer.prototype, "codePartRendererActions", void 0);
exports.CodePartRenderer = CodePartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CodePartRenderer);
let CopyToClipboardButtonAction = class CopyToClipboardButtonAction {
    constructor() {
        this.priority = 10;
    }
    render(response) {
        return React.createElement(CopyToClipboardButton, { key: 'copyToClipBoard', code: response.code, clipboardService: this.clipboardService });
    }
};
exports.CopyToClipboardButtonAction = CopyToClipboardButtonAction;
tslib_1.__decorate([
    (0, inversify_1.inject)(clipboard_service_1.ClipboardService),
    tslib_1.__metadata("design:type", Object)
], CopyToClipboardButtonAction.prototype, "clipboardService", void 0);
exports.CopyToClipboardButtonAction = CopyToClipboardButtonAction = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CopyToClipboardButtonAction);
const CopyToClipboardButton = (props) => {
    const { code, clipboardService } = props;
    const copyCodeToClipboard = React.useCallback(() => {
        clipboardService.writeText(code);
    }, [code, clipboardService]);
    return React.createElement("div", { className: 'button codicon codicon-copy', title: nls_1.nls.localizeByDefault('Copy'), role: 'button', onClick: copyCodeToClipboard });
};
let InsertCodeAtCursorButtonAction = class InsertCodeAtCursorButtonAction {
    constructor() {
        this.priority = 20;
    }
    render(response) {
        return React.createElement(InsertCodeAtCursorButton, { key: 'insertCodeAtCursor', code: response.code, editorManager: this.editorManager });
    }
};
exports.InsertCodeAtCursorButtonAction = InsertCodeAtCursorButtonAction;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.EditorManager),
    tslib_1.__metadata("design:type", browser_2.EditorManager)
], InsertCodeAtCursorButtonAction.prototype, "editorManager", void 0);
exports.InsertCodeAtCursorButtonAction = InsertCodeAtCursorButtonAction = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], InsertCodeAtCursorButtonAction);
const InsertCodeAtCursorButton = (props) => {
    const { code, editorManager } = props;
    const insertCode = React.useCallback(() => {
        const editor = editorManager.currentEditor;
        if (editor) {
            const currentEditor = editor.editor;
            const selection = currentEditor.selection;
            // Insert the text at the current cursor position
            // If there is a selection, replace the selection with the text
            currentEditor.executeEdits([{
                    range: {
                        start: selection.start,
                        end: selection.end
                    },
                    newText: code
                }]);
        }
    }, [code, editorManager]);
    return React.createElement("div", { className: 'button codicon codicon-insert', title: nls_1.nls.localizeByDefault('Insert At Cursor'), role: 'button', onClick: insertCode });
};
/**
 * Renders the given code within a Monaco Editor
 */
const CodeWrapper = (props) => {
    var _a;
    // eslint-disable-next-line no-null/no-null
    const ref = React.useRef(null);
    const editorRef = React.useRef(undefined);
    const createInputElement = async () => {
        const resource = await props.untitledResourceResolver.createUntitledResource(undefined, props.language);
        const editor = await props.editorProvider.createSimpleInline(resource.uri, ref.current, {
            readOnly: true,
            autoSizing: true,
            scrollBeyondLastLine: false,
            scrollBeyondLastColumn: 0,
            renderFinalNewline: 'off',
            maxHeight: -1,
            scrollbar: {
                vertical: 'hidden',
                alwaysConsumeMouseWheel: false
            },
            wordWrap: 'off',
            codeLens: false,
            inlayHints: { enabled: 'off' },
            hover: { enabled: false }
        });
        editor.document.textEditorModel.setValue(props.content);
        editor.getControl().onContextMenu(e => props.contextMenuCallback(e.event));
        editorRef.current = editor;
    };
    React.useEffect(() => {
        createInputElement();
        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
            }
        };
    }, []);
    React.useEffect(() => {
        if (editorRef.current) {
            editorRef.current.document.textEditorModel.setValue(props.content);
        }
    }, [props.content]);
    (_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.resizeToFit();
    return React.createElement("div", { className: 'theia-CodeWrapper', ref: ref });
};
exports.CodeWrapper = CodeWrapper;
//# sourceMappingURL=code-part-renderer.js.map