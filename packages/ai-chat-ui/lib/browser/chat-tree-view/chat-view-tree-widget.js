"use strict";
var ChatViewTreeWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewTreeWidget = exports.ChatWelcomeMessageProvider = exports.isResponseNode = exports.isEditableRequestNode = exports.isRequestNode = void 0;
exports.isEnterKey = isEnterKey;
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
const ai_core_1 = require("@theia/ai-core");
const browser_1 = require("@theia/ai-core/lib/browser");
const core_1 = require("@theia/core");
const browser_2 = require("@theia/core/lib/browser");
const nls_1 = require("@theia/core/lib/common/nls");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const chat_node_toolbar_action_contribution_1 = require("../chat-node-toolbar-action-contribution");
const chat_response_part_renderer_1 = require("../chat-response-part-renderer");
const markdown_part_renderer_1 = require("../chat-response-renderer/markdown-part-renderer");
const chat_progress_message_1 = require("../chat-progress-message");
const chat_view_tree_input_widget_1 = require("./chat-view-tree-input-widget");
const isRequestNode = (node) => 'request' in node;
exports.isRequestNode = isRequestNode;
const isEditableRequestNode = (node) => (0, exports.isRequestNode)(node) && ai_chat_1.EditableChatRequestModel.is(node.request);
exports.isEditableRequestNode = isEditableRequestNode;
const isResponseNode = (node) => 'response' in node;
exports.isResponseNode = isResponseNode;
function isEnterKey(e) {
    var _a;
    return browser_2.Key.ENTER.keyCode === ((_a = browser_2.KeyCode.createKeyCode(e.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode);
}
exports.ChatWelcomeMessageProvider = Symbol('ChatWelcomeMessageProvider');
let ChatViewTreeWidget = ChatViewTreeWidget_1 = class ChatViewTreeWidget extends browser_2.TreeWidget {
    set shouldScrollToEnd(shouldScrollToEnd) {
        this._shouldScrollToEnd = shouldScrollToEnd;
        this.shouldScrollToRow = this._shouldScrollToEnd;
    }
    get shouldScrollToEnd() {
        return this._shouldScrollToEnd;
    }
    constructor(props, model, contextMenuRenderer) {
        super(props, model, contextMenuRenderer);
        this.onDidSubmitEditEmitter = new core_1.Emitter();
        this.onDidSubmitEdit = this.onDidSubmitEditEmitter.event;
        this.chatInputs = new Map();
        this._shouldScrollToEnd = true;
        this.isEnabled = false;
        /** Tracks if we are at the bottom for showing the scroll-to-bottom button. */
        this.atBottom = true;
        /**
         * Track the visibility of the scroll button with debounce logic. Used to prevent flickering when streaming tokens.
         */
        this._showScrollButton = false;
        this.lastScrollTop = 0;
        this.toDisposeOnChatModelChange = new core_1.DisposableCollection();
        this.id = ChatViewTreeWidget_1.ID;
        this.title.closable = false;
        model.root = {
            id: 'ChatTree',
            name: 'ChatRootNode',
            parent: undefined,
            visible: false,
            children: [],
        };
    }
    init() {
        super.init();
        this.id = ChatViewTreeWidget_1.ID + '-treeContainer';
        this.addClass('treeContainer');
        this.toDispose.pushAll([
            this.toDisposeOnChatModelChange,
            this.activationService.onDidChangeActiveStatus(change => {
                this.chatInputs.forEach(widget => {
                    widget.setEnabled(change);
                });
                this.update();
            }),
            this.onScroll(scrollEvent => {
                this.handleScrollEvent(scrollEvent);
            })
        ]);
        // Initialize lastScrollTop with current scroll position
        this.lastScrollTop = this.getCurrentScrollTop(undefined);
    }
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.update();
    }
    handleScrollEvent(scrollEvent) {
        const currentScrollTop = this.getCurrentScrollTop(scrollEvent);
        const isScrollingUp = currentScrollTop < this.lastScrollTop;
        const isScrollingDown = currentScrollTop > this.lastScrollTop;
        const isAtBottom = this.isScrolledToBottom();
        const isAtAbsoluteBottom = this.isAtAbsoluteBottom();
        // Asymmetric threshold logic to prevent jitter:
        if (this.shouldScrollToEnd && isScrollingUp) {
            if (!isAtAbsoluteBottom) {
                this.setTemporaryScrollLock(true);
            }
        }
        else if (!this.shouldScrollToEnd && isAtBottom && isScrollingDown) {
            this.setTemporaryScrollLock(false);
        }
        this.updateScrollToBottomButtonState(isAtBottom);
        this.lastScrollTop = currentScrollTop;
    }
    /** Updates the scroll-to-bottom button state and handles debounce. */
    updateScrollToBottomButtonState(isAtBottom) {
        const atBottomNow = isAtBottom; // Use isScrolledToBottom for threshold
        if (atBottomNow !== this.atBottom) {
            this.atBottom = atBottomNow;
            if (this.atBottom) {
                // We're at the bottom, hide the button immediately and clear any debounce timer.
                this._showScrollButton = false;
                if (this._scrollButtonDebounceTimer !== undefined) {
                    clearTimeout(this._scrollButtonDebounceTimer);
                    this._scrollButtonDebounceTimer = undefined;
                }
                this.update();
            }
            else {
                // User scrolled up; delay showing the scroll-to-bottom button.
                if (this._scrollButtonDebounceTimer !== undefined) {
                    clearTimeout(this._scrollButtonDebounceTimer);
                }
                this._scrollButtonDebounceTimer = window.setTimeout(() => {
                    // Re-check: only show if we're still not at bottom
                    if (!this.atBottom) {
                        this._showScrollButton = true;
                        this.update();
                    }
                    this._scrollButtonDebounceTimer = undefined;
                }, ChatViewTreeWidget_1.SCROLL_BUTTON_GRACE_PERIOD);
            }
        }
    }
    setTemporaryScrollLock(enabled) {
        var _a;
        // Immediately apply scroll lock changes without delay
        (_a = this.onScrollLockChange) === null || _a === void 0 ? void 0 : _a.call(this, enabled);
        // Update cached scrollToRow so that outdated values do not cause unwanted scrolling on update()
        this.updateScrollToRow();
    }
    getCurrentScrollTop(scrollEvent) {
        // For virtualized trees, use the virtualized view's scroll state (most reliable)
        if (this.props.virtualized !== false && this.view) {
            const scrollState = this.getVirtualizedScrollState();
            if (scrollState !== undefined) {
                return scrollState.scrollTop;
            }
        }
        // Try to extract scroll position from the scroll event
        if (scrollEvent && typeof scrollEvent === 'object' && 'scrollTop' in scrollEvent) {
            const scrollEventWithScrollTop = scrollEvent;
            const scrollTop = scrollEventWithScrollTop.scrollTop;
            if (typeof scrollTop === 'number' && !isNaN(scrollTop)) {
                return scrollTop;
            }
        }
        // Last resort: use DOM scroll position
        if (this.node && typeof this.node.scrollTop === 'number') {
            return this.node.scrollTop;
        }
        return 0;
    }
    /**
     * Returns true if the scroll position is at the absolute (1px tolerance) bottom of the scroll container.
     * Handles both virtualized and non-virtualized scroll containers.
     * Allows for a tiny floating point epsilon (1px).
     */
    isAtAbsoluteBottom() {
        var _a, _b;
        let scrollTop = 0;
        let scrollHeight = 0;
        let clientHeight = 0;
        const EPSILON = 1; // px
        if (this.props.virtualized !== false && this.view) {
            const state = this.getVirtualizedScrollState();
            if (state) {
                scrollTop = state.scrollTop;
                scrollHeight = (_a = state.scrollHeight) !== null && _a !== void 0 ? _a : 0;
                clientHeight = (_b = state.clientHeight) !== null && _b !== void 0 ? _b : 0;
            }
        }
        else if (this.node) {
            scrollTop = this.node.scrollTop;
            scrollHeight = this.node.scrollHeight;
            clientHeight = this.node.clientHeight;
        }
        const diff = Math.abs(scrollTop + clientHeight - scrollHeight);
        return diff <= EPSILON;
    }
    renderTree(model) {
        var _a;
        if (!this.isEnabled) {
            return this.renderDisabledMessage();
        }
        const tree = browser_2.CompositeTreeNode.is(model.root) && ((_a = model.root.children) === null || _a === void 0 ? void 0 : _a.length) > 0
            ? super.renderTree(model)
            : this.renderWelcomeMessage();
        return React.createElement(React.Fragment, null,
            tree,
            this.renderScrollToBottomButton());
    }
    /** Shows the scroll to bottom button if not at the bottom (debounced). */
    renderScrollToBottomButton() {
        if (!this._showScrollButton) {
            return undefined;
        }
        // Down-arrow, Theia codicon, fixed overlay on widget
        return React.createElement("button", { className: "theia-ChatTree-ScrollToBottom codicon codicon-arrow-down", title: nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/scrollToBottom', 'Jump to latest message'), onClick: () => this.handleScrollToBottomButtonClick() });
    }
    /** Scrolls to the bottom row and updates atBottom state. */
    handleScrollToBottomButtonClick() {
        this.scrollToRow = this.rows.size;
        this.atBottom = true;
        this._showScrollButton = false;
        if (this._scrollButtonDebounceTimer !== undefined) {
            clearTimeout(this._scrollButtonDebounceTimer);
            this._scrollButtonDebounceTimer = undefined;
        }
        this.update();
    }
    renderDisabledMessage() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.welcomeMessageProvider) === null || _a === void 0 ? void 0 : _a.renderDisabledMessage) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : React.createElement(React.Fragment, null);
    }
    renderWelcomeMessage() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.welcomeMessageProvider) === null || _a === void 0 ? void 0 : _a.renderWelcomeMessage) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : React.createElement(React.Fragment, null);
    }
    mapRequestToNode(branch) {
        return {
            parent: this.model.root,
            get id() {
                return this.request.id;
            },
            get request() {
                return branch.get();
            },
            branch,
            sessionId: this.chatModelId
        };
    }
    mapResponseToNode(response) {
        return {
            id: response.id,
            parent: this.model.root,
            response,
            sessionId: this.chatModelId
        };
    }
    /**
     * Tracks the ChatModel handed over.
     * Tracking multiple chat models will result in a weird UI
     */
    trackChatModel(chatModel) {
        this.toDisposeOnChatModelChange.dispose();
        this.recreateModelTree(chatModel);
        chatModel.getRequests().forEach(request => {
            if (!request.response.isComplete) {
                request.response.onDidChange(() => this.scheduleUpdateScrollToRow());
            }
        });
        this.toDisposeOnChatModelChange.pushAll([
            core_1.Disposable.create(() => {
                this.chatInputs.forEach(widget => widget.dispose());
                this.chatInputs.clear();
            }),
            chatModel.onDidChange(event => {
                var _a;
                if (event.kind === 'enableEdit') {
                    this.scrollToRow = (_a = this.rows.get(event.request.id)) === null || _a === void 0 ? void 0 : _a.index;
                    this.update();
                    return;
                }
                else if (event.kind === 'cancelEdit') {
                    this.disposeChatInputWidget(event.request);
                    this.scrollToRow = undefined;
                    this.update();
                    return;
                }
                else if (event.kind === 'changeHierarchyBranch') {
                    this.scrollToRow = undefined;
                }
                this.recreateModelTree(chatModel);
                if (event.kind === 'addRequest' && !event.request.response.isComplete) {
                    event.request.response.onDidChange(() => this.scheduleUpdateScrollToRow());
                }
                else if (event.kind === 'submitEdit') {
                    event.branch.succeedingBranches().forEach(branch => {
                        this.disposeChatInputWidget(branch.get());
                    });
                    this.onDidSubmitEditEmitter.fire(event.newRequest);
                }
            })
        ]);
    }
    disposeChatInputWidget(request) {
        const widget = this.chatInputs.get(request.id);
        if (widget) {
            widget.dispose();
            this.chatInputs.delete(request.id);
        }
    }
    getScrollToRow() {
        // Only scroll to end if auto-scroll is enabled (not locked)
        if (this.shouldScrollToEnd) {
            return this.rows.size;
        }
        // When auto-scroll is disabled, don't auto-scroll at all
        return undefined;
    }
    async recreateModelTree(chatModel) {
        if (browser_2.CompositeTreeNode.is(this.model.root)) {
            const nodes = [];
            this.chatModelId = chatModel.id;
            chatModel.getBranches().forEach(branch => {
                const request = branch.get();
                nodes.push(this.mapRequestToNode(branch));
                nodes.push(this.mapResponseToNode(request.response));
            });
            this.model.root.children = nodes;
            this.model.refresh();
        }
    }
    renderNode(node, props) {
        if (!browser_2.TreeNode.isVisible(node)) {
            return undefined;
        }
        if (!((0, exports.isRequestNode)(node) || (0, exports.isResponseNode)(node))) {
            return super.renderNode(node, props);
        }
        return React.createElement(React.Fragment, { key: node.id },
            React.createElement("div", { className: 'theia-ChatNode', onContextMenu: e => this.handleContextMenu(node, e) },
                this.renderAgent(node),
                this.renderDetail(node)));
    }
    renderAgent(node) {
        var _a;
        const inProgress = (0, exports.isResponseNode)(node) && !node.response.isComplete && !node.response.isCanceled && !node.response.isError;
        const waitingForInput = (0, exports.isResponseNode)(node) && node.response.isWaitingForInput;
        const toolbarContributions = !inProgress
            ? this.chatNodeToolbarActionContributions.getContributions()
                .flatMap(c => c.getToolbarActions(node))
                .filter(action => this.commandRegistry.isEnabled(action.commandId, node))
                .sort((a, b) => { var _a, _b; return ((_a = a.priority) !== null && _a !== void 0 ? _a : 0) - ((_b = b.priority) !== null && _b !== void 0 ? _b : 0); })
            : [];
        const agentLabel = React.createRef();
        const agentDescription = (_a = this.getAgent(node)) === null || _a === void 0 ? void 0 : _a.description;
        return React.createElement(React.Fragment, null,
            React.createElement("div", { className: 'theia-ChatNodeHeader' },
                React.createElement("div", { className: `theia-AgentAvatar ${this.getAgentIconClassName(node)}` }),
                React.createElement("h3", { ref: agentLabel, className: 'theia-AgentLabel', onMouseEnter: () => {
                        if (agentDescription) {
                            this.hoverService.requestHover({
                                content: agentDescription,
                                target: agentLabel.current,
                                position: 'right'
                            });
                        }
                    } }, this.getAgentLabel(node)),
                inProgress && !waitingForInput && React.createElement("span", { className: 'theia-ChatContentInProgress' }, nls_1.nls.localizeByDefault('Generating')),
                inProgress && waitingForInput && React.createElement("span", { className: 'theia-ChatContentInProgress' }, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/waitingForInput', 'Waiting for input')),
                React.createElement("div", { className: 'theia-ChatNodeToolbar' }, !inProgress &&
                    toolbarContributions.length > 0 &&
                    toolbarContributions.map(action => React.createElement("span", { key: action.commandId, className: `theia-ChatNodeToolbarAction ${action.icon}`, title: action.tooltip, onClick: e => {
                            e.stopPropagation();
                            this.commandRegistry.executeCommand(action.commandId, node);
                        }, onKeyDown: e => {
                            if (isEnterKey(e)) {
                                e.stopPropagation();
                                this.commandRegistry.executeCommand(action.commandId, node);
                            }
                        }, role: 'button' })))));
    }
    getAgentLabel(node) {
        var _a, _b;
        if ((0, exports.isRequestNode)(node)) {
            // TODO find user name
            return nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/you', 'You');
        }
        return (_b = (_a = this.getAgent(node)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/ai', 'AI');
    }
    getAgent(node) {
        if ((0, exports.isRequestNode)(node)) {
            return undefined;
        }
        return node.response.agentId ? this.chatAgentService.getAgent(node.response.agentId) : undefined;
    }
    getAgentIconClassName(node) {
        var _a;
        if ((0, exports.isRequestNode)(node)) {
            return (0, browser_2.codicon)('account');
        }
        const agent = node.response.agentId ? this.chatAgentService.getAgent(node.response.agentId) : undefined;
        return (_a = agent === null || agent === void 0 ? void 0 : agent.iconClass) !== null && _a !== void 0 ? _a : (0, browser_2.codicon)('copilot');
    }
    renderDetail(node) {
        if ((0, exports.isRequestNode)(node)) {
            return this.renderChatRequest(node);
        }
        if ((0, exports.isResponseNode)(node)) {
            return this.renderChatResponse(node);
        }
        ;
    }
    renderChatRequest(node) {
        return React.createElement(ChatRequestRender, { node: node, hoverService: this.hoverService, chatAgentService: this.chatAgentService, variableService: this.variableService, openerService: this.openerService, provideChatInputWidget: () => {
                const editableNode = node;
                if ((0, exports.isEditableRequestNode)(editableNode)) {
                    let widget = this.chatInputs.get(editableNode.id);
                    if (!widget) {
                        widget = this.inputWidgetFactory({
                            node: editableNode,
                            initialValue: editableNode.request.message.request.text,
                            onQuery: async (query) => {
                                editableNode.request.submitEdit({ text: query });
                            },
                            branch: editableNode.branch
                        });
                        this.chatInputs.set(editableNode.id, widget);
                        widget.disposed.connect(() => {
                            this.chatInputs.delete(editableNode.id);
                            editableNode.request.cancelEdit();
                        });
                    }
                    return widget;
                }
                return;
            } });
    }
    renderChatResponse(node) {
        return (React.createElement("div", { className: 'theia-ResponseNode' },
            !node.response.isComplete
                && node.response.response.content.length === 0
                && node.response.progressMessages
                    .filter(c => c.show === 'untilFirstContent')
                    .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-untilFirstContent-${i}` })),
            node.response.response.content.map((c, i) => React.createElement("div", { className: 'theia-ResponseNode-Content', key: `${node.id}-content-${i}` }, this.getChatResponsePartRenderer(c, node))),
            !node.response.isComplete
                && node.response.progressMessages
                    .filter(c => c.show === 'whileIncomplete')
                    .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-whileIncomplete-${i}` })),
            node.response.progressMessages
                .filter(c => c.show === 'forever')
                .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-afterComplete-${i}` }))));
    }
    getChatResponsePartRenderer(content, node) {
        const renderer = this.chatResponsePartRenderers.getContributions().reduce((prev, current) => {
            const prio = current.canHandle(content);
            if (prio > prev[0]) {
                return [prio, current];
            }
            return prev;
        }, [-1, undefined])[1];
        if (!renderer) {
            console.error('No renderer found for content', content);
            return React.createElement("div", null, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/noRenderer', 'Error: No renderer found'));
        }
        return renderer.render(content, node);
    }
    handleContextMenu(node, event) {
        this.contextMenuRenderer.render({
            menuPath: ChatViewTreeWidget_1.CONTEXT_MENU,
            anchor: { x: event.clientX, y: event.clientY },
            args: [node],
            context: event.currentTarget
        });
        event.preventDefault();
    }
    handleSpace(event) {
        // We need to return false to prevent the handler within
        // packages/core/src/browser/widgets/widget.ts
        // Otherwise, the space key will never be handled by the monaco editor
        return false;
    }
    /**
     * Ensure atBottom state is correct when content grows (e.g., LLM streaming while scroll lock is enabled).
     */
    updateScrollToRow() {
        super.updateScrollToRow();
        const isAtBottom = this.isScrolledToBottom();
        this.updateScrollToBottomButtonState(isAtBottom);
    }
};
exports.ChatViewTreeWidget = ChatViewTreeWidget;
ChatViewTreeWidget.ID = 'chat-tree-widget';
ChatViewTreeWidget.CONTEXT_MENU = ['chat-tree-context-menu'];
/**
 * Debounce period in ms before showing scroll-to-bottom button after scrolling up.
 * Avoids flickering of the button during LLM token streaming.
 */
ChatViewTreeWidget.SCROLL_BUTTON_GRACE_PERIOD = 100;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_response_part_renderer_1.ChatResponsePartRenderer),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "chatResponsePartRenderers", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_node_toolbar_action_contribution_1.ChatNodeToolbarActionContribution),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "chatNodeToolbarActionContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "chatAgentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AIVariableService),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], ChatViewTreeWidget.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.OpenerService),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.HoverService),
    tslib_1.__metadata("design:type", browser_2.HoverService)
], ChatViewTreeWidget.prototype, "hoverService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.ChatWelcomeMessageProvider),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "welcomeMessageProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_view_tree_input_widget_1.AIChatTreeInputFactory),
    tslib_1.__metadata("design:type", Function)
], ChatViewTreeWidget.prototype, "inputWidgetFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "activationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], ChatViewTreeWidget.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChatViewTreeWidget.prototype, "init", null);
exports.ChatViewTreeWidget = ChatViewTreeWidget = ChatViewTreeWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(browser_2.TreeProps)),
    tslib_1.__param(1, (0, inversify_1.inject)(browser_2.TreeModel)),
    tslib_1.__param(2, (0, inversify_1.inject)(browser_2.ContextMenuRenderer)),
    tslib_1.__metadata("design:paramtypes", [Object, Object, browser_2.ContextMenuRenderer])
], ChatViewTreeWidget);
const WidgetContainer = ({ widget }) => {
    // eslint-disable-next-line no-null/no-null
    const containerRef = React.useRef(null);
    React.useEffect(() => {
        if (containerRef.current && !widget.isAttached) {
            browser_2.Widget.attach(widget, containerRef.current);
        }
    }, [containerRef.current]);
    // Clean up
    React.useEffect(() => () => {
        setTimeout(() => {
            // Delay clean up to allow react to finish its rendering cycle
            widget.clearFlag(browser_2.Widget.Flag.IsAttached);
            widget.dispose();
        });
    }, []);
    return React.createElement("div", { ref: containerRef });
};
const ChatRequestRender = ({ node, hoverService, chatAgentService, variableService, openerService, provideChatInputWidget }) => {
    const parts = node.request.message.parts;
    if (ai_chat_1.EditableChatRequestModel.isEditing(node.request)) {
        const widget = provideChatInputWidget();
        if (widget) {
            return React.createElement("div", { className: "theia-RequestNode" },
                React.createElement(WidgetContainer, { widget: widget }));
        }
    }
    const renderFooter = () => {
        if (node.branch.items.length < 2) {
            return;
        }
        const isFirst = node.branch.activeBranchIndex === 0;
        const isLast = node.branch.activeBranchIndex === node.branch.items.length - 1;
        return (React.createElement("div", { className: 'theia-RequestNode-Footer' },
            React.createElement("div", { className: `item ${isFirst ? '' : 'enabled'}` },
                React.createElement("div", { className: "codicon codicon-chevron-left action-label", title: "Previous", onClick: () => {
                        node.branch.enablePrevious();
                    } })),
            React.createElement("small", null,
                React.createElement("span", null,
                    node.branch.activeBranchIndex + 1,
                    "/"),
                React.createElement("span", null, node.branch.items.length)),
            React.createElement("div", { className: `item ${isLast ? '' : 'enabled'}` },
                React.createElement("div", { className: 'codicon codicon-chevron-right action-label', title: "Next", onClick: () => {
                        node.branch.enableNext();
                    } }))));
    };
    return (React.createElement("div", { className: "theia-RequestNode" },
        React.createElement("p", null, parts.map((part, index) => {
            var _a, _b;
            if (part instanceof ai_chat_1.ParsedChatRequestAgentPart || part instanceof ai_chat_1.ParsedChatRequestVariablePart) {
                let description = undefined;
                let className = '';
                if (part instanceof ai_chat_1.ParsedChatRequestAgentPart) {
                    description = (_a = chatAgentService.getAgent(part.agentId)) === null || _a === void 0 ? void 0 : _a.description;
                    className = 'theia-RequestNode-AgentLabel';
                }
                else if (part instanceof ai_chat_1.ParsedChatRequestVariablePart) {
                    description = (_b = variableService.getVariable(part.variableName)) === null || _b === void 0 ? void 0 : _b.description;
                    className = 'theia-RequestNode-VariableLabel';
                }
                return (React.createElement(HoverableLabel, { key: index, text: part.text, description: description, hoverService: hoverService, className: className }));
            }
            else {
                const ref = (0, markdown_part_renderer_1.useMarkdownRendering)(part.text
                    .replace(/^[\r\n]+|[\r\n]+$/g, '') // remove excessive new lines
                    .replace(/(^ )/g, '&nbsp;'), // enforce keeping space before
                openerService, true);
                return (React.createElement("span", { key: index, ref: ref }));
            }
        })),
        renderFooter()));
};
const HoverableLabel = ({ text, description, hoverService, className }) => {
    const spanRef = React.createRef();
    return (React.createElement("span", { className: className, ref: spanRef, onMouseEnter: () => {
            if (description) {
                hoverService.requestHover({
                    content: description,
                    target: spanRef.current,
                    position: 'right'
                });
            }
        } }, text));
};
//# sourceMappingURL=chat-view-tree-widget.js.map