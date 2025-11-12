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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendChatToolRequestService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_tool_request_service_1 = require("../common/chat-tool-request-service");
const chat_model_1 = require("../common/chat-model");
const chat_tool_preferences_1 = require("../common/chat-tool-preferences");
const chat_tool_preference_bindings_1 = require("./chat-tool-preference-bindings");
/**
 * Frontend-specific implementation of ChatToolRequestService that handles tool confirmation
 */
let FrontendChatToolRequestService = class FrontendChatToolRequestService extends chat_tool_request_service_1.ChatToolRequestService {
    toChatToolRequest(toolRequest, request) {
        const confirmationMode = this.confirmationManager.getConfirmationMode(toolRequest.id, request.session.id);
        return {
            ...toolRequest,
            handler: async (arg_string) => {
                switch (confirmationMode) {
                    case chat_tool_preferences_1.ToolConfirmationMode.DISABLED:
                        return { denied: true, message: `Tool ${toolRequest.id} is disabled` };
                    case chat_tool_preferences_1.ToolConfirmationMode.ALWAYS_ALLOW:
                        // Execute immediately without confirmation
                        return toolRequest.handler(arg_string, request);
                    case chat_tool_preferences_1.ToolConfirmationMode.CONFIRM:
                    default:
                        // Create confirmation requirement
                        const toolCallContent = this.findToolCallContent(toolRequest, arg_string, request);
                        const confirmed = await toolCallContent.confirmed;
                        if (confirmed) {
                            return toolRequest.handler(arg_string, request);
                        }
                        else {
                            // Return an object indicating the user denied the tool execution
                            // instead of throwing an error
                            return { denied: true, message: `Tool execution denied by user: ${toolRequest.id}` };
                        }
                }
            }
        };
    }
    /**
     * Find existing tool call content or create a new one for confirmation tracking
     *
     * Looks for ToolCallChatResponseContent nodes where the name field matches the toolRequest id.
     * Starts from the back of the content array to find the most recent match.
     */
    findToolCallContent(toolRequest, arguments_, request) {
        // Look for existing tool call content with matching ID
        const response = request.response.response;
        const contentArray = response.content;
        // Start from the end of the array and find the first match
        for (let i = contentArray.length - 1; i >= 0; i--) {
            const content = contentArray[i];
            if (chat_model_1.ToolCallChatResponseContent.is(content) &&
                content.name === toolRequest.id) {
                return content;
            }
        }
        throw new Error(`Tool call content for tool ${toolRequest.id} not found in the response`);
    }
};
exports.FrontendChatToolRequestService = FrontendChatToolRequestService;
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_tool_preference_bindings_1.ToolConfirmationManager),
    tslib_1.__metadata("design:type", chat_tool_preference_bindings_1.ToolConfirmationManager)
], FrontendChatToolRequestService.prototype, "confirmationManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_tool_preferences_1.ChatToolPreferences),
    tslib_1.__metadata("design:type", Object)
], FrontendChatToolRequestService.prototype, "preferences", void 0);
exports.FrontendChatToolRequestService = FrontendChatToolRequestService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FrontendChatToolRequestService);
//# sourceMappingURL=chat-tool-request-service.js.map