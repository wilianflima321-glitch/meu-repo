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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallPartRenderer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const nls_1 = require("@theia/core/lib/common/nls");
const browser_1 = require("@theia/core/lib/browser");
const React = require("@theia/core/shared/react");
const tool_confirmation_1 = require("./tool-confirmation");
const chat_tool_preferences_1 = require("@theia/ai-chat/lib/common/chat-tool-preferences");
const markdown_part_renderer_1 = require("./markdown-part-renderer");
const chat_tool_preference_bindings_1 = require("@theia/ai-chat/lib/browser/chat-tool-preference-bindings");
let ToolCallPartRenderer = class ToolCallPartRenderer {
    canHandle(response) {
        if (common_1.ToolCallChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response, parentNode) {
        const chatId = parentNode.sessionId;
        const confirmationMode = response.name ? this.getToolConfirmationSettings(response.name, chatId) : chat_tool_preferences_1.ToolConfirmationMode.DISABLED;
        return React.createElement(ToolCallContent, { response: response, confirmationMode: confirmationMode, toolConfirmationManager: this.toolConfirmationManager, chatId: chatId, renderCollapsibleArguments: this.renderCollapsibleArguments.bind(this), responseRenderer: this.renderResult.bind(this), requestCanceled: parentNode.response.isCanceled });
    }
    renderResult(response) {
        const result = this.tryParse(response.result);
        if (!result) {
            return undefined;
        }
        if (typeof result === 'string') {
            return React.createElement("pre", null, JSON.stringify(result, undefined, 2));
        }
        if ('content' in result) {
            return React.createElement("div", { className: 'theia-toolCall-response-content' }, result.content.map((content, idx) => {
                switch (content.type) {
                    case 'image': {
                        return React.createElement("div", { key: `content-${idx}-${content.type}`, className: 'theia-toolCall-image-result' },
                            React.createElement("img", { src: `data:${content.mimeType};base64,${content.base64data}` }));
                    }
                    case 'text': {
                        return React.createElement("div", { key: `content-${idx}-${content.type}`, className: 'theia-toolCall-text-result' },
                            React.createElement(MarkdownRender, { text: content.text, openerService: this.openerService }));
                    }
                    case 'audio':
                    case 'error':
                    default: {
                        return React.createElement("div", { key: `content-${idx}-${content.type}`, className: 'theia-toolCall-default-result' },
                            React.createElement("pre", null, JSON.stringify(response, undefined, 2)));
                    }
                }
            }));
        }
        return React.createElement("pre", null, JSON.stringify(result, undefined, 2));
    }
    tryParse(result) {
        if (!result) {
            return undefined;
        }
        try {
            return typeof result === 'string' ? JSON.parse(result) : result;
        }
        catch (error) {
            return result;
        }
    }
    getToolConfirmationSettings(responseId, chatId) {
        return this.toolConfirmationManager.getConfirmationMode(responseId, chatId);
    }
    renderCollapsibleArguments(args) {
        if (!args || !args.trim() || args.trim() === '{}') {
            return undefined;
        }
        return (React.createElement("details", { className: "collapsible-arguments" },
            React.createElement("summary", { className: "collapsible-arguments-summary" }, "..."),
            React.createElement("span", null, this.prettyPrintArgs(args))));
    }
    prettyPrintArgs(args) {
        try {
            return JSON.stringify(JSON.parse(args), undefined, 2);
        }
        catch (e) {
            // fall through
            return args;
        }
    }
};
exports.ToolCallPartRenderer = ToolCallPartRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_tool_preference_bindings_1.ToolConfirmationManager),
    tslib_1.__metadata("design:type", chat_tool_preference_bindings_1.ToolConfirmationManager)
], ToolCallPartRenderer.prototype, "toolConfirmationManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], ToolCallPartRenderer.prototype, "openerService", void 0);
exports.ToolCallPartRenderer = ToolCallPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ToolCallPartRenderer);
const Spinner = () => (React.createElement("span", { className: `${(0, browser_1.codicon)('loading')} theia-animation-spin` }));
/**
 * A function component to handle tool call rendering and confirmation
 */
const ToolCallContent = ({ response, confirmationMode, toolConfirmationManager, chatId, responseRenderer, renderCollapsibleArguments, requestCanceled }) => {
    const [confirmationState, setConfirmationState] = React.useState('waiting');
    const [rejectionReason, setRejectionReason] = React.useState(undefined);
    const formatReason = (reason) => {
        if (!reason) {
            return '';
        }
        if (reason instanceof Error) {
            return reason.message;
        }
        if (typeof reason === 'string') {
            return reason;
        }
        try {
            return JSON.stringify(reason);
        }
        catch (e) {
            return String(reason);
        }
    };
    React.useEffect(() => {
        if (confirmationMode === chat_tool_preferences_1.ToolConfirmationMode.ALWAYS_ALLOW) {
            response.confirm();
            setConfirmationState('allowed');
            return;
        }
        else if (confirmationMode === chat_tool_preferences_1.ToolConfirmationMode.DISABLED) {
            response.deny();
            setConfirmationState('denied');
            return;
        }
        response.confirmed
            .then(confirmed => {
            if (confirmed === true) {
                setConfirmationState('allowed');
            }
            else {
                setConfirmationState('denied');
            }
        })
            .catch(reason => {
            setRejectionReason(reason);
            setConfirmationState('rejected');
        });
    }, [response, confirmationMode]);
    const handleAllow = React.useCallback((mode = 'once') => {
        if (mode === 'forever' && response.name) {
            toolConfirmationManager.setConfirmationMode(response.name, chat_tool_preferences_1.ToolConfirmationMode.ALWAYS_ALLOW);
        }
        else if (mode === 'session' && response.name) {
            toolConfirmationManager.setSessionConfirmationMode(response.name, chat_tool_preferences_1.ToolConfirmationMode.ALWAYS_ALLOW, chatId);
        }
        response.confirm();
    }, [response, toolConfirmationManager, chatId]);
    const handleDeny = React.useCallback((mode = 'once') => {
        if (mode === 'forever' && response.name) {
            toolConfirmationManager.setConfirmationMode(response.name, chat_tool_preferences_1.ToolConfirmationMode.DISABLED);
        }
        else if (mode === 'session' && response.name) {
            toolConfirmationManager.setSessionConfirmationMode(response.name, chat_tool_preferences_1.ToolConfirmationMode.DISABLED, chatId);
        }
        response.deny();
    }, [response, toolConfirmationManager, chatId]);
    const reasonText = formatReason(rejectionReason);
    return (React.createElement("div", { className: 'theia-toolCall' },
        confirmationState === 'rejected' ? (React.createElement("span", { className: 'theia-toolCall-rejected' },
            React.createElement("span", { className: (0, browser_1.codicon)('error') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolcall-part-renderer/rejected', 'Execution canceled'),
            ": ",
            response.name,
            reasonText ? React.createElement("span", null,
                " \u2014 ",
                reasonText) : undefined)) : requestCanceled && !response.finished ? (React.createElement("span", { className: 'theia-toolCall-rejected' },
            React.createElement("span", { className: (0, browser_1.codicon)('error') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolcall-part-renderer/rejected', 'Execution canceled'),
            ": ",
            response.name)) : confirmationState === 'denied' ? (React.createElement("span", { className: 'theia-toolCall-denied' },
            React.createElement("span", { className: (0, browser_1.codicon)('error') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolcall-part-renderer/denied', 'Execution denied'),
            ": ",
            response.name)) : response.finished ? (React.createElement("details", { className: 'theia-toolCall-finished' },
            React.createElement("summary", null,
                nls_1.nls.localize('theia/ai/chat-ui/toolcall-part-renderer/finished', 'Ran'),
                " ",
                response.name,
                "(",
                renderCollapsibleArguments(response.arguments),
                ")"),
            React.createElement("div", { className: 'theia-toolCall-response-result' }, responseRenderer(response)))) : (confirmationState === 'allowed' && !requestCanceled && (React.createElement("span", { className: 'theia-toolCall-allowed' },
            React.createElement(Spinner, null),
            " ",
            nls_1.nls.localizeByDefault('Running'),
            " ",
            response.name))),
        confirmationState === 'waiting' && !requestCanceled && (React.createElement("span", { className: 'theia-toolCall-waiting' },
            React.createElement(tool_confirmation_1.ToolConfirmation, { response: response, onAllow: handleAllow, onDeny: handleDeny })))));
};
const MarkdownRender = ({ text, openerService }) => {
    const ref = (0, markdown_part_renderer_1.useMarkdownRendering)(text, openerService);
    return React.createElement("div", { ref: ref });
};
//# sourceMappingURL=toolcall-part-renderer.js.map