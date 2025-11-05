"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressChatResponseContentImpl = exports.ErrorChatResponseModel = exports.MutableChatResponseModel = exports.QuestionResponseContentImpl = exports.HorizontalLayoutChatResponseContentImpl = exports.CommandChatResponseContentImpl = exports.COMMAND_CHAT_RESPONSE_COMMAND = exports.ToolCallChatResponseContentImpl = exports.CodeChatResponseContentImpl = exports.InformationalChatResponseContentImpl = exports.MarkdownChatResponseContentImpl = exports.ThinkingChatResponseContentImpl = exports.TextChatResponseContentImpl = exports.ErrorChatResponseContentImpl = exports.MutableChatRequestModel = exports.ChatContextManagerImpl = exports.ChatRequestHierarchyBranchImpl = exports.ChatRequestHierarchyImpl = exports.ChatTreeChangeSet = exports.MutableChatModel = exports.QuestionResponseContent = exports.ProgressChatResponseContent = exports.ThinkingChatResponseContent = exports.ErrorChatResponseContent = exports.ToolCallChatResponseContent = exports.HorizontalLayoutChatResponseContent = exports.CodeChatResponseContent = exports.CommandChatResponseContent = exports.InformationalChatResponseContent = exports.MarkdownChatResponseContent = exports.TextChatResponseContent = exports.Location = exports.ChatResponseContent = exports.EditableChatRequestModel = exports.ChatRequestModel = exports.ChatSuggestionCallback = exports.ChatChangeEvent = exports.ChangeSetImpl = void 0;
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const markdown_rendering_1 = require("@theia/core/lib/common/markdown-rendering");
const vscode_languageserver_protocol_1 = require("@theia/core/shared/vscode-languageserver-protocol");
const change_set_1 = require("./change-set");
Object.defineProperty(exports, "ChangeSetImpl", { enumerable: true, get: function () { return change_set_1.ChangeSetImpl; } });
const chat_agents_1 = require("./chat-agents");
const debounce = require("@theia/core/shared/lodash.debounce");
var ChatChangeEvent;
(function (ChatChangeEvent) {
    function isChangeSetEvent(event) {
        return event.kind === 'updateChangeSet';
    }
    ChatChangeEvent.isChangeSetEvent = isChangeSetEvent;
})(ChatChangeEvent || (exports.ChatChangeEvent = ChatChangeEvent = {}));
var ChatSuggestionCallback;
(function (ChatSuggestionCallback) {
    function is(candidate) {
        return typeof candidate === 'object' && 'callback' in candidate;
    }
    ChatSuggestionCallback.is = is;
    function containsCallbackLink(candidate) {
        if (!is(candidate)) {
            return false;
        }
        const text = typeof candidate.content === 'string' ? candidate.content : candidate.content.value;
        return text.includes('](_callback)');
    }
    ChatSuggestionCallback.containsCallbackLink = containsCallbackLink;
})(ChatSuggestionCallback || (exports.ChatSuggestionCallback = ChatSuggestionCallback = {}));
var ChatRequestModel;
(function (ChatRequestModel) {
    function is(request) {
        return !!(request &&
            typeof request === 'object' &&
            'id' in request &&
            typeof request.id === 'string' &&
            'session' in request &&
            'request' in request &&
            'response' in request &&
            'message' in request);
    }
    ChatRequestModel.is = is;
    function isInProgress(request) {
        if (!request) {
            return false;
        }
        const response = request.response;
        return !(response.isComplete ||
            response.isCanceled ||
            response.isError);
    }
    ChatRequestModel.isInProgress = isInProgress;
})(ChatRequestModel || (exports.ChatRequestModel = ChatRequestModel = {}));
var EditableChatRequestModel;
(function (EditableChatRequestModel) {
    function is(request) {
        return !!(ChatRequestModel.is(request) &&
            'enableEdit' in request &&
            'cancelEdit' in request &&
            'submitEdit' in request);
    }
    EditableChatRequestModel.is = is;
    function isEditing(request) {
        return is(request) && request.isEditing;
    }
    EditableChatRequestModel.isEditing = isEditing;
})(EditableChatRequestModel || (exports.EditableChatRequestModel = EditableChatRequestModel = {}));
var ChatResponseContent;
(function (ChatResponseContent) {
    function is(obj) {
        return !!(obj &&
            typeof obj === 'object' &&
            'kind' in obj &&
            typeof obj.kind === 'string');
    }
    ChatResponseContent.is = is;
    function hasAsString(obj) {
        return typeof obj.asString === 'function';
    }
    ChatResponseContent.hasAsString = hasAsString;
    function hasDisplayString(obj) {
        return typeof obj.asDisplayString === 'function';
    }
    ChatResponseContent.hasDisplayString = hasDisplayString;
    function hasMerge(obj) {
        return typeof obj.merge === 'function';
    }
    ChatResponseContent.hasMerge = hasMerge;
    function hasToLanguageModelMessage(obj) {
        return typeof obj.toLanguageModelMessage === 'function';
    }
    ChatResponseContent.hasToLanguageModelMessage = hasToLanguageModelMessage;
})(ChatResponseContent || (exports.ChatResponseContent = ChatResponseContent = {}));
var Location;
(function (Location) {
    function is(obj) {
        return !!obj && typeof obj === 'object' &&
            'uri' in obj && obj.uri instanceof core_1.URI &&
            'position' in obj && vscode_languageserver_protocol_1.Position.is(obj.position);
    }
    Location.is = is;
})(Location || (exports.Location = Location = {}));
var TextChatResponseContent;
(function (TextChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'text' &&
            'content' in obj &&
            typeof obj.content === 'string');
    }
    TextChatResponseContent.is = is;
})(TextChatResponseContent || (exports.TextChatResponseContent = TextChatResponseContent = {}));
var MarkdownChatResponseContent;
(function (MarkdownChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'markdownContent' &&
            'content' in obj &&
            markdown_rendering_1.MarkdownString.is(obj.content));
    }
    MarkdownChatResponseContent.is = is;
})(MarkdownChatResponseContent || (exports.MarkdownChatResponseContent = MarkdownChatResponseContent = {}));
var InformationalChatResponseContent;
(function (InformationalChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'informational' &&
            'content' in obj &&
            markdown_rendering_1.MarkdownString.is(obj.content));
    }
    InformationalChatResponseContent.is = is;
})(InformationalChatResponseContent || (exports.InformationalChatResponseContent = InformationalChatResponseContent = {}));
var CommandChatResponseContent;
(function (CommandChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'command' &&
            'command' in obj &&
            core_1.Command.is(obj.command));
    }
    CommandChatResponseContent.is = is;
})(CommandChatResponseContent || (exports.CommandChatResponseContent = CommandChatResponseContent = {}));
var CodeChatResponseContent;
(function (CodeChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'code' &&
            'code' in obj &&
            typeof obj.code === 'string');
    }
    CodeChatResponseContent.is = is;
})(CodeChatResponseContent || (exports.CodeChatResponseContent = CodeChatResponseContent = {}));
var HorizontalLayoutChatResponseContent;
(function (HorizontalLayoutChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'horizontal' &&
            'content' in obj &&
            Array.isArray(obj.content) &&
            obj.content.every(ChatResponseContent.is));
    }
    HorizontalLayoutChatResponseContent.is = is;
})(HorizontalLayoutChatResponseContent || (exports.HorizontalLayoutChatResponseContent = HorizontalLayoutChatResponseContent = {}));
var ToolCallChatResponseContent;
(function (ToolCallChatResponseContent) {
    function is(obj) {
        return ChatResponseContent.is(obj) && obj.kind === 'toolCall';
    }
    ToolCallChatResponseContent.is = is;
})(ToolCallChatResponseContent || (exports.ToolCallChatResponseContent = ToolCallChatResponseContent = {}));
var ErrorChatResponseContent;
(function (ErrorChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'error' &&
            'error' in obj &&
            obj.error instanceof Error);
    }
    ErrorChatResponseContent.is = is;
})(ErrorChatResponseContent || (exports.ErrorChatResponseContent = ErrorChatResponseContent = {}));
var ThinkingChatResponseContent;
(function (ThinkingChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'thinking' &&
            'content' in obj &&
            typeof obj.content === 'string');
    }
    ThinkingChatResponseContent.is = is;
})(ThinkingChatResponseContent || (exports.ThinkingChatResponseContent = ThinkingChatResponseContent = {}));
var ProgressChatResponseContent;
(function (ProgressChatResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'progress' &&
            'message' in obj &&
            typeof obj.message === 'string');
    }
    ProgressChatResponseContent.is = is;
})(ProgressChatResponseContent || (exports.ProgressChatResponseContent = ProgressChatResponseContent = {}));
var QuestionResponseContent;
(function (QuestionResponseContent) {
    function is(obj) {
        return (ChatResponseContent.is(obj) &&
            obj.kind === 'question' &&
            'question' in obj &&
            typeof obj.question === 'string' &&
            'options' in obj &&
            Array.isArray(obj.options) &&
            obj.options.every(option => typeof option === 'object' &&
                option && 'text' in option &&
                typeof option.text === 'string' &&
                ('value' in option ? typeof option.value === 'string' || typeof option.value === 'undefined' : true)) &&
            'handler' in obj &&
            typeof obj.handler === 'function' &&
            'request' in obj &&
            obj.request instanceof MutableChatRequestModel);
    }
    QuestionResponseContent.is = is;
})(QuestionResponseContent || (exports.QuestionResponseContent = QuestionResponseContent = {}));
/**********************
 * Implementations
 **********************/
class MutableChatModel {
    constructor(location = chat_agents_1.ChatAgentLocation.Panel) {
        this.location = location;
        this._onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this.toDispose = new core_1.DisposableCollection();
        this._suggestions = [];
        this._contextManager = new ChatContextManagerImpl();
        // TODO accept serialized data as a parameter to restore a previously saved ChatModel
        this._hierarchy = new ChatRequestHierarchyImpl();
        this._changeSet = new ChatTreeChangeSet(this._hierarchy);
        this.toDispose.push(this._changeSet);
        this._changeSet.onDidChange(this._onDidChangeEmitter.fire, this._onDidChangeEmitter, this.toDispose);
        this._id = (0, core_1.generateUuid)();
        this.toDispose.pushAll([
            this._onDidChangeEmitter,
            this._contextManager.onDidChange(this._onDidChangeEmitter.fire, this._onDidChangeEmitter),
            this._hierarchy.onDidChange(event => {
                this._onDidChangeEmitter.fire({
                    kind: 'changeHierarchyBranch',
                    branch: event.branch,
                });
            }),
        ]);
    }
    get id() {
        return this._id;
    }
    get changeSet() {
        return this._changeSet;
    }
    getBranches() {
        return this._hierarchy.activeBranches();
    }
    getBranch(requestId) {
        return this._hierarchy.findBranch(requestId);
    }
    getRequests() {
        return this._hierarchy.activeRequests();
    }
    getRequest(id) {
        return this.getRequests().find(request => request.id === id);
    }
    get suggestions() {
        return this._suggestions;
    }
    get context() {
        return this._contextManager;
    }
    get settings() {
        return this._settings;
    }
    setSettings(settings) {
        this._settings = settings;
    }
    addRequest(parsedChatRequest, agentId, context = { variables: [] }) {
        const add = this.getTargetForRequestAddition(parsedChatRequest);
        const requestModel = new MutableChatRequestModel(this, parsedChatRequest, agentId, context);
        requestModel.onDidChange(event => {
            if (!ChatChangeEvent.isChangeSetEvent(event)) {
                this._onDidChangeEmitter.fire(event);
            }
        }, this, this.toDispose);
        add(requestModel);
        this._changeSet.registerRequest(requestModel);
        this._onDidChangeEmitter.fire({
            kind: 'addRequest',
            request: requestModel,
        });
        return requestModel;
    }
    getTargetForRequestAddition(request) {
        const requestId = request.request.referencedRequestId;
        const branch = requestId !== undefined && this._hierarchy.findBranch(requestId);
        if (requestId !== undefined && !branch) {
            throw new Error(`Cannot find branch for requestId: ${requestId}`);
        }
        return branch ? branch.add.bind(branch) : this._hierarchy.append.bind(this._hierarchy);
    }
    setSuggestions(suggestions) {
        this._suggestions = Object.freeze(suggestions);
        this._onDidChangeEmitter.fire({
            kind: 'suggestionsChanged',
            suggestions
        });
    }
    isEmpty() {
        return this.getRequests().length === 0;
    }
    dispose() {
        this.toDispose.dispose();
    }
}
exports.MutableChatModel = MutableChatModel;
class ChatTreeChangeSet {
    get onDidChange() {
        return this.onDidChangeEmitter.event;
    }
    constructor(hierarchy) {
        this.hierarchy = hierarchy;
        this.onDidChangeEmitter = new core_1.Emitter();
        this.toDispose = new core_1.DisposableCollection();
        this.currentElements = [];
        this.handleChangeSetChange = debounce(this.doHandleChangeSetChange.bind(this), 100, { leading: false, trailing: true });
        this.toDisposeOnRequestAdded = new core_1.DisposableCollection();
        hierarchy.onDidChange(this.handleChangeSetChange, this, this.toDispose);
    }
    get title() {
        var _a, _b;
        return (_b = (_a = this.getCurrentChangeSet()) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : '';
    }
    removeElements(...uris) {
        return this.getMutableChangeSet().removeElements(...uris);
    }
    addElements(...elements) {
        return this.getMutableChangeSet().addElements(...elements);
    }
    setElements(...elements) {
        this.getMutableChangeSet().setElements(...elements);
    }
    setTitle(title) {
        this.getMutableChangeSet().setTitle(title);
    }
    getElementByURI(uri) {
        return this.currentElements.find(candidate => candidate.uri.isEqual(uri));
    }
    doHandleChangeSetChange() {
        var _a;
        const newElements = this.computeChangeSetElements();
        this.handleElementChange(newElements);
        this.currentElements = newElements;
        this.onDidChangeEmitter.fire({ kind: 'updateChangeSet', elements: this.currentElements, title: (_a = this.getCurrentChangeSet()) === null || _a === void 0 ? void 0 : _a.title });
    }
    getElements() {
        return this.currentElements;
    }
    computeChangeSetElements() {
        const allElements = change_set_1.ChangeSetImpl.combine((function* (requests) {
            for (let i = requests.length - 1; i >= 0; i--) {
                const changeSet = requests[i].changeSet;
                if (changeSet) {
                    yield changeSet;
                }
            }
        })(this.hierarchy.activeRequests()));
        return core_1.ArrayUtils.coalesce(Array.from(allElements.values()));
    }
    handleElementChange(newElements) {
        var _a, _b;
        const old = new Set(this.currentElements);
        for (const element of newElements) {
            if (!old.delete(element)) {
                (_a = element.onShow) === null || _a === void 0 ? void 0 : _a.call(element);
            }
        }
        for (const element of old) {
            (_b = element.onHide) === null || _b === void 0 ? void 0 : _b.call(element);
        }
    }
    registerRequest(request) {
        request.onDidChange(event => event.kind === 'updateChangeSet' && this.handleChangeSetChange(), this, this.toDispose);
        if (this.localChangeSet) {
            request.changeSet = this.localChangeSet;
            this.localChangeSet = undefined;
        }
        this.toDisposeOnRequestAdded.dispose();
    }
    getMutableChangeSet() {
        const tipRequest = this.hierarchy.activeRequests().at(-1);
        const existingChangeSet = tipRequest === null || tipRequest === void 0 ? void 0 : tipRequest.changeSet;
        if (existingChangeSet) {
            return existingChangeSet;
        }
        if (this.localChangeSet && tipRequest) {
            throw new Error('Non-empty chat model retained reference to own change set. This is unexpected!');
        }
        if (this.localChangeSet) {
            return this.localChangeSet;
        }
        const newChangeSet = new change_set_1.ChangeSetImpl();
        if (tipRequest) {
            tipRequest.changeSet = newChangeSet;
        }
        else {
            this.localChangeSet = newChangeSet;
            newChangeSet.onDidChange(this.handleChangeSetChange, this, this.toDisposeOnRequestAdded);
        }
        return newChangeSet;
    }
    getCurrentChangeSet() {
        var _a;
        const holder = this.getBranchParent(candidate => !!candidate.get().changeSet);
        return (_a = holder === null || holder === void 0 ? void 0 : holder.get().changeSet) !== null && _a !== void 0 ? _a : this.localChangeSet;
    }
    /** Returns the lowest node among active nodes that satisfies {@link criterion} */
    getBranchParent(criterion) {
        const branches = this.hierarchy.activeBranches();
        for (let i = branches.length - 1; i >= 0; i--) {
            const branch = branches[i];
            if (criterion === null || criterion === void 0 ? void 0 : criterion(branch)) {
                return branch;
            }
        }
        return branches.at(0);
    }
    dispose() {
        this.toDispose.dispose();
    }
}
exports.ChatTreeChangeSet = ChatTreeChangeSet;
class ChatRequestHierarchyImpl {
    constructor() {
        this.onDidChangeActiveBranchEmitter = new core_1.Emitter();
        this.onDidChange = this.onDidChangeActiveBranchEmitter.event;
        this.branch = new ChatRequestHierarchyBranchImpl(this);
    }
    append(request) {
        const branches = this.activeBranches();
        if (branches.length === 0) {
            this.branch.add(request);
            return this.branch;
        }
        return branches.at(-1).continue(request);
    }
    activeRequests() {
        return this.activeBranches().map(h => h.get());
    }
    activeBranches() {
        return Array.from(this.iterateBranches());
    }
    *iterateBranches() {
        let current = this.branch;
        while (current) {
            if (current.items.length > 0) {
                yield current;
                current = current.next();
            }
            else {
                break;
            }
        }
    }
    findRequest(requestId) {
        var _a;
        const branch = this.findInBranch(this.branch, requestId);
        return (_a = branch === null || branch === void 0 ? void 0 : branch.items.find(item => item.element.id === requestId)) === null || _a === void 0 ? void 0 : _a.element;
    }
    findBranch(requestId) {
        return this.findInBranch(this.branch, requestId);
    }
    findInBranch(branch, requestId) {
        for (const item of branch.items) {
            if (item.element.id === requestId) {
                return branch;
            }
        }
        for (const item of branch.items) {
            if (item.next) {
                const found = this.findInBranch(item.next, requestId);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    notifyChange(event) {
        this.onDidChangeActiveBranchEmitter.fire(event);
    }
    dispose() {
        this.onDidChangeActiveBranchEmitter.dispose();
        this.branch.dispose();
    }
}
exports.ChatRequestHierarchyImpl = ChatRequestHierarchyImpl;
class ChatRequestHierarchyBranchImpl {
    constructor(hierarchy, previous, items = [], _activeIndex = -1) {
        this.hierarchy = hierarchy;
        this.previous = previous;
        this.items = items;
        this._activeIndex = _activeIndex;
        this.id = (0, core_1.generateUuid)();
    }
    get activeBranchIndex() {
        return this._activeIndex;
    }
    set activeBranchIndex(value) {
        this._activeIndex = value;
        this.hierarchy.notifyChange({
            branch: this,
            item: this.items[this._activeIndex]
        });
    }
    next() {
        var _a;
        return (_a = this.items[this.activeBranchIndex]) === null || _a === void 0 ? void 0 : _a.next;
    }
    get() {
        return this.items[this.activeBranchIndex].element;
    }
    add(request) {
        const branch = {
            element: request
        };
        this.items.push(branch);
        this.activeBranchIndex = this.items.length - 1;
    }
    remove(request) {
        const requestId = typeof request === 'string' ? request : request.id;
        const index = this.items.findIndex(version => version.element.id === requestId);
        if (index !== -1) {
            this.items.splice(index, 1);
            if (this.activeBranchIndex >= index) {
                this.activeBranchIndex--;
            }
        }
    }
    continue(request) {
        if (this.items.length === 0) {
            this.add(request);
            return this;
        }
        const item = this.items[this.activeBranchIndex];
        if (item) {
            const next = new ChatRequestHierarchyBranchImpl(this.hierarchy, this, [{ element: request }], 0);
            this.items[this.activeBranchIndex] = {
                ...item,
                next
            };
            return next;
        }
        throw new Error(`No current branch to continue from. Active Index: ${this.activeBranchIndex}`);
    }
    enable(request) {
        this.activeBranchIndex = this.items.findIndex(pred => pred.element.id === request.id);
        return this.items[this.activeBranchIndex];
    }
    enablePrevious() {
        if (this.activeBranchIndex > 0) {
            this.activeBranchIndex--;
            return this.items[this.activeBranchIndex];
        }
        return this.items[0];
    }
    enableNext() {
        if (this.activeBranchIndex < this.items.length - 1) {
            this.activeBranchIndex++;
            return this.items[this.activeBranchIndex];
        }
        return this.items[this.activeBranchIndex];
    }
    succeedingBranches() {
        const branches = [];
        let current = this;
        while (current !== undefined) {
            branches.push(current);
            current = current.next();
        }
        return branches;
    }
    dispose() {
        if (core_1.Disposable.is(this.get())) {
            this.items.forEach(({ element }) => core_1.Disposable.is(element) && element.dispose());
        }
        this.items.length = 0;
    }
}
exports.ChatRequestHierarchyBranchImpl = ChatRequestHierarchyBranchImpl;
class ChatContextManagerImpl {
    get onDidChange() {
        return this.onDidChangeEmitter.event;
    }
    constructor(context) {
        this.variables = new Array();
        this.onDidChangeEmitter = new core_1.Emitter();
        if (context) {
            this.variables.push(...context.variables.map(ai_core_1.AIVariableResolutionRequest.fromResolved));
        }
    }
    getVariables() {
        const result = this.variables.slice();
        Object.freeze(result);
        return result;
    }
    addVariables(...variables) {
        let modified = false;
        variables.forEach(variable => {
            if (this.variables.some(existing => existing.variable.id === variable.variable.id && existing.arg === variable.arg)) {
                return;
            }
            this.variables.push(variable);
            modified = true;
        });
        if (modified) {
            this.onDidChangeEmitter.fire({ kind: 'addVariable' });
        }
    }
    deleteVariables(...indices) {
        const toDelete = indices.filter(candidate => candidate <= this.variables.length).sort((left, right) => right - left);
        if (toDelete.length) {
            toDelete.forEach(index => {
                this.variables.splice(index, 1);
            });
            this.onDidChangeEmitter.fire({ kind: 'removeVariable' });
        }
    }
    setVariables(variables) {
        this.variables.length = 0;
        variables.forEach(variable => {
            if (this.variables.some(existing => existing.variable.id === variable.variable.id && existing.arg === variable.arg)) {
                return;
            }
            this.variables.push(variable);
        });
        this.onDidChangeEmitter.fire({ kind: 'setVariables' });
    }
    clear() {
        if (this.variables.length) {
            this.variables.length = 0;
            this.onDidChangeEmitter.fire({ kind: 'removeVariable' });
        }
    }
}
exports.ChatContextManagerImpl = ChatContextManagerImpl;
class MutableChatRequestModel {
    constructor(session, message, agentId, context = { variables: [] }, data = {}) {
        this.message = message;
        this._onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this._isEditing = false;
        this.toDispose = new core_1.DisposableCollection();
        // TODO accept serialized data as a parameter to restore a previously saved ChatRequestModel
        this._request = message.request;
        this._id = (0, core_1.generateUuid)();
        this._session = session;
        this._response = new MutableChatResponseModel(this._id, agentId);
        this._context = context;
        this._agentId = agentId;
        this._data = data;
        this.editContextManager = new ChatContextManagerImpl(context);
        this.editContextManager.onDidChange(this._onDidChangeEmitter.fire, this._onDidChangeEmitter, this.toDispose);
        this.toDispose.push(this._onDidChangeEmitter);
    }
    get changeSet() {
        return this._changeSet;
    }
    set changeSet(changeSet) {
        var _a;
        (_a = this._changeSet) === null || _a === void 0 ? void 0 : _a.dispose();
        this._changeSet = changeSet;
        this.toDispose.push(changeSet);
        changeSet.onDidChange(() => this._onDidChangeEmitter.fire({ kind: 'updateChangeSet', elements: changeSet.getElements(), title: changeSet.title }), this, this.toDispose);
        this._onDidChangeEmitter.fire({ kind: 'updateChangeSet', elements: changeSet.getElements(), title: changeSet.title });
    }
    get isEditing() {
        return this._isEditing;
    }
    enableEdit() {
        this._isEditing = true;
        this.emitEditRequest(this);
    }
    get data() {
        return this._data;
    }
    addData(key, value) {
        this._data[key] = value;
    }
    getDataByKey(key) {
        return this._data[key];
    }
    removeData(key) {
        delete this._data[key];
    }
    get id() {
        return this._id;
    }
    get session() {
        return this._session;
    }
    get request() {
        return this._request;
    }
    get response() {
        return this._response;
    }
    get context() {
        return this._context;
    }
    get agentId() {
        return this._agentId;
    }
    cancelEdit() {
        if (this.isEditing) {
            this._isEditing = false;
            this.emitCancelEdit(this);
            this.clearEditContext();
        }
    }
    submitEdit(newRequest) {
        var _a;
        if (this.isEditing) {
            this._isEditing = false;
            const variables = (_a = this.editContextManager.getVariables()) !== null && _a !== void 0 ? _a : [];
            this.emitSubmitEdit(this, {
                ...newRequest,
                referencedRequestId: this.id,
                variables
            });
            this.clearEditContext();
        }
    }
    cancel() {
        this.response.cancel();
    }
    dispose() {
        this.toDispose.dispose();
    }
    clearEditContext() {
        this.editContextManager.setVariables(this.context.variables.map(ai_core_1.AIVariableResolutionRequest.fromResolved));
    }
    emitEditRequest(request) {
        const branch = this.session.getBranch(request.id);
        if (!branch) {
            throw new Error(`Cannot find hierarchy for requestId: ${request.id}`);
        }
        this._onDidChangeEmitter.fire({
            kind: 'enableEdit',
            request,
            branch,
        });
    }
    emitCancelEdit(request) {
        const branch = this.session.getBranch(request.id);
        if (!branch) {
            throw new Error(`Cannot find branch for requestId: ${request.id}`);
        }
        this._onDidChangeEmitter.fire({
            kind: 'cancelEdit',
            request,
            branch,
        });
    }
    emitSubmitEdit(request, newRequest) {
        const branch = this.session.getBranch(request.id);
        if (!branch) {
            throw new Error(`Cannot find branch for requestId: ${request.id}`);
        }
        this._onDidChangeEmitter.fire({
            kind: 'submitEdit',
            request,
            branch,
            newRequest
        });
    }
}
exports.MutableChatRequestModel = MutableChatRequestModel;
class ErrorChatResponseContentImpl {
    constructor(error) {
        this.kind = 'error';
        this._error = error;
    }
    get error() {
        return this._error;
    }
    asString() {
        return undefined;
    }
}
exports.ErrorChatResponseContentImpl = ErrorChatResponseContentImpl;
class TextChatResponseContentImpl {
    constructor(content) {
        this.kind = 'text';
        this._content = content;
    }
    get content() {
        return this._content;
    }
    asString() {
        return this._content;
    }
    asDisplayString() {
        return this.asString();
    }
    merge(nextChatResponseContent) {
        this._content += nextChatResponseContent.content;
        return true;
    }
    toLanguageModelMessage() {
        return {
            actor: 'ai',
            type: 'text',
            text: this.content
        };
    }
}
exports.TextChatResponseContentImpl = TextChatResponseContentImpl;
class ThinkingChatResponseContentImpl {
    constructor(content, signature) {
        this.kind = 'thinking';
        this._content = content;
        this._signature = signature;
    }
    get content() {
        return this._content;
    }
    get signature() {
        return this._signature;
    }
    asString() {
        return JSON.stringify({
            type: 'thinking',
            thinking: this.content,
            signature: this.signature
        });
    }
    asDisplayString() {
        return `<Thinking>${this.content}</Thinking>`;
    }
    merge(nextChatResponseContent) {
        this._content += nextChatResponseContent.content;
        this._signature += nextChatResponseContent.signature;
        return true;
    }
    toLanguageModelMessage() {
        return {
            actor: 'ai',
            type: 'thinking',
            thinking: this.content,
            signature: this.signature
        };
    }
}
exports.ThinkingChatResponseContentImpl = ThinkingChatResponseContentImpl;
class MarkdownChatResponseContentImpl {
    constructor(content) {
        this.kind = 'markdownContent';
        this._content = new markdown_rendering_1.MarkdownStringImpl();
        this._content.appendMarkdown(content);
    }
    get content() {
        return this._content;
    }
    asString() {
        return this._content.value;
    }
    asDisplayString() {
        return this.asString();
    }
    merge(nextChatResponseContent) {
        this._content.appendMarkdown(nextChatResponseContent.content.value);
        return true;
    }
    toLanguageModelMessage() {
        return {
            actor: 'ai',
            type: 'text',
            text: this.content.value
        };
    }
}
exports.MarkdownChatResponseContentImpl = MarkdownChatResponseContentImpl;
class InformationalChatResponseContentImpl {
    constructor(content) {
        this.kind = 'informational';
        this._content = new markdown_rendering_1.MarkdownStringImpl(content);
    }
    get content() {
        return this._content;
    }
    asString() {
        return undefined;
    }
    merge(nextChatResponseContent) {
        this._content.appendMarkdown(nextChatResponseContent.content.value);
        return true;
    }
}
exports.InformationalChatResponseContentImpl = InformationalChatResponseContentImpl;
class CodeChatResponseContentImpl {
    constructor(code, language, location) {
        this.kind = 'code';
        this._code = code;
        this._language = language;
        this._location = location;
    }
    get code() {
        return this._code;
    }
    get language() {
        return this._language;
    }
    get location() {
        return this._location;
    }
    asString() {
        var _a;
        return `\`\`\`${(_a = this._language) !== null && _a !== void 0 ? _a : ''}\n${this._code}\n\`\`\``;
    }
    merge(nextChatResponseContent) {
        this._code += `${nextChatResponseContent.code}`;
        return true;
    }
}
exports.CodeChatResponseContentImpl = CodeChatResponseContentImpl;
class ToolCallChatResponseContentImpl {
    constructor(id, name, arg_string, finished, result) {
        this.kind = 'toolCall';
        this._id = id;
        this._name = name;
        this._arguments = arg_string;
        this._finished = finished;
        this._result = result;
        // Initialize the confirmation promise immediately
        this._confirmed = this.createConfirmationPromise();
    }
    get id() {
        return this._id;
    }
    get name() {
        return this._name;
    }
    get arguments() {
        return this._arguments;
    }
    get finished() {
        return this._finished === undefined ? false : this._finished;
    }
    get result() {
        return this._result;
    }
    get confirmed() {
        return this._confirmed;
    }
    /**
     * Create a confirmation promise that can be resolved/rejected later
     */
    createConfirmationPromise() {
        // The promise is always created, just ensure we have resolution handlers
        if (!this._confirmationResolver) {
            this._confirmed = new Promise((resolve, reject) => {
                this._confirmationResolver = resolve;
                this._confirmationRejecter = reject;
            });
        }
        return this._confirmed;
    }
    /**
     * Confirm the tool execution
     */
    confirm() {
        if (this._confirmationResolver) {
            this._confirmationResolver(true);
        }
    }
    /**
     * Deny the tool execution
     */
    deny() {
        if (this._confirmationResolver) {
            this._confirmationResolver(false);
            this._finished = true;
            this._result = 'Tool execution denied by user';
        }
    }
    /**
     * Cancel the confirmation (reject the promise)
     */
    cancelConfirmation(reason) {
        if (this._confirmationRejecter) {
            this._confirmationRejecter(reason);
        }
    }
    asString() {
        return '';
    }
    asDisplayString() {
        var _a;
        return `Tool call: ${this._name}(${(_a = this._arguments) !== null && _a !== void 0 ? _a : ''})`;
    }
    merge(nextChatResponseContent) {
        if (nextChatResponseContent.id === this.id) {
            this._finished = nextChatResponseContent.finished;
            this._result = nextChatResponseContent.result;
            const args = nextChatResponseContent.arguments;
            this._arguments = (args && args.length > 0) ? args : this._arguments;
            // Don't merge confirmation promises - they should be managed separately
            return true;
        }
        if (nextChatResponseContent.name !== undefined) {
            return false;
        }
        if (nextChatResponseContent.arguments === undefined) {
            return false;
        }
        this._arguments += `${nextChatResponseContent.arguments}`;
        return true;
    }
    toLanguageModelMessage() {
        var _a, _b, _c, _d;
        return [{
                actor: 'ai',
                type: 'tool_use',
                id: (_a = this.id) !== null && _a !== void 0 ? _a : '',
                input: this.arguments && this.arguments.length !== 0 ? JSON.parse(this.arguments) : {},
                name: (_b = this.name) !== null && _b !== void 0 ? _b : ''
            }, {
                actor: 'user',
                type: 'tool_result',
                tool_use_id: (_c = this.id) !== null && _c !== void 0 ? _c : '',
                content: this.result,
                name: (_d = this.name) !== null && _d !== void 0 ? _d : ''
            }];
    }
}
exports.ToolCallChatResponseContentImpl = ToolCallChatResponseContentImpl;
exports.COMMAND_CHAT_RESPONSE_COMMAND = {
    id: 'ai-chat.command-chat-response.generic'
};
class CommandChatResponseContentImpl {
    constructor(command, customCallback, args) {
        this.command = command;
        this.customCallback = customCallback;
        this.args = args;
        this.kind = 'command';
    }
    get arguments() {
        var _a;
        return (_a = this.args) !== null && _a !== void 0 ? _a : [];
    }
    asString() {
        var _a, _b;
        return ((_a = this.command) === null || _a === void 0 ? void 0 : _a.id) || ((_b = this.customCallback) === null || _b === void 0 ? void 0 : _b.label) || 'command';
    }
}
exports.CommandChatResponseContentImpl = CommandChatResponseContentImpl;
class HorizontalLayoutChatResponseContentImpl {
    constructor(content = []) {
        this.kind = 'horizontal';
        this._content = content;
    }
    get content() {
        return this._content;
    }
    asString() {
        return this._content.map(child => child.asString && child.asString()).join(' ');
    }
    asDisplayString() {
        return this.asString();
    }
    merge(nextChatResponseContent) {
        if (HorizontalLayoutChatResponseContent.is(nextChatResponseContent)) {
            this._content.push(...nextChatResponseContent.content);
        }
        else {
            this._content.push(nextChatResponseContent);
        }
        return true;
    }
}
exports.HorizontalLayoutChatResponseContentImpl = HorizontalLayoutChatResponseContentImpl;
/**
 * Default implementation for the QuestionResponseContent.
 */
class QuestionResponseContentImpl {
    constructor(question, options, request, handler) {
        this.question = question;
        this.options = options;
        this.request = request;
        this.handler = handler;
        this.kind = 'question';
    }
    set selectedOption(option) {
        this._selectedOption = option;
        this.request.response.response.responseContentChanged();
    }
    get selectedOption() {
        return this._selectedOption;
    }
    asString() {
        var _a;
        return `Question: ${this.question}
${this.selectedOption ? `Answer: ${(_a = this.selectedOption) === null || _a === void 0 ? void 0 : _a.text}` : 'No answer'}`;
    }
    merge() {
        return false;
    }
}
exports.QuestionResponseContentImpl = QuestionResponseContentImpl;
class ChatResponseImpl {
    constructor() {
        this._onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        // TODO accept serialized data as a parameter to restore a previously saved ChatResponse
        this._content = [];
    }
    get content() {
        return this._content;
    }
    clearContent() {
        this._content = [];
        this._updateResponseRepresentation();
        this._onDidChangeEmitter.fire();
    }
    addContents(contents) {
        contents.forEach(c => this.doAddContent(c));
        this._onDidChangeEmitter.fire();
    }
    addContent(nextContent) {
        // TODO: Support more complex merges affecting different content than the last, e.g. via some kind of ProcessorRegistry
        // TODO: Support more of the built-in VS Code behavior, see
        //   https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatModel.ts#L188-L244
        this.doAddContent(nextContent);
        this._onDidChangeEmitter.fire();
    }
    doAddContent(nextContent) {
        var _a;
        if (ToolCallChatResponseContent.is(nextContent) && nextContent.id !== undefined) {
            const fittingTool = this._content.find(c => ToolCallChatResponseContent.is(c) && c.id === nextContent.id);
            if (fittingTool !== undefined) {
                (_a = fittingTool.merge) === null || _a === void 0 ? void 0 : _a.call(fittingTool, nextContent);
            }
            else {
                this._content.push(nextContent);
            }
        }
        else {
            const lastElement = this._content.length > 0
                ? this._content[this._content.length - 1]
                : undefined;
            if ((lastElement === null || lastElement === void 0 ? void 0 : lastElement.kind) === nextContent.kind && ChatResponseContent.hasMerge(lastElement)) {
                const mergeSuccess = lastElement.merge(nextContent);
                if (!mergeSuccess) {
                    this._content.push(nextContent);
                }
            }
            else {
                this._content.push(nextContent);
            }
        }
        this._updateResponseRepresentation();
    }
    responseContentChanged() {
        this._updateResponseRepresentation();
        this._onDidChangeEmitter.fire();
    }
    _updateResponseRepresentation() {
        this._responseRepresentation = this.responseRepresentationsToString(this._content, 'asString');
        this._responseRepresentationForDisplay = this.responseRepresentationsToString(this.content, 'asDisplayString');
    }
    responseRepresentationsToString(content, collect) {
        return content
            .map(responseContent => {
            if (collect === 'asDisplayString') {
                if (ChatResponseContent.hasDisplayString(responseContent)) {
                    return responseContent.asDisplayString();
                }
            }
            if (ChatResponseContent.hasAsString(responseContent)) {
                return responseContent.asString();
            }
            if (TextChatResponseContent.is(responseContent)) {
                return responseContent.content;
            }
            console.warn('Was not able to map responseContent to a string', responseContent);
            return undefined;
        })
            .filter(text => (text !== undefined && text !== ''))
            .join('\n\n');
    }
    asString() {
        return this._responseRepresentation;
    }
    asDisplayString() {
        return this._responseRepresentationForDisplay;
    }
}
class MutableChatResponseModel {
    constructor(requestId, agentId) {
        this._onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this.data = {};
        // TODO accept serialized data as a parameter to restore a previously saved ChatResponseModel
        this._requestId = requestId;
        this._id = (0, core_1.generateUuid)();
        this._progressMessages = [];
        const response = new ChatResponseImpl();
        response.onDidChange(() => this._onDidChangeEmitter.fire());
        this._response = response;
        this._isComplete = false;
        this._isWaitingForInput = false;
        this._agentId = agentId;
        this._cancellationToken = new core_1.CancellationTokenSource();
    }
    get id() {
        return this._id;
    }
    get requestId() {
        return this._requestId;
    }
    get progressMessages() {
        return this._progressMessages;
    }
    addProgressMessage(message) {
        var _a, _b, _c;
        const id = (_a = message.id) !== null && _a !== void 0 ? _a : (0, core_1.generateUuid)();
        const existingMessage = this.getProgressMessage(id);
        if (existingMessage) {
            this.updateProgressMessage({ id, ...message });
            return existingMessage;
        }
        const newMessage = {
            kind: 'progressMessage',
            id,
            status: (_b = message.status) !== null && _b !== void 0 ? _b : 'inProgress',
            show: (_c = message.show) !== null && _c !== void 0 ? _c : 'untilFirstContent',
            ...message,
        };
        this._progressMessages.push(newMessage);
        this._onDidChangeEmitter.fire();
        return newMessage;
    }
    getProgressMessage(id) {
        return this._progressMessages.find(message => message.id === id);
    }
    updateProgressMessage(message) {
        const progressMessage = this.getProgressMessage(message.id);
        if (progressMessage) {
            Object.assign(progressMessage, message);
            this._onDidChangeEmitter.fire();
        }
    }
    get response() {
        return this._response;
    }
    get isComplete() {
        return this._isComplete;
    }
    get isCanceled() {
        return this._cancellationToken.token.isCancellationRequested;
    }
    get isWaitingForInput() {
        return this._isWaitingForInput;
    }
    get agentId() {
        return this._agentId;
    }
    overrideAgentId(agentId) {
        this._agentId = agentId;
    }
    complete() {
        this._isComplete = true;
        this._isWaitingForInput = false;
        this._onDidChangeEmitter.fire();
    }
    cancel() {
        this._cancellationToken.cancel();
        this._isComplete = true;
        this._isWaitingForInput = false;
        // Ensure any pending tool confirmations are canceled when the chat is canceled
        try {
            const content = this._response.content;
            for (const item of content) {
                if (ToolCallChatResponseContent.is(item)) {
                    item.cancelConfirmation(new Error('Chat request canceled'));
                }
            }
        }
        catch (e) {
            // best-effort: ignore errors while canceling confirmations
        }
        this._onDidChangeEmitter.fire();
    }
    get cancellationToken() {
        return this._cancellationToken.token;
    }
    waitForInput() {
        this._isWaitingForInput = true;
        this._onDidChangeEmitter.fire();
    }
    stopWaitingForInput() {
        this._isWaitingForInput = false;
        this._onDidChangeEmitter.fire();
    }
    error(error) {
        this._isComplete = true;
        this._isWaitingForInput = false;
        this._isError = true;
        this._errorObject = error;
        this._onDidChangeEmitter.fire();
    }
    get errorObject() {
        return this._errorObject;
    }
    get isError() {
        return this._isError;
    }
}
exports.MutableChatResponseModel = MutableChatResponseModel;
class ErrorChatResponseModel extends MutableChatResponseModel {
    constructor(requestId, error, agentId) {
        super(requestId, agentId);
        this.error(error);
    }
}
exports.ErrorChatResponseModel = ErrorChatResponseModel;
class ProgressChatResponseContentImpl {
    constructor(message) {
        this.kind = 'progress';
        this._message = message;
    }
    get message() {
        return this._message;
    }
    asString() {
        return JSON.stringify({
            type: 'progress',
            message: this.message
        });
    }
    asDisplayString() {
        return `<Progress>${this.message}</Progress>`;
    }
    merge(nextChatResponseContent) {
        this._message = nextChatResponseContent.message;
        return true;
    }
    toLanguageModelMessage() {
        return {
            actor: 'ai',
            type: 'text',
            text: this.message
        };
    }
}
exports.ProgressChatResponseContentImpl = ProgressChatResponseContentImpl;
//# sourceMappingURL=chat-model.js.map