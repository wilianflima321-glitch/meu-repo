"use strict";
var ChatViewWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewWidget = void 0;
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
const core_1 = require("@theia/core");
const ai_chat_1 = require("@theia/ai-chat");
const browser_1 = require("@theia/core/lib/browser");
const nls_1 = require("@theia/core/lib/common/nls");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_input_widget_1 = require("./chat-input-widget");
const chat_view_tree_widget_1 = require("./chat-tree-view/chat-view-tree-widget");
const ai_activation_service_1 = require("@theia/ai-core/lib/browser/ai-activation-service");
const progress_bar_factory_1 = require("@theia/core/lib/browser/progress-bar-factory");
const browser_2 = require("@theia/ai-core/lib/browser");
let ChatViewWidget = ChatViewWidget_1 = class ChatViewWidget extends browser_1.BaseWidget {
    constructor(treeWidget, inputWidget) {
        super();
        this.treeWidget = treeWidget;
        this.inputWidget = inputWidget;
        this._state = { locked: false, temporaryLocked: false };
        this.onStateChangedEmitter = new core_1.Emitter();
        this.isExtractable = true;
        this.id = ChatViewWidget_1.ID;
        this.title.label = ChatViewWidget_1.LABEL;
        this.title.caption = ChatViewWidget_1.LABEL;
        this.title.iconClass = (0, browser_1.codicon)('comment-discussion');
        this.title.closable = true;
        this.node.classList.add('chat-view-widget');
        this.update();
    }
    init() {
        this.toDispose.pushAll([
            this.treeWidget,
            this.inputWidget,
            this.onStateChanged(newState => {
                const shouldScrollToEnd = !newState.locked && !newState.temporaryLocked;
                this.treeWidget.shouldScrollToEnd = shouldScrollToEnd;
                this.update();
            })
        ]);
        const layout = this.layout = new browser_1.PanelLayout();
        this.treeWidget.node.classList.add('chat-tree-view-widget');
        layout.addWidget(this.treeWidget);
        this.inputWidget.node.classList.add('chat-input-widget');
        layout.addWidget(this.inputWidget);
        this.chatSession = this.chatService.createSession();
        this.inputWidget.onQuery = this.onQuery.bind(this);
        this.inputWidget.onUnpin = this.onUnpin.bind(this);
        this.inputWidget.onCancel = this.onCancel.bind(this);
        this.inputWidget.chatModel = this.chatSession.model;
        this.inputWidget.pinnedAgent = this.chatSession.pinnedAgent;
        this.inputWidget.onDeleteChangeSet = this.onDeleteChangeSet.bind(this);
        this.inputWidget.onDeleteChangeSetElement = this.onDeleteChangeSetElement.bind(this);
        this.treeWidget.trackChatModel(this.chatSession.model);
        this.treeWidget.onScrollLockChange = this.onScrollLockChange.bind(this);
        this.initListeners();
        this.inputWidget.setEnabled(this.activationService.isActive);
        this.treeWidget.setEnabled(this.activationService.isActive);
        this.activationService.onDidChangeActiveStatus(change => {
            this.treeWidget.setEnabled(change);
            this.inputWidget.setEnabled(change);
            this.update();
        });
        this.toDispose.push(this.progressBarFactory({ container: this.node, insertMode: 'prepend', locationId: 'ai-chat' }));
    }
    initListeners() {
        this.toDispose.pushAll([
            this.chatService.onSessionEvent(event => {
                if (!(0, ai_chat_1.isActiveSessionChangedEvent)(event)) {
                    return;
                }
                const session = event.sessionId ? this.chatService.getSession(event.sessionId) : this.chatService.createSession();
                if (session) {
                    this.chatSession = session;
                    this.treeWidget.trackChatModel(this.chatSession.model);
                    this.inputWidget.chatModel = this.chatSession.model;
                    this.inputWidget.pinnedAgent = this.chatSession.pinnedAgent;
                }
                else {
                    console.warn(`Session with ${event.sessionId} not found.`);
                }
            }),
            // The chat view needs to handle the submission of the edit request
            this.treeWidget.onDidSubmitEdit(request => {
                this.onQuery(request);
            })
        ]);
    }
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        this.inputWidget.activate();
    }
    storeState() {
        return this.state;
    }
    restoreState(oldState) {
        const copy = (0, core_1.deepClone)(this.state);
        if (oldState.locked) {
            copy.locked = oldState.locked;
        }
        // Don't restore temporary lock state as it should reset on restart
        copy.temporaryLocked = false;
        this.state = copy;
    }
    get state() {
        return this._state;
    }
    set state(state) {
        this._state = state;
        this.onStateChangedEmitter.fire(this._state);
    }
    get onStateChanged() {
        return this.onStateChangedEmitter.event;
    }
    async onQuery(query) {
        const chatRequest = !query ? { text: '' } : typeof query === 'string' ? { text: query } : { ...query };
        if (chatRequest.text.length === 0) {
            return;
        }
        const requestProgress = await this.chatService.sendRequest(this.chatSession.id, chatRequest);
        requestProgress === null || requestProgress === void 0 ? void 0 : requestProgress.responseCompleted.then(responseModel => {
            var _a, _b;
            if (responseModel.isError) {
                this.messageService.error((_b = (_a = responseModel.errorObject) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : nls_1.nls.localize('theia/ai/chat-ui/errorChatInvocation', 'An error occurred during chat service invocation.'));
            }
        }).finally(() => {
            this.inputWidget.pinnedAgent = this.chatSession.pinnedAgent;
        });
        if (!requestProgress) {
            this.messageService.error(`Was not able to send request "${chatRequest.text}" to session ${this.chatSession.id}`);
            return;
        }
        // Tree Widget currently tracks the ChatModel itself. Therefore no notification necessary.
    }
    onUnpin() {
        this.chatSession.pinnedAgent = undefined;
        this.inputWidget.pinnedAgent = this.chatSession.pinnedAgent;
    }
    onCancel(requestModel) {
        this.chatService.cancelRequest(requestModel.session.id, requestModel.id);
    }
    onDeleteChangeSet(sessionId) {
        this.chatService.deleteChangeSet(sessionId);
    }
    onDeleteChangeSetElement(sessionId, uri) {
        this.chatService.deleteChangeSetElement(sessionId, uri);
    }
    onScrollLockChange(temporaryLocked) {
        this.setTemporaryLock(temporaryLocked);
    }
    lock() {
        this.state = { ...(0, core_1.deepClone)(this.state), locked: true, temporaryLocked: false };
    }
    unlock() {
        this.state = { ...(0, core_1.deepClone)(this.state), locked: false, temporaryLocked: false };
    }
    setTemporaryLock(locked) {
        // Only set temporary lock if not permanently locked
        if (!this.state.locked) {
            this.state = { ...(0, core_1.deepClone)(this.state), temporaryLocked: locked };
        }
    }
    get isLocked() {
        return !!this.state.locked;
    }
    addContext(variable) {
        this.inputWidget.addContext(variable);
    }
    setSettings(settings) {
        if (this.chatSession && this.chatSession.model) {
            const model = this.chatSession.model;
            model.setSettings(settings);
        }
    }
    getSettings() {
        return this.chatSession.model.settings;
    }
};
exports.ChatViewWidget = ChatViewWidget;
ChatViewWidget.ID = 'chat-view-widget';
ChatViewWidget.LABEL = nls_1.nls.localize('theia/ai/chat/view/label', 'AI Chat');
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidget.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], ChatViewWidget.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidget.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidget.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_activation_service_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidget.prototype, "activationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.FrontendVariableService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidget.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(progress_bar_factory_1.ProgressBarFactory),
    tslib_1.__metadata("design:type", Function)
], ChatViewWidget.prototype, "progressBarFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChatViewWidget.prototype, "init", null);
exports.ChatViewWidget = ChatViewWidget = ChatViewWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(chat_view_tree_widget_1.ChatViewTreeWidget)),
    tslib_1.__param(1, (0, inversify_1.inject)(chat_input_widget_1.AIChatInputWidget)),
    tslib_1.__metadata("design:paramtypes", [chat_view_tree_widget_1.ChatViewTreeWidget,
        chat_input_widget_1.AIChatInputWidget])
], ChatViewWidget);
//# sourceMappingURL=chat-view-widget.js.map