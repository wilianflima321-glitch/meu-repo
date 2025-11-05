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
exports.aiChatPreferences = exports.PIN_CHAT_AGENT_PREF = exports.DEFAULT_CHAT_AGENT_PREF = void 0;
const ai_core_preferences_1 = require("@theia/ai-core/lib/common/ai-core-preferences");
const core_1 = require("@theia/core");
exports.DEFAULT_CHAT_AGENT_PREF = 'ai-features.chat.defaultChatAgent';
exports.PIN_CHAT_AGENT_PREF = 'ai-features.chat.pinChatAgent';
exports.aiChatPreferences = {
    properties: {
        [exports.DEFAULT_CHAT_AGENT_PREF]: {
            type: 'string',
            description: core_1.nls.localize('theia/ai/chat/defaultAgent/description', 'Optional: <agent-name> of the Chat Agent that shall be invoked, if no agent is explicitly mentioned with @<agent-name> in the user query. \
If no Default Agent is configured, Theia´s defaults will be applied.'),
            title: ai_core_preferences_1.AI_CORE_PREFERENCES_TITLE,
        },
        [exports.PIN_CHAT_AGENT_PREF]: {
            type: 'boolean',
            description: core_1.nls.localize('theia/ai/chat/pinChatAgent/description', 'Enable agent pinning to automatically keep a mentioned chat agent active across prompts, reducing the need for repeated mentions.\
You can manually unpin or switch agents anytime.'),
            default: true,
            title: ai_core_preferences_1.AI_CORE_PREFERENCES_TITLE,
        }
    }
};
//# sourceMappingURL=ai-chat-preferences.js.map