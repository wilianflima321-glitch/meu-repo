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
exports.CustomChatAgent = void 0;
const tslib_1 = require("tslib");
const chat_agents_1 = require("./chat-agents");
const inversify_1 = require("@theia/core/shared/inversify");
let CustomChatAgent = class CustomChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    constructor() {
        super(...arguments);
        this.id = 'CustomChatAgent';
        this.name = 'CustomChatAgent';
        this.languageModelRequirements = [{ purpose: 'chat' }];
        this.defaultLanguageModelPurpose = 'chat';
    }
    set prompt(prompt) {
        // the name is dynamic, so we set the propmptId here
        this.systemPromptId = `${this.name}_prompt`;
        this.prompts.push({ id: this.systemPromptId, defaultVariant: { id: `${this.name}_prompt`, template: prompt } });
    }
};
exports.CustomChatAgent = CustomChatAgent;
exports.CustomChatAgent = CustomChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CustomChatAgent);
//# sourceMappingURL=custom-chat-agent.js.map