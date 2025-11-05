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
exports.ChatToolRequestService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
/**
 * Wraps tool requests in a chat context.
 *
 * This service extracts tool requests from a given chat request model and wraps their
 * handler functions to provide additional context, such as the chat request model.
 */
let ChatToolRequestService = class ChatToolRequestService {
    getChatToolRequests(request) {
        const toolRequests = request.message.toolRequests.size > 0 ? [...request.message.toolRequests.values()] : undefined;
        if (!toolRequests) {
            return [];
        }
        return this.toChatToolRequests(toolRequests, request);
    }
    toChatToolRequests(toolRequests, request) {
        if (!toolRequests) {
            return [];
        }
        return toolRequests.map(toolRequest => this.toChatToolRequest(toolRequest, request));
    }
    toChatToolRequest(toolRequest, request) {
        return {
            ...toolRequest,
            handler: async (arg_string) => toolRequest.handler(arg_string, request)
        };
    }
};
exports.ChatToolRequestService = ChatToolRequestService;
exports.ChatToolRequestService = ChatToolRequestService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatToolRequestService);
//# sourceMappingURL=chat-tool-request-service.js.map