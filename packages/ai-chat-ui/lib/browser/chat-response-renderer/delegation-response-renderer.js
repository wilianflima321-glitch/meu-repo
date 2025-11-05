"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegationResponseRenderer = void 0;
const tslib_1 = require("tslib");
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
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const delegation_response_content_1 = require("@theia/ai-chat/lib/browser/delegation-response-content");
const sub_chat_widget_1 = require("../chat-tree-view/sub-chat-widget");
const core_1 = require("@theia/core");
let DelegationResponseRenderer = class DelegationResponseRenderer {
    canHandle(response) {
        if ((0, delegation_response_content_1.isDelegationResponseContent)(response)) {
            return 10;
        }
        return -1;
    }
    render(response, parentNode) {
        return this.renderExpandableNode(response, parentNode);
    }
    renderExpandableNode(response, parentNode) {
        return React.createElement(DelegatedChat, { response: response.response, agentId: response.agentId, prompt: response.prompt, parentNode: parentNode, subChatWidgetFactory: this.subChatWidgetFactory });
    }
};
exports.DelegationResponseRenderer = DelegationResponseRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(sub_chat_widget_1.SubChatWidgetFactory),
    tslib_1.__metadata("design:type", Function)
], DelegationResponseRenderer.prototype, "subChatWidgetFactory", void 0);
exports.DelegationResponseRenderer = DelegationResponseRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DelegationResponseRenderer);
class DelegatedChat extends React.Component {
    constructor(props) {
        super(props);
        this.toDispose = new core_1.DisposableCollection();
        this.state = {
            node: undefined
        };
        this.widget = props.subChatWidgetFactory();
    }
    componentDidMount() {
        // Start rendering as soon as the response is created (streaming mode)
        this.props.response.responseCreated.then(chatModel => {
            const node = mapResponseToNode(chatModel, this.props.parentNode);
            this.setState({ node });
            // Listen for changes to update the rendering as the response streams in
            const changeListener = () => {
                // Force re-render when the response content changes
                this.forceUpdate();
            };
            this.toDispose.push(chatModel.onDidChange(changeListener));
        }).catch(error => {
            console.error('Failed to create delegated chat response:', error);
            // Still try to handle completion in case of partial success
        });
        // Keep the completion handling for final cleanup if needed
        this.props.response.responseCompleted.then(() => {
            // Final update when response is complete
            this.forceUpdate();
        }).catch(error => {
            console.error('Error in delegated chat response completion:', error);
            // Force update anyway to show any partial content or error state
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        this.toDispose.dispose();
    }
    render() {
        var _a, _b, _c, _d, _e, _f;
        const { agentId, prompt } = this.props;
        const hasNode = !!this.state.node;
        const isComplete = (_b = (_a = this.state.node) === null || _a === void 0 ? void 0 : _a.response.isComplete) !== null && _b !== void 0 ? _b : false;
        const isCanceled = (_d = (_c = this.state.node) === null || _c === void 0 ? void 0 : _c.response.isCanceled) !== null && _d !== void 0 ? _d : false;
        const isError = (_f = (_e = this.state.node) === null || _e === void 0 ? void 0 : _e.response.isError) !== null && _f !== void 0 ? _f : false;
        let statusIcon = '';
        let statusText = '';
        if (hasNode) {
            if (isCanceled) {
                statusIcon = 'codicon-close';
                statusText = core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/status/canceled', 'canceled');
            }
            else if (isComplete) {
                statusIcon = 'codicon-check';
                statusText = core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/status/completed', 'completed');
            }
            else if (isError) {
                statusIcon = 'codicon-error';
                statusText = core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/status/error', 'error');
            }
            else {
                statusIcon = 'codicon-loading';
                statusText = core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/status/generating', 'generating...');
            }
        }
        else {
            statusIcon = 'codicon-loading';
            statusText = core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/status/starting', 'starting...');
        }
        return (React.createElement("div", { className: "theia-delegation-container" },
            React.createElement("details", { className: "delegation-response-details" },
                React.createElement("summary", { className: "delegation-summary" },
                    React.createElement("div", { className: "delegation-header" },
                        React.createElement("span", { className: "delegation-agent" },
                            React.createElement("span", { className: "codicon codicon-copilot-large" }),
                            " ",
                            agentId),
                        React.createElement("span", { className: "delegation-status" },
                            React.createElement("span", { className: `codicon ${statusIcon} delegation-status-icon` }),
                            React.createElement("span", { className: "delegation-status-text" }, statusText)))),
                React.createElement("div", { className: "delegation-content" },
                    React.createElement("div", { className: "delegation-prompt-section" },
                        React.createElement("strong", null, core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/prompt/label', 'Delegated prompt:')),
                        React.createElement("div", { className: "delegation-prompt" }, prompt)),
                    React.createElement("div", { className: "delegation-response-section" },
                        React.createElement("strong", null, core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/response/label', 'Response:')),
                        React.createElement("div", { className: 'delegation-response-placeholder' }, hasNode && this.state.node ? this.widget.renderChatResponse(this.state.node) :
                            React.createElement("div", { className: "theia-ChatContentInProgress" }, core_1.nls.localize('theia/ai/chat-ui/delegation-response-renderer/starting', 'Starting delegation...'))))))));
    }
}
function mapResponseToNode(response, parentNode) {
    return {
        id: response.id,
        parent: parentNode,
        response,
        sessionId: parentNode.sessionId
    };
}
//# sourceMappingURL=delegation-response-renderer.js.map