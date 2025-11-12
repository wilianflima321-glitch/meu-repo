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
exports.FrontendChatServiceImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const common_2 = require("@theia/core/lib/common");
const ai_chat_preferences_1 = require("../common/ai-chat-preferences");
const change_set_file_service_1 = require("./change-set-file-service");
/**
 * Customizes the ChatServiceImpl to consider preference based default chat agent
 */
let FrontendChatServiceImpl = class FrontendChatServiceImpl extends common_1.ChatServiceImpl {
    isPinChatAgentEnabled() {
        return this.preferenceService.get(ai_chat_preferences_1.PIN_CHAT_AGENT_PREF, true);
    }
    initialAgentSelection(parsedRequest) {
        const agentPart = this.getMentionedAgent(parsedRequest);
        if (!agentPart) {
            const configuredDefaultChatAgent = this.getConfiguredDefaultChatAgent();
            if (configuredDefaultChatAgent) {
                return configuredDefaultChatAgent;
            }
        }
        return super.initialAgentSelection(parsedRequest);
    }
    getConfiguredDefaultChatAgent() {
        const configuredDefaultChatAgentId = this.preferenceService.get(ai_chat_preferences_1.DEFAULT_CHAT_AGENT_PREF, undefined);
        const configuredDefaultChatAgent = configuredDefaultChatAgentId ? this.chatAgentService.getAgent(configuredDefaultChatAgentId) : undefined;
        if (configuredDefaultChatAgentId && !configuredDefaultChatAgent) {
            this.logger.warn(`The configured default chat agent with id '${configuredDefaultChatAgentId}' does not exist.`);
        }
        return configuredDefaultChatAgent;
    }
    createSession(location, options, pinnedAgent) {
        const session = super.createSession(location, options, pinnedAgent);
        session.model.onDidChange(event => {
            if (common_1.ChatChangeEvent.isChangeSetEvent(event)) {
                this.changeSetFileService.closeDiffsForSession(session.id, session.model.changeSet.getElements().map(({ uri }) => uri));
            }
        });
        return session;
    }
};
exports.FrontendChatServiceImpl = FrontendChatServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_2.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], FrontendChatServiceImpl.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_service_1.ChangeSetFileService),
    tslib_1.__metadata("design:type", change_set_file_service_1.ChangeSetFileService)
], FrontendChatServiceImpl.prototype, "changeSetFileService", void 0);
exports.FrontendChatServiceImpl = FrontendChatServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FrontendChatServiceImpl);
//# sourceMappingURL=frontend-chat-service.js.map