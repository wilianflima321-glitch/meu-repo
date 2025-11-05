"use strict";
var AIChatInputWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatInputWidget = exports.AIChatInputConfiguration = void 0;
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
const ai_chat_1 = require("@theia/ai-chat");
const change_set_decorator_service_1 = require("@theia/ai-chat/lib/browser/change-set-decorator-service");
const image_context_variable_1 = require("@theia/ai-chat/lib/common/image-context-variable");
const browser_1 = require("@theia/ai-core/lib/browser");
const core_1 = require("@theia/core");
const browser_2 = require("@theia/core/lib/browser");
const context_key_service_1 = require("@theia/core/lib/browser/context-key-service");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const monaco_editor_core_1 = require("@theia/monaco-editor-core");
const monaco_editor_provider_1 = require("@theia/monaco/lib/browser/monaco-editor-provider");
const change_set_action_service_1 = require("./change-set-actions/change-set-action-service");
const chat_input_agent_suggestions_1 = require("./chat-input-agent-suggestions");
const chat_view_language_contribution_1 = require("./chat-view-language-contribution");
const context_variable_picker_1 = require("./context-variable-picker");
const task_context_variable_1 = require("@theia/ai-chat/lib/browser/task-context-variable");
const chat_input_history_1 = require("./chat-input-history");
exports.AIChatInputConfiguration = Symbol('AIChatInputConfiguration');
let AIChatInputWidget = AIChatInputWidget_1 = class AIChatInputWidget extends browser_2.ReactWidget {
    constructor() {
        super(...arguments);
        this.editorRef = undefined;
        this.editorReady = new promise_util_1.Deferred();
        this.isEnabled = false;
        this.heightInLines = 12;
        this.onDisposeForChatModel = new core_1.DisposableCollection();
        this.onDidResizeEmitter = new core_1.Emitter();
        this.onDidResize = this.onDidResizeEmitter.event;
    }
    get editor() {
        return this.editorRef;
    }
    get inputConfiguration() {
        return this.configuration;
    }
    getPreviousPrompt(currentInput) {
        if (!this.navigationState) {
            return undefined;
        }
        return this.navigationState.getPreviousPrompt(currentInput);
    }
    getNextPrompt() {
        if (!this.navigationState) {
            return undefined;
        }
        return this.navigationState.getNextPrompt();
    }
    set branch(branch) {
        if (this._branch !== branch) {
            this._branch = branch;
            this.update();
        }
    }
    set onQuery(query) {
        this._onQuery = (prompt) => {
            var _a;
            if (((_a = this.configuration) === null || _a === void 0 ? void 0 : _a.enablePromptHistory) !== false && prompt.trim()) {
                this.historyService.addToHistory(prompt);
                this.navigationState.stopNavigation();
            }
            return query(prompt);
        };
    }
    set onUnpin(unpin) {
        this._onUnpin = unpin;
    }
    set onCancel(cancel) {
        this._onCancel = cancel;
    }
    set onDeleteChangeSet(deleteChangeSet) {
        this._onDeleteChangeSet = deleteChangeSet;
    }
    set onDeleteChangeSetElement(deleteChangeSetElement) {
        this._onDeleteChangeSetElement = deleteChangeSetElement;
    }
    set initialValue(value) {
        this._initialValue = value;
    }
    set chatModel(chatModel) {
        this.onDisposeForChatModel.dispose();
        this.onDisposeForChatModel = new core_1.DisposableCollection();
        this.onDisposeForChatModel.push(chatModel.onDidChange(event => {
            if (event.kind === 'addVariable' || event.kind === 'removeVariable' || event.kind === 'addRequest' || event.kind === 'changeHierarchyBranch') {
                this.update();
            }
        }));
        this._chatModel = chatModel;
        this.update();
    }
    set pinnedAgent(pinnedAgent) {
        this._pinnedAgent = pinnedAgent;
        this.update();
    }
    init() {
        this.id = AIChatInputWidget_1.ID;
        this.title.closable = false;
        this.toDispose.push(this.resources.add(this.getResourceUri(), ''));
        this.toDispose.push(this.aiActivationService.onDidChangeActiveStatus(() => {
            this.setEnabled(this.aiActivationService.isActive);
        }));
        this.toDispose.push(this.onDidResizeEmitter);
        this.setEnabled(this.aiActivationService.isActive);
        this.historyService.init().then(() => {
            this.navigationState = new chat_input_history_1.ChatInputNavigationState(this.historyService);
        });
        this.initializeContextKeys();
        this.update();
    }
    initializeContextKeys() {
        this.chatInputFocusKey = this.contextKeyService.createKey('chatInputFocus', false);
        this.chatInputFirstLineKey = this.contextKeyService.createKey('chatInputFirstLine', false);
        this.chatInputLastLineKey = this.contextKeyService.createKey('chatInputLastLine', false);
    }
    updateCursorPositionKeys() {
        if (!this.editorRef) {
            this.chatInputFirstLineKey.set(false);
            this.chatInputLastLineKey.set(false);
            return;
        }
        const editor = this.editorRef.getControl();
        const position = editor.getPosition();
        const model = editor.getModel();
        if (!position || !model) {
            this.chatInputFirstLineKey.set(false);
            this.chatInputLastLineKey.set(false);
            return;
        }
        const isFirstLine = position.lineNumber === 1;
        const isLastLine = position.lineNumber === model.getLineCount();
        this.chatInputFirstLineKey.set(isFirstLine);
        this.chatInputLastLineKey.set(isLastLine);
    }
    setupEditorEventListeners() {
        if (!this.editorRef) {
            return;
        }
        const editor = this.editorRef.getControl();
        this.toDispose.push(editor.onDidFocusEditorWidget(() => {
            this.chatInputFocusKey.set(true);
            this.updateCursorPositionKeys();
        }));
        this.toDispose.push(editor.onDidBlurEditorWidget(() => {
            this.chatInputFocusKey.set(false);
            this.chatInputFirstLineKey.set(false);
            this.chatInputLastLineKey.set(false);
        }));
        this.toDispose.push(editor.onDidChangeCursorPosition(() => {
            if (editor.hasWidgetFocus()) {
                this.updateCursorPositionKeys();
            }
        }));
        this.toDispose.push(editor.onDidChangeModelContent(() => {
            if (editor.hasWidgetFocus()) {
                this.updateCursorPositionKeys();
            }
        }));
        if (editor.hasWidgetFocus()) {
            this.chatInputFocusKey.set(true);
            this.updateCursorPositionKeys();
        }
    }
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        this.editorReady.promise.then(() => {
            if (this.editorRef) {
                this.editorRef.focus();
            }
        });
    }
    async handleAgentCompletion(request) {
        try {
            const agentId = request.agentId;
            if (agentId) {
                await this.agentNotificationService.showCompletionNotification(agentId);
            }
        }
        catch (error) {
            console.error('Failed to handle agent completion notification:', error);
        }
    }
    getResourceUri() {
        return new core_1.URI(`ai-chat:/input.${chat_view_language_contribution_1.CHAT_VIEW_LANGUAGE_EXTENSION}`);
    }
    render() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const branch = this._branch;
        const chatModel = this._chatModel;
        // State of the input widget's action buttons depends on the state of the currently active or last processed
        // request, if there is one. If the chat model has branched, then the current request is the last on the
        // branch. Otherwise, it's the last request in the chat model.
        const currentRequest = (_c = (_b = (_a = branch === null || branch === void 0 ? void 0 : branch.items) === null || _a === void 0 ? void 0 : _a.at(-1)) === null || _b === void 0 ? void 0 : _b.element) !== null && _c !== void 0 ? _c : chatModel.getRequests().at(-1);
        const isEditing = !!(currentRequest && (ai_chat_1.EditableChatRequestModel.isEditing(currentRequest)));
        const isPending = () => !!(currentRequest && !isEditing && ai_chat_1.ChatRequestModel.isInProgress(currentRequest));
        const pending = isPending();
        const hasPromptHistory = ((_d = this.configuration) === null || _d === void 0 ? void 0 : _d.enablePromptHistory) && this.historyService.getPrompts().length > 0;
        return (React.createElement(ChatInput, { branch: this._branch, onQuery: this._onQuery.bind(this), onUnpin: this._onUnpin.bind(this), onCancel: this._onCancel.bind(this), onDragOver: this.onDragOver.bind(this), onDrop: this.onDrop.bind(this), onPaste: this.onPaste.bind(this), onEscape: this.onEscape.bind(this), onDeleteChangeSet: this._onDeleteChangeSet.bind(this), onDeleteChangeSetElement: this._onDeleteChangeSetElement.bind(this), onAddContextElement: this.addContextElement.bind(this), onDeleteContextElement: this.deleteContextElement.bind(this), onOpenContextElement: this.openContextElement.bind(this), context: this.getContext(), onAgentCompletion: this.handleAgentCompletion.bind(this), chatModel: this._chatModel, pinnedAgent: this._pinnedAgent, editorProvider: this.editorProvider, uri: this.getResourceUri(), contextMenuCallback: this.handleContextMenu.bind(this), isEnabled: this.isEnabled, setEditorRef: editor => {
                this.editorRef = editor;
                this.setupEditorEventListeners();
                this.editorReady.resolve();
            }, showContext: (_e = this.configuration) === null || _e === void 0 ? void 0 : _e.showContext, showPinnedAgent: (_f = this.configuration) === null || _f === void 0 ? void 0 : _f.showPinnedAgent, showChangeSet: (_g = this.configuration) === null || _g === void 0 ? void 0 : _g.showChangeSet, showSuggestions: (_h = this.configuration) === null || _h === void 0 ? void 0 : _h.showSuggestions, hasPromptHistory: hasPromptHistory, labelProvider: this.labelProvider, actionService: this.changeSetActionService, decoratorService: this.changeSetDecoratorService, initialValue: this._initialValue, openerService: this.openerService, suggestions: this._chatModel.suggestions, currentRequest: currentRequest, isEditing: isEditing, pending: pending, heightInLines: this.heightInLines, onResponseChanged: () => {
                if (isPending() !== pending) {
                    this.update();
                }
            }, onResize: () => this.onDidResizeEmitter.fire() }));
    }
    onDragOver(event) {
        var _a;
        event.preventDefault();
        event.stopPropagation();
        this.node.classList.add('drag-over');
        if ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.types.includes('text/plain')) {
            event.dataTransfer.dropEffect = 'copy';
        }
        else {
            event.dataTransfer.dropEffect = 'link';
        }
    }
    onDrop(event) {
        var _a, _b, _c;
        event.preventDefault();
        event.stopPropagation();
        this.node.classList.remove('drag-over');
        const dataTransferText = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
        const position = (_c = (_b = this.editorRef) === null || _b === void 0 ? void 0 : _b.getControl().getTargetAtClientPoint(event.clientX, event.clientY)) === null || _c === void 0 ? void 0 : _c.position;
        this.variableService.getDropResult(event.nativeEvent, { type: 'ai-chat-input-widget' }).then(result => {
            var _a, _b;
            result.variables.forEach(variable => this.addContext(variable));
            const text = (_a = result.text) !== null && _a !== void 0 ? _a : dataTransferText;
            if (position && text) {
                (_b = this.editorRef) === null || _b === void 0 ? void 0 : _b.getControl().executeEdits('drag-and-drop', [{
                        range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        },
                        text
                    }]);
            }
        });
    }
    onPaste(event) {
        this.variableService.getPasteResult(event, { type: 'ai-chat-input-widget' }).then(result => {
            var _a, _b;
            result.variables.forEach(variable => this.addContext(variable));
            if (result.text) {
                const position = (_a = this.editorRef) === null || _a === void 0 ? void 0 : _a.getControl().getPosition();
                if (position && result.text) {
                    (_b = this.editorRef) === null || _b === void 0 ? void 0 : _b.getControl().executeEdits('paste', [{
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: position.column,
                                endLineNumber: position.lineNumber,
                                endColumn: position.column
                            },
                            text: result.text
                        }]);
                }
            }
        });
    }
    onEscape() {
        var _a, _b, _c, _d;
        const currentRequest = (_d = (_c = (_b = (_a = this._branch) === null || _a === void 0 ? void 0 : _a.items) === null || _b === void 0 ? void 0 : _b.at(-1)) === null || _c === void 0 ? void 0 : _c.element) !== null && _d !== void 0 ? _d : this._chatModel.getRequests().at(-1);
        if (currentRequest && !ai_chat_1.EditableChatRequestModel.isEditing(currentRequest) && ai_chat_1.ChatRequestModel.isInProgress(currentRequest)) {
            this._onCancel(currentRequest);
        }
    }
    async openContextElement(request) {
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === this._chatModel.id);
        const context = { session };
        await this.variableService.open(request, context);
    }
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.update();
    }
    addContextElement() {
        this.contextVariablePicker.pickContextVariable().then(contextElement => {
            if (contextElement) {
                this.addContext(contextElement);
            }
        });
    }
    deleteContextElement(index) {
        this._chatModel.context.deleteVariables(index);
    }
    handleContextMenu(event) {
        this.contextMenuRenderer.render({
            menuPath: AIChatInputWidget_1.CONTEXT_MENU,
            anchor: { x: event.posx, y: event.posy },
            context: event.target,
            args: [this.editorRef]
        });
        event.preventDefault();
    }
    addContext(variable) {
        this._chatModel.context.addVariables(variable);
    }
    getContext() {
        return this._chatModel.context.getVariables();
    }
};
exports.AIChatInputWidget = AIChatInputWidget;
AIChatInputWidget.ID = 'chat-input-widget';
AIChatInputWidget.CONTEXT_MENU = ['chat-input-context-menu'];
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_editor_provider_1.MonacoEditorProvider),
    tslib_1.__metadata("design:type", monaco_editor_provider_1.MonacoEditorProvider)
], AIChatInputWidget.prototype, "editorProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.InMemoryResources),
    tslib_1.__metadata("design:type", core_1.InMemoryResources)
], AIChatInputWidget.prototype, "resources", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_2.ContextMenuRenderer)
], AIChatInputWidget.prototype, "contextMenuRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.AIChatInputConfiguration),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "configuration", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.FrontendVariableService),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.LabelProvider),
    tslib_1.__metadata("design:type", browser_2.LabelProvider)
], AIChatInputWidget.prototype, "labelProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(context_variable_picker_1.ContextVariablePicker),
    tslib_1.__metadata("design:type", context_variable_picker_1.ContextVariablePicker)
], AIChatInputWidget.prototype, "contextVariablePicker", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_action_service_1.ChangeSetActionService),
    tslib_1.__metadata("design:type", change_set_action_service_1.ChangeSetActionService)
], AIChatInputWidget.prototype, "changeSetActionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AgentCompletionNotificationService),
    tslib_1.__metadata("design:type", browser_1.AgentCompletionNotificationService)
], AIChatInputWidget.prototype, "agentNotificationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_decorator_service_1.ChangeSetDecoratorService),
    tslib_1.__metadata("design:type", change_set_decorator_service_1.ChangeSetDecoratorService)
], AIChatInputWidget.prototype, "changeSetDecoratorService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.OpenerService),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "aiActivationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_input_history_1.ChatInputHistoryService),
    tslib_1.__metadata("design:type", chat_input_history_1.ChatInputHistoryService)
], AIChatInputWidget.prototype, "historyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(context_key_service_1.ContextKeyService),
    tslib_1.__metadata("design:type", Object)
], AIChatInputWidget.prototype, "contextKeyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIChatInputWidget.prototype, "init", null);
exports.AIChatInputWidget = AIChatInputWidget = AIChatInputWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIChatInputWidget);
// Utility to check if we have task context in the chat model
const hasTaskContext = (chatModel) => chatModel.context.getVariables().some(variable => { var _a; return ((_a = variable.variable) === null || _a === void 0 ? void 0 : _a.id) === task_context_variable_1.TASK_CONTEXT_VARIABLE.id; });
const ChatInput = (props) => {
    const onDeleteChangeSet = () => props.onDeleteChangeSet(props.chatModel.id);
    const onDeleteChangeSetElement = (uri) => props.onDeleteChangeSetElement(props.chatModel.id, uri);
    const [isInputEmpty, setIsInputEmpty] = React.useState(true);
    const [changeSetUI, setChangeSetUI] = React.useState(() => buildChangeSetUI(props.chatModel.changeSet, props.labelProvider, props.decoratorService, props.actionService.getActionsForChangeset(props.chatModel.changeSet), onDeleteChangeSet, onDeleteChangeSetElement));
    // eslint-disable-next-line no-null/no-null
    const editorContainerRef = React.useRef(null);
    // eslint-disable-next-line no-null/no-null
    const placeholderRef = React.useRef(null);
    const editorRef = React.useRef(undefined);
    // eslint-disable-next-line no-null/no-null
    const containerRef = React.useRef(null);
    // On the first request of the chat, if the chat has a task context and a pinned
    // agent, show a "Perform this task." placeholder which is the message to send by default
    const isFirstRequest = props.chatModel.getRequests().length === 0;
    const shouldUseTaskPlaceholder = isFirstRequest && props.pinnedAgent && hasTaskContext(props.chatModel);
    const taskPlaceholder = core_1.nls.localize('theia/ai/chat-ui/performThisTask', 'Perform this task.');
    const placeholderText = !props.isEnabled
        ? core_1.nls.localize('theia/ai/chat-ui/aiDisabled', 'AI features are disabled')
        : shouldUseTaskPlaceholder
            ? taskPlaceholder
            : core_1.nls.localizeByDefault('Ask a question') + (props.hasPromptHistory ? core_1.nls.localizeByDefault(' ({0} for history)', '⇅') : '');
    // Handle paste events on the container
    const handlePaste = React.useCallback((event) => {
        props.onPaste(event);
    }, [props.onPaste]);
    // Set up paste handler on the container div
    React.useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('paste', handlePaste, true);
            return () => {
                container.removeEventListener('paste', handlePaste, true);
            };
        }
        return undefined;
    }, [handlePaste]);
    React.useEffect(() => {
        const uri = props.uri;
        const createInputElement = async () => {
            var _a, _b;
            const paddingTop = 6;
            const lineHeight = 20;
            const maxHeightPx = ((_a = props.heightInLines) !== null && _a !== void 0 ? _a : 12) * lineHeight;
            const editor = await props.editorProvider.createSimpleInline(uri, editorContainerRef.current, {
                language: chat_view_language_contribution_1.CHAT_VIEW_LANGUAGE_EXTENSION,
                // Disable code lens, inlay hints and hover support to avoid console errors from other contributions
                codeLens: false,
                inlayHints: { enabled: 'off' },
                hover: { enabled: false },
                autoSizing: false, // we handle the sizing ourselves
                scrollBeyondLastLine: false,
                scrollBeyondLastColumn: 0,
                minHeight: 1,
                fontFamily: 'var(--theia-ui-font-family)',
                fontSize: 13,
                cursorWidth: 1,
                maxHeight: -1,
                scrollbar: { horizontal: 'hidden', alwaysConsumeMouseWheel: false, handleMouseWheel: true },
                automaticLayout: true,
                lineNumbers: 'off',
                lineHeight,
                padding: { top: paddingTop },
                suggest: {
                    showIcons: true,
                    showSnippets: false,
                    showWords: false,
                    showStatusBar: false,
                    insertMode: 'replace',
                },
                bracketPairColorization: { enabled: false },
                wrappingStrategy: 'advanced',
                stickyScroll: { enabled: false },
            });
            if (editorContainerRef.current) {
                editorContainerRef.current.style.overflowY = 'auto'; // ensure vertical scrollbar
                editorContainerRef.current.style.height = (lineHeight + (2 * paddingTop)) + 'px';
                editorContainerRef.current.addEventListener('wheel', e => {
                    // Prevent parent from scrolling
                    e.stopPropagation();
                }, { passive: false });
            }
            const updateEditorHeight = () => {
                if (editorContainerRef.current) {
                    const contentHeight = editor.getControl().getContentHeight() + paddingTop;
                    editorContainerRef.current.style.height = `${Math.min(contentHeight, maxHeightPx)}px`;
                }
            };
            editor.getControl().onDidChangeModelContent(() => {
                const value = editor.getControl().getValue();
                setIsInputEmpty(!value || value.length === 0);
                updateEditorHeight();
                handleOnChange();
            });
            const resizeObserver = new ResizeObserver(() => {
                updateEditorHeight();
                props.onResize();
            });
            if (editorContainerRef.current) {
                resizeObserver.observe(editorContainerRef.current);
            }
            editor.getControl().onDidDispose(() => {
                resizeObserver.disconnect();
            });
            editor.getControl().onContextMenu(e => props.contextMenuCallback(e.event));
            const updateLineCounts = () => {
                // We need the line numbers to allow scrolling by using the keyboard
                const model = editor.getControl().getModel();
                const lineCount = model.getLineCount();
                const decorations = [];
                for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                    decorations.push({
                        range: new monaco_editor_core_1.Range(lineNumber, 1, lineNumber, 1),
                        options: {
                            description: `line-number-${lineNumber}`,
                            isWholeLine: false,
                            className: `line-number-${lineNumber}`,
                        }
                    });
                }
                const lineNumbers = model.getAllDecorations().filter(predicate => { var _a; return (_a = predicate.options.description) === null || _a === void 0 ? void 0 : _a.startsWith('line-number-'); });
                editor.getControl().removeDecorations(lineNumbers.map(d => d.id));
                editor.getControl().createDecorationsCollection(decorations);
            };
            (_b = editor.getControl().getModel()) === null || _b === void 0 ? void 0 : _b.onDidChangeContent(() => {
                updateLineCounts();
            });
            editor.getControl().onDidChangeCursorPosition(e => {
                var _a;
                const lineNumber = e.position.lineNumber;
                const line = (_a = editor.getControl().getDomNode()) === null || _a === void 0 ? void 0 : _a.querySelector(`.line-number-${lineNumber}`);
                line === null || line === void 0 ? void 0 : line.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            });
            editorRef.current = editor;
            props.setEditorRef(editor);
            if (props.initialValue) {
                setValue(props.initialValue);
            }
            updateLineCounts();
        };
        createInputElement();
        return () => {
            props.setEditorRef(undefined);
            if (editorRef.current) {
                editorRef.current.dispose();
            }
        };
    }, []);
    React.useEffect(() => {
        setChangeSetUI(buildChangeSetUI(props.chatModel.changeSet, props.labelProvider, props.decoratorService, props.actionService.getActionsForChangeset(props.chatModel.changeSet), onDeleteChangeSet, onDeleteChangeSetElement));
        const listener = props.chatModel.onDidChange(event => {
            if (ai_chat_1.ChatChangeEvent.isChangeSetEvent(event)) {
                setChangeSetUI(buildChangeSetUI(props.chatModel.changeSet, props.labelProvider, props.decoratorService, props.actionService.getActionsForChangeset(props.chatModel.changeSet), onDeleteChangeSet, onDeleteChangeSetElement));
            }
            if (event.kind === 'addRequest') {
                // Listen for when this request's response becomes complete
                const responseListener = event.request.response.onDidChange(() => {
                    if (event.request.response.isComplete) {
                        props.onAgentCompletion(event.request);
                        responseListener.dispose(); // Clean up the listener once notification is sent
                    }
                });
            }
        });
        return () => {
            listener.dispose();
        };
    }, [props.chatModel, props.labelProvider, props.decoratorService, props.actionService]);
    React.useEffect(() => {
        const disposable = props.actionService.onDidChange(() => {
            const newActions = props.actionService.getActionsForChangeset(props.chatModel.changeSet);
            setChangeSetUI(current => !current ? current : { ...current, actions: newActions });
        });
        return () => disposable.dispose();
    }, [props.actionService, props.chatModel.changeSet]);
    React.useEffect(() => {
        const disposable = props.decoratorService.onDidChangeDecorations(() => {
            setChangeSetUI(buildChangeSetUI(props.chatModel.changeSet, props.labelProvider, props.decoratorService, props.actionService.getActionsForChangeset(props.chatModel.changeSet), onDeleteChangeSet, onDeleteChangeSetElement));
        });
        return () => disposable.dispose();
    });
    const setValue = React.useCallback((value) => {
        if (editorRef.current && !editorRef.current.document.isDisposed()) {
            editorRef.current.document.textEditorModel.setValue(value);
        }
    }, [editorRef]);
    // Without user input, if we can default to "Perform this task.", do so
    const submit = React.useCallback(function submit(value) {
        let effectiveValue = value;
        if ((!value || value.trim().length === 0) && shouldUseTaskPlaceholder) {
            effectiveValue = taskPlaceholder;
        }
        if (!effectiveValue || effectiveValue.trim().length === 0) {
            return;
        }
        props.onQuery(effectiveValue);
        setValue('');
        if (editorRef.current && !editorRef.current.document.textEditorModel.isDisposed()) {
            editorRef.current.document.textEditorModel.setValue('');
        }
    }, [props.context, props.onQuery, setValue, shouldUseTaskPlaceholder, taskPlaceholder]);
    const onKeyDown = React.useCallback((event) => {
        var _a;
        if (!props.isEnabled) {
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            // On Enter, read input and submit (handles task context)
            const currentValue = ((_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.document.textEditorModel.getValue()) || '';
            submit(currentValue);
        }
        else if (event.key === 'Escape') {
            event.preventDefault();
            props.onEscape();
        }
    }, [props.isEnabled, submit]);
    const handleInputFocus = () => {
        hidePlaceholderIfEditorFilled();
    };
    const handleOnChange = () => {
        showPlaceholderIfEditorEmpty();
        hidePlaceholderIfEditorFilled();
    };
    const handleInputBlur = () => {
        showPlaceholderIfEditorEmpty();
    };
    const showPlaceholderIfEditorEmpty = () => {
        var _a, _b;
        if (!((_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.getControl().getValue())) {
            (_b = placeholderRef.current) === null || _b === void 0 ? void 0 : _b.classList.remove('hidden');
        }
    };
    const hidePlaceholderIfEditorFilled = () => {
        var _a, _b;
        const value = (_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.getControl().getValue();
        if (value && value.length > 0) {
            (_b = placeholderRef.current) === null || _b === void 0 ? void 0 : _b.classList.add('hidden');
        }
    };
    const handlePin = () => {
        var _a, _b;
        if (editorRef.current) {
            (_a = editorRef.current.getControl().getModel()) === null || _a === void 0 ? void 0 : _a.applyEdits([{
                    range: {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1
                    },
                    text: '@',
                }]);
            editorRef.current.getControl().setPosition({ lineNumber: 1, column: 2 });
            (_b = editorRef.current.getControl().getAction('editor.action.triggerSuggest')) === null || _b === void 0 ? void 0 : _b.run();
        }
    };
    const leftOptions = [
        ...(props.showContext
            ? [{
                    title: core_1.nls.localize('theia/ai/chat-ui/attachToContext', 'Attach elements to context'),
                    handler: () => props.onAddContextElement(),
                    className: 'codicon-add',
                    disabled: !props.isEnabled
                }]
            : []),
        ...(props.showPinnedAgent
            ? [{
                    title: props.pinnedAgent ? core_1.nls.localize('theia/ai/chat-ui/unpinAgent', 'Unpin Agent') : core_1.nls.localize('theia/ai/chat-ui/agent', 'Agent'),
                    handler: props.pinnedAgent ? props.onUnpin : handlePin,
                    className: 'at-icon',
                    disabled: !props.isEnabled,
                    text: {
                        align: 'right',
                        content: props.pinnedAgent && props.pinnedAgent.name
                    },
                }]
            : []),
    ];
    let rightOptions = [];
    const { currentRequest: latestRequest, isEditing, pending, onResponseChanged } = props;
    React.useEffect(() => {
        if (!latestRequest) {
            return;
        }
        const disposable = latestRequest.response.onDidChange(onResponseChanged);
        return () => disposable.dispose();
    }, [latestRequest, onResponseChanged]);
    if (isEditing) {
        rightOptions = [{
                title: core_1.nls.localize('theia/ai/chat-ui/send', 'Send (Enter)'),
                handler: () => {
                    var _a;
                    if (props.isEnabled) {
                        submit(((_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.document.textEditorModel.getValue()) || '');
                    }
                },
                className: 'codicon-send',
                disabled: (isInputEmpty && !shouldUseTaskPlaceholder) || !props.isEnabled
            }];
    }
    else if (pending) {
        rightOptions = [{
                title: core_1.nls.localize('theia/ai/chat-ui/cancel', 'Cancel (Esc)'),
                handler: () => {
                    if (latestRequest) {
                        props.onCancel(latestRequest);
                    }
                },
                className: 'codicon-stop-circle'
            }];
    }
    else {
        rightOptions = [{
                title: core_1.nls.localize('theia/ai/chat-ui/send', 'Send (Enter)'),
                handler: () => {
                    var _a;
                    if (props.isEnabled) {
                        submit(((_a = editorRef.current) === null || _a === void 0 ? void 0 : _a.document.textEditorModel.getValue()) || '');
                    }
                },
                className: 'codicon-send',
                disabled: (isInputEmpty && !shouldUseTaskPlaceholder) || !props.isEnabled
            }];
    }
    const contextUI = buildContextUI(props.context, props.labelProvider, props.onDeleteContextElement, props.onOpenContextElement);
    return (React.createElement("div", { className: 'theia-ChatInput', "data-ai-disabled": !props.isEnabled, onDragOver: props.onDragOver, onDrop: props.onDrop, ref: containerRef },
        props.showSuggestions !== false && React.createElement(chat_input_agent_suggestions_1.ChatInputAgentSuggestions, { suggestions: props.suggestions, opener: props.openerService }),
        props.showChangeSet && (changeSetUI === null || changeSetUI === void 0 ? void 0 : changeSetUI.elements) &&
            React.createElement(ChangeSetBox, { changeSet: changeSetUI }),
        React.createElement("div", { className: 'theia-ChatInput-Editor-Box' },
            React.createElement("div", { className: 'theia-ChatInput-Editor', ref: editorContainerRef, onKeyDown: onKeyDown, onFocus: handleInputFocus, onBlur: handleInputBlur },
                React.createElement("div", { ref: placeholderRef, className: 'theia-ChatInput-Editor-Placeholder' }, placeholderText)),
            props.context && props.context.length > 0 &&
                React.createElement(ChatContext, { context: contextUI.context }),
            React.createElement(ChatInputOptions, { leftOptions: leftOptions, rightOptions: rightOptions }))));
};
const noPropagation = (handler) => (e) => {
    handler();
    e.stopPropagation();
};
const buildChangeSetUI = (changeSet, labelProvider, decoratorService, actions, onDeleteChangeSet, onDeleteChangeSetElement) => {
    const elements = changeSet.getElements();
    return elements.length ? ({
        title: changeSet.title,
        changeSet,
        deleteChangeSet: onDeleteChangeSet,
        elements: changeSet.getElements().map(element => toUiElement(element, onDeleteChangeSetElement, labelProvider, decoratorService)),
        actions
    }) : undefined;
};
/** Memo because the parent element rerenders on every key press in the chat widget. */
const ChangeSetBox = React.memo(({ changeSet: { changeSet, title, deleteChangeSet, elements, actions } }) => (React.createElement("div", { className: 'theia-ChatInput-ChangeSet-Box' },
    React.createElement("div", { className: 'theia-ChatInput-ChangeSet-Header' },
        React.createElement("h3", null, title),
        React.createElement("div", { className: 'theia-ChatInput-ChangeSet-Header-Actions' },
            actions.map(action => React.createElement("div", { key: action.id, className: 'theia-changeSet-Action' }, action.render(changeSet))),
            React.createElement("span", { className: 'codicon codicon-close action', title: core_1.nls.localize('theia/ai/chat-ui/deleteChangeSet', 'Delete Change Set'), onClick: () => deleteChangeSet() }))),
    React.createElement("div", { className: 'theia-ChatInput-ChangeSet-List' },
        React.createElement("ul", null, elements.map(element => ChangeSetElement(element)))))));
function toUiElement(element, onDeleteChangeSetElement, labelProvider, decoratorService) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        open: (_a = element.open) === null || _a === void 0 ? void 0 : _a.bind(element),
        uri: element.uri.toString(),
        iconClass: (_c = (_b = element.icon) !== null && _b !== void 0 ? _b : labelProvider.getIcon(element.uri)) !== null && _c !== void 0 ? _c : labelProvider.fileIcon,
        nameClass: `${element.type} ${element.state}`,
        name: (_d = element.name) !== null && _d !== void 0 ? _d : labelProvider.getName(element.uri),
        additionalInfo: (_e = element.additionalInfo) !== null && _e !== void 0 ? _e : labelProvider.getDetails(element.uri),
        additionalInfoSuffixIcon: decoratorService.getAdditionalInfoSuffixIcon(element),
        openChange: (_f = element === null || element === void 0 ? void 0 : element.openChange) === null || _f === void 0 ? void 0 : _f.bind(element),
        apply: element.state !== 'applied' ? (_g = element === null || element === void 0 ? void 0 : element.apply) === null || _g === void 0 ? void 0 : _g.bind(element) : undefined,
        revert: element.state === 'applied' || element.state === 'stale' ? (_h = element === null || element === void 0 ? void 0 : element.revert) === null || _h === void 0 ? void 0 : _h.bind(element) : undefined,
        delete: () => onDeleteChangeSetElement(element.uri)
    };
}
const ChangeSetElement = element => (React.createElement("li", { key: element.uri, title: core_1.nls.localize('theia/ai/chat-ui/openDiff', 'Open Diff'), onClick: () => { var _a; return (_a = element.openChange) === null || _a === void 0 ? void 0 : _a.call(element); } },
    React.createElement("div", { className: `theia-ChatInput-ChangeSet-Icon ${element.iconClass}` }),
    React.createElement("div", { className: 'theia-ChatInput-ChangeSet-labelParts' },
        React.createElement("span", { className: `theia-ChatInput-ChangeSet-title ${element.nameClass}` }, element.name),
        React.createElement("div", { className: 'theia-ChatInput-ChangeSet-additionalInfo' },
            element.additionalInfo && React.createElement("span", null, element.additionalInfo),
            element.additionalInfoSuffixIcon
                && React.createElement("div", { className: `theia-ChatInput-ChangeSet-AdditionalInfo-SuffixIcon ${element.additionalInfoSuffixIcon.join(' ')}` }))),
    React.createElement("div", { className: 'theia-ChatInput-ChangeSet-Actions' },
        element.open && (React.createElement("span", { className: 'codicon codicon-file action', title: core_1.nls.localize('theia/ai/chat-ui/openOriginalFile', 'Open Original File'), onClick: noPropagation(() => element.open()) })),
        element.revert && (React.createElement("span", { className: 'codicon codicon-discard action', title: core_1.nls.localizeByDefault('Revert'), onClick: noPropagation(() => element.revert()) })),
        element.apply && (React.createElement("span", { className: 'codicon codicon-check action', title: core_1.nls.localizeByDefault('Apply'), onClick: noPropagation(() => element.apply()) })),
        React.createElement("span", { className: 'codicon codicon-close action', title: core_1.nls.localizeByDefault('Delete'), onClick: noPropagation(() => element.delete()) }))));
const ChatInputOptions = ({ leftOptions, rightOptions }) => (React.createElement("div", { className: "theia-ChatInputOptions" },
    React.createElement("div", { className: "theia-ChatInputOptions-left" }, leftOptions.map((option, index) => {
        var _a, _b;
        return (React.createElement("span", { key: index, className: `option${option.disabled ? ' disabled' : ''}${((_a = option.text) === null || _a === void 0 ? void 0 : _a.align) === 'right' ? ' reverse' : ''}`, title: option.title, onClick: option.handler },
            React.createElement("span", null, (_b = option.text) === null || _b === void 0 ? void 0 : _b.content),
            React.createElement("span", { className: `codicon ${option.className}` })));
    })),
    React.createElement("div", { className: "theia-ChatInputOptions-right" }, rightOptions.map((option, index) => {
        var _a, _b;
        return (React.createElement("span", { key: index, className: `option${option.disabled ? ' disabled' : ''}${((_a = option.text) === null || _a === void 0 ? void 0 : _a.align) === 'right' ? ' reverse' : ''}`, title: option.title, onClick: option.handler },
            React.createElement("span", null, (_b = option.text) === null || _b === void 0 ? void 0 : _b.content),
            React.createElement("span", { className: `codicon ${option.className}` })));
    }))));
function buildContextUI(context, labelProvider, onDeleteContextElement, onOpen) {
    if (!context) {
        return { context: [] };
    }
    return {
        context: context.map((element, index) => ({
            variable: element,
            name: labelProvider.getName(element),
            iconClass: labelProvider.getIcon(element),
            nameClass: element.variable.name,
            additionalInfo: labelProvider.getDetails(element),
            details: labelProvider.getLongName(element),
            delete: () => onDeleteContextElement(index),
            open: () => onOpen(element)
        }))
    };
}
const ChatContext = ({ context }) => (React.createElement("div", { className: "theia-ChatInput-ChatContext" },
    React.createElement("ul", null, context.map((element, index) => {
        var _a, _b, _c;
        if (image_context_variable_1.ImageContextVariable.isImageContextRequest(element.variable)) {
            const variable = image_context_variable_1.ImageContextVariable.parseRequest(element.variable);
            return React.createElement("li", { key: index, className: "theia-ChatInput-ChatContext-Element theia-ChatInput-ImageContext-Element", title: (_a = variable.name) !== null && _a !== void 0 ? _a : variable.wsRelativePath, onClick: () => { var _a; return (_a = element.open) === null || _a === void 0 ? void 0 : _a.call(element); } },
                React.createElement("div", { className: "theia-ChatInput-ChatContext-Row" },
                    React.createElement("div", { className: `theia-ChatInput-ChatContext-Icon ${element.iconClass}` }),
                    React.createElement("div", { className: "theia-ChatInput-ChatContext-labelParts" },
                        React.createElement("span", { className: `theia-ChatInput-ChatContext-title ${element.nameClass}` }, (_b = variable.name) !== null && _b !== void 0 ? _b : (_c = variable.wsRelativePath) === null || _c === void 0 ? void 0 : _c.split('/').pop()),
                        React.createElement("span", { className: 'theia-ChatInput-ChatContext-additionalInfo' }, element.additionalInfo)),
                    React.createElement("span", { className: "codicon codicon-close action", title: core_1.nls.localizeByDefault('Delete'), onClick: e => { e.stopPropagation(); element.delete(); } })),
                React.createElement("div", { className: "theia-ChatInput-ChatContext-ImageRow" },
                    React.createElement("div", { className: 'theia-ChatInput-ImagePreview-Item' },
                        React.createElement("img", { src: `data:${variable.mimeType};base64,${variable.data}`, alt: variable.name }))));
        }
        return React.createElement("li", { key: index, className: "theia-ChatInput-ChatContext-Element", title: element.details, onClick: () => { var _a; return (_a = element.open) === null || _a === void 0 ? void 0 : _a.call(element); } },
            React.createElement("div", { className: "theia-ChatInput-ChatContext-Row" },
                React.createElement("div", { className: `theia-ChatInput-ChatContext-Icon ${element.iconClass}` }),
                React.createElement("div", { className: "theia-ChatInput-ChatContext-labelParts" },
                    React.createElement("span", { className: `theia-ChatInput-ChatContext-title ${element.nameClass}` }, element.name),
                    React.createElement("span", { className: 'theia-ChatInput-ChatContext-additionalInfo' }, element.additionalInfo)),
                React.createElement("span", { className: "codicon codicon-close action", title: core_1.nls.localizeByDefault('Delete'), onClick: e => { e.stopPropagation(); element.delete(); } })));
    }))));
//# sourceMappingURL=chat-input-widget.js.map