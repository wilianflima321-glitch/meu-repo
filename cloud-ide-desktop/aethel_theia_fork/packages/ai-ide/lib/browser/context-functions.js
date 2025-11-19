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
var ListChatContext_1, ResolveChatContext_1, AddFileToChatContext_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddFileToChatContext = exports.ResolveChatContext = exports.ListChatContext = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const context_functions_1 = require("../common/context-functions");
const file_variable_contribution_1 = require("@theia/ai-core/lib/browser/file-variable-contribution");
let ListChatContext = class ListChatContext {
    static { ListChatContext_1 = this; }
    static ID = context_functions_1.LIST_CHAT_CONTEXT_FUNCTION_ID;
    getTool() {
        return {
            id: ListChatContext_1.ID,
            name: ListChatContext_1.ID,
            description: 'Returns the list of context elements (such as files) specified by the user manually as part of the chat request.',
            handler: async (_, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const result = ctx.context.variables.map(contextElement => ({
                    id: contextElement.variable.id + contextElement.arg,
                    type: contextElement.variable.name
                }));
                return JSON.stringify(result, undefined, 2);
            },
            parameters: {
                type: 'object',
                properties: {}
            },
        };
    }
};
exports.ListChatContext = ListChatContext;
exports.ListChatContext = ListChatContext = ListChatContext_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ListChatContext);
let ResolveChatContext = class ResolveChatContext {
    static { ResolveChatContext_1 = this; }
    static ID = context_functions_1.RESOLVE_CHAT_CONTEXT_FUNCTION_ID;
    getTool() {
        return {
            id: ResolveChatContext_1.ID,
            name: ResolveChatContext_1.ID,
            description: 'Returns the content of a specific context element (such as files) specified by the user manually as part of the chat request.',
            parameters: {
                type: 'object',
                properties: {
                    contextElementId: {
                        type: 'string',
                        description: 'The id of the context element to resolve.'
                    }
                },
                required: ['contextElementId']
            },
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { contextElementId } = JSON.parse(args);
                const variable = ctx.context.variables.find(contextElement => contextElement.variable.id + contextElement.arg === contextElementId);
                if (variable) {
                    const result = {
                        type: variable.variable.name,
                        ref: variable.value,
                        content: variable.contextValue
                    };
                    return JSON.stringify(result, undefined, 2);
                }
                return JSON.stringify({ error: 'Context element not found' }, undefined, 2);
            }
        };
    }
};
exports.ResolveChatContext = ResolveChatContext;
exports.ResolveChatContext = ResolveChatContext = ResolveChatContext_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ResolveChatContext);
let AddFileToChatContext = class AddFileToChatContext {
    static { AddFileToChatContext_1 = this; }
    static ID = context_functions_1.UPDATE_CONTEXT_FILES_FUNCTION_ID;
    getTool() {
        return {
            id: AddFileToChatContext_1.ID,
            name: AddFileToChatContext_1.ID,
            parameters: {
                type: 'object',
                properties: {
                    filesToAdd: {
                        type: 'array',
                        description: 'The absolute paths of files to add to the context of the current chat.',
                        items: { type: 'string' }
                    }
                },
                required: ['filesToAdd']
            },
            description: 'Adds one or more files to the context of the current chat session, and returns the current list of files in the context.',
            handler: async (arg, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { filesToAdd } = JSON.parse(arg);
                ctx.session.context.addVariables(...filesToAdd.map(file => ({ arg: file, variable: file_variable_contribution_1.FILE_VARIABLE })));
                const result = ctx.session.context.getVariables().filter(candidate => candidate.variable.id === file_variable_contribution_1.FILE_VARIABLE.id && !!candidate.arg)
                    .map(fileRequest => fileRequest.arg);
                return JSON.stringify(result);
            }
        };
    }
};
exports.AddFileToChatContext = AddFileToChatContext;
exports.AddFileToChatContext = AddFileToChatContext = AddFileToChatContext_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AddFileToChatContext);
//# sourceMappingURL=context-functions.js.map