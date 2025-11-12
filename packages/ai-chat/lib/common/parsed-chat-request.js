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
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatParserTypes.ts
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/editor/common/core/offsetRange.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsedChatRequestAgentPart = exports.ParsedChatRequestFunctionPart = exports.ParsedChatRequestVariablePart = exports.ParsedChatRequestTextPart = exports.chatSubcommandLeader = exports.chatFunctionLeader = exports.chatAgentLeader = exports.chatVariableLeader = void 0;
const ai_core_1 = require("@theia/ai-core");
exports.chatVariableLeader = '#';
exports.chatAgentLeader = '@';
exports.chatFunctionLeader = '~';
exports.chatSubcommandLeader = '/';
class ParsedChatRequestTextPart {
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
    get promptText() {
        return this.text;
    }
}
exports.ParsedChatRequestTextPart = ParsedChatRequestTextPart;
class ParsedChatRequestVariablePart {
    constructor(range, variableName, variableArg) {
        this.range = range;
        this.variableName = variableName;
        this.variableArg = variableArg;
    }
    get text() {
        const argPart = this.variableArg ? `:${this.variableArg}` : '';
        return `${exports.chatVariableLeader}${this.variableName}${argPart}`;
    }
    get promptText() {
        var _a, _b;
        return (_b = (_a = this.resolution) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : this.text;
    }
}
exports.ParsedChatRequestVariablePart = ParsedChatRequestVariablePart;
class ParsedChatRequestFunctionPart {
    constructor(range, toolRequest) {
        this.range = range;
        this.toolRequest = toolRequest;
    }
    get text() {
        return `${exports.chatFunctionLeader}${this.toolRequest.id}`;
    }
    get promptText() {
        return (0, ai_core_1.toolRequestToPromptText)(this.toolRequest);
    }
}
exports.ParsedChatRequestFunctionPart = ParsedChatRequestFunctionPart;
class ParsedChatRequestAgentPart {
    constructor(range, agentId, agentName) {
        this.range = range;
        this.agentId = agentId;
        this.agentName = agentName;
    }
    get text() {
        return `${exports.chatAgentLeader}${this.agentName}`;
    }
    get promptText() {
        return '';
    }
}
exports.ParsedChatRequestAgentPart = ParsedChatRequestAgentPart;
//# sourceMappingURL=parsed-chat-request.js.map