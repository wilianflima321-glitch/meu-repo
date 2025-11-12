"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.ChatInputAgentSuggestions = void 0;
const React = require("@theia/core/shared/react");
const markdown_part_renderer_1 = require("./chat-response-renderer/markdown-part-renderer");
const ai_chat_1 = require("@theia/ai-chat");
function getText(suggestion) {
    if (typeof suggestion === 'string') {
        return suggestion;
    }
    if ('value' in suggestion) {
        return suggestion.value;
    }
    if (typeof suggestion.content === 'string') {
        return suggestion.content;
    }
    return suggestion.content.value;
}
function getContent(suggestion) {
    if (typeof suggestion === 'string') {
        return suggestion;
    }
    if ('value' in suggestion) {
        return suggestion;
    }
    return suggestion.content;
}
const ChatInputAgentSuggestions = ({ suggestions, opener }) => (!!(suggestions === null || suggestions === void 0 ? void 0 : suggestions.length) && React.createElement("div", { className: "chat-agent-suggestions" }, suggestions.map(suggestion => React.createElement(ChatInputAgentSuggestion, { key: getText(suggestion), suggestion: suggestion, opener: opener, handler: ai_chat_1.ChatSuggestionCallback.is(suggestion) ? new ChatSuggestionClickHandler(suggestion) : undefined }))));
exports.ChatInputAgentSuggestions = ChatInputAgentSuggestions;
const ChatInputAgentSuggestion = ({ suggestion, opener, handler }) => {
    const ref = (0, markdown_part_renderer_1.useMarkdownRendering)(getContent(suggestion), opener, true, handler);
    return React.createElement("div", { className: "chat-agent-suggestion", style: (!handler || ai_chat_1.ChatSuggestionCallback.containsCallbackLink(suggestion)) ? undefined : { cursor: 'pointer' }, ref: ref });
};
class ChatSuggestionClickHandler {
    constructor(suggestion) {
        this.suggestion = suggestion;
    }
    handleEvent(event) {
        const { target, currentTarget } = event;
        if (event.type !== 'click' || !(target instanceof Element)) {
            return false;
        }
        const link = target.closest('a[href^="_callback"]');
        if (link) {
            this.suggestion.callback();
            return true;
        }
        if (!(currentTarget instanceof Element)) {
            this.suggestion.callback();
            return true;
        }
        const containedLink = currentTarget.querySelector('a[href^="_callback"]');
        // Whole body should count.
        if (!containedLink) {
            this.suggestion.callback();
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=chat-input-agent-suggestions.js.map